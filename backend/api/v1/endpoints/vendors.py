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


@router.get("/", response_model=List[VendorResponse])
def read_vendors(
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all registered canteen vendors.
    """
    vendor_repo = VendorRepository(db)
    vendors = vendor_repo.get_multi()
    return vendors


@router.put("/{vendor_id}/status", response_model=VendorResponse)
def update_vendor_status(
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
        
    vendor_repo.update(vendor, {"status": payload.status})
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
def upsert_menu_item(
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
            available=payload.available
        )
        vendor_repo.create_menu_item(db_item)
        return db_item


@router.delete("/{vendor_id}/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(
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
    return None
