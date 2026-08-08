from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(50), primary_key=True) # e.g. "notif-123456"
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    recipient_role = Column(String(50), nullable=True, index=True) # coordinator, principal, vendor, dcr, admin
    message = Column(String(500), nullable=False)
    type = Column(String(50), nullable=False) # new_order, approved, rejected, modification, bill, info
    order_id = Column(String(50), nullable=True)
    vendor_order_id = Column(String(50), nullable=True)
    read = Column(Boolean, default=False, nullable=False, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    recipient = relationship("User")
