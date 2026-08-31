from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.core.database import get_db
from backend.models.system_setting import SystemSetting
from backend.models.order import MasterOrder
from backend.models.user import User
from backend.api import deps
import json

router = APIRouter()

DEPARTMENTS_META = {
    "diploma": {"name": "Diploma Department", "default_budget": 250000.0, "baseline_used": 0.0},
    "degree": {"name": "Degree Department", "default_budget": 350000.0, "baseline_used": 0.0},
    "pharmacy": {"name": "Pharmacy Department", "default_budget": 150000.0, "baseline_used": 0.0},
    "physiotherapy": {"name": "Physiotherapy Department", "default_budget": 180000.0, "baseline_used": 0.0},
    "nursing": {"name": "Nursing Department", "default_budget": 200000.0, "baseline_used": 0.0},
    "bsc": {"name": "B.Sc./Paramedical Department", "default_budget": 160000.0, "baseline_used": 0.0},
}

class DepartmentBudgetResponse(BaseModel):
    department_id: str
    department_name: str
    budget_year: str
    annual_budget: float
    used_amount: float
    remaining_amount: float
    utilization_pct: float
    warning_threshold: float
    has_warning: bool
    status: str

class UpdateBudgetPayload(BaseModel):
    annual_budget: float
    warning_threshold: Optional[float] = 0.80

def _get_department_budget_obj(dept_id: str, db: Session) -> dict:
    meta = DEPARTMENTS_META.get(dept_id, {
        "name": f"{dept_id.upper()} Department",
        "default_budget": 200000.0,
        "baseline_used": 0.0
    })

    # Check for custom cap stored in SystemSetting
    setting_key = f"dept_budget_{dept_id}"
    setting = db.query(SystemSetting).filter(SystemSetting.key == setting_key).first()
    
    annual_budget = meta["default_budget"]
    warning_threshold = 0.80

    if setting and setting.value:
        try:
            cfg = json.loads(setting.value)
            annual_budget = float(cfg.get("annual_budget", annual_budget))
            warning_threshold = float(cfg.get("warning_threshold", warning_threshold))
        except Exception:
            pass

    CANCELLED_STATUSES = [
        "Cancelled", "Coordinator Cancelled", "Principal Rejected",
        "DCR Rejected", "Admin Rejected", "Vendor Rejected", "Rejected", "Draft"
    ]
    # Calculate actual completed order spend in database for this department (excluding cancelled/rejected/draft orders)
    db_orders = db.query(MasterOrder).filter(
        MasterOrder.department_id == dept_id,
        MasterOrder.status.in_(["Completed", "Bill Generated"]),
        ~MasterOrder.status.in_(CANCELLED_STATUSES)
    ).all()
    db_spend = sum([o.total_bill_amount for o in db_orders if o.total_bill_amount]) if db_orders else 0.0
    
    used_amount = meta["baseline_used"] + db_spend
    remaining_amount = max(0.0, annual_budget - used_amount)
    utilization_pct = round((used_amount / annual_budget) * 100, 2) if annual_budget > 0 else 0.0
    has_warning = (used_amount / annual_budget) >= warning_threshold if annual_budget > 0 else False
    
    if used_amount > annual_budget:
        b_status = "EXCEEDED"
    elif has_warning:
        b_status = "WARNING"
    else:
        b_status = "OPTIMAL"

    return {
        "department_id": dept_id,
        "department_name": meta["name"],
        "budget_year": "2026-27",
        "annual_budget": annual_budget,
        "used_amount": round(used_amount, 2),
        "remaining_amount": round(remaining_amount, 2),
        "utilization_pct": utilization_pct,
        "warning_threshold": warning_threshold,
        "has_warning": has_warning,
        "status": b_status
    }

@router.get("", response_model=List[DepartmentBudgetResponse])
def get_all_budgets(db: Session = Depends(get_db)) -> Any:
    """
    Get all department budgets with live utilization metrics.
    """
    results = []
    for dept_id in DEPARTMENTS_META.keys():
        results.append(_get_department_budget_obj(dept_id, db))
    return results

@router.get("/{dept_id}", response_model=DepartmentBudgetResponse)
def get_department_budget(dept_id: str, db: Session = Depends(get_db)) -> Any:
    """
    Get budget details for a specific department.
    """
    return _get_department_budget_obj(dept_id, db)

@router.put("/{dept_id}", response_model=DepartmentBudgetResponse)
def update_department_budget(
    dept_id: str,
    payload: UpdateBudgetPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin", "dcr"]))
) -> Any:
    """
    Update annual budget cap and warning threshold for a department (Admin or DCR/Administration).
    """
    setting_key = f"dept_budget_{dept_id}"
    setting = db.query(SystemSetting).filter(SystemSetting.key == setting_key).first()
    
    config_val = json.dumps({
        "annual_budget": max(1000.0, payload.annual_budget),
        "warning_threshold": max(0.1, min(1.0, payload.warning_threshold or 0.80))
    })

    if not setting:
        setting = SystemSetting(key=setting_key, value=config_val)
        db.add(setting)
    else:
        setting.value = config_val
    
    db.commit()
    return _get_department_budget_obj(dept_id, db)
