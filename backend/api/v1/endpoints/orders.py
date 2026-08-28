from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User
from backend.repositories.order import OrderRepository
from backend.schemas.order import (
    MasterOrderResponse, MasterOrderCreate, ApprovalPayload,
    VendorOrderResponse, ModificationPayload
)
from backend.services.order import OrderService
from backend.services.billing import BillingService
from backend.services.notification import NotificationService
from backend.lib.seed_db import seed_all_database

router = APIRouter()


@router.get("", response_model=List[MasterOrderResponse])
def read_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve orders filtered by role access.
    - Coordinator: Only their department orders
    - Principal: Only departments they oversee
    - DCR / Admin: All orders
    - Vendor: Only orders containing their vendor id
    """
    order_repo = OrderRepository(db)
    role = current_user.role
    
    if role == "coordinator":
        orders = order_repo.get_by_coordinator(current_user.id, current_user.department_id)
    elif role == "principal":
        dept_ids = [d.id for d in current_user.managed_departments]
        if current_user.department_id and current_user.department_id not in dept_ids:
            dept_ids.append(current_user.department_id)
        orders = order_repo.get_by_departments(dept_ids, principal_id=current_user.id)
    elif role == "vendor":
        orders = order_repo.get_by_vendor(current_user.vendor_id)
    else:
        # DCR and Admin see all orders
        orders = order_repo.get_multi()
        
    # Map raw models to response list to handle relationships
    response = []
    for o in orders:
        vendor_orders_resp = []
        master_calc_total = 0.0
        for vo in o.vendor_orders:
            # Skip for vendor if it's not their sub-order
            if role == "vendor" and vo.vendor_id != current_user.vendor_id:
                continue
                
            items_resp = [
                {
                    "id": item.id,
                    "vendor_order_id": item.vendor_order_id,
                    "name": item.name,
                    "quantity": item.quantity,
                    "price": item.price,
                    "unit": item.unit,
                    "menu_item_id": item.menu_item_id
                } for item in vo.items
            ]
            
            mod_resp = None
            if vo.modification:
                mod_resp = {
                    "id": vo.modification.id,
                    "vendor_order_id": vo.modification.vendor_order_id,
                    "reason": vo.modification.reason,
                    "type": vo.modification.type,
                    "requested_at": vo.modification.requested_at,
                    "status": vo.modification.status
                }
            
            calc_vo_amount = sum(float(item.price or 0.0) * int(item.quantity or 0) for item in vo.items)
            display_vo_amount = vo.bill_amount if (vo.bill_amount and vo.bill_amount > 0.0) else calc_vo_amount
            master_calc_total += display_vo_amount
                
            vendor_orders_resp.append(
                VendorOrderResponse(
                    id=vo.id,
                    master_order_id=vo.master_order_id,
                    vendor_id=vo.vendor_id,
                    vendor_name=vo.vendor.name,
                    status=vo.status,
                    bill_amount=display_vo_amount,
                    invoice_number=vo.invoice_number,
                    items=items_resp,
                    modification=mod_resp
                )
            )
            
        history_resp = [
            {
                "id": h.id,
                "master_order_id": h.master_order_id,
                "action": h.action,
                "role": h.role,
                "user_name": h.user.name,
                "remarks": h.remarks,
                "timestamp": h.timestamp
            } for h in o.history
        ]
        
        display_master_total = o.total_bill_amount if (o.total_bill_amount and o.total_bill_amount > 0.0) else master_calc_total
        
        response.append(
            MasterOrderResponse(
                id=o.id,
                title=o.title,
                purpose=o.purpose,
                department_id=o.department_id,
                department_label=o.department.label if o.department else None,
                created_by_id=o.created_by_id,
                created_by_name=o.created_by.name,
                status=o.status,
                total_bill_amount=display_master_total,
                bill_generated_at=o.bill_generated_at,
                created_at=o.created_at,
                updated_at=o.updated_at,
                vendor_orders=vendor_orders_resp,
                history=history_resp
            )
        )
    return response


@router.get("/verify-invoice/{invoice_no}")
def verify_invoice(invoice_no: str, db: Session = Depends(get_db)) -> Any:
    """
    Public endpoint to verify an invoice and return non-sensitive details.
    """
    from backend.models.order import MasterOrder, VendorOrder
    
    # 1. Try to find VendorOrder by explicit invoice_number column
    v_order = db.query(VendorOrder).filter(VendorOrder.invoice_number == invoice_no).first()
    
    master_order = None
    vendor_order = None
    
    if v_order:
        vendor_order = v_order
        master_order = v_order.master_order
    else:
        # Parse canonical patterns
        # Master: INV-ORD-XXX-MASTER
        # Vendor: INV-ORD-XXX-VYYYY
        upper_no = invoice_no.upper()
        if upper_no.startswith("INV-") and upper_no.endswith("-MASTER"):
            order_id = upper_no[4:-7]
            master_order = db.query(MasterOrder).filter(MasterOrder.id == order_id).first()
        elif upper_no.startswith("INV-"):
            parts = upper_no.split("-")
            if len(parts) >= 4:
                order_id = f"{parts[1]}-{parts[2]}"
                vendor_id = parts[3].lower()
                master_order = db.query(MasterOrder).filter(MasterOrder.id == order_id).first()
                if master_order:
                    vendor_order = db.query(VendorOrder).filter(
                        VendorOrder.master_order_id == order_id,
                        VendorOrder.vendor_id == vendor_id
                    ).first()
                    
    if not master_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice/Order not found")
        
    items = []
    if vendor_order:
        for item in vendor_order.items:
            items.append({
                "name": item.name,
                "quantity": item.quantity,
                "price": item.price,
                "subtotal": item.price * item.quantity
            })
        total_amount = vendor_order.bill_amount
        vendor_name = vendor_order.vendor.name if vendor_order.vendor else "Canteen Vendor"
    else:
        for vo in master_order.vendor_orders:
            for item in vo.items:
                items.append({
                    "name": item.name,
                    "quantity": item.quantity,
                    "price": item.price,
                    "subtotal": item.price * item.quantity,
                    "vendor": vo.vendor.name if vo.vendor else "Canteen"
                })
        total_amount = master_order.total_bill_amount
        vendor_name = "All Campus Canteens (Master Invoice)"
        
    return {
        "invoice_number": invoice_no,
        "order_reference": master_order.id,
        "title": master_order.title,
        "purpose": master_order.purpose,
        "department_name": master_order.department.name if master_order.department else "General Department",
        "vendor_name": vendor_name,
        "total_amount": total_amount,
        "date": master_order.created_at.strftime("%d %b %Y"),
        "status": "GENUINE",
        "issuer": "AharSetu ERP Institutional Billing System",
        "items": items,
        "order_status": master_order.status
    }


@router.get("/{order_id}", response_model=MasterOrderResponse)
def read_order_by_id(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get master order by ID with details.
    """
    order_repo = OrderRepository(db)
    o = order_repo.get_by_id(order_id)
    if not o:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
        
    role = current_user.role

    # Enforce IDOR protection: Coordinators, Principals, & Vendors can only view authorized orders
    if role == "coordinator":
        if o.created_by_id != current_user.id and (current_user.department_id and o.department_id != current_user.department_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this department's order"
            )
    elif role == "principal":
        managed_ids = [d.id for d in current_user.managed_departments]
        if o.department_id not in managed_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this department's order"
            )
    elif role == "vendor":
        vendor_match = any(vo.vendor_id == current_user.vendor_id for vo in o.vendor_orders)
        if not vendor_match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this vendor order"
            )

    vendor_orders_resp = []
    master_calc_total = 0.0
    for vo in o.vendor_orders:
        if role == "vendor" and vo.vendor_id != current_user.vendor_id:
            continue
            
        items_resp = [
            {
                "id": item.id,
                "vendor_order_id": item.vendor_order_id,
                "name": item.name,
                "quantity": item.quantity,
                "price": item.price,
                "unit": item.unit,
                "menu_item_id": item.menu_item_id
            } for item in vo.items
        ]
        
        mod_resp = None
        if vo.modification:
            mod_resp = {
                "id": vo.modification.id,
                "vendor_order_id": vo.modification.vendor_order_id,
                "reason": vo.modification.reason,
                "type": vo.modification.type,
                "requested_at": vo.modification.requested_at,
                "status": vo.modification.status
            }
            
        calc_vo_amount = sum(float(item.price or 0.0) * int(item.quantity or 0) for item in vo.items)
        display_vo_amount = vo.bill_amount if (vo.bill_amount and vo.bill_amount > 0.0) else calc_vo_amount
        master_calc_total += display_vo_amount

        vendor_orders_resp.append(
            VendorOrderResponse(
                id=vo.id,
                master_order_id=vo.master_order_id,
                vendor_id=vo.vendor_id,
                vendor_name=vo.vendor.name,
                status=vo.status,
                bill_amount=display_vo_amount,
                invoice_number=vo.invoice_number,
                items=items_resp,
                modification=mod_resp
            )
        )
        
    history_resp = [
        {
            "id": h.id,
            "master_order_id": h.master_order_id,
            "action": h.action,
            "role": h.role,
            "user_name": h.user.name,
            "remarks": h.remarks,
            "timestamp": h.timestamp
        } for h in o.history
    ]
    
    display_master_total = o.total_bill_amount if (o.total_bill_amount and o.total_bill_amount > 0.0) else master_calc_total

    return MasterOrderResponse(
        id=o.id,
        title=o.title,
        purpose=o.purpose,
        department_id=o.department_id,
        department_label=o.department.label if o.department else None,
        created_by_id=o.created_by_id,
        created_by_name=o.created_by.name,
        status=o.status,
        total_bill_amount=display_master_total,
        bill_generated_at=o.bill_generated_at,
        created_at=o.created_at,
        updated_at=o.updated_at,
        vendor_orders=vendor_orders_resp,
        history=history_resp
    )


@router.post("", response_model=MasterOrderResponse)
async def create_order(
    payload: MasterOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["coordinator", "principal"]))
) -> Any:
    """
    Submit a split order containing multiple vendor items.
    """
    if current_user.role == "principal":
        managed_dept_ids = [d.id for d in current_user.managed_departments]
        if not payload.department_id or payload.department_id not in managed_dept_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create requisitions for departments you manage."
            )

    order_service = OrderService(db)
    items_in = [{"menu_item_id": i.menu_item_id, "quantity": i.quantity} for i in payload.items]
    try:
        order = order_service.create_order(
            creator=current_user,
            title=payload.title,
            purpose=payload.purpose,
            items_in=items_in,
            department_id=payload.department_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    # Notify DCR or Principal immediately on creation
    try:
        notif_service = NotificationService(db)
        if current_user.role == "principal":
            await notif_service.create_and_send_notification(
                msg_key="order_submitted",
                params={"title": order.title},
                msg_type="order_submitted",
                recipient_role="dcr",
                order_id=order.id
            )
        else:
            await notif_service.create_and_send_notification(
                msg_key="new_order",
                params={"dept": order.department.name if order.department else "Coordinator", "title": order.title},
                msg_type="new_order",
                recipient_role="principal",
                order_id=order.id
            )
    except Exception as e:
        print(f"[ERROR] Failed to send order creation notification: {e}")

    # Audit log order creation
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Order Created",
        new_value=f"Order ID: {order.id}, Title: {order.title}"
    )
    return read_order_by_id(order.id, db, current_user)


@router.put("/{order_id}", response_model=MasterOrderResponse)
async def update_order(
    order_id: str,
    payload: MasterOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["coordinator", "principal", "admin"]))
) -> Any:
    """
    Update a requisition before DCR final approval.
    Allows correcting items, quantities, title, and purpose.
    """
    order_service = OrderService(db)
    items_in = [{"menu_item_id": i.menu_item_id, "quantity": i.quantity} for i in payload.items]
    try:
        order = order_service.update_order(
            order_id=order_id,
            title=payload.title,
            purpose=payload.purpose,
            items_in=items_in,
            user=current_user,
            department_id=payload.department_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Audit log order update
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Order Edited",
        new_value=f"Order ID: {order.id}, Items count: {len(items_in)}"
    )

    # Broadcast WebSocket update
    try:
        from backend.services.websocket import manager
        await manager.broadcast({"type": "ORDER_UPDATED", "order_id": order.id, "status": order.status})
    except Exception as e:
        print(f"[WS] Broadcast error on order edit: {e}")

    return read_order_by_id(order.id, db, current_user)


@router.post("/{order_id}/cancel", response_model=MasterOrderResponse)
async def cancel_order(
    order_id: str,
    payload: Dict[str, Any] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["coordinator", "principal", "admin"]))
) -> Any:
    """
    Cancel a requisition before DCR final clearance.
    """
    reason = (payload or {}).get("reason") or "Cancelled by user"
    order_service = OrderService(db)
    try:
        order = order_service.cancel_order(
            order_id=order_id,
            user=current_user,
            reason=reason
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Notify Principal & DCR
    try:
        notif_service = NotificationService(db)
        await notif_service.create_and_send_notification(
            msg_key="order_cancelled",
            params={"title": order.title},
            msg_type="order_cancelled",
            recipient_role="principal",
            order_id=order.id
        )
    except Exception as e:
        print(f"[ERROR] Failed to send cancel notification: {e}")

    # Audit log order cancellation
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Order Cancelled",
        new_value=f"Order ID: {order.id}, Reason: {reason}"
    )

    # Broadcast WebSocket update
    try:
        from backend.services.websocket import manager
        await manager.broadcast({"type": "ORDER_UPDATED", "order_id": order.id, "status": order.status})
    except Exception as e:
        print(f"[WS] Broadcast error on order cancel: {e}")

    return read_order_by_id(order.id, db, current_user)


@router.post("/{order_id}/submit", response_model=MasterOrderResponse)
async def submit_for_approval(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["coordinator", "principal"]))
) -> Any:
    """
    Submit a created order.
    Fires WebSocket alerts to DCR (if submitted by Principal) or supervising Principal (if submitted by Coordinator).
    """
    order_service = OrderService(db)
    order = order_service.submit_for_approval(order_id, current_user)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order not found or not in draft status"
        )
        
    # Notify DCR or Principal
    notif_service = NotificationService(db)
    if current_user.role == "principal":
        await notif_service.create_and_send_notification(
            msg_key="order_submitted",
            params={"title": order.title},
            msg_type="order_submitted",
            recipient_role="dcr",
            order_id=order.id
        )
    else:
        await notif_service.create_and_send_notification(
            msg_key="new_order",
            params={"dept": order.department.name if order.department else "Coordinator", "title": order.title},
            msg_type="new_order",
            recipient_role="principal",
            order_id=order.id
        )
    
    # Audit log order submission
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Order Submitted for Approval" if current_user.role != "principal" else "Principal Approved",
        old_value="Created",
        new_value=order.status
    )
    await notif_service.notify_order_updated(order.id)
    return read_order_by_id(order.id, db, current_user)


@router.post("/{order_id}/principal-review", response_model=MasterOrderResponse)
async def principal_review(
    order_id: str,
    payload: ApprovalPayload,
    action: str, # approve, reject
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["principal"]))
) -> Any:
    """
    Principal review (approve or reject).
    Triggers WebSocket alerts to DCR (on approval) or Coordinator (on rejection).
    """
    if action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be approve or reject."
        )
        
    order_service = OrderService(db)
    order = order_service.principal_review(order_id, action, payload.remarks, current_user)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order not found or not awaiting Principal review"
        )
        
    # Send WebSockets
    notif_service = NotificationService(db)
    if action == "approve":
        # Notify DCR
        await notif_service.create_and_send_notification(
            msg_key="approved",
            params={"title": order.title},
            msg_type="approved",
            recipient_role="dcr",
            order_id=order.id
        )
    else:
        # Notify Coordinator
        await notif_service.create_and_send_notification(
            msg_key="rejected",
            params={"title": order.title, "remarks": payload.remarks},
            msg_type="rejected",
            recipient_id=order.created_by_id,
            order_id=order.id
        )
        
    # Audit log principal review decision
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action=f"Principal Review: {action.upper()}",
        new_value=f"Order ID: {order.id}, Remarks: {payload.remarks}"
    )
    await notif_service.notify_order_updated(order.id)
    return read_order_by_id(order.id, db, current_user)


@router.post("/{order_id}/dcr-review", response_model=MasterOrderResponse)
async def dcr_review(
    order_id: str,
    payload: ApprovalPayload,
    action: str, # approve, reject
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["dcr"]))
) -> Any:
    """
    DCR audit (approve or reject).
    Triggers WebSocket alerts to vendors (on approval) or Coordinator (on rejection).
    """
    if action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be approve or reject."
        )
        
    order_service = OrderService(db)
    order = order_service.dcr_review(order_id, action, payload.remarks, current_user)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order not found or not awaiting DCR review"
        )
        
    notif_service = NotificationService(db)
    if action == "approve":
        # DCR approved forwards to all vendors. Notify each vendor.
        for vo in order.vendor_orders:
            # Fetch vendor user profiles to notify
            vendor_users = db.query(User).filter(User.role == "vendor", User.vendor_id == vo.vendor_id).all()
            for vu in vendor_users:
                await notif_service.create_and_send_notification(
                    msg_key="new_order",
                    params={"dept": order.department.name if order.department else "DCR", "title": order.title},
                    msg_type="new_order",
                    recipient_id=vu.id,
                    order_id=order.id,
                    vendor_order_id=vo.id
                )
    else:
        # Notify Coordinator of rejection
        await notif_service.create_and_send_notification(
            msg_key="rejected",
            params={"title": order.title, "remarks": payload.remarks},
            msg_type="rejected",
            recipient_id=order.created_by_id,
            order_id=order.id
        )
        
    # Audit log DCR review decision
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action=f"DCR Review: {action.upper()}",
        new_value=f"Order ID: {order.id}, Remarks: {payload.remarks}"
    )
    await notif_service.notify_order_updated(order.id)
    return read_order_by_id(order.id, db, current_user)


@router.post("/vendor-order/{vendor_order_id}/pricing", response_model=MasterOrderResponse)
async def set_vendor_pricing(
    vendor_order_id: str,
    prices: Dict[str, float],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["vendor", "admin"]))
) -> Any:
    """
    Vendor Pricing confirmation.
    Triggers BillingService auto bill generator when all vendors confirm.
    """
    billing_service = BillingService(db)
    vo = await billing_service.set_vendor_prices(vendor_order_id, prices, current_user.name)
    if not vo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor order not found or not in Processing status"
        )
        
    # Notify Coordinator if master invoice was automatically generated
    if vo.master_order.status == "Completed":
        notif_service = NotificationService(db)
        await notif_service.create_and_send_notification(
            msg_key="bill_generated",
            params={"title": vo.master_order.title, "amount": vo.master_order.total_bill_amount},
            msg_type="bill",
            recipient_id=vo.master_order.created_by_id,
            order_id=vo.master_order_id
        )
        await notif_service.create_and_send_notification(
            msg_key="completed",
            params={"title": vo.master_order.title},
            msg_type="completed",
            recipient_id=vo.master_order.created_by_id,
            order_id=vo.master_order_id
        )
        
    # Audit log pricing confirmation
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Vendor Sub-Order Pricing Confirmed",
        new_value=f"Sub-order ID: {vo.id}, Bill Amount: {vo.bill_amount}"
    )
    notif_service = NotificationService(db)
    await notif_service.notify_order_updated(vo.master_order_id)
    return read_order_by_id(vo.master_order_id, db, current_user)


@router.post("/vendor-order/{vendor_order_id}/reject", response_model=MasterOrderResponse)
async def reject_vendor_order_endpoint(
    vendor_order_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["vendor", "admin"]))
) -> Any:
    """
    Vendor rejects sub-order (or admin does on vendor's behalf).
    """
    from backend.models.order import ApprovalHistory
    order_repo = OrderRepository(db)
    vo = order_repo.get_vendor_order(vendor_order_id)
    if not vo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor order not found"
        )
    reason = payload.get("reason", "Vendor unable to fulfill kitchen order.")
    vo.status = "Vendor Rejected"
    vo.bill_amount = 0.0
    
    master = vo.master_order
    now = datetime.now(timezone.utc)
    vo.updated_at = now
    
    active_vos = [v for v in master.vendor_orders if v.status != "Vendor Rejected"]
    confirmed_vos = [v for v in master.vendor_orders if v.status == "Vendor Confirmed"]
    
    if len(active_vos) == 0:
        master.status = "Vendor Rejected"
    elif len(confirmed_vos) > 0 and len(confirmed_vos) == len(active_vos):
        master.status = "Completed"
        master.bill_generated_at = now
        master.total_bill_amount = sum(v.bill_amount for v in confirmed_vos)
    else:
        master.status = "Vendor Processing"
        
    master.updated_at = now
    
    order_repo.create_history_entry(
        ApprovalHistory(
            master_order_id=master.id,
            action="Vendor Rejected Sub-Order",
            role="vendor",
            user_id=current_user.id,
            remarks=f"Sub-order rejected by {vo.vendor.name if vo.vendor else 'Vendor'}. Reason: {reason}"
        )
    )
    db.commit()
    db.refresh(master)
    
    notif_service = NotificationService(db)
    await notif_service.create_and_send_notification(
        msg_key="rejected",
        params={"title": master.title, "reason": reason},
        msg_type="rejected",
        recipient_id=master.created_by_id,
        order_id=master.id
    )
    await notif_service.notify_order_updated(master.id)
    return read_order_by_id(master.id, db, current_user)


@router.post("/vendor-order/{vendor_order_id}/modification", response_model=MasterOrderResponse)
async def request_vendor_modification(
    vendor_order_id: str,
    payload: ModificationPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["vendor"]))
) -> Any:
    """
    Vendor requests order modification.
    Alerts Coordinator via WebSockets.
    """
    order_service = OrderService(db)
    vo = order_service.request_vendor_modification(
        vendor_order_id=vendor_order_id,
        reason=payload.reason,
        mod_type=payload.type,
        user=current_user
    )
    if not vo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor order not found or not in processing"
        )
        
    # Notify Coordinator
    notif_service = NotificationService(db)
    await notif_service.create_and_send_notification(
        msg_key="mod_requested",
        params={"vendor": current_user.name, "title": vo.master_order.title},
        msg_type="modification",
        recipient_id=vo.master_order.created_by_id,
        order_id=vo.master_order_id,
        vendor_order_id=vo.id
    )
    
    # Audit log modification request
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Vendor Order Modification Requested",
        new_value=f"Sub-order ID: {vo.id}, Reason: {payload.reason}, Type: {payload.type}"
    )
    await notif_service.notify_order_updated(vo.master_order_id)
    return read_order_by_id(vo.master_order_id, db, current_user)


@router.post("/vendor-order/{vendor_order_id}/resolve-mod", response_model=MasterOrderResponse)
async def resolve_modification(
    vendor_order_id: str,
    resolution: str, # accept, reject
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["coordinator"]))
) -> Any:
    """
    Coordinator resolves vendor modification (Accept/Reject).
    If major modification accepted, resets order to Principal review.
    """
    if resolution not in ["accept", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid resolution. Must be accept or reject."
        )
        
    order_service = OrderService(db)
    master = order_service.resolve_modification(vendor_order_id, resolution, current_user)
    if not master:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor order not found or has no pending modification"
        )
        
    # Notify Vendor of decision
    vo = order_service.order_repo.get_vendor_order(vendor_order_id)
    vendor_users = db.query(User).filter(User.role == "vendor", User.vendor_id == vo.vendor_id).all()
    
    notif_service = NotificationService(db)
    for vu in vendor_users:
        await notif_service.create_and_send_notification(
            msg_key="approved" if resolution == "accept" else "rejected",
            params={"title": f"Modification request for {master.title}"},
            msg_type="info",
            recipient_id=vu.id,
            order_id=master.id,
            vendor_order_id=vo.id
        )
        
    # Notify Principal if status was set back to Sent for Approval
    if master.status == "Sent for Approval":
        await notif_service.create_and_send_notification(
            msg_key="new_order",
            params={"dept": master.department.name if master.department else "Coordinator", "title": f"Re-approval: {master.title}"},
            msg_type="new_order",
            recipient_role="principal",
            order_id=master.id
        )
        
    # Audit log resolved modification
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action=f"Modification Resolved: {resolution.upper()}",
        new_value=f"Sub-order ID: {vendor_order_id}, Master Order ID: {master.id}"
    )
    notif_service = NotificationService(db)
    await notif_service.notify_order_updated(master.id)
    return read_order_by_id(master.id, db, current_user)


@router.post("/{order_id}/complete", response_model=MasterOrderResponse)
async def complete_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Admin completes an order.
    Alerts Coordinator of closure.
    """
    billing_service = BillingService(db)
    order = billing_service.complete_order(order_id, current_user.id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order not found or not in Bill Generated status"
        )
        
    # Notify Coordinator
    notif_service = NotificationService(db)
    await notif_service.create_and_send_notification(
        msg_key="completed",
        params={"title": order.title},
        msg_type="info",
        recipient_id=order.created_by_id,
        order_id=order.id
    )
    
    # Audit log completed order
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Order Completed & Settled",
        new_value=f"Master Order ID: {order.id}, Total Revenue: {order.total_bill_amount}"
    )
    await notif_service.notify_order_updated(order.id)
    return read_order_by_id(order.id, db, current_user)


@router.post("/clear-all", status_code=status.HTTP_200_OK)
@router.post("/system/reset", status_code=status.HTTP_200_OK)
def reset_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Dict[str, str]:
    """
    Controlled admin-only reset: Clear transactional order/bill/settlement data while preserving
    users, vendors, menu items, departments, and system configuration.
    """
    from backend.models import (
        Payment, Bill, Settlement, VendorOrderItem,
        VendorOrderModification, VendorOrder, ApprovalHistory, MasterOrder,
        VendorMonthlySettlement, Notification
    )
    db.query(Payment).delete()
    db.query(Bill).delete()
    db.query(Settlement).delete()
    db.query(VendorOrderItem).delete()
    db.query(VendorOrderModification).delete()
    db.query(VendorOrder).delete()
    db.query(ApprovalHistory).delete()
    db.query(MasterOrder).delete()
    db.query(VendorMonthlySettlement).delete()
    db.query(Notification).delete()
    
    # Zero out vendor revenue
    from backend.models.vendor import Vendor
    db.query(Vendor).update({"revenue": 0.0})
    db.commit()

    return {"message": "All orders, bills, and transactions successfully cleared from database."}
