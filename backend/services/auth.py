from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from backend.models.user import User, UserSession
from backend.repositories.user import UserRepository
from backend.core.config import settings


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def authenticate_user(
        self,
        email: str,
        password: str,
        role: str,
        department_id: Optional[str] = None
    ) -> Optional[User]:
        user = self.user_repo.get_by_email(email)
        if not user:
            return None
        
        # Verify password
        if not verify_password(password, user.password_hash):
            return None
            
        # Verify role matches
        if user.role != role:
            return None
            
        # Verify department matches (for coordinator)
        if role == "coordinator" and user.department_id != department_id:
            return None
            
        # Verify department matches (for principal)
        if role == "principal" and department_id:
            # Check if department_id is in managed departments
            managed_ids = [d.id for d in user.managed_departments]
            if department_id not in managed_ids:
                return None
                
        if not user.active:
            return None
            
        return user

    def login_user(self, user: User) -> Dict[str, Any]:
        # Clear existing sessions for single login policy or to manage load
        self.user_repo.clear_user_sessions(user.id)
        
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)
        
        # Save session in database
        session_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db_session = UserSession(
            user_id=user.id,
            refresh_token=refresh_token,
            expires_at=session_expires
        )
        self.user_repo.create_session(db_session)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user
        }

    def refresh_session(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        db_session = self.user_repo.get_session_by_token(refresh_token)
        if not db_session or db_session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            if db_session:
                self.db.delete(db_session)
                self.db.commit()
            return None
            
        user = self.user_repo.get(db_session.user_id)
        if not user or not user.active:
            return None
            
        # Issue new access token
        new_access_token = create_access_token(subject=user.id)
        
        # Rotate refresh token (Standard Security Practice)
        new_refresh_token = create_refresh_token(subject=user.id)
        
        # Update session
        db_session.refresh_token = new_refresh_token
        db_session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.db.commit()
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "user": user
        }

    def logout_user(self, refresh_token: str) -> None:
        self.user_repo.remove_session(refresh_token)
