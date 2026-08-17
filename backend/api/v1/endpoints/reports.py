from typing import Any, List, Dict, Optional
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


@router.get("/filtered-summary")
def get_filtered_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    status: Optional[str] = None,
    coordinator_id: Optional[int] = None,
    principal_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin", "dcr"]))
) -> Any:
    """
    Get system-wide summary analytics filtered by date, department, vendor, status, coordinator, and principal HOD.
    Real database queries.
    """
    from datetime import datetime
    from backend.models.user import User
    from backend.models.vendor import Vendor
    from backend.models.order import MasterOrder, VendorOrder

    query = db.query(MasterOrder)
    
    if start_date:
        try:
            # support YYYY-MM-DD or full ISO
            if len(start_date) == 10:
                sd = datetime.fromisoformat(f"{start_date}T00:00:00")
            else:
                sd = datetime.fromisoformat(start_date)
            query = query.filter(MasterOrder.created_at >= sd)
        except Exception:
            pass
            
    if end_date:
        try:
            if len(end_date) == 10:
                ed = datetime.fromisoformat(f"{end_date}T23:59:59")
            else:
                ed = datetime.fromisoformat(end_date)
            query = query.filter(MasterOrder.created_at <= ed)
        except Exception:
            pass
            
    if department_id:
        query = query.filter(MasterOrder.department_id == department_id)
        
    if status:
        query = query.filter(MasterOrder.status == status)
        
    if coordinator_id:
        query = query.filter(MasterOrder.created_by_id == coordinator_id)
        
    if principal_id:
        principal = db.query(User).filter(User.id == principal_id, User.role == "principal").first()
        if principal:
            dept_ids = [d.id for d in principal.managed_departments]
            query = query.filter(MasterOrder.department_id.in_(dept_ids))
        else:
            query = query.filter(False)
            
    if vendor_id:
        query = query.join(VendorOrder).filter(VendorOrder.vendor_id == vendor_id)
        
    orders = query.all()
    
    total_orders = len(orders)
    completed_orders = sum(1 for o in orders if o.status == "Completed")
    pending_orders = sum(1 for o in orders if o.status in ["Submitted", "Principal Approved", "DCR Approved", "Vendor Processing", "Vendor Confirmed"])
    rejected_orders = sum(1 for o in orders if o.status in ["Principal Rejected", "DCR Rejected"])
    total_expenditure = sum(o.total_bill_amount for o in orders if o.status == "Completed")
    total_billed = sum(o.total_bill_amount for o in orders if o.status in ["Completed", "Bill Generated"])
    
    # Department-wise split from matched orders
    dept_exp = {}
    for o in orders:
        d_id = o.department_id or "unknown"
        d_name = o.department.name if o.department else "Unknown"
        d_label = o.department.label if o.department else "Unknown"
        if d_id not in dept_exp:
            dept_exp[d_id] = {
                "department_id": d_id,
                "department_name": d_name,
                "label": d_label,
                "total_orders": 0,
                "completed_orders": 0,
                "revenue": 0.0
            }
        dept_exp[d_id]["total_orders"] += 1
        if o.status == "Completed":
            dept_exp[d_id]["completed_orders"] += 1
            dept_exp[d_id]["revenue"] += o.total_bill_amount

    # Vendor-wise split from matched orders
    vendor_rev = {}
    for o in orders:
        vos = o.vendor_orders
        if vendor_id:
            vos = [vo for vo in vos if vo.vendor_id == vendor_id]
        for vo in vos:
            v_id = vo.vendor_id
            v_name = vo.vendor.name if vo.vendor else "Unknown Vendor"
            v_owner = vo.vendor.owner_name if vo.vendor else "Unknown Owner"
            v_status = vo.vendor.status if vo.vendor else "closed"
            if v_id not in vendor_rev:
                vendor_rev[v_id] = {
                    "vendor_id": v_id,
                    "vendor_name": v_name,
                    "owner": v_owner,
                    "status": v_status,
                    "revenue": 0.0,
                    "menu_count": len(vo.vendor.menu_items) if (vo.vendor and vo.vendor.menu_items) else 0
                }
            if o.status == "Completed" or vo.status == "Completed":
                vendor_rev[v_id]["revenue"] += vo.bill_amount
                
    # List of orders matching filters
    orders_list = []
    for o in orders:
        orders_list.append({
            "id": o.id,
            "title": o.title,
            "purpose": o.purpose,
            "department_id": o.department_id,
            "department_label": o.department.label if o.department else "Unknown",
            "created_by_name": o.created_by.name if o.created_by else "Unknown",
            "status": o.status,
            "total_bill_amount": o.total_bill_amount,
            "created_at": o.created_at
        })
        
    return {
        "metrics": {
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "pending_orders": pending_orders,
            "rejected_orders": rejected_orders,
            "total_expenditure": total_expenditure,
            "total_billed": total_billed
        },
        "departments": list(dept_exp.values()),
        "vendors": list(vendor_rev.values()),
        "orders": orders_list
    }
