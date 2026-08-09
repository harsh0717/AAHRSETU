from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.core.security import get_password_hash
from backend.models.user import User, Department
from backend.repositories.user import UserRepository
from backend.schemas.user import UserCreate, UserResponse, UserUpdate, DepartmentResponse

router = APIRouter()


@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all institutional departments.
    """
    user_repo = UserRepository(db)
    return user_repo.get_departments()


@router.get("/", response_model=List[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Retrieve all registered users (Admin-only).
    """
    user_repo = UserRepository(db)
    users = user_repo.get_multi(skip=skip, limit=limit)
    
    response = []
    for u in users:
        principal_depts = [d.id for d in u.managed_departments]
        response.append(
            UserResponse(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                department_id=u.department_id,
                vendor_id=u.vendor_id,
                preferred_language=u.preferred_language,
                active=u.active,
                principal_depts=principal_depts,
                created_at=u.created_at
            )
        )
    return response


@router.post("/", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Create a new user account (Admin-only).
    """
    user_repo = UserRepository(db)
    existing = user_repo.get_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
        
    db_user = User(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        department_id=payload.department_id if payload.role == "coordinator" else None,
        vendor_id=payload.vendor_id if payload.role == "vendor" else None,
        preferred_language=payload.preferred_language,
        active=payload.active
    )
    user_repo.create(db_user)
    
    # Save principal departments if principal role
    if payload.role == "principal" and payload.principal_depts:
        user_repo.set_managed_departments(db_user, payload.principal_depts)
        
    principal_depts = [d.id for d in db_user.managed_departments]
    
    # Audit log user creation
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="User Created",
        new_value=f"ID: {db_user.id}, Email: {db_user.email}, Role: {db_user.role}"
    )
    
    return UserResponse(
        id=db_user.id,
        name=db_user.name,
        email=db_user.email,
        role=db_user.role,
        department_id=db_user.department_id,
        vendor_id=db_user.vendor_id,
        preferred_language=db_user.preferred_language,
        active=db_user.active,
        principal_depts=principal_depts,
        created_at=db_user.created_at
    )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Update an existing user account (Admin-only).
    """
    user_repo = UserRepository(db)
    db_user = user_repo.get(user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Restrict users from updating other user accounts unless they are admins
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this profile"
        )
        
    # Check email conflict
    if payload.email and payload.email != db_user.email:
        conflict = user_repo.get_by_email(payload.email)
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )
            
    # Update fields
    update_data = payload.model_dump(exclude_unset=True)
    
    # If not admin, sanitize update payload to prevent escalation
    if current_user.role != "admin":
        update_data.pop("role", None)
        update_data.pop("department_id", None)
        update_data.pop("vendor_id", None)
        update_data.pop("active", None)
        update_data.pop("principal_depts", None)
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    else:
        update_data.pop("password", None)
        
    principal_depts_list = update_data.pop("principal_depts", None)
    
    old_name = db_user.name
    old_email = db_user.email
    old_lang = db_user.preferred_language
    
    # Perform update
    user_repo.update(db_user, update_data)
    
    if principal_depts_list is not None and db_user.role == "principal":
        user_repo.set_managed_departments(db_user, principal_depts_list)
        
    principal_depts = [d.id for d in db_user.managed_departments]
    
    # Audit log user update
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="User Updated",
        old_value=f"ID: {db_user.id}, Name: {old_name}, Email: {old_email}, Language: {old_lang}",
        new_value=f"Name: {db_user.name}, Email: {db_user.email}, Language: {db_user.preferred_language}"
    )
    
    return UserResponse(
        id=db_user.id,
        name=db_user.name,
        email=db_user.email,
        role=db_user.role,
        department_id=db_user.department_id,
        vendor_id=db_user.vendor_id,
        preferred_language=db_user.preferred_language,
        active=db_user.active,
        principal_depts=principal_depts,
        created_at=db_user.created_at
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> None:
    """
    Delete a user account (Admin-only). Prevents self-deletion.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-deletion is prohibited."
        )
        
    user_repo = UserRepository(db)
    target_user = user_repo.get(user_id)
    target_email = target_user.email if target_user else str(user_id)
    
    removed = user_repo.remove(user_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Audit log user deletion
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="User Deleted",
        old_value=f"ID: {user_id}, Email: {target_email}"
    )
    return None
