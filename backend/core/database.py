from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.core.config import settings

# Engine configuration (pool size, max overflow for concurrency)
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    """
    Dependency injection helper to yield a scoped database session.
    Automatically closes session upon request lifecycle completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
