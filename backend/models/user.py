from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from backend.core.database import Base

# Join table for Principal managed departments (Many-to-Many)
user_departments = Table(
    "user_departments",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", String(50), ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True)
)


class Department(Base):
    __tablename__ = "departments"
    
    id = Column(String(50), primary_key=True) # e.g. "diploma", "degree"
    name = Column(String(100), nullable=False)
    label = Column(String(200), nullable=False)

    users = relationship("User", back_populates="coordinator_department")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True) # coordinator, principal, dcr, vendor, admin
    
    # Coordinators are linked directly to one department
    department_id = Column(String(50), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    
    # Vendor users link to their specific vendor profile
    vendor_id = Column(String(50), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    
    preferred_language = Column(String(10), default="en", nullable=False)
    avatar_url = Column(String(500), nullable=True)
    avatar_version = Column(Integer, default=1, nullable=False)
    mobile_number = Column(String(15), nullable=True)
    profile_setup_completed = Column(Boolean, default=False, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    coordinator_department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    managed_departments = relationship("Department", secondary=user_departments)
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    vendor = relationship("Vendor", back_populates="user_profiles", foreign_keys=[vendor_id])


class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(String(500), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    user = relationship("User", back_populates="sessions")
