from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.core.database import Base

class Settlement(Base):
    __tablename__ = "settlements"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    settlement_number = Column(String(50), unique=True, nullable=False, index=True)  # SET-2026-08
    month = Column(Integer, nullable=False)   # 1-12
    year = Column(Integer, nullable=False)
    total_bills = Column(Integer, default=0, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0, nullable=False)
    settled_amount = Column(Numeric(12, 2), default=0, nullable=False)
    pending_amount = Column(Numeric(12, 2), default=0, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    finalized_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="DRAFT", nullable=False)  # DRAFT | FINALIZED | REOPENED
    notes = Column(Text, nullable=True)
    
    # Relationships
    bills = relationship("Bill", back_populates="settlement")
    creator = relationship("User", foreign_keys=[created_by_id])
