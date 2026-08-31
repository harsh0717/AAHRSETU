from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class OrderItemBase(BaseModel):
    name: Optional[str] = ""
    quantity: int
    price: Optional[float] = 0.0
    unit: Optional[str] = None
    menu_item_id: Optional[str] = None


class OrderItemCreate(BaseModel):
    name: Optional[str] = ""
    quantity: int
    price: Optional[float] = 0.0
    unit: Optional[str] = None
    menu_item_id: Optional[str] = None


class OrderItemResponse(OrderItemBase):
    id: int
    vendor_order_id: str

    class Config:
        from_attributes = True


class ModificationPayload(BaseModel):
    reason: str
    type: str # minor, major


class ModificationResponse(BaseModel):
    id: int
    vendor_order_id: str
    reason: str
    type: str
    requested_at: datetime
    status: str

    class Config:
        from_attributes = True


class VendorOrderResponse(BaseModel):
    id: str
    master_order_id: str
    vendor_id: str
    vendor_name: Optional[str] = None
    vendor_owner_name: Optional[str] = None
    status: str
    bill_amount: float
    invoice_number: Optional[str] = None
    items: List[OrderItemResponse] = []
    modification: Optional[ModificationResponse] = None

    class Config:
        from_attributes = True


class ApprovalHistoryResponse(BaseModel):
    id: int
    master_order_id: str
    action: str
    role: str
    user_name: Optional[str] = None
    remarks: str
    timestamp: datetime

    class Config:
        from_attributes = True


class PrincipalApprovalSchema(BaseModel):
    status: Optional[str] = None
    remarks: str = ""
    reviewedAt: Optional[str] = ""
    reviewedBy: Optional[str] = ""


class DCRApprovalSchema(BaseModel):
    status: Optional[str] = None
    remarks: str = ""
    reviewedAt: Optional[str] = ""
    reviewedBy: Optional[str] = ""


class MasterOrderCreate(BaseModel):
    title: str
    purpose: str
    items: List[OrderItemCreate] # contains menu_item_id + quantity
    department_id: Optional[str] = None
    order_type: Optional[str] = "IMMEDIATE" # IMMEDIATE, SCHEDULED
    scheduled_for: Optional[datetime] = None
    timezone: Optional[str] = "Asia/Kolkata"


class MasterOrderResponse(BaseModel):
    id: str
    title: str
    purpose: str
    department_id: Optional[str] = None
    department_label: Optional[str] = None
    created_by_id: int
    created_by_name: Optional[str] = None
    status: str
    total_bill_amount: float
    bill_generated_at: Optional[datetime] = None
    order_type: Optional[str] = "IMMEDIATE"
    scheduled_for: Optional[datetime] = None
    timezone: Optional[str] = "Asia/Kolkata"
    created_at: datetime
    updated_at: datetime
    
    vendor_orders: List[VendorOrderResponse] = []
    history: List[ApprovalHistoryResponse] = []

    class Config:
        from_attributes = True


class ApprovalPayload(BaseModel):
    remarks: Optional[str] = ""
