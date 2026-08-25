from typing import Any, List, Optional
from datetime import datetime, timezone
import calendar
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User, Department
from backend.models.vendor import Vendor
from backend.models.bill import Bill
from backend.lib.pdf_generator import generate_monthly_bills_pdf
from backend.lib.excel_generator import generate_bills_excel

router = APIRouter()


def _check_bill_access(bill: Bill, user: User) -> bool:
    if user.role in ["admin", "dcr", "administration"]:
        return True
    elif user.role == "principal":
        # Check if department is managed by principal
        principal_depts = [d.id for d in user.managed_departments]
        return bill.department_id in principal_depts and bill.vendor_id is None
    elif user.role == "coordinator":
        return bill.department_id == user.department_id and bill.vendor_id is None
    elif user.role == "vendor":
        return bill.vendor_id == user.vendor_id
    return False


@router.get("")
def read_bills(
    invoice_number: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    settlement_status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve all bills accessible to the authenticated session with search and filtering.
    Protects multi-department data leakage.
    """
    query = db.query(Bill)

    if current_user.role in ["admin", "dcr", "administration"]:
        pass  # full institutional view
    elif current_user.role == "principal":
        principal_depts = [d.id for d in current_user.managed_departments]
        query = query.filter(
            Bill.department_id.in_(principal_depts),
            Bill.vendor_id == None
        )
    elif current_user.role == "coordinator":
        if not current_user.department_id:
            return {"items": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 0}
        query = query.filter(
            Bill.department_id == current_user.department_id,
            Bill.vendor_id == None
        )
    elif current_user.role == "vendor":
        if not current_user.vendor_id:
            return {"items": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 0}
        query = query.filter(
            Bill.vendor_id == current_user.vendor_id
        )
    else:
        return {"items": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 0}

    # Apply filters
    if invoice_number:
        query = query.filter(
            (Bill.invoice_number.ilike(f"%{invoice_number}%")) |
            (Bill.order_id.ilike(f"%{invoice_number}%"))
        )
    if department_id:
        query = query.filter(Bill.department_id == department_id)
    if vendor_id:
        query = query.filter(Bill.vendor_id == vendor_id)
    if settlement_status:
        query = query.filter(Bill.settlement_status == settlement_status)
    if date_from:
        try:
            d_from = datetime.fromisoformat(date_from)
            query = query.filter(Bill.generated_at >= d_from)
        except Exception:
            pass
    if date_to:
        try:
            d_to = datetime.fromisoformat(date_to)
            query = query.filter(Bill.generated_at <= d_to)
        except Exception:
            pass
    if month and month > 0:
        query = query.filter(extract('month', Bill.generated_at) == month)
    if year and year > 0:
        query = query.filter(extract('year', Bill.generated_at) == year)

    total = query.count()
    bills = query.order_by(Bill.generated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for b in bills:
        results.append({
            "id": b.id,
            "invoice_number": b.invoice_number,
            "order_id": b.order_id,
            "vendor_id": b.vendor_id,
            "vendor_name": b.vendor.name if b.vendor else None,
            "department_id": b.department_id,
            "department_label": b.department.label if b.department else (b.department.name if b.department else b.department_id),
            "amount": float(b.amount or 0.0),
            "generated_at": b.generated_at.isoformat() if b.generated_at else None,
            "status": b.status,
            "settlement_status": b.settlement_status or "PENDING_SETTLEMENT",
            "settlement_id": b.settlement_id,
            "system_generated": b.system_generated
        })

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/financial-summary")
def get_financial_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """
    Get executive institutional financial summary.
    Current month, previous month, YTD, and pending settlement totals.
    """
    now = datetime.now(timezone.utc)
    cur_m = now.month
    cur_y = now.year
    prev_m = 12 if cur_m == 1 else cur_m - 1
    prev_y = cur_y - 1 if cur_m == 1 else cur_y

    all_bills = db.query(Bill).all()

    cur_m_bills = [b for b in all_bills if b.generated_at and b.generated_at.month == cur_m and b.generated_at.year == cur_y]
    prev_m_bills = [b for b in all_bills if b.generated_at and b.generated_at.month == prev_m and b.generated_at.year == prev_y]
    ytd_bills = [b for b in all_bills if b.generated_at and b.generated_at.year == cur_y]

    pending_bills = [b for b in all_bills if b.settlement_status != 'SETTLED']
    settled_bills = [b for b in all_bills if b.settlement_status == 'SETTLED']

    cur_m_total = sum(float(b.amount or 0.0) for b in cur_m_bills)
    prev_m_total = sum(float(b.amount or 0.0) for b in prev_m_bills)
    ytd_total = sum(float(b.amount or 0.0) for b in ytd_bills)
    pending_total = sum(float(b.amount or 0.0) for b in pending_bills)
    settled_total = sum(float(b.amount or 0.0) for b in settled_bills)

    return {
        "current_month_total": cur_m_total,
        "current_month_bills": len(cur_m_bills),
        "previous_month_total": prev_m_total,
        "previous_month_bills": len(prev_m_bills),
        "ytd_total": ytd_total,
        "ytd_bills": len(ytd_bills),
        "pending_settlement_total": pending_total,
        "pending_settlement_bills": len(pending_bills),
        "settled_total": settled_total,
        "settled_bills": len(settled_bills),
        "current_month_name": calendar.month_name[cur_m],
        "previous_month_name": calendar.month_name[prev_m],
    }


@router.get("/monthly")
def get_monthly_bills(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """Get bills and aggregations for a specific month and year."""
    bills = db.query(Bill).filter(
        extract('month', Bill.generated_at) == month,
        extract('year', Bill.generated_at) == year
    ).order_by(Bill.generated_at.desc()).all()

    total_amount = sum(float(b.amount or 0.0) for b in bills)
    settled_amount = sum(float(b.amount or 0.0) for b in bills if b.settlement_status == 'SETTLED')
    pending_amount = total_amount - settled_amount

    dept_ids = set(b.department_id for b in bills if b.department_id)
    vendor_ids = set(b.vendor_id for b in bills if b.vendor_id)

    results = []
    for b in bills:
        results.append({
            "id": b.id,
            "invoice_number": b.invoice_number,
            "order_id": b.order_id,
            "vendor_id": b.vendor_id,
            "vendor_name": b.vendor.name if b.vendor else None,
            "department_id": b.department_id,
            "department_label": b.department.label if b.department else (b.department.name if b.department else b.department_id),
            "amount": float(b.amount or 0.0),
            "generated_at": b.generated_at.isoformat() if b.generated_at else None,
            "settlement_status": b.settlement_status or "PENDING_SETTLEMENT",
            "settlement_id": b.settlement_id,
        })

    return {
        "month": month,
        "year": year,
        "month_name": calendar.month_name[month],
        "total_bills": len(bills),
        "total_amount": total_amount,
        "settled_amount": settled_amount,
        "pending_amount": pending_amount,
        "dept_count": len(dept_ids),
        "vendor_count": len(vendor_ids),
        "items": results
    }


@router.get("/export/pdf")
def export_monthly_bills_pdf(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """Export monthly consolidated bills report as PDF."""
    bills = db.query(Bill).filter(
        extract('month', Bill.generated_at) == month,
        extract('year', Bill.generated_at) == year
    ).order_by(Bill.generated_at.desc()).all()

    total_amount = sum(float(b.amount or 0.0) for b in bills)
    settled_amount = sum(float(b.amount or 0.0) for b in bills if b.settlement_status == 'SETTLED')
    pending_amount = total_amount - settled_amount

    summary = {
        'total_bills': len(bills),
        'total_amount': total_amount,
        'settled_amount': settled_amount,
        'pending_amount': pending_amount,
    }

    bills_data = []
    for b in bills:
        bills_data.append({
            'invoice_number': b.invoice_number,
            'order_id': b.order_id,
            'department_label': b.department.label if b.department else (b.department.name if b.department else b.department_id),
            'vendor_name': b.vendor.name if b.vendor else None,
            'amount': float(b.amount or 0.0),
            'settlement_status': b.settlement_status or 'PENDING_SETTLEMENT',
        })

    pdf_bytes = generate_monthly_bills_pdf(month, year, bills_data, summary)
    month_name = calendar.month_name[month]
    filename = f"AaharSetu_Monthly_Bills_{month_name}_{year}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/excel")
def export_monthly_bills_excel(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr', 'administration']))
) -> Any:
    """Export monthly bills spreadsheet with multi-sheet breakdowns."""
    bills = db.query(Bill).filter(
        extract('month', Bill.generated_at) == month,
        extract('year', Bill.generated_at) == year
    ).order_by(Bill.generated_at.desc()).all()

    total_amount = sum(float(b.amount or 0.0) for b in bills)
    settled_amount = sum(float(b.amount or 0.0) for b in bills if b.settlement_status == 'SETTLED')
    pending_amount = total_amount - settled_amount

    dept_ids = set(b.department_id for b in bills if b.department_id)
    vendor_ids = set(b.vendor_id for b in bills if b.vendor_id)

    summary = {
        'total_bills': len(bills),
        'total_amount': total_amount,
        'settled_amount': settled_amount,
        'pending_amount': pending_amount,
        'dept_count': len(dept_ids),
        'vendor_count': len(vendor_ids),
    }

    bills_data = []
    for b in bills:
        bills_data.append({
            'invoice_number': b.invoice_number,
            'order_id': b.order_id,
            'department_label': b.department.label if b.department else (b.department.name if b.department else b.department_id),
            'vendor_name': b.vendor.name if b.vendor else None,
            'order_created_at': b.generated_at.strftime("%Y-%m-%d") if b.generated_at else '',
            'generated_at': b.generated_at.strftime("%Y-%m-%d %H:%M") if b.generated_at else '',
            'amount': float(b.amount or 0.0),
            'settlement_status': b.settlement_status or 'PENDING_SETTLEMENT',
        })

    excel_bytes = generate_bills_excel(month, year, bills_data, summary)
    month_name = calendar.month_name[month]
    filename = f"AaharSetu_Monthly_Bills_{month_name}_{year}.xlsx"

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{bill_id}/pdf")
def stream_bill_pdf(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Response:
    """
    Securely stream the generated PDF invoice from PostgreSQL.
    Excludes unauthorized department/vendor access.
    """
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        # Check by invoice number as fallback
        bill = db.query(Bill).filter(Bill.invoice_number == bill_id).first()
        
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )
        
    if not _check_bill_access(bill, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied. You do not have permission to view this invoice."
        )
        
    if not bill.pdf_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF attachment not found for this bill record."
        )
        
    return Response(
        content=bill.pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={bill.invoice_number}.pdf"
        }
    )
