from typing import Any, List, Dict, Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, case, cast, Float, text
from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User, Department
from backend.models.vendor import Vendor, VendorMenuItem
from backend.models.order import MasterOrder, VendorOrder, VendorOrderItem, ApprovalHistory
from backend.models.audit import AuditLog
from backend.repositories.order import OrderRepository
from backend.repositories.vendor import VendorRepository
from backend.repositories.user import UserRepository
from datetime import datetime, timezone, timedelta
import csv
import io

router = APIRouter()


def parse_date(date_str: Optional[str], end_of_day: bool = False) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        if len(date_str) == 10:
            suffix = 'T23:59:59' if end_of_day else 'T00:00:00'
            return datetime.fromisoformat(f"{date_str}{suffix}")
        return datetime.fromisoformat(date_str)
    except Exception:
        return None


def apply_order_filters(query, start_date=None, end_date=None, department_id=None,
                        vendor_id=None, status=None, coordinator_id=None,
                        principal_id=None, db=None):
    """Apply common filters to a MasterOrder query."""
    if start_date:
        sd = parse_date(start_date)
        if sd:
            query = query.filter(MasterOrder.created_at >= sd)
    if end_date:
        ed = parse_date(end_date, end_of_day=True)
        if ed:
            query = query.filter(MasterOrder.created_at <= ed)
    if department_id:
        query = query.filter(MasterOrder.department_id == department_id)
    if status:
        query = query.filter(MasterOrder.status == status)
    if coordinator_id:
        query = query.filter(MasterOrder.created_by_id == coordinator_id)
    if principal_id and db:
        principal = db.query(User).filter(User.id == principal_id, User.role == 'principal').first()
        if principal:
            dept_ids = [d.id for d in principal.managed_departments]
            query = query.filter(MasterOrder.department_id.in_(dept_ids))
        else:
            query = query.filter(False)
    if vendor_id and db:
        subq = db.query(VendorOrder.master_order_id).filter(VendorOrder.vendor_id == vendor_id).subquery()
        query = query.filter(MasterOrder.id.in_(subq))
    return query


@router.get('/summary')
def get_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    coordinator_id: Optional[int] = Query(None),
    principal_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Global KPI summary — total, completed, pending, rejected, billed expenditure."""
    query = apply_order_filters(
        db.query(MasterOrder), start_date, end_date, department_id,
        vendor_id, status, coordinator_id, principal_id, db
    )
    orders = query.all()

    total = len(orders)
    completed = sum(1 for o in orders if o.status == 'Completed')
    pending = sum(1 for o in orders if o.status in [
        'Sent for Approval', 'Principal Reviewing', 'Principal Approved',
        'DCR Reviewing', 'Vendor Processing', 'Vendor Clarification Required',
        'Coordinator Updated', 'Vendor Confirmed'
    ])
    rejected = sum(1 for o in orders if o.status in ['Principal Rejected', 'DCR Rejected'])
    bill_generated = sum(1 for o in orders if o.status in ['Bill Generated', 'Completed'])
    total_expenditure = sum(o.total_bill_amount for o in orders if o.status == 'Completed')
    total_billed = sum(o.total_bill_amount for o in orders if o.status in ['Completed', 'Bill Generated'])
    avg_order = total_expenditure / completed if completed > 0 else 0

    active_vendors = db.query(Vendor).filter(Vendor.status == 'open', Vendor.active == True).count()
    total_vendors = db.query(Vendor).filter(Vendor.active == True).count()

    return {
        'total_orders': total,
        'completed_orders': completed,
        'pending_orders': pending,
        'rejected_orders': rejected,
        'bill_generated_orders': bill_generated,
        'total_expenditure': round(total_expenditure, 2),
        'total_billed': round(total_billed, 2),
        'avg_order_value': round(avg_order, 2),
        'active_vendors': active_vendors,
        'total_vendors': total_vendors,
    }


@router.get('/departments')
def get_departments_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Department-wise expenditure breakdown."""
    user_repo = UserRepository(db)
    depts = user_repo.get_departments()
    result = []

    for d in depts:
        query = db.query(MasterOrder).filter(MasterOrder.department_id == d.id)
        query = apply_order_filters(query, start_date, end_date, vendor_id=vendor_id, db=db)
        orders = query.all()

        total_orders = len(orders)
        completed = sum(1 for o in orders if o.status == 'Completed')
        pending = sum(1 for o in orders if o.status not in ['Completed', 'Principal Rejected', 'DCR Rejected'])
        rejected = sum(1 for o in orders if o.status in ['Principal Rejected', 'DCR Rejected'])
        expenditure = sum(o.total_bill_amount for o in orders if o.status == 'Completed')
        avg_val = expenditure / completed if completed > 0 else 0

        result.append({
            'department_id': d.id,
            'department_name': d.name,
            'label': d.label,
            'total_orders': total_orders,
            'completed_orders': completed,
            'pending_orders': pending,
            'rejected_orders': rejected,
            'total_expenditure': round(expenditure, 2),
            'avg_order_value': round(avg_val, 2),
        })

    return result


@router.get('/departments/{dept_id}')
def get_department_detail(
    dept_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Single department drill-down with vendor breakdown and monthly trends."""
    orders = apply_order_filters(
        db.query(MasterOrder).filter(MasterOrder.department_id == dept_id),
        start_date, end_date, db=db
    ).all()

    # Vendor breakdown
    vendor_spend: Dict[str, dict] = {}
    for o in orders:
        for vo in o.vendor_orders:
            vid = vo.vendor_id
            vname = vo.vendor.name if vo.vendor else 'Unknown'
            if vid not in vendor_spend:
                vendor_spend[vid] = {'vendor_id': vid, 'vendor_name': vname, 'revenue': 0.0, 'orders': 0}
            vendor_spend[vid]['orders'] += 1
            if o.status in ['Completed', 'Bill Generated']:
                vendor_spend[vid]['revenue'] += vo.bill_amount

    # Monthly breakdown
    monthly: Dict[str, dict] = {}
    for o in orders:
        month_key = o.created_at.strftime('%Y-%m') if o.created_at else 'Unknown'
        if month_key not in monthly:
            monthly[month_key] = {'month': month_key, 'orders': 0, 'expenditure': 0.0}
        monthly[month_key]['orders'] += 1
        if o.status == 'Completed':
            monthly[month_key]['expenditure'] += o.total_bill_amount

    # Top coordinators
    coord_spend: Dict[int, dict] = {}
    for o in orders:
        cid = o.created_by_id
        cname = o.created_by.name if o.created_by else 'Unknown'
        if cid not in coord_spend:
            coord_spend[cid] = {'coordinator_id': cid, 'name': cname, 'orders': 0, 'expenditure': 0.0}
        coord_spend[cid]['orders'] += 1
        if o.status == 'Completed':
            coord_spend[cid]['expenditure'] += o.total_bill_amount

    completed = [o for o in orders if o.status == 'Completed']
    total_exp = sum(o.total_bill_amount for o in completed)

    return {
        'department_id': dept_id,
        'total_orders': len(orders),
        'completed_orders': len(completed),
        'rejected_orders': sum(1 for o in orders if o.status in ['Principal Rejected', 'DCR Rejected']),
        'total_expenditure': round(total_exp, 2),
        'avg_order_value': round(total_exp / len(completed), 2) if completed else 0,
        'vendor_breakdown': sorted(vendor_spend.values(), key=lambda x: x['revenue'], reverse=True),
        'monthly_trend': sorted(monthly.values(), key=lambda x: x['month']),
        'coordinator_breakdown': sorted(coord_spend.values(), key=lambda x: x['expenditure'], reverse=True),
    }


@router.get('/vendors')
def get_vendors_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Vendor performance report."""
    vendors = db.query(Vendor).filter(Vendor.active == True).all()
    result = []

    for v in vendors:
        query = db.query(VendorOrder).filter(VendorOrder.vendor_id == v.id)
        if department_id:
            query = query.join(MasterOrder).filter(MasterOrder.department_id == department_id)
        if start_date:
            sd = parse_date(start_date)
            if sd:
                query = query.join(MasterOrder, isouter=True).filter(MasterOrder.created_at >= sd) if not department_id else query

        vos = query.all()
        total_orders = len(vos)
        completed = sum(1 for vo in vos if vo.status in ['Completed', 'Vendor Confirmed'])
        modified = sum(1 for vo in vos if vo.modification is not None)
        revenue = sum(vo.bill_amount for vo in vos if vo.status in ['Completed', 'Vendor Confirmed'])
        completion_rate = (completed / total_orders * 100) if total_orders > 0 else 0
        avg_val = revenue / completed if completed > 0 else 0
        menu_count = len([m for m in v.menu_items if m.active])
        available_count = len([m for m in v.menu_items if m.available and m.active])

        result.append({
            'vendor_id': v.id,
            'vendor_name': v.name,
            'owner_name': v.owner_name,
            'status': v.status,
            'active': v.active,
            'total_orders': total_orders,
            'completed_orders': completed,
            'modified_orders': modified,
            'revenue': round(revenue, 2),
            'avg_order_value': round(avg_val, 2),
            'completion_rate': round(completion_rate, 1),
            'menu_items': menu_count,
            'available_items': available_count,
        })

    return sorted(result, key=lambda x: x['revenue'], reverse=True)


@router.get('/vendors/{vendor_id}')
def get_vendor_detail(
    vendor_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Single vendor drill-down."""
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail='Vendor not found')

    vos = db.query(VendorOrder).filter(VendorOrder.vendor_id == vendor_id).all()

    # Monthly trend
    monthly: Dict[str, dict] = {}
    for vo in vos:
        mo = vo.master_order
        if not mo:
            continue
        month_key = mo.created_at.strftime('%Y-%m') if mo.created_at else 'Unknown'
        if month_key not in monthly:
            monthly[month_key] = {'month': month_key, 'orders': 0, 'revenue': 0.0}
        monthly[month_key]['orders'] += 1
        if vo.status in ['Completed', 'Vendor Confirmed']:
            monthly[month_key]['revenue'] += vo.bill_amount

    # Top items by quantity
    item_counts: Dict[str, dict] = {}
    for vo in vos:
        for item in (vo.items or []):
            key = item.name
            if key not in item_counts:
                item_counts[key] = {'name': key, 'quantity': 0, 'orders': 0, 'revenue': 0.0}
            item_counts[key]['quantity'] += item.quantity
            item_counts[key]['orders'] += 1
            item_counts[key]['revenue'] += item.quantity * item.price

    completed = sum(1 for vo in vos if vo.status in ['Completed', 'Vendor Confirmed'])
    revenue = sum(vo.bill_amount for vo in vos if vo.status in ['Completed', 'Vendor Confirmed'])

    return {
        'vendor_id': v.id,
        'vendor_name': v.name,
        'status': v.status,
        'total_orders': len(vos),
        'completed_orders': completed,
        'revenue': round(revenue, 2),
        'modification_requests': sum(1 for vo in vos if vo.modification is not None),
        'menu_items': [{'id': m.id, 'name': m.name, 'price': m.price, 'available': m.available, 'category': m.category} for m in v.menu_items if m.active],
        'top_items': sorted(item_counts.values(), key=lambda x: x['quantity'], reverse=True)[:10],
        'monthly_trend': sorted(monthly.values(), key=lambda x: x['month']),
    }


@router.get('/trends')
def get_trends(
    period: str = Query('monthly', description='daily | monthly | yearly'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Time-series order counts and expenditure."""
    query = apply_order_filters(
        db.query(MasterOrder), start_date, end_date, department_id, vendor_id, db=db
    )
    orders = query.all()

    trend: Dict[str, dict] = {}
    for o in orders:
        if not o.created_at:
            continue
        if period == 'daily':
            key = o.created_at.strftime('%Y-%m-%d')
        elif period == 'yearly':
            key = o.created_at.strftime('%Y')
        else:
            key = o.created_at.strftime('%Y-%m')

        if key not in trend:
            trend[key] = {'period': key, 'orders': 0, 'completed': 0, 'expenditure': 0.0, 'rejected': 0}
        trend[key]['orders'] += 1
        if o.status == 'Completed':
            trend[key]['completed'] += 1
            trend[key]['expenditure'] += o.total_bill_amount
        if o.status in ['Principal Rejected', 'DCR Rejected']:
            trend[key]['rejected'] += 1

    return sorted(trend.values(), key=lambda x: x['period'])


@router.get('/items')
def get_popular_items(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    limit: int = Query(10),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Top N most ordered menu items."""
    order_query = apply_order_filters(
        db.query(MasterOrder), start_date, end_date, department_id, vendor_id, db=db
    )
    orders = order_query.all()

    item_stats: Dict[str, dict] = {}
    for o in orders:
        for vo in o.vendor_orders:
            if vendor_id and vo.vendor_id != vendor_id:
                continue
            vname = vo.vendor.name if vo.vendor else 'Unknown'
            for item in (vo.items or []):
                key = f"{vname}::{item.name}"
                if key not in item_stats:
                    item_stats[key] = {
                        'item_name': item.name,
                        'vendor_name': vname,
                        'vendor_id': vo.vendor_id,
                        'total_orders': 0,
                        'total_quantity': 0,
                        'total_revenue': 0.0
                    }
                item_stats[key]['total_orders'] += 1
                item_stats[key]['total_quantity'] += item.quantity
                item_stats[key]['total_revenue'] += item.quantity * item.price

    sorted_items = sorted(item_stats.values(), key=lambda x: x['total_quantity'], reverse=True)
    return [{'rank': i + 1, **item} for i, item in enumerate(sorted_items[:limit])]


@router.get('/approval-time')
def get_approval_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Approval stage timing analytics."""
    query = apply_order_filters(
        db.query(MasterOrder), start_date, end_date, db=db
    )
    orders = query.all()

    creation_to_principal: List[float] = []
    principal_to_dcr: List[float] = []
    dcr_to_vendor: List[float] = []
    total_processing: List[float] = []

    for o in orders:
        history_map: Dict[str, datetime] = {}
        for h in (o.history or []):
            action_key = h.action
            if action_key not in history_map:
                history_map[action_key] = h.timestamp

        created_ts = history_map.get('Order Created') or o.created_at
        submitted_ts = history_map.get('Submitted for Approval')
        principal_ts = history_map.get('Principal Approved') or history_map.get('Principal Review: APPROVE')
        dcr_ts = history_map.get('DCR Approved') or history_map.get('DCR Review: APPROVE')
        completed_ts = o.bill_generated_at or history_map.get('Completed')

        def hours_between(a, b):
            if a and b:
                a = a.replace(tzinfo=timezone.utc) if a.tzinfo is None else a
                b = b.replace(tzinfo=timezone.utc) if b.tzinfo is None else b
                diff = (b - a).total_seconds() / 3600
                return diff if diff >= 0 else None
            return None

        h1 = hours_between(created_ts, principal_ts)
        h2 = hours_between(principal_ts, dcr_ts)
        h3 = hours_between(dcr_ts, completed_ts)
        h_total = hours_between(created_ts, completed_ts)

        if h1 is not None: creation_to_principal.append(h1)
        if h2 is not None: principal_to_dcr.append(h2)
        if h3 is not None: dcr_to_vendor.append(h3)
        if h_total is not None: total_processing.append(h_total)

    def compute_stats(times: List[float]) -> dict:
        if not times:
            return {'avg': None, 'min': None, 'max': None, 'count': 0}
        return {
            'avg': round(sum(times) / len(times), 1),
            'min': round(min(times), 1),
            'max': round(max(times), 1),
            'count': len(times)
        }

    return {
        'submission_to_principal': compute_stats(creation_to_principal),
        'principal_to_dcr': compute_stats(principal_to_dcr),
        'dcr_to_completion': compute_stats(dcr_to_vendor),
        'total_processing': compute_stats(total_processing),
    }


@router.get('/funnel')
def get_order_funnel(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Order status funnel counts."""
    query = apply_order_filters(db.query(MasterOrder), start_date, end_date, db=db)
    orders = query.all()

    STATUS_GROUPS = [
        ('Created / Draft', ['Created', 'Draft']),
        ('Submitted for Approval', ['Sent for Approval', 'Principal Reviewing']),
        ('Principal Approved', ['Principal Approved']),
        ('DCR Approved / Processing', ['DCR Approved', 'DCR Reviewing', 'Vendor Processing', 'Vendor Clarification Required', 'Coordinator Updated']),
        ('Vendor Confirmed', ['Vendor Confirmed']),
        ('Completed / Billed', ['Completed', 'Bill Generated']),
        ('Rejected', ['Principal Rejected', 'DCR Rejected']),
    ]

    result = []
    total = len(orders)
    for label, statuses in STATUS_GROUPS:
        count = sum(1 for o in orders if o.status in statuses)
        result.append({
            'stage': label,
            'count': count,
            'pct': round(count / total * 100, 1) if total > 0 else 0
        })

    return result


@router.get('/department-vendor-matrix')
def get_dept_vendor_matrix(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin']))
) -> Any:
    """Department x Vendor spending matrix."""
    user_repo = UserRepository(db)
    depts = user_repo.get_departments()
    vendors = db.query(Vendor).filter(Vendor.active == True).all()

    query = apply_order_filters(db.query(MasterOrder), start_date, end_date, db=db)
    orders = query.all()

    # Build matrix
    matrix: Dict[str, Dict[str, float]] = {}
    for d in depts:
        matrix[d.id] = {'dept_id': d.id, 'dept_name': d.name, 'dept_label': d.label}
        for v in vendors:
            matrix[d.id][v.id] = 0.0

    for o in orders:
        if not o.department_id or o.department_id not in matrix:
            continue
        for vo in o.vendor_orders:
            if vo.vendor_id in matrix[o.department_id] and o.status in ['Completed', 'Bill Generated']:
                matrix[o.department_id][vo.vendor_id] += vo.bill_amount

    return {
        'vendors': [{'id': v.id, 'name': v.name} for v in vendors],
        'rows': list(matrix.values()),
    }


@router.get('/export')
def export_report(
    format: str = Query('csv'),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    vendor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    coordinator_id: Optional[int] = Query(None),
    principal_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin']))
):
    """Export filtered orders as CSV."""
    query = apply_order_filters(
        db.query(MasterOrder), start_date, end_date, department_id,
        vendor_id, status, coordinator_id, principal_id, db
    )
    orders = query.order_by(MasterOrder.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Order ID', 'Title', 'Department', 'Coordinator', 'Status',
        'Created Date', 'Total Bill Amount (₹)', 'Vendors'
    ])

    for o in orders:
        dept_name = o.department.label if o.department else 'N/A'
        coord_name = o.created_by.name if o.created_by else 'N/A'
        vendor_names = ', '.join(set(vo.vendor.name for vo in o.vendor_orders if vo.vendor))
        created_str = o.created_at.strftime('%Y-%m-%d %H:%M') if o.created_at else 'N/A'
        writer.writerow([
            o.id, o.title, dept_name, coord_name, o.status,
            created_str, f'{o.total_bill_amount:.2f}', vendor_names
        ])

    output.seek(0)
    filename = f'aharsetu_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


# --- Keep legacy endpoints for backward compatibility ---

@router.get('/system-stats')
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin']))
) -> Any:
    """Get global system analytics metrics (Admin-only)."""
    order_repo = OrderRepository(db)
    vendor_repo = VendorRepository(db)
    user_repo = UserRepository(db)
    total_orders = order_repo.get_all_orders_count()
    completed_orders = order_repo.get_completed_orders_count()
    total_revenue = order_repo.get_total_revenue()
    active_vendors = db.query(Vendor).filter(Vendor.status == 'open').count()
    return {
        'total_orders': total_orders,
        'completed_orders': completed_orders,
        'total_revenue': total_revenue,
        'active_vendors': active_vendors
    }


@router.get('/revenue')
def get_vendor_revenue_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin']))
) -> Any:
    """Vendor-wise revenue split (legacy)."""
    vendors = db.query(Vendor).all()
    return [{
        'vendor_id': v.id,
        'vendor_name': v.name,
        'owner': v.owner_name,
        'status': v.status,
        'revenue': v.revenue,
        'menu_count': len(v.menu_items)
    } for v in vendors]


@router.get('/department')
def get_department_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin']))
) -> Any:
    """Department-wise orders summary (legacy)."""
    user_repo = UserRepository(db)
    depts = user_repo.get_departments()
    result = []
    for d in depts:
        orders = db.query(MasterOrder).filter(MasterOrder.department_id == d.id).all()
        completed = sum(1 for o in orders if o.status == 'Completed')
        revenue = sum(o.total_bill_amount for o in orders if o.status == 'Completed')
        result.append({
            'department_id': d.id,
            'department_name': d.name,
            'label': d.label,
            'total_orders': len(orders),
            'completed_orders': completed,
            'revenue': revenue
        })
    return result


@router.get('/audit-logs')
def get_audit_logs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.check_role(['admin']))
) -> Any:
    """Paginated audit logs."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return [{
        'id': l.id,
        'user_name': l.user.name,
        'role': l.role,
        'department': l.department,
        'action': l.action,
        'old_value': l.old_value,
        'new_value': l.new_value,
        'timestamp': l.timestamp,
        'ip_address': l.ip_address,
        'browser': l.browser
    } for l in logs]


@router.get('/filtered-summary')
def get_filtered_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    status: Optional[str] = None,
    coordinator_id: Optional[int] = None,
    principal_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(['admin', 'dcr']))
) -> Any:
    """Comprehensive filtered report (legacy combined endpoint)."""
    query = apply_order_filters(
        db.query(MasterOrder), start_date, end_date, department_id,
        vendor_id, status, coordinator_id, principal_id, db
    )
    orders = query.all()

    total_orders = len(orders)
    completed_orders = sum(1 for o in orders if o.status == 'Completed')
    pending_orders = sum(1 for o in orders if o.status in [
        'Sent for Approval', 'Principal Reviewing', 'Principal Approved',
        'DCR Reviewing', 'Vendor Processing', 'Vendor Confirmed'
    ])
    rejected_orders = sum(1 for o in orders if o.status in ['Principal Rejected', 'DCR Rejected'])
    total_expenditure = sum(o.total_bill_amount for o in orders if o.status == 'Completed')
    total_billed = sum(o.total_bill_amount for o in orders if o.status in ['Completed', 'Bill Generated'])

    dept_exp: Dict[str, dict] = {}
    for o in orders:
        d_id = o.department_id or 'unknown'
        d_name = o.department.name if o.department else 'Unknown'
        d_label = o.department.label if o.department else 'Unknown'
        if d_id not in dept_exp:
            dept_exp[d_id] = {'department_id': d_id, 'department_name': d_name, 'label': d_label,
                               'total_orders': 0, 'completed_orders': 0, 'revenue': 0.0}
        dept_exp[d_id]['total_orders'] += 1
        if o.status == 'Completed':
            dept_exp[d_id]['completed_orders'] += 1
            dept_exp[d_id]['revenue'] += o.total_bill_amount

    vendor_rev: Dict[str, dict] = {}
    for o in orders:
        for vo in o.vendor_orders:
            if vendor_id and vo.vendor_id != vendor_id:
                continue
            v_id = vo.vendor_id
            v_name = vo.vendor.name if vo.vendor else 'Unknown'
            if v_id not in vendor_rev:
                vendor_rev[v_id] = {'vendor_id': v_id, 'vendor_name': v_name,
                                     'owner': vo.vendor.owner_name if vo.vendor else '',
                                     'status': vo.vendor.status if vo.vendor else 'closed',
                                     'revenue': 0.0,
                                     'menu_count': len(vo.vendor.menu_items) if vo.vendor else 0}
            if o.status in ['Completed', 'Bill Generated']:
                vendor_rev[v_id]['revenue'] += vo.bill_amount

    orders_list = [{
        'id': o.id, 'title': o.title, 'purpose': o.purpose,
        'department_id': o.department_id,
        'department_label': o.department.label if o.department else 'Unknown',
        'created_by_name': o.created_by.name if o.created_by else 'Unknown',
        'status': o.status, 'total_bill_amount': o.total_bill_amount,
        'created_at': o.created_at
    } for o in orders]

    return {
        'metrics': {
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'pending_orders': pending_orders,
            'rejected_orders': rejected_orders,
            'total_expenditure': total_expenditure,
            'total_billed': total_billed
        },
        'departments': list(dept_exp.values()),
        'vendors': list(vendor_rev.values()),
        'orders': orders_list
    }
