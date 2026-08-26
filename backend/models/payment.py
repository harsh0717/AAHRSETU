from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.core.database import Base

class Payment(Base):
    """Future payment entity — not yet integrated with live gateway."""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_reference = Column(String(100), unique=True, nullable=True, index=True)
    settlement_id = Column(Integer, ForeignKey("settlements.id", ondelete="SET NULL"), nullable=True)
    bill_id = Column(String(50), ForeignKey("bills.id", ondelete="SET NULL"), nullable=True)
    vendor_id = Column(String(50), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    payment_method = Column(String(50), nullable=True)  # UPI|CARD|NEFT|RTGS|MANUAL
    gateway = Column(String(50), nullable=True)  # razorpay|stripe|manual
    gateway_transaction_id = Column(String(200), nullable=True)
    status = Column(String(20), default="PENDING", nullable=False)  # PENDING|PROCESSING|SUCCESS|FAILED|CANCELLED|REFUNDED
    initiated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    bank_name = Column(String(100), nullable=True)
    payment_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    settlement = relationship("Settlement")
    vendor = relationship("Vendor")
    created_by = relationship("User", foreign_keys=[created_by_id])
