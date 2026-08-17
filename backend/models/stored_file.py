from datetime import datetime, timezone
from sqlalchemy import Column, String, LargeBinary, DateTime
from backend.core.database import Base

class StoredFile(Base):
    __tablename__ = "stored_files"
    
    filename = Column(String(250), primary_key=True)
    content_type = Column(String(100), nullable=False)
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
