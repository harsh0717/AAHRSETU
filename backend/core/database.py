from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.core.config import settings

# Ensure postgres:// URL scheme from Neon/Render/Supabase is mapped to postgresql://
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Engine configuration (pool size, max overflow for concurrency)
engine_kwargs = {"pool_pre_ping": True}
if not db_url.startswith("sqlite"):
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
else:
    engine_kwargs["connect_args"] = {"timeout": 15}

engine = create_engine(db_url, **engine_kwargs)

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
