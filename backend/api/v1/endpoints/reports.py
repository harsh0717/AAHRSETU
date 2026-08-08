from typing import Any, List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User
from backend.models.vendor import Vendor
from backend.models.order import MasterOrder
from backend.models.audit import AuditLog
from backend.repositories.order import OrderRepository
from backend.repositories.vendor import VendorRepository
from backend.repositories.user import UserRepository

router = APIRouter()


@router.get("/system-stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Get global system analytics metrics (Admin-only).
    """
    order_repo = OrderRepository(db)
    vendor_repo = VendorRepository(db)
    user_repo = UserRepository(db)
    
    total_orders = order_repo.get_all_orders_count()
    completed_orders = order_repo.get_completed_orders_count()
    total_revenue = order_repo.get_total_revenue()
    active_vendors = db.query(Vendor).filter(Vendor.status == "open").count()
    
    return {
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "total_revenue": total_revenue,
        "active_vendors": active_vendors
    }


@router.get("/revenue", response_model=List[Dict[str, Any]])
def get_vendor_revenue_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Get vendor-wise revenue split report (Admin-only).
    """
    vendors = db.query(Vendor).all()
    report = []
    for v in vendors:
        # Calculate active items count
        menu_count = len(v.menu_items)
        report.append({
            "vendor_id": v.id,
            "vendor_name": v.name,
            "owner": v.owner_name,
            "status": v.status,
            "revenue": v.revenue,
            "menu_count": menu_count
        })
    return report


@router.get("/department", response_model=List[Dict[str, Any]])
def get_department_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Get department-wise orders and metrics summary (Admin-only).
    """
    user_repo = UserRepository(db)
    depts = user_repo.get_departments()
    
    report = []
    for d in depts:
        orders = db.query(MasterOrder).filter(MasterOrder.department_id == d.id).all()
        total_orders = len(orders)
        completed_orders = sum(1 for o in orders if o.status == "Completed")
        revenue = sum(o.total_bill_amount for o in orders if o.status == "Completed")
        
        report.append({
            "department_id": d.id,
            "department_name": d.name,
            "label": d.label,
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "revenue": revenue
        })
    return report


@router.get("/audit-logs", response_model=List[Dict[str, Any]])
def get_audit_logs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Get paginated institutional transaction logs (Admin-only).
    """
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    report = []
    for l in logs:
        report.append({
            "id": l.id,
            "user_name": l.user.name,
            "role": l.role,
            "department": l.department,
            "action": l.action,
            "old_value": l.old_value,
            "new_value": l.new_value,
            "timestamp": l.timestamp,
            "ip_address": l.ip_address,
            "browser": l.browser
        })
    return report
