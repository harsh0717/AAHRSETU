import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.core.config import settings
from backend.core.database import engine, Base, SessionLocal
from backend.api.v1.api import api_router
from backend.lib.seed_db import seed_all_database
from backend.models.user import User
from backend.models.stored_file import StoredFile
from backend.models.system_setting import SystemSetting

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
    
    # Auto-seed and migration check
    db = SessionLocal()
    try:
        from sqlalchemy import text
        if engine.dialect.name != "sqlite":
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_version INTEGER DEFAULT 1;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15);"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_setup_completed BOOLEAN DEFAULT FALSE;"))
            db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_setup_skipped BOOLEAN DEFAULT FALSE;"))
            db.execute(text("ALTER TABLE vendor_menu_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);"))
            db.commit()

        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("Database is empty. Seeding AharSetu v2.0 baseline data...")
            seed_all_database(db)
            logger.info("Database successfully seeded.")
        else:
            logger.info(f"Database already contains {user_count} user(s). Migration checked successfully.")

        # Seed default settings
        demo_setting = db.query(SystemSetting).filter(SystemSetting.key == "demo_accounts_enabled").first()
        if not demo_setting:
            db.add(SystemSetting(key="demo_accounts_enabled", value="true"))
            db.commit()
            logger.info("Default system setting 'demo_accounts_enabled' seeded.")
    finally:
        db.close()
except Exception as e:
    logger.error(f"Error initializing database: {e}")

tags_metadata = [
    {"name": "system", "description": "System health check and operational status endpoints."},
    {"name": "auth", "description": "Authentication, JWT session tokens, refresh, and profile endpoints."},
    {"name": "users", "description": "User account management, profile updates, and role assignments."},
    {"name": "vendors", "description": "Canteen vendor management, status availability, and menu items."},
    {"name": "orders", "description": "Master requisitions, department approvals, DCR audits, vendor confirmation, and billing."},
    {"name": "notifications", "description": "User notifications, unread counts, and real-time WebSocket connection."},
    {"name": "reports", "description": "Institutional expenditure, department audit metrics, vendor revenue, and audit logs."}
]

app = FastAPI(
    title="AharSetu Enterprise ERP API",
    description="AharSetu Campus Canteen Order Management & Institutional Billing ERP REST APIs",
    version="2.0.0",
    openapi_tags=tags_metadata,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=True
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

# Serve uploaded avatar images as static files
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "public", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)
