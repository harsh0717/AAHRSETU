from sqlalchemy.orm import Session
from backend.models.audit import AuditLog
from backend.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, db: Session):
        super().__init__(AuditLog, db)

    def log_action(
        self,
        user_id: int,
        role: str,
        department: str,
        action: str,
        old_value: str = None,
        new_value: str = None,
        ip_address: str = "127.0.0.1",
        browser: str = "Unknown"
    ) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            role=role,
            department=department,
            action=action,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            browser=browser
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log
