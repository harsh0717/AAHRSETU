from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base


class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(String(50), primary_key=True) # e.g. "v1", "v2"
    name = Column(String(150), nullable=False)
    owner_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=False)
    status = Column(String(50), default="closed", nullable=False) # open, closed, temporarily_unavailable
    revenue = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    menu_items = relationship("VendorMenuItem", back_populates="vendor", cascade="all, delete-orphan")
    vendor_orders = relationship("VendorOrder", back_populates="vendor")
    user_profiles = relationship("User", back_populates="vendor")


class VendorMenuItem(Base):
    __tablename__ = "vendor_menu_items"
    
    id = Column(String(50), primary_key=True) # e.g. "v1m1"
    vendor_id = Column(String(50), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    price = Column(Float, nullable=False)
    unit = Column(String(50), default="per plate", nullable=False)
    description = Column(String(500), nullable=True)
    category = Column(String(100), default="General", nullable=False)
    available = Column(Boolean, default=True, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    image_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    vendor = relationship("Vendor", back_populates="menu_items")
