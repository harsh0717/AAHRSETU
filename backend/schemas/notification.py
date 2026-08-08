from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    recipient_id: Optional[int] = None
    recipient_role: Optional[str] = None
    message: str
    type: str
    order_id: Optional[str] = None
    vendor_order_id: Optional[str] = None
    read: bool
    timestamp: datetime

    class Config:
        from_attributes = True
