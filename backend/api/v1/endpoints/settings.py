from typing import Any, Optional
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
    demo_switcher_enabled: bool = True

class UpdateSettingsPayload(BaseModel):
    demo_accounts_enabled: Optional[bool] = None
    demo_switcher_enabled: Optional[bool] = None

@router.get("/public", response_model=PublicSettingsResponse)
def get_public_settings(db: Session = Depends(get_db)) -> Any:
    """
    Retrieve public system configurations (no auth required).
    """
    demo_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_accounts_enabled").first()
    accounts_enabled = True
    if demo_setting:
        accounts_enabled = (demo_setting.value.lower() == "true")
        
    switcher_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_switcher_enabled").first()
    switcher_enabled = accounts_enabled
    if switcher_setting:
        switcher_enabled = (switcher_setting.value.lower() == "true")

    return {
        "demo_accounts_enabled": accounts_enabled,
        "demo_switcher_enabled": switcher_enabled
    }

@router.put("", response_model=PublicSettingsResponse)
def update_settings(
    payload: UpdateSettingsPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Update global system settings (Admin-only, audit-logged).
    """
    audit_repo = AuditRepository(db)
    
    accounts_enabled = True
    switcher_enabled = True

    if payload.demo_accounts_enabled is not None:
        demo_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_accounts_enabled").first()
        old_val = "true"
        if not demo_setting:
            demo_setting = SystemSetting(key="demo_accounts_enabled", value="true")
            db.add(demo_setting)
        else:
            old_val = demo_setting.value
            
        new_val = "true" if payload.demo_accounts_enabled else "false"
        demo_setting.value = new_val
        accounts_enabled = payload.demo_accounts_enabled
        
        audit_repo.log_action(
            user_id=current_user.id,
            role=current_user.role,
            department=current_user.department_id or "General",
            action="Toggle Quick Test Accounts",
            old_value=f"enabled={old_val}",
            new_value=f"enabled={new_val}"
        )
    else:
        demo_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_accounts_enabled").first()
        if demo_setting:
            accounts_enabled = (demo_setting.value.lower() == "true")

    if payload.demo_switcher_enabled is not None:
        sw_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_switcher_enabled").first()
        old_val = "true"
        if not sw_setting:
            sw_setting = SystemSetting(key="demo_switcher_enabled", value="true")
            db.add(sw_setting)
        else:
            old_val = sw_setting.value
            
        new_val = "true" if payload.demo_switcher_enabled else "false"
        sw_setting.value = new_val
        switcher_enabled = payload.demo_switcher_enabled
        
        audit_repo.log_action(
            user_id=current_user.id,
            role=current_user.role,
            department=current_user.department_id or "General",
            action="Toggle Live Quick Switcher Dock",
            old_value=f"enabled={old_val}",
            new_value=f"enabled={new_val}"
        )
    else:
        sw_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_switcher_enabled").first()
        if sw_setting:
            switcher_enabled = (sw_setting.value.lower() == "true")
        else:
            switcher_enabled = accounts_enabled

    db.commit()
    
    return {
        "demo_accounts_enabled": accounts_enabled,
        "demo_switcher_enabled": switcher_enabled
    }
