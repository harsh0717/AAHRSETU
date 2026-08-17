from sqlalchemy import Column, String
from backend.core.database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    key = Column(String(100), primary_key=True)
    value = Column(String(500), nullable=False)
