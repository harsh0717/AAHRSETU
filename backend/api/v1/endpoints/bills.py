from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User
from backend.models.bill import Bill

router = APIRouter()

def _check_bill_access(bill: Bill, user: User) -> bool:
    if user.role in ["admin", "dcr"]:
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
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve all bills accessible to the authenticated session.
    Protects multi-department data leakage.
    """
    if current_user.role in ["admin", "dcr"]:
        bills = db.query(Bill).order_by(Bill.generated_at.desc()).all()
    elif current_user.role == "principal":
        principal_depts = [d.id for d in current_user.managed_departments]
        bills = db.query(Bill).filter(
            Bill.department_id.in_(principal_depts),
            Bill.vendor_id == None
        ).order_by(Bill.generated_at.desc()).all()
    elif current_user.role == "coordinator":
        if not current_user.department_id:
            return []
        bills = db.query(Bill).filter(
            Bill.department_id == current_user.department_id,
            Bill.vendor_id == None
        ).order_by(Bill.generated_at.desc()).all()
    elif current_user.role == "vendor":
        if not current_user.vendor_id:
            return []
        bills = db.query(Bill).filter(
            Bill.vendor_id == current_user.vendor_id
        ).order_by(Bill.generated_at.desc()).all()
    else:
        return []

    # Map to custom response dictionaries
    results = []
    for b in bills:
        results.append({
            "id": b.id,
            "invoice_number": b.invoice_number,
            "order_id": b.order_id,
            "vendor_id": b.vendor_id,
            "vendor_name": b.vendor.name if b.vendor else None,
            "department_id": b.department_id,
            "department_label": b.department.label if b.department else None,
            "amount": b.amount,
            "generated_at": b.generated_at.isoformat(),
            "status": b.status,
            "system_generated": b.system_generated
        })
    return results

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
