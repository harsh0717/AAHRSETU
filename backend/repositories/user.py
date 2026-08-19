from typing import List, Optional
from sqlalchemy.orm import Session
from backend.models.user import User, Department, UserSession, user_departments
from backend.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_session_by_token(self, refresh_token: str) -> Optional[UserSession]:
        return self.db.query(UserSession).filter(UserSession.refresh_token == refresh_token).first()

    def create_session(self, session: UserSession) -> UserSession:
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def remove_session(self, refresh_token: str) -> None:
        sess = self.get_session_by_token(refresh_token)
        if sess:
            self.db.delete(sess)
            self.db.commit()

    def clear_user_sessions(self, user_id: int) -> None:
        self.db.query(UserSession).filter(UserSession.user_id == user_id).delete()
        self.db.commit()

    def remove(self, id: int) -> Optional[User]:
        user = self.get(id)
        if not user:
            return None
        # Clean up many-to-many managed departments
        self.db.execute(user_departments.delete().where(user_departments.c.user_id == id))
        # Clean up active sessions
        self.db.query(UserSession).filter(UserSession.user_id == id).delete()
        # Clean up recipient notifications
        from backend.models.notification import Notification
        self.db.query(Notification).filter(Notification.recipient_id == id).delete()
        # Delete user
        self.db.delete(user)
        self.db.commit()
        return user

    # Department operations
    def get_departments(self) -> List[Department]:
        return self.db.query(Department).all()

    def get_department_by_id(self, dept_id: str) -> Optional[Department]:
        return self.db.query(Department).filter(Department.id == dept_id).first()

    def create_department(self, dept: Department) -> Department:
        self.db.add(dept)
        self.db.commit()
        self.db.refresh(dept)
        return dept
        
    def set_managed_departments(self, user: User, dept_ids: List[str]) -> None:
        # Clear existing managed departments
        self.db.execute(user_departments.delete().where(user_departments.c.user_id == user.id))
        self.db.commit()
        
        # Add new ones
        for dept_id in dept_ids:
            dept = self.get_department_by_id(dept_id)
            if dept:
                user.managed_departments.append(dept)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
