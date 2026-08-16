from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User
from backend.models.vendor import Vendor, VendorMenuItem
from backend.repositories.vendor import VendorRepository
from backend.schemas.vendor import VendorResponse, VendorMenuItemResponse, VendorMenuItemCreate, VendorStatusUpdate

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
    if current_user.role != "vendor" or not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authenticated vendors can update availability."
        )
    
    vendor_repo = VendorRepository(db)
    vendor = vendor_repo.get(current_user.vendor_id)
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found for the user."
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
    if current_user.role != "admin" and (
        current_user.role != "vendor" or current_user.vendor_id != vendor_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized status update"
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
