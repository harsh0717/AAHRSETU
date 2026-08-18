from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SettlementBase(BaseModel):
    vendor_id: str
    month: str
    total_amount: float = 0.0
    paid_amount: float = 0.0
    due_amount: float = 0.0
    status: str = "Pending"


class SettlementCreate(BaseModel):
    vendor_id: str
    month: str
    total_amount: float
    paid_amount: float = 0.0


class SettlementUpdate(BaseModel):
    month: str
    vendor_id: str
    total_amount: float
    paid_amount: float


class SettlementResponse(SettlementBase):
    id: int
    updated_at: datetime
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True
