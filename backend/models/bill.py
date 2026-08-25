from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, LargeBinary
from sqlalchemy.orm import relationship
from backend.core.database import Base
from datetime import datetime, timezone

class Bill(Base):
    __tablename__ = "bills"
    
    id = Column(String(50), primary_key=True)
    invoice_number = Column(String(100), unique=True, index=True, nullable=False)
    order_id = Column(String(50), ForeignKey("master_orders.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(String(50), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True) # Null for Master Invoice
    department_id = Column(String(50), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(50), default="PAID", nullable=False) # PAID, FAILED
    pdf_data = Column(LargeBinary, nullable=True)
    system_generated = Column(Boolean, default=True, nullable=False)

    settlement_status = Column(String(50), default="PENDING_SETTLEMENT", nullable=False)
    settlement_id = Column(Integer, ForeignKey("settlements.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    settlement = relationship("Settlement", back_populates="bills")
    order = relationship("MasterOrder")
    vendor = relationship("Vendor")
    department = relationship("Department")
