from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.schemas.user import LoginPayload, TokenResponse, TokenRefreshPayload, UserResponse
from backend.services.auth import AuthService
from backend.models.user import User

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginPayload,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Authenticate user credentials, including role and department (where applicable),
    and return access/refresh tokens.
    """
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(
        email=payload.email,
        password=payload.password,
        role=payload.role,
        department_id=payload.department_id
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email, password, role or department configuration"
        )
        
    # Map principal departments relation back to response list
    principal_depts = [d.id for d in user.managed_departments]
    
    session_data = auth_service.login_user(user)
    
    # Audit log login event
    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    ip_address = request.client.host if request.client else "127.0.0.1"
    browser = request.headers.get("user-agent", "Unknown")
    audit_repo.log_action(
        user_id=user.id,
        role=user.role,
        department=user.department_id or "General",
        action="User Logged In",
        ip_address=ip_address,
        browser=browser
    )
    
    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department_id=user.department_id,
        vendor_id=user.vendor_id,
        preferred_language=user.preferred_language,
        avatar_url=user.avatar_url,
        avatar_version=user.avatar_version or 1,
        mobile_number=user.mobile_number,
        profile_setup_completed=user.profile_setup_completed or False,
        profile_setup_skipped=user.profile_setup_skipped or False,
        active=user.active,
        principal_depts=principal_depts,
        created_at=user.created_at
    )
    
    return {
        "access_token": session_data["access_token"],
        "refresh_token": session_data["refresh_token"],
        "token_type": "bearer",
        "user": user_resp
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    payload: TokenRefreshPayload,
    db: Session = Depends(get_db)
) -> Any:
    """
    Rotate expired access tokens using a valid refresh token.
    """
    auth_service = AuthService(db)
    session_data = auth_service.refresh_session(payload.refresh_token)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid refresh token"
        )
        
    user = session_data["user"]
    principal_depts = [d.id for d in user.managed_departments]
    
    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department_id=user.department_id,
        vendor_id=user.vendor_id,
        preferred_language=user.preferred_language,
        avatar_url=user.avatar_url,
        avatar_version=user.avatar_version or 1,
        mobile_number=user.mobile_number,
        profile_setup_completed=user.profile_setup_completed or False,
        profile_setup_skipped=user.profile_setup_skipped or False,
        active=user.active,
        principal_depts=principal_depts,
        created_at=user.created_at
    )
    
    return {
        "access_token": session_data["access_token"],
        "refresh_token": session_data["refresh_token"],
        "token_type": "bearer",
        "user": user_resp
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: TokenRefreshPayload,
    request: Request,
    db: Session = Depends(get_db)
) -> None:
    """
    Invalidate active refresh sessions.
    """
    # Look up session and user before deletion for auditing
    from backend.repositories.user import UserRepository
    from backend.repositories.audit import AuditRepository
    user_repo = UserRepository(db)
    session = user_repo.get_session_by_token(payload.refresh_token)
    if session:
        user = user_repo.get(session.user_id)
        if user:
            ip_address = request.client.host if request.client else "127.0.0.1"
            browser = request.headers.get("user-agent", "Unknown")
            audit_repo = AuditRepository(db)
            audit_repo.log_action(
                user_id=user.id,
                role=user.role,
                department=user.department_id or "General",
                action="User Logged Out",
                ip_address=ip_address,
                browser=browser
            )

    auth_service = AuthService(db)
    auth_service.logout_user(payload.refresh_token)
    return None


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve active user credentials session profile.
    """
    principal_depts = [d.id for d in current_user.managed_departments]
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        department_id=current_user.department_id,
        vendor_id=current_user.vendor_id,
        preferred_language=current_user.preferred_language,
        avatar_url=current_user.avatar_url,
        avatar_version=current_user.avatar_version or 1,
        mobile_number=current_user.mobile_number,
        profile_setup_completed=current_user.profile_setup_completed or False,
        profile_setup_skipped=current_user.profile_setup_skipped or False,
        active=current_user.active,
        principal_depts=principal_depts,
        created_at=current_user.created_at
    )
