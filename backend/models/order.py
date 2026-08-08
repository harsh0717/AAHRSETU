from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.core.database import Base


class MasterOrder(Base):
    __tablename__ = "master_orders"
    
    id = Column(String(50), primary_key=True) # e.g. "ORD-123456"
    title = Column(String(200), nullable=False)
    purpose = Column(String(500), nullable=False)
    department_id = Column(String(50), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(100), default="Created", nullable=False) # Created, Sent for Approval, etc.
    total_bill_amount = Column(Float, default=0.0, nullable=False)
    bill_generated_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    department = relationship("Department")
    created_by = relationship("User", foreign_keys=[created_by_id])
    vendor_orders = relationship("VendorOrder", back_populates="master_order", cascade="all, delete-orphan")
    history = relationship("ApprovalHistory", back_populates="master_order", cascade="all, delete-orphan")


class VendorOrder(Base):
    __tablename__ = "vendor_orders"
    
    id = Column(String(50), primary_key=True) # e.g. "VORD-123456-1"
    master_order_id = Column(String(50), ForeignKey("master_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(String(50), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(100), default="Pending", nullable=False) # Pending, Confirmed, Completed
    bill_amount = Column(Float, default=0.0, nullable=False)
    invoice_number = Column(String(100), nullable=True, unique=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    master_order = relationship("MasterOrder", back_populates="vendor_orders")
    vendor = relationship("Vendor", back_populates="vendor_orders")
    items = relationship("VendorOrderItem", back_populates="vendor_order", cascade="all, delete-orphan")
    modification = relationship("VendorOrderModification", back_populates="vendor_order", uselist=False, cascade="all, delete-orphan")


class VendorOrderItem(Base):
    __tablename__ = "vendor_order_items"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    vendor_order_id = Column(String(50), ForeignKey("vendor_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, default=0.0, nullable=False)
    unit = Column(String(50), nullable=True) # e.g. "per cup", "per plate"
    menu_item_id = Column(String(50), nullable=True) # Soft link to menu item if still exists
    
    # Relationships
    vendor_order = relationship("VendorOrder", back_populates="items")


class VendorOrderModification(Base):
    __tablename__ = "vendor_order_modifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    vendor_order_id = Column(String(50), ForeignKey("vendor_orders.id", ondelete="CASCADE"), nullable=False, unique=True)
    reason = Column(String(500), nullable=False)
    type = Column(String(50), nullable=False) # minor, major
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(50), default="Pending", nullable=False) # Pending, Accepted, Rejected
    
    # Relationships
    vendor_order = relationship("VendorOrder", back_populates="modification")


class ApprovalHistory(Base):
    __tablename__ = "approval_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    master_order_id = Column(String(50), ForeignKey("master_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    remarks = Column(String(500), default="", nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    master_order = relationship("MasterOrder", back_populates="history")
    user = relationship("User")
