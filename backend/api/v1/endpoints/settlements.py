from typing import Any, List, Optional
from datetime import datetime, timezone
import calendar
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from io import BytesIO

from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User, Department
from backend.models.vendor import Vendor
from backend.models.bill import Bill
from backend.models.order import MasterOrder
from backend.models.settlement import Settlement
from backend.lib.pdf_generator import generate_settlement_pdf
from backend.lib.excel_generator import generate_settlement_excel
from backend.services.notification import NotificationService

router = APIRouter()


def _get_settlement_breakdowns(db: Session, month: int, year: int):
    """
    Compute department and vendor breakdowns for bills in a specific month and year.
    Uses master bills and vendor bills properly.
    """
    # Bills query for the month/year
    bills_q = db.query(Bill).filter(
        extract('month', Bill.generated_at) == month,
        extract('year', Bill.generated_at) == year
    )
    all_bills = bills_q.all()

    # Department breakdown (using Master bills / all bills associated with department)
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

    for b in all_bills:
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

    # Filter out empty entries
    active_depts = [v for v in dept_stats.values() if v['bill_count'] > 0 or v['total_amount'] > 0]
    active_vendors = [v for v in vendor_stats.values() if v['bill_count'] > 0 or v['total_amount'] > 0]

    return active_depts, active_vendors, all_bills


@router.get("")
def list_settlements(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """List all settlement records."""
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

    # Check if a finalized settlement already exists for this month/year
    existing = db.query(Settlement).filter(
        Settlement.month == month,
        Settlement.year == year
    ).first()

    if existing and existing.status == 'FINALIZED':
        raise HTTPException(status_code=400, detail=f"Settlement for {calendar.month_name[month]} {year} is already finalized.")

    dept_breakdown, vendor_breakdown, bills = _get_settlement_breakdowns(db, month, year)
    total_bills = len(bills)
    total_amount = sum(float(b.amount or 0.0) for b in bills)
    settled_amount = sum(float(b.amount or 0.0) for b in bills if b.settlement_status == 'SETTLED')
    pending_amount = total_amount - settled_amount

    settlement_num = f"SET-{year:04d}-{month:02d}"

    if existing:
        # Update existing draft
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
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """
    Finalize a settlement.
    Reconciles bills and marks all matching bills as SETTLED.
    """
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    if settlement.status == "FINALIZED":
        return {"message": "Settlement is already finalized", "settlement_number": settlement.settlement_number}

    # Fetch bills for this month/year
    bills = db.query(Bill).filter(
        extract('month', Bill.generated_at) == settlement.month,
        extract('year', Bill.generated_at) == settlement.year
    ).all()

    total_amount = sum(float(b.amount or 0.0) for b in bills)

    # Update bills
    for b in bills:
        b.settlement_status = "SETTLED"
        b.settlement_id = settlement.id

    now = datetime.now(timezone.utc)
    settlement.status = "FINALIZED"
    settlement.finalized_at = now
    settlement.total_bills = len(bills)
    settlement.total_amount = total_amount
    settlement.settled_amount = total_amount
    settlement.pending_amount = 0.0

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
