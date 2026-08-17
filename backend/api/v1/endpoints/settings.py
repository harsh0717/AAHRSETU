from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.models.system_setting import SystemSetting
from backend.models.user import User
from backend.api import deps
from backend.repositories.audit import AuditRepository
from pydantic import BaseModel

router = APIRouter()

class PublicSettingsResponse(BaseModel):
    demo_accounts_enabled: bool

class UpdateSettingsPayload(BaseModel):
    demo_accounts_enabled: bool

@router.get("/public", response_model=PublicSettingsResponse)
def get_public_settings(db: Session = Depends(get_db)) -> Any:
    """
    Retrieve public system configurations (no auth required).
    """
    demo_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_accounts_enabled").first()
    enabled = True
    if demo_setting:
        enabled = (demo_setting.value.lower() == "true")
    return {"demo_accounts_enabled": enabled}

@router.put("", response_model=PublicSettingsResponse)
def update_settings(
    payload: UpdateSettingsPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Update global system settings (Admin-only, audit-logged).
    """
    demo_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_accounts_enabled").first()
    old_val = "true"
    if not demo_setting:
        demo_setting = SystemSetting(key="demo_accounts_enabled", value="true")
        db.add(demo_setting)
    else:
        old_val = demo_setting.value
        
    new_val = "true" if payload.demo_accounts_enabled else "false"
    demo_setting.value = new_val
    db.commit()
    
    # Log admin action
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Toggle Demo Accounts",
        old_value=f"enabled={old_val}",
        new_value=f"enabled={new_val}"
    )
    
    return {"demo_accounts_enabled": payload.demo_accounts_enabled}
