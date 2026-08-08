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


@router.get("/", response_model=List[MasterOrderResponse])
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
        orders = order_repo.get_by_coordinator(current_user.id)
    elif role == "principal":
        dept_ids = [d.id for d in current_user.managed_departments]
        orders = order_repo.get_by_departments(dept_ids)
    elif role == "vendor":
        orders = order_repo.get_by_vendor(current_user.vendor_id)
    else:
        # DCR and Admin see all orders
        orders = order_repo.get_multi()
        
    # Map raw models to response list to handle relationships
    response = []
    for o in orders:
        vendor_orders_resp = []
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
                
            vendor_orders_resp.append(
                VendorOrderResponse(
                    id=vo.id,
                    master_order_id=vo.master_order_id,
                    vendor_id=vo.vendor_id,
                    vendor_name=vo.vendor.name,
                    status=vo.status,
                    bill_amount=vo.bill_amount,
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
                total_bill_amount=o.total_bill_amount,
                bill_generated_at=o.bill_generated_at,
                created_at=o.created_at,
                updated_at=o.updated_at,
                vendor_orders=vendor_orders_resp,
                history=history_resp
            )
        )
    return response


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
    vendor_orders_resp = []
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
            
        vendor_orders_resp.append(
            VendorOrderResponse(
                id=vo.id,
                master_order_id=vo.master_order_id,
                vendor_id=vo.vendor_id,
                vendor_name=vo.vendor.name,
                status=vo.status,
                bill_amount=vo.bill_amount,
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
    
    return MasterOrderResponse(
        id=o.id,
        title=o.title,
        purpose=o.purpose,
        department_id=o.department_id,
        department_label=o.department.label if o.department else None,
        created_by_id=o.created_by_id,
        created_by_name=o.created_by.name,
        status=o.status,
        total_bill_amount=o.total_bill_amount,
        bill_generated_at=o.bill_generated_at,
        created_at=o.created_at,
        updated_at=o.updated_at,
        vendor_orders=vendor_orders_resp,
        history=history_resp
    )


@router.post("/", response_model=MasterOrderResponse)
def create_order(
    payload: MasterOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["coordinator"]))
) -> Any:
    """
    Submit a split order containing multiple vendor items (Coordinator-only).
    """
    order_service = OrderService(db)
    items_in = [{"menu_item_id": i.menu_item_id, "quantity": i.quantity} for i in payload.items]
    try:
        order = order_service.create_order(
            creator=current_user,
            title=payload.title,
            purpose=payload.purpose,
            items_in=items_in
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    return read_order_by_id(order.id, db, current_user)


@router.post("/{order_id}/submit", response_model=MasterOrderResponse)
async def submit_for_approval(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["coordinator"]))
) -> Any:
    """
    Submit a created order to Sent for Approval.
    Fires WebSocket alerts to the supervising Principal.
    """
    order_service = OrderService(db)
    order = order_service.submit_for_approval(order_id, current_user)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order not found or not in draft status"
        )
        
    # Notify Principal
    notif_service = NotificationService(db)
    await notif_service.create_and_send_notification(
        msg_key="new_order",
        params={"dept": order.department.name if order.department else "Coordinator", "title": order.title},
        msg_type="new_order",
        recipient_role="principal",
        order_id=order.id
    )
    
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
    vo = billing_service.set_vendor_prices(vendor_order_id, prices, current_user.name)
    if not vo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor order not found or not in Processing status"
        )
        
    # Notify Coordinator if master invoice was automatically generated
    if vo.master_order.status == "Bill Generated":
        notif_service = NotificationService(db)
        await notif_service.create_and_send_notification(
            msg_key="bill_generated",
            params={"title": vo.master_order.title, "amount": vo.master_order.total_bill_amount},
            msg_type="bill",
            recipient_id=vo.master_order.created_by_id,
            order_id=vo.master_order_id
        )
        
    return read_order_by_id(vo.master_order_id, db, current_user)


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
    
    return read_order_by_id(order.id, db, current_user)


@router.post("/system/reset", status_code=status.HTTP_200_OK)
def reset_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Dict[str, str]:
    """
    Clear all database tables and seed them with AharSetu v2.0 mock data.
    """
    seed_all_database(db)
    return {"message": "Database successfully reset and seeded."}
