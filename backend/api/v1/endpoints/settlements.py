from typing import Any, List, Optional, Dict
from datetime import datetime, timezone
import calendar
import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from io import BytesIO

from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User, Department
from backend.models.vendor import Vendor, VendorMonthlySettlement
from backend.models.bill import Bill
from backend.models.order import MasterOrder
from backend.models.settlement import Settlement
from backend.models.payment import Payment
from backend.lib.pdf_generator import generate_settlement_pdf
from backend.lib.excel_generator import generate_settlement_excel
from backend.services.notification import NotificationService

router = APIRouter()


class RecordPaymentPayload(BaseModel):
    vendor_id: str
    amount: float
    payment_method: str = "NEFT"
    payment_reference: Optional[str] = None
    bank_name: Optional[str] = None
    payment_date: Optional[str] = None
    settlement_id: Optional[int] = None
    notes: Optional[str] = None


def _get_settlement_breakdowns(db: Session, month: int, year: int):
    """
    Compute department and vendor breakdowns for bills in a specific month and year.
    Only uses vendor-specific bills (vendor_id IS NOT NULL) to avoid double-counting:
    - Master bills (vendor_id=None) are consolidated department receipts, NOT vendor payments.
    - Vendor bills (vendor_id set) represent actual amounts to be paid per vendor.
    """
    # All bills for the month (used for the bill register display)
    all_bills = db.query(Bill).filter(
        extract('month', Bill.generated_at) == month,
        extract('year', Bill.generated_at) == year
    ).all()

    # Only vendor-specific bills for financial calculations (exclude master/consolidated bills)
    vendor_bills = [b for b in all_bills if b.vendor_id is not None]

    # Department breakdown — derived from vendor bills only to avoid double-counting
    depts = db.query(Department).all()
    dept_map = {d.id: d for d in depts}
    dept_stats = {}
    for d_id, d in dept_map.items():
        dept_stats[d_id] = {
            'department_id': d_id,
            'department_name': d.name,
            'label': d.label,
            'bill_count': 0,
            'total_amount': 0.0,
            'settled_amount': 0.0,
            'pending_amount': 0.0,
        }

    # Vendor breakdown
    vendors = db.query(Vendor).all()
    vendor_map = {v.id: v for v in vendors}
    vendor_stats = {}
    for v_id, v in vendor_map.items():
        vendor_stats[v_id] = {
            'vendor_id': v_id,
            'vendor_name': v.name,
            'bill_count': 0,
            'total_amount': 0.0,
            'settled_amount': 0.0,
            'pending_amount': 0.0,
        }

    for b in vendor_bills:
        amt = float(b.amount or 0.0)
        is_settled = (b.settlement_status == 'SETTLED')

        if b.department_id and b.department_id in dept_stats:
            dept_stats[b.department_id]['bill_count'] += 1
            dept_stats[b.department_id]['total_amount'] += amt
            if is_settled:
                dept_stats[b.department_id]['settled_amount'] += amt
            else:
                dept_stats[b.department_id]['pending_amount'] += amt

        if b.vendor_id and b.vendor_id in vendor_stats:
            vendor_stats[b.vendor_id]['bill_count'] += 1
            vendor_stats[b.vendor_id]['total_amount'] += amt
            if is_settled:
                vendor_stats[b.vendor_id]['settled_amount'] += amt
            else:
                vendor_stats[b.vendor_id]['pending_amount'] += amt

    # Filter out empty entries and sort vendors by name for consistent display
    active_depts = [v for v in dept_stats.values() if v['bill_count'] > 0 or v['total_amount'] > 0]
    active_vendors = sorted(
        [v for v in vendor_stats.values() if v['bill_count'] > 0 or v['total_amount'] > 0],
        key=lambda x: x['vendor_name']
    )

    return active_depts, active_vendors, all_bills


# ============================================================================
# 1. OUTSTANDING DUES & AGING ANALYSIS (Tally/Zoho Style)
# ============================================================================

@router.get("/outstanding")
def get_outstanding_settlements(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration', 'vendor']))
) -> Any:
    """
    Get real-time outstanding vendor dues with aging analysis (0-30, 31-60, 60+ days).
    Provides executive visibility into total institution payables.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Fetch vendor bills (excluding master invoices)
    query_bills = db.query(Bill).filter(Bill.vendor_id != None)
    if current_user.role == "vendor":
        query_bills = query_bills.filter(Bill.vendor_id == current_user.vendor_id)
    vendor_bills = query_bills.order_by(Bill.generated_at.asc()).all()
    
    # 2. Fetch recorded payments
    query_payments = db.query(Payment).filter(Payment.status.in_(['SUCCESS', 'PENDING']))
    if current_user.role == "vendor":
        query_payments = query_payments.filter(Payment.vendor_id == current_user.vendor_id)
    payments = query_payments.all()
    
    # 3. Fetch vendors
    query_vendors = db.query(Vendor)
    if current_user.role == "vendor":
        query_vendors = query_vendors.filter(Vendor.id == current_user.vendor_id)
    vendors = query_vendors.all()
    vendor_map = {v.id: v for v in vendors}
    
    vendor_stats = {}
    for v_id, v in vendor_map.items():
        vendor_stats[v_id] = {
            'vendor_id': v_id,
            'vendor_name': v.name,
            'owner_name': v.owner_name,
            'phone': v.phone,
            'email': v.email,
            'total_billed': 0.0,
            'total_paid': 0.0,
            'outstanding': 0.0,
            'settled_bills_count': 0,
            'pending_bills_count': 0,
            'total_bills_count': 0,
            'aging_0_30': 0.0,
            'aging_31_60': 0.0,
            'aging_over_60': 0.0,
            'last_payment_date': None,
            'last_payment_amount': None,
            'last_payment_ref': None,
        }
    
    # Calculate billed amounts and aging on pending bills
    for b in vendor_bills:
        v_id = b.vendor_id
        if v_id not in vendor_stats:
            continue
        
        amt = float(b.amount or 0.0)
        vendor_stats[v_id]['total_billed'] += amt
        vendor_stats[v_id]['total_bills_count'] += 1
        
        if b.settlement_status == 'SETTLED':
            vendor_stats[v_id]['settled_bills_count'] += 1
        else:
            vendor_stats[v_id]['pending_bills_count'] += 1
            # Calculate aging in days
            bill_date = b.generated_at
            if bill_date:
                if bill_date.tzinfo is None:
                    bill_date = bill_date.replace(tzinfo=timezone.utc)
                age_days = (now - bill_date).days
            else:
                age_days = 0
            
            if age_days <= 30:
                vendor_stats[v_id]['aging_0_30'] += amt
            elif age_days <= 60:
                vendor_stats[v_id]['aging_31_60'] += amt
            else:
                vendor_stats[v_id]['aging_over_60'] += amt
                
    # Calculate recorded payments
    for p in payments:
        if not p.vendor_id or p.vendor_id not in vendor_stats:
            continue
        p_amt = float(p.amount or 0.0)
        vendor_stats[p.vendor_id]['total_paid'] += p_amt
        
        p_date = p.payment_date or p.completed_at or p.initiated_at
        if p_date:
            p_date_iso = p_date.isoformat() if hasattr(p_date, 'isoformat') else str(p_date)
            cur_last = vendor_stats[p.vendor_id]['last_payment_date']
            if not cur_last or str(p_date_iso) > str(cur_last):
                vendor_stats[p.vendor_id]['last_payment_date'] = p_date_iso
                vendor_stats[p.vendor_id]['last_payment_amount'] = p_amt
                vendor_stats[p.vendor_id]['last_payment_ref'] = p.payment_reference or p.gateway_transaction_id

    # Resolve outstanding balance per vendor
    for v_id, data in vendor_stats.items():
        if data['total_paid'] > 0:
            data['outstanding'] = max(0.0, data['total_billed'] - data['total_paid'])
        else:
            data['outstanding'] = data['aging_0_30'] + data['aging_31_60'] + data['aging_over_60']
            data['total_paid'] = max(0.0, data['total_billed'] - data['outstanding'])
            
    active_vendors = [v for v in vendor_stats.values() if v['total_billed'] > 0 or v['outstanding'] > 0 or v['total_paid'] > 0]
    active_vendors.sort(key=lambda x: x['outstanding'], reverse=True)
    
    grand_billed = sum(v['total_billed'] for v in active_vendors)
    grand_paid = sum(v['total_paid'] for v in active_vendors)
    grand_outstanding = sum(v['outstanding'] for v in active_vendors)
    grand_aging_0_30 = sum(v['aging_0_30'] for v in active_vendors)
    grand_aging_31_60 = sum(v['aging_31_60'] for v in active_vendors)
    grand_aging_over_60 = sum(v['aging_over_60'] for v in active_vendors)
    total_pending_bills = sum(v['pending_bills_count'] for v in active_vendors)
    vendors_with_dues_count = sum(1 for v in active_vendors if v['outstanding'] > 0)
    
    return {
        'as_of': now.isoformat(),
        'summary': {
            'grand_billed': grand_billed,
            'grand_paid': grand_paid,
            'grand_outstanding': grand_outstanding,
            'aging_0_30': grand_aging_0_30,
            'aging_31_60': grand_aging_31_60,
            'aging_over_60': grand_aging_over_60,
            'total_pending_bills': total_pending_bills,
            'vendors_with_dues_count': vendors_with_dues_count,
            'total_vendors_count': len(active_vendors)
        },
        'vendors': active_vendors
    }


# ============================================================================
# 2. PAYMENT RECORDING & LISTING (Real Financial Transactions)
# ============================================================================

@router.post("/payments")
@router.post("/payments/record")
def record_vendor_payment(
    payload: RecordPaymentPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """
    Record an actual vendor payment transaction with bank, UTR, and amount details.
    """
    vendor = db.query(Vendor).filter(Vendor.id == payload.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
        
    now = datetime.now(timezone.utc)
    pay_date = now
    if payload.payment_date:
        try:
            pay_date = datetime.fromisoformat(payload.payment_date)
            if pay_date.tzinfo is None:
                pay_date = pay_date.replace(tzinfo=timezone.utc)
        except Exception:
            pay_date = now
            
    ref_no = payload.payment_reference
    if not ref_no or not ref_no.strip():
        ref_no = f"PAY-{datetime.now().strftime('%Y%m%d')}-{vendor.id.upper()}-{uuid.uuid4().hex[:4].upper()}"
        
    payment = Payment(
        payment_reference=ref_no,
        settlement_id=payload.settlement_id,
        vendor_id=vendor.id,
        amount=payload.amount,
        currency="INR",
        payment_method=payload.payment_method.upper(),
        gateway=payload.bank_name or "Direct Bank Transfer",
        gateway_transaction_id=ref_no,
        status="SUCCESS",
        initiated_at=pay_date,
        completed_at=pay_date,
        bank_name=payload.bank_name,
        payment_date=pay_date,
        notes=payload.notes,
        created_by_id=current_user.id
    )
    db.add(payment)
    
    # Sync with VendorMonthlySettlement if settlement ID is linked
    if payload.settlement_id:
        settlement = db.query(Settlement).filter(Settlement.id == payload.settlement_id).first()
        if settlement:
            month_str = f"{settlement.year:04d}-{settlement.month:02d}"
            vms = db.query(VendorMonthlySettlement).filter(
                VendorMonthlySettlement.vendor_id == vendor.id,
                VendorMonthlySettlement.month == month_str
            ).first()
            if vms:
                vms.paid_amount = float(vms.paid_amount or 0.0) + payload.amount
                vms.due_amount = max(0.0, float(vms.total_amount or 0.0) - vms.paid_amount)
                if vms.due_amount <= 0:
                    vms.status = "Settled"
                else:
                    vms.status = "Partially Settled"
                db.add(vms)
                
    db.commit()
    db.refresh(payment)
    
    return {
        "id": payment.id,
        "payment_reference": payment.payment_reference,
        "vendor_id": payment.vendor_id,
        "vendor_name": vendor.name,
        "amount": float(payment.amount),
        "payment_method": payment.payment_method,
        "bank_name": payment.bank_name,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "status": payment.status,
        "notes": payment.notes,
        "created_by": current_user.name
    }


@router.get("/payments")
def list_vendor_payments(
    vendor_id: Optional[str] = Query(None),
    settlement_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """List recorded vendor payment transactions."""
    query = db.query(Payment)
    
    if current_user.role == "vendor":
        query = query.filter(Payment.vendor_id == current_user.vendor_id)
    elif vendor_id:
        query = query.filter(Payment.vendor_id == vendor_id)
        
    if settlement_id:
        query = query.filter(Payment.settlement_id == settlement_id)
        
    payments = query.order_by(Payment.payment_date.desc(), Payment.id.desc()).all()
    
    results = []
    for p in payments:
        v_name = p.vendor.name if p.vendor else "Unknown Vendor"
        creator_name = p.created_by.name if p.created_by else None
        p_date = p.payment_date or p.completed_at or p.initiated_at
        results.append({
            "id": p.id,
            "payment_reference": p.payment_reference,
            "settlement_id": p.settlement_id,
            "vendor_id": p.vendor_id,
            "vendor_name": v_name,
            "amount": float(p.amount or 0.0),
            "currency": p.currency,
            "payment_method": p.payment_method,
            "bank_name": p.bank_name or p.gateway,
            "status": p.status,
            "notes": p.notes,
            "payment_date": p_date.isoformat() if p_date else None,
            "created_by": creator_name
        })
    return results


# ============================================================================
# 3. VENDOR PASSBOOK / ACCOUNT LEDGER (Tally/QuickBooks Style)
# ============================================================================

@router.get("/vendor/{vendor_id}/ledger")
def get_vendor_ledger(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get chronological debit/credit ledger with running balance for a specific vendor.
    Provides complete audit passbook for financial reconciliation.
    """
    if current_user.role == "vendor" and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Access denied to this vendor's ledger")
        
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    # 1. Fetch all bills for this vendor (Debits to school = Vendor Invoice)
    bills = db.query(Bill).filter(Bill.vendor_id == vendor_id).all()
    
    # 2. Fetch all payments made to this vendor
    payments = db.query(Payment).filter(Payment.vendor_id == vendor_id, Payment.status == "SUCCESS").all()
    
    entries = []
    
    for b in bills:
        b_date = b.generated_at or datetime.now(timezone.utc)
        dept_name = b.department.label if b.department else (b.department.name if b.department else "General")
        entries.append({
            'date': b_date,
            'type': 'INVOICE',
            'reference': b.invoice_number,
            'order_id': b.order_id,
            'description': f"Bill for Order {b.order_id} ({dept_name})",
            'debit': float(b.amount or 0.0),   # Increases liability owed by institution
            'credit': 0.0,
            'settlement_status': b.settlement_status or 'PENDING_SETTLEMENT'
        })
        
    for p in payments:
        p_date = p.payment_date or p.completed_at or p.initiated_at or datetime.now(timezone.utc)
        mode_str = p.payment_method or "TRANSFER"
        bank_str = f" via {p.bank_name}" if p.bank_name else ""
        desc_notes = f" — {p.notes}" if p.notes else ""
        entries.append({
            'date': p_date,
            'type': 'PAYMENT',
            'reference': p.payment_reference or f"PAY-{p.id}",
            'order_id': None,
            'description': f"Payment Disbursement ({mode_str}{bank_str}){desc_notes}",
            'debit': 0.0,
            'credit': float(p.amount or 0.0),  # Decreases liability owed by institution
            'settlement_status': 'PAID'
        })
        
    # Sort chronologically
    entries.sort(key=lambda x: x['date'] if x['date'] else datetime.min)
    
    running_balance = 0.0
    total_billed = 0.0
    total_paid = 0.0
    
    formatted_entries = []
    for e in entries:
        total_billed += e['debit']
        total_paid += e['credit']
        running_balance += (e['debit'] - e['credit'])
        formatted_entries.append({
            'date': e['date'].isoformat() if hasattr(e['date'], 'isoformat') else str(e['date']),
            'type': e['type'],
            'reference': e['reference'],
            'order_id': e['order_id'],
            'description': e['description'],
            'debit': e['debit'],
            'credit': e['credit'],
            'balance': max(0.0, running_balance),
            'settlement_status': e['settlement_status']
        })
        
    return {
        'vendor': {
            'id': vendor.id,
            'name': vendor.name,
            'owner_name': vendor.owner_name,
            'phone': vendor.phone,
            'email': vendor.email,
            'status': vendor.status
        },
        'summary': {
            'total_billed': total_billed,
            'total_paid': total_paid,
            'current_outstanding': max(0.0, running_balance),
            'total_entries': len(formatted_entries)
        },
        'ledger_entries': formatted_entries
    }


# ============================================================================
# 4. MONTHLY SETTLEMENTS CRUD & REPORTING
# ============================================================================

@router.get("")
def list_settlements(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """List all monthly settlement summary records."""
    settlements = db.query(Settlement).order_by(Settlement.year.desc(), Settlement.month.desc()).all()
    results = []
    for s in settlements:
        dept_breakdown, vendor_breakdown, _ = _get_settlement_breakdowns(db, s.month, s.year)
        creator_name = s.creator.name if s.creator else None
        month_name = calendar.month_name[s.month] if 1 <= s.month <= 12 else str(s.month)
        results.append({
            'id': s.id,
            'settlement_number': s.settlement_number,
            'month': s.month,
            'year': s.year,
            'month_name': month_name,
            'total_bills': s.total_bills,
            'total_amount': float(s.total_amount or 0.0),
            'settled_amount': float(s.settled_amount or 0.0),
            'pending_amount': float(s.pending_amount or 0.0),
            'status': s.status,
            'created_at': s.created_at.isoformat() if s.created_at else None,
            'finalized_at': s.finalized_at.isoformat() if s.finalized_at else None,
            'creator_name': creator_name,
            'department_breakdown': dept_breakdown,
            'vendor_breakdown': vendor_breakdown,
        })
    return results


@router.post("")
def create_draft_settlement(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """Create or calculate a draft settlement for a given month and year."""
    month = int(payload.get('month', datetime.now().month))
    year = int(payload.get('year', datetime.now().year))
    notes = payload.get('notes')

    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month (must be 1-12)")

    existing = db.query(Settlement).filter(
        Settlement.month == month,
        Settlement.year == year
    ).first()

    if existing and existing.status == 'FINALIZED':
        raise HTTPException(status_code=400, detail=f"Settlement for {calendar.month_name[month]} {year} is already finalized.")

    dept_breakdown, vendor_breakdown, bills = _get_settlement_breakdowns(db, month, year)
    # Only count vendor-specific bills (master bills excluded) to avoid double-counting
    vendor_bills_only = [b for b in bills if b.vendor_id is not None]
    total_bills = len(vendor_bills_only)
    total_amount = sum(float(b.amount or 0.0) for b in vendor_bills_only)
    settled_amount = sum(float(b.amount or 0.0) for b in vendor_bills_only if b.settlement_status == 'SETTLED')
    pending_amount = total_amount - settled_amount

    settlement_num = f"SET-{year:04d}-{month:02d}"

    if existing:
        existing.total_bills = total_bills
        existing.total_amount = total_amount
        existing.settled_amount = settled_amount
        existing.pending_amount = pending_amount
        existing.notes = notes
        existing.created_by_id = current_user.id
        db.commit()
        db.refresh(existing)
        settlement_obj = existing
    else:
        settlement_obj = Settlement(
            settlement_number=settlement_num,
            month=month,
            year=year,
            total_bills=total_bills,
            total_amount=total_amount,
            settled_amount=settled_amount,
            pending_amount=pending_amount,
            status="DRAFT",
            notes=notes,
            created_by_id=current_user.id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(settlement_obj)
        db.commit()
        db.refresh(settlement_obj)

    month_name = calendar.month_name[month] if 1 <= month <= 12 else str(month)
    return {
        'id': settlement_obj.id,
        'settlement_number': settlement_obj.settlement_number,
        'month': settlement_obj.month,
        'year': settlement_obj.year,
        'month_name': month_name,
        'total_bills': settlement_obj.total_bills,
        'total_amount': float(settlement_obj.total_amount or 0.0),
        'settled_amount': float(settlement_obj.settled_amount or 0.0),
        'pending_amount': float(settlement_obj.pending_amount or 0.0),
        'status': settlement_obj.status,
        'created_at': settlement_obj.created_at.isoformat() if settlement_obj.created_at else None,
        'finalized_at': settlement_obj.finalized_at.isoformat() if settlement_obj.finalized_at else None,
        'creator_name': current_user.name,
        'department_breakdown': dept_breakdown,
        'vendor_breakdown': vendor_breakdown,
    }


@router.get("/{settlement_id}")
def get_settlement(
    settlement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """Get single settlement summary."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    dept_breakdown, vendor_breakdown, _ = _get_settlement_breakdowns(db, settlement.month, settlement.year)
    creator_name = settlement.creator.name if settlement.creator else None
    month_name = calendar.month_name[settlement.month] if 1 <= settlement.month <= 12 else str(settlement.month)

    return {
        'id': settlement.id,
        'settlement_number': settlement.settlement_number,
        'month': settlement.month,
        'year': settlement.year,
        'month_name': month_name,
        'total_bills': settlement.total_bills,
        'total_amount': float(settlement.total_amount or 0.0),
        'settled_amount': float(settlement.settled_amount or 0.0),
        'pending_amount': float(settlement.pending_amount or 0.0),
        'status': settlement.status,
        'notes': settlement.notes,
        'created_at': settlement.created_at.isoformat() if settlement.created_at else None,
        'finalized_at': settlement.finalized_at.isoformat() if settlement.finalized_at else None,
        'creator_name': creator_name,
        'department_breakdown': dept_breakdown,
        'vendor_breakdown': vendor_breakdown,
    }


@router.get("/{settlement_id}/report")
def get_settlement_report(
    settlement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """Get comprehensive settlement report including bills list."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    dept_breakdown, vendor_breakdown, bills = _get_settlement_breakdowns(db, settlement.month, settlement.year)
    creator_name = settlement.creator.name if settlement.creator else None
    month_name = calendar.month_name[settlement.month] if 1 <= settlement.month <= 12 else str(settlement.month)

    bills_list = []
    for b in bills:
        bills_list.append({
            'id': b.id,
            'invoice_number': b.invoice_number,
            'order_id': b.order_id,
            'department_id': b.department_id,
            'department_label': b.department.label if b.department else b.department_id,
            'vendor_name': b.vendor.name if b.vendor else None,
            'amount': float(b.amount or 0.0),
            'settlement_status': b.settlement_status or 'PENDING_SETTLEMENT',
            'generated_at': b.generated_at.isoformat() if b.generated_at else None,
        })

    return {
        'id': settlement.id,
        'settlement_number': settlement.settlement_number,
        'month': settlement.month,
        'year': settlement.year,
        'month_name': month_name,
        'total_bills': settlement.total_bills,
        'total_amount': float(settlement.total_amount or 0.0),
        'settled_amount': float(settlement.settled_amount or 0.0),
        'pending_amount': float(settlement.pending_amount or 0.0),
        'status': settlement.status,
        'notes': settlement.notes,
        'created_at': settlement.created_at.isoformat() if settlement.created_at else None,
        'finalized_at': settlement.finalized_at.isoformat() if settlement.finalized_at else None,
        'creator_name': creator_name,
        'department_breakdown': dept_breakdown,
        'vendor_breakdown': vendor_breakdown,
        'bills': bills_list
    }


@router.post("/{settlement_id}/finalize")
def finalize_settlement(
    settlement_id: int,
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """
    Finalize a settlement.
    Reconciles bills, auto-records vendor Payment transaction entries, and marks all matching bills as SETTLED.
    """
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    if settlement.status == "FINALIZED":
        return {"message": "Settlement is already finalized", "settlement_number": settlement.settlement_number}

    # Fetch all bills for this month/year
    bills = db.query(Bill).filter(
        extract('month', Bill.generated_at) == settlement.month,
        extract('year', Bill.generated_at) == settlement.year
    ).all()

    # Only vendor-specific bills count toward the settlement total
    vendor_bills = [b for b in bills if b.vendor_id is not None]
    total_amount = sum(float(b.amount or 0.0) for b in vendor_bills)

    # Mark all bills (including master) as SETTLED for audit trail
    for b in bills:
        b.settlement_status = "SETTLED"
        b.settlement_id = settlement.id

    now = datetime.now(timezone.utc)
    settlement.status = "FINALIZED"
    settlement.finalized_at = now
    settlement.total_bills = len(vendor_bills)
    settlement.total_amount = total_amount
    settlement.settled_amount = total_amount
    settlement.pending_amount = 0.0

    # Auto-record Payment audit entries per vendor
    vendor_payments_payload = payload.get('vendor_payments', {}) if payload else {}
    vendor_totals = {}
    for b in vendor_bills:
        vendor_totals[b.vendor_id] = vendor_totals.get(b.vendor_id, 0.0) + float(b.amount or 0.0)

    for v_id, v_amount in vendor_totals.items():
        v_details = vendor_payments_payload.get(v_id, {})
        utr = v_details.get('utr') or f"SET-{settlement.settlement_number}-{v_id.upper()}"
        mode = v_details.get('mode') or "NEFT"
        b_name = v_details.get('bank_name') or "Institution Bank Transfer"
        p_notes = v_details.get('notes') or f"Settlement {settlement.settlement_number}"

        pmt = Payment(
            payment_reference=utr,
            settlement_id=settlement.id,
            vendor_id=v_id,
            amount=v_amount,
            currency="INR",
            payment_method=mode,
            gateway=b_name,
            gateway_transaction_id=utr,
            status="SUCCESS",
            initiated_at=now,
            completed_at=now,
            bank_name=b_name,
            payment_date=now,
            notes=p_notes,
            created_by_id=current_user.id
        )
        db.add(pmt)

        # Update vendor monthly settlement tracker
        month_str = f"{settlement.year:04d}-{settlement.month:02d}"
        vms = db.query(VendorMonthlySettlement).filter(
            VendorMonthlySettlement.vendor_id == v_id,
            VendorMonthlySettlement.month == month_str
        ).first()
        if vms:
            vms.paid_amount = v_amount
            vms.due_amount = 0.0
            vms.status = "Settled"
            db.add(vms)

    db.commit()
    db.refresh(settlement)

    # Broadcast notification
    try:
        notif_service = NotificationService(db)
        notif_service.notify_settlement_event(
            settlement_number=settlement.settlement_number,
            month=settlement.month,
            year=settlement.year,
            amount=total_amount,
            event_type="settlement_finalized"
        )
    except Exception as e:
        print(f"[SETTLEMENT] Notification dispatch error: {e}")

    return {
        "message": "Settlement successfully finalized",
        "settlement_number": settlement.settlement_number,
        "total_amount": float(settlement.total_amount),
        "total_bills": settlement.total_bills,
        "finalized_at": settlement.finalized_at.isoformat()
    }


@router.get("/{settlement_id}/export/pdf")
def export_settlement_pdf(
    settlement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """Export settlement as PDF document."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    dept_breakdown, vendor_breakdown, _ = _get_settlement_breakdowns(db, settlement.month, settlement.year)
    creator_name = settlement.creator.name if settlement.creator else None

    settlement_dict = {
        'id': settlement.id,
        'settlement_number': settlement.settlement_number,
        'month': settlement.month,
        'year': settlement.year,
        'total_bills': settlement.total_bills,
        'total_amount': float(settlement.total_amount or 0.0),
        'settled_amount': float(settlement.settled_amount or 0.0),
        'pending_amount': float(settlement.pending_amount or 0.0),
        'status': settlement.status,
        'creator_name': creator_name,
        'finalized_at': settlement.finalized_at.strftime("%Y-%m-%d %H:%M") if settlement.finalized_at else None
    }

    pdf_bytes = generate_settlement_pdf(settlement_dict, dept_breakdown, vendor_breakdown)
    filename = f"AaharSetu_Settlement_{settlement.settlement_number}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{settlement_id}/export/excel")
def export_settlement_excel(
    settlement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """Export settlement as multi-sheet Excel spreadsheet."""
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    dept_breakdown, vendor_breakdown, bills = _get_settlement_breakdowns(db, settlement.month, settlement.year)
    creator_name = settlement.creator.name if settlement.creator else None

    settlement_dict = {
        'id': settlement.id,
        'settlement_number': settlement.settlement_number,
        'month': settlement.month,
        'year': settlement.year,
        'total_bills': settlement.total_bills,
        'total_amount': float(settlement.total_amount or 0.0),
        'settled_amount': float(settlement.settled_amount or 0.0),
        'pending_amount': float(settlement.pending_amount or 0.0),
        'status': settlement.status,
        'creator_name': creator_name,
        'created_at': settlement.created_at.strftime("%Y-%m-%d %H:%M") if settlement.created_at else None,
        'finalized_at': settlement.finalized_at.strftime("%Y-%m-%d %H:%M") if settlement.finalized_at else None
    }

    bills_data = []
    for b in bills:
        bills_data.append({
            'invoice_number': b.invoice_number,
            'order_id': b.order_id,
            'department_id': b.department_id,
            'department_label': b.department.label if b.department else b.department_id,
            'vendor_name': b.vendor.name if b.vendor else None,
            'generated_at': b.generated_at.strftime("%Y-%m-%d") if b.generated_at else None,
            'amount': float(b.amount or 0.0),
            'settlement_status': b.settlement_status or 'PENDING_SETTLEMENT'
        })

    excel_bytes = generate_settlement_excel(settlement_dict, dept_breakdown, vendor_breakdown, bills_data)
    filename = f"AaharSetu_Settlement_{settlement.settlement_number}.xlsx"

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
