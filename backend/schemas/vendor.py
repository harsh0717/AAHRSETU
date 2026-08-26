from typing import List, Optional
from pydantic import BaseModel, EmailStr


class VendorMenuItemBase(BaseModel):
    name: str
    price: float
    unit: str = "per plate"
    description: Optional[str] = None
    category: str = "General"
    available: bool = True
    active: bool = True
    image_url: Optional[str] = None


class VendorMenuItemCreate(VendorMenuItemBase):
    id: Optional[str] = None


class VendorMenuItemResponse(VendorMenuItemBase):
    id: str
    vendor_id: str

    class Config:
        from_attributes = True


class VendorBase(BaseModel):
    name: str
    owner_name: str
    email: EmailStr
    phone: str
    status: str = "closed" # open, closed, temporarily_unavailable
    revenue: float = 0.0
    image_url: Optional[str] = None
    active: bool = True


class VendorCreate(VendorBase):
    id: str


class VendorResponse(VendorBase):
    id: str
    menu_items: List[VendorMenuItemResponse] = []

    class Config:
        from_attributes = True


class VendorStatusUpdate(BaseModel):
    status: str


class VendorUpdatePayload(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None


class MenuItemAvailabilityUpdate(BaseModel):
    available: bool


