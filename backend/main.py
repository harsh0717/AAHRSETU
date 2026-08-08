import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.core.database import engine, Base, SessionLocal
from backend.api.v1.api import api_router
from backend.lib.seed_db import seed_all_database
from backend.models.user import User

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aharsetu-api")

# Auto-create database tables on startup (Dev-friendly seeding)
try:
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")
    
    # Auto-seed if database is empty
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("Database is empty. Seeding AharSetu v2.0 baseline data...")
            seed_all_database(db)
            logger.info("Database successfully seeded.")
        else:
            logger.info(f"Database already contains {user_count} user(s). Skipping seeding.")
    finally:
        db.close()
except Exception as e:
    logger.error(f"Error initializing database: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AharSetu Canteen Order Management ERP REST APIs",
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=False
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check endpoint
@app.get("/health", tags=["system"])
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)
