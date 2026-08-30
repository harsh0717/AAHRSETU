from datetime import datetime
from typing import List, Optional
import re
from pydantic import BaseModel, EmailStr, field_validator


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
    mobile_number: Optional[str] = None
    profile_setup_completed: Optional[bool] = None
    profile_setup_skipped: Optional[bool] = None
    active: Optional[bool] = None
    principal_depts: Optional[List[str]] = None

    @field_validator("mobile_number", mode="before")
    @classmethod
    def validate_mobile_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        digits_only = re.sub(r"\D", "", str(v))
        if len(digits_only) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return digits_only


class UserResponse(UserBase):
    id: int
    department_id: Optional[str] = None
    vendor_id: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_version: int = 1
    mobile_number: Optional[str] = None
    profile_setup_completed: bool = False
    profile_setup_skipped: bool = False
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


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str

