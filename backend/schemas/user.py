from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr


class DepartmentBase(BaseModel):
    id: str
    name: str
    label: str


class DepartmentResponse(DepartmentBase):
    class Config:
        from_attributes = True


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    preferred_language: str = "en"
    active: bool = True


class UserCreate(UserBase):
    password: str
    department_id: Optional[str] = None
    vendor_id: Optional[str] = None
    principal_depts: Optional[List[str]] = []


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[str] = None
    vendor_id: Optional[str] = None
    preferred_language: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_version: Optional[int] = None
    active: Optional[bool] = None
    principal_depts: Optional[List[str]] = None


class UserResponse(UserBase):
    id: int
    department_id: Optional[str] = None
    vendor_id: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_version: int = 1
    principal_depts: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class LoginPayload(BaseModel):
    role: str
    department_id: Optional[str] = None
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefreshPayload(BaseModel):
    refresh_token: str
