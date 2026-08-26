from typing import Any, List, Optional
from pydantic import BaseModel, EmailStr
from backend.core.security import get_password_hash
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User
from backend.models.vendor import Vendor, VendorMenuItem, VendorMonthlySettlement
from backend.schemas.vendor import (
    VendorResponse,
    VendorMenuItemResponse,
    VendorMenuItemCreate,
    VendorStatusUpdate,
    VendorUpdatePayload,
    MenuItemAvailabilityUpdate,
)
from datetime import datetime


router = APIRouter()


@router.get("", response_model=List[VendorResponse])
def read_vendors(
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all registered canteen vendors.
    """
    vendor_repo = VendorRepository(db)
    vendors = vendor_repo.get_multi()
    return vendors


@router.patch("/me/availability", response_model=VendorResponse)
async def update_my_vendor_status(
    payload: VendorStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Update the authenticated vendor's canteen status (open, closed, temporarily unavailable).
    Determines vendor identity strictly from the authenticated JWT session context.
    """
    if current_user.role != "vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with the 'vendor' role can update their availability."
        )
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any vendor profile."
        )
    
    vendor_repo = VendorRepository(db)
    vendor = vendor_repo.get(current_user.vendor_id)
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The vendor profile associated with your account could not be found."
        )
        
    old_status = vendor.status
    new_status = payload.status.lower().strip()
    if new_status not in ["open", "closed", "temporarily_unavailable"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status value. Allowed: open, closed, temporarily_unavailable"
        )
        
    vendor_repo.update(vendor, {"status": new_status})
    
    # Audit log status update
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department="General",
        action="Vendor Status Updated",
        old_value=old_status,
        new_value=new_status
    )

    # Broadcast real-time status update to all connected WebSocket clients
    try:
        from backend.services.notification import manager
        await manager.broadcast({
            "type": "VENDOR_STATUS_UPDATED",
            "vendor_id": vendor.id,
            "status": new_status,
            "vendor_name": vendor.name
        })
    except Exception as err:
        print(f"[WS BROADCAST ERROR] Failed to broadcast vendor status: {err}")

    return vendor


@router.put("/{vendor_id}/status", response_model=VendorResponse)
async def update_vendor_status(
    vendor_id: str,
    payload: VendorStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Update vendor status (open, closed, temporarily unavailable).
    Role restricted: Admin can update any, Vendor users can only update their linked vendor.
    """
    if current_user.role != "admin" and current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this vendor's status."
        )
        
    vendor_repo = VendorRepository(db)
    vendor = vendor_repo.get(vendor_id)
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
        
    old_status = vendor.status
    new_status = payload.status.lower().strip()
    if new_status not in ["open", "closed", "temporarily_unavailable"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status value. Allowed: open, closed, temporarily_unavailable"
        )

    vendor_repo.update(vendor, {"status": new_status})
    
    # Audit log status update
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Vendor Status Updated",
        old_value=old_status,
        new_value=new_status
    )

    # Broadcast real-time status update to all connected WebSocket clients
    try:
        from backend.services.notification import manager
        await manager.broadcast({
            "type": "VENDOR_STATUS_UPDATED",
            "vendor_id": vendor.id,
            "status": new_status,
            "vendor_name": vendor.name
        })
    except Exception as err:
        print(f"[WS BROADCAST ERROR] Failed to broadcast vendor status: {err}")

    return vendor


@router.get("/{vendor_id}/menu", response_model=List[VendorMenuItemResponse])
def get_vendor_menu(
    vendor_id: str,
    db: Session = Depends(get_db)
) -> Any:
    """
    Get menu items of a specific vendor.
    """
    vendor_repo = VendorRepository(db)
    return vendor_repo.get_menu_items(vendor_id)


@router.post("/{vendor_id}/menu", response_model=VendorMenuItemResponse)
async def upsert_menu_item(
    vendor_id: str,
    payload: VendorMenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["vendor", "admin"]))
) -> Any:
    """
    Add or update a vendor menu item.
    Vendor role must own the menu being modified.
    """
    if current_user.role == "vendor" and current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this vendor menu"
        )
        
    vendor_repo = VendorRepository(db)
    
    # Check if creating or updating
    item_id = payload.id
    if item_id:
        # Update existing
        db_item = vendor_repo.get_menu_item(vendor_id, item_id)
        if not db_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Menu item not found"
            )
        update_data = payload.model_dump(exclude={"id"})
        for field, value in update_data.items():
            setattr(db_item, field, value)
        db.commit()
        db.refresh(db_item)
        return db_item
    else:
        # Create new
        new_id = f"{vendor_id}m{int(db.query(VendorMenuItem).count()) + 1}"
        db_item = VendorMenuItem(
            id=new_id,
            vendor_id=vendor_id,
            name=payload.name,
            price=payload.price,
            unit=payload.unit,
            description=payload.description or None,
            category=payload.category or 'General',
            available=payload.available,
            active=payload.active,
            image_url=payload.image_url or None,
        )
        vendor_repo.create_menu_item(db_item)

    # Broadcast MENU_UPDATED so coordinators get a real-time refresh signal
    try:
        from backend.services.notification import manager
        import asyncio
        from datetime import datetime, timezone
        asyncio.create_task(manager.broadcast({
            "type": "MENU_UPDATED",
            "vendor_id": vendor_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }))
    except Exception:
        pass

    return db_item


@router.delete("/{vendor_id}/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    vendor_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["vendor", "admin"]))
) -> None:
    """
    Delete a menu item.
    Vendor role must own the menu being modified.
    """
    if current_user.role == "vendor" and current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this vendor menu"
        )
        
    vendor_repo = VendorRepository(db)
    db_item = vendor_repo.get_menu_item(vendor_id, item_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found"
        )
        
    vendor_repo.remove_menu_item(vendor_id, item_id)

    # Broadcast MENU_UPDATED
    try:
        from backend.services.notification import manager
        import asyncio
        from datetime import datetime, timezone
        asyncio.create_task(manager.broadcast({
            "type": "MENU_UPDATED",
            "vendor_id": vendor_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }))
    except Exception:
        pass

    return None


@router.patch("/{vendor_id}/menu/{item_id}/availability", response_model=VendorMenuItemResponse)
async def update_menu_item_availability(
    vendor_id: str,
    item_id: str,
    payload: MenuItemAvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["vendor", "admin"]))
) -> Any:
    """
    Update menu item availability (Vendor/Admin only).
    """
    if current_user.role == "vendor" and current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this vendor menu"
        )
        
    vendor_repo = VendorRepository(db)
    db_item = vendor_repo.get_menu_item(vendor_id, item_id)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found"
        )
        
    db_item.available = payload.available
    db.commit()
    db.refresh(db_item)

    # Broadcast MENU_ITEM_AVAILABILITY_UPDATED
    try:
        from backend.services.notification import manager
        import asyncio
        asyncio.create_task(manager.broadcast({
            "type": "MENU_ITEM_AVAILABILITY_UPDATED",
            "vendor_id": vendor_id,
            "item_id": item_id,
            "available": db_item.available,
            "item_name": db_item.name
        }))
    except Exception:
        pass

    return db_item


@router.patch("/{vendor_id}/availability", response_model=VendorResponse)
async def patch_vendor_availability(
    vendor_id: str,
    payload: VendorStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    PATCH /vendors/{vendor_id}/availability — update vendor open/closed status.
    Alias for PUT /vendors/{vendor_id}/status for RESTful naming compliance.
    """
    return await update_vendor_status(vendor_id, payload, db, current_user)


class VendorCreatePayload(BaseModel):
    id: str
    name: str
    owner_name: str
    email: EmailStr
    phone: str
    password: str
    image_url: Optional[str] = None


@router.post("", response_model=VendorResponse)
def create_vendor_by_admin(
    payload: VendorCreatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Create a new Vendor profile and concurrently create their login account (Admin-only).
    """
    # 1. Check if vendor profile ID already exists
    vendor_repo = VendorRepository(db)
    existing_vendor = vendor_repo.get(payload.id)
    if existing_vendor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor with this ID already exists."
        )
        
    # 2. Check if email already registered in users
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user account with this email already exists."
        )
        
    # 3. Create Vendor profile record
    vendor = Vendor(
        id=payload.id,
        name=payload.name,
        owner_name=payload.owner_name,
        email=payload.email,
        phone=payload.phone,
        status="closed",
        revenue=0.0,
        image_url=payload.image_url,
        active=True
    )
    db.add(vendor)
    db.flush()
    
    # 4. Create User login account for this vendor
    user = User(
        name=payload.owner_name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role="vendor",
        vendor_id=vendor.id,
        preferred_language="en",
        active=True
    )
    db.add(user)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.put("/{vendor_id}/toggle-active", response_model=VendorResponse)
def toggle_vendor_active_status(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Toggle a vendor's active/deactivated account status (Admin-only).
    Suspends user logins for the vendor but preserves all historical data records.
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found."
        )
        
    new_active_status = not (vendor.active if hasattr(vendor, 'active') else True)
    vendor.active = new_active_status
    db.add(vendor)
    
    # Toggle active status on linked user accounts
    users = db.query(User).filter(User.vendor_id == vendor.id).all()
    for u in users:
        u.active = new_active_status
        db.add(u)
        
    db.commit()
    db.refresh(vendor)
    
    # Audit log this action
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department="General",
        action="Vendor Account Active Status Toggled",
        old_value=str(not new_active_status),
        new_value=str(new_active_status)
    )
    
@router.put("/{vendor_id}", response_model=VendorResponse)
@router.patch("/{vendor_id}", response_model=VendorResponse)
async def update_vendor_profile(
    vendor_id: str,
    payload: VendorUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Update vendor profile details including canteen name, proprietor name, phone, email, status, and image.
    Allowed roles: admin, dcr, administration, or the vendor user linked to this vendor_id.
    """
    if current_user.role not in ["admin", "dcr", "administration"] and current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this vendor profile."
        )

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found."
        )

    # 1. Update basic fields if supplied
    if payload.name is not None and payload.name.strip():
        vendor.name = payload.name.strip()

    if payload.owner_name is not None and payload.owner_name.strip():
        vendor.owner_name = payload.owner_name.strip()
        # Also update linked user's name
        users = db.query(User).filter(User.vendor_id == vendor.id).all()
        for u in users:
            u.name = vendor.owner_name

    if payload.phone is not None and payload.phone.strip():
        vendor.phone = payload.phone.strip()

    if payload.email is not None and payload.email.strip():
        new_email = str(payload.email).strip().lower()
        if new_email != vendor.email:
            existing_user = db.query(User).filter(User.email == new_email, User.vendor_id != vendor.id).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Another user account is already registered with this email address."
                )
            vendor.email = new_email
            # Update linked user account email
            users = db.query(User).filter(User.vendor_id == vendor.id).all()
            for u in users:
                u.email = new_email

    if payload.status is not None and payload.status.strip():
        valid_statuses = ["open", "closed", "temporarily_unavailable"]
        new_status = payload.status.strip().lower()
        if new_status in valid_statuses:
            vendor.status = new_status

    if payload.image_url is not None:
        vendor.image_url = payload.image_url.strip() or None

    if payload.active is not None:
        vendor.active = payload.active

    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    # Audit log
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Vendor Profile Updated",
        old_value=vendor_id,
        new_value=f"Name: {vendor.name}, Owner: {vendor.owner_name}, Phone: {vendor.phone}, Status: {vendor.status}"
    )

    # Broadcast WebSocket event
    try:
        from backend.services.notification import manager
        await manager.broadcast({
            "type": "VENDOR_UPDATED",
            "vendor_id": vendor.id,
            "name": vendor.name,
            "owner_name": vendor.owner_name,
            "status": vendor.status
        })
    except Exception:
        pass

    return vendor


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> None:
    """
    Hard delete a vendor and all their associated user login accounts (Admin-only).
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found."
        )

    # Delete linked user accounts
    db.query(User).filter(User.vendor_id == vendor.id).delete(synchronize_session=False)

    # Delete the vendor itself (SQLAlchemy cascade deletes menu_items)
    db.delete(vendor)
    db.commit()

    # Audit log this action
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department="General",
        action="Vendor Deleted",
        old_value=vendor_id,
        new_value="DELETED"
    )
    return


def sync_monthly_settlements(db: Session):
    from backend.models.order import VendorOrder
    from collections import defaultdict
    
    vendors = db.query(Vendor).all()
    current_month = datetime.now().strftime("%B %Y")
    
    completed_orders = db.query(VendorOrder).filter(VendorOrder.status == "Completed").all()
    orders_by_vendor_month = defaultdict(float)
    
    for vo in completed_orders:
        month_str = vo.updated_at.strftime("%B %Y")
        orders_by_vendor_month[(vo.vendor_id, month_str)] += vo.bill_amount
        
    for vendor in vendors:
        months_to_check = set([current_month])
        for (v_id, m_str) in orders_by_vendor_month.keys():
            if v_id == vendor.id:
                months_to_check.add(m_str)
                
        for month in months_to_check:
            s = db.query(VendorMonthlySettlement).filter(
                VendorMonthlySettlement.vendor_id == vendor.id,
                VendorMonthlySettlement.month == month
            ).first()
            
            calculated_total = orders_by_vendor_month[(vendor.id, month)]
            
            if not s:
                s = VendorMonthlySettlement(
                    vendor_id=vendor.id,
                    month=month,
                    total_amount=calculated_total,
                    paid_amount=0.0,
                    due_amount=calculated_total,
                    status="Pending"
                )
                db.add(s)
            else:
                if s.total_amount != calculated_total:
                    s.total_amount = calculated_total
                    s.due_amount = max(0.0, calculated_total - s.paid_amount)
                    if s.due_amount <= 0.0:
                        s.status = "Settled"
                    elif s.paid_amount > 0.0:
                        s.status = "Partially Settled"
                    else:
                        s.status = "Pending"
                    db.add(s)
    db.commit()


@router.get("/settlements", response_model=List[SettlementResponse])
def get_monthly_settlements(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Retrieve all monthly settlements for canteens (Admin-only).
    Auto-syncs records against completed order billing amounts first.
    """
    sync_monthly_settlements(db)
    settlements = db.query(VendorMonthlySettlement).order_by(VendorMonthlySettlement.month.desc()).all()
    response = []
    for s in settlements:
        vendor = db.query(Vendor).filter(Vendor.id == s.vendor_id).first()
        r = SettlementResponse.model_validate(s)
        r.vendor_name = vendor.name if vendor else "Unknown Vendor"
        response.append(r)
    return response


@router.post("/settlements", response_model=SettlementResponse)
def update_monthly_settlement(
    payload: SettlementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Update or record monthly settlement payment and outstanding dues (Admin-only).
    """
    s = db.query(VendorMonthlySettlement).filter(
        VendorMonthlySettlement.vendor_id == payload.vendor_id,
        VendorMonthlySettlement.month == payload.month
    ).first()
    
    if not s:
        s = VendorMonthlySettlement(
            vendor_id=payload.vendor_id,
            month=payload.month,
            total_amount=payload.total_amount,
            paid_amount=payload.paid_amount,
            due_amount=max(0.0, payload.total_amount - payload.paid_amount)
        )
    else:
        s.total_amount = payload.total_amount
        s.paid_amount = payload.paid_amount
        s.due_amount = max(0.0, payload.total_amount - payload.paid_amount)
        
    if s.due_amount <= 0.0:
        s.status = "Settled"
    elif s.paid_amount > 0.0:
        s.status = "Partially Settled"
    else:
        s.status = "Pending"
        
    db.add(s)
    db.commit()
    db.refresh(s)
    
    vendor = db.query(Vendor).filter(Vendor.id == s.vendor_id).first()
    r = SettlementResponse.model_validate(s)
    r.vendor_name = vendor.name if vendor else "Unknown Vendor"
    return r


@router.get("/my-settlements", response_model=List[SettlementResponse])
def get_my_monthly_settlements(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["vendor"]))
) -> Any:
    """
    Retrieve monthly settlements history for the currently logged-in vendor.
    """
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is not linked to any vendor profile."
        )
    
    sync_monthly_settlements(db)
    settlements = db.query(VendorMonthlySettlement).filter(
        VendorMonthlySettlement.vendor_id == current_user.vendor_id
    ).order_by(VendorMonthlySettlement.month.desc()).all()
    
    response = []
    vendor = db.query(Vendor).filter(Vendor.id == current_user.vendor_id).first()
    vendor_name = vendor.name if vendor else "My Canteen"
    for s in settlements:
        r = SettlementResponse.model_validate(s)
        r.vendor_name = vendor_name
        response.append(r)
    return response

