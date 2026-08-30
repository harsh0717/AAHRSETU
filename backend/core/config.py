import json
from typing import List, Union, Optional
from pydantic import AnyHttpUrl, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AharSetu ERP"
    API_V1_STR: str = "/api/v1"
    
    # JWT & Security
    SECRET_KEY: str = "super_secret_session_token_key_for_aharsetu_erp_2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database (defaults to local sqlite for dev; overridden by DATABASE_URL env on Render / Neon)
    DATABASE_URL: str = "sqlite:///./aharsetu.db"
    
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    FRONTEND_URL: Optional[str] = None
    ALLOWED_ORIGINS: Optional[str] = None

    @model_validator(mode="after")
    def assemble_cors_origins(self) -> "Settings":
        origins = []
        raw_origins = self.BACKEND_CORS_ORIGINS
        if isinstance(raw_origins, str):
            if raw_origins.startswith("["):
                try:
                    origins = json.loads(raw_origins)
                except Exception:
                    origins = [i.strip() for i in raw_origins.split(",")]
            else:
                origins = [i.strip() for i in raw_origins.split(",")]
        elif isinstance(raw_origins, list):
            origins = list(raw_origins)

        # Merge FRONTEND_URL if set
        if self.FRONTEND_URL:
            origins.append(self.FRONTEND_URL.strip())
            
        # Merge ALLOWED_ORIGINS if set (comma-separated list)
        if self.ALLOWED_ORIGINS:
            origins.extend([i.strip() for i in self.ALLOWED_ORIGINS.split(",") if i.strip()])

        # Deduplicate and ensure no trailing slashes on origins
        clean_origins = []
        for o in origins:
            clean = o.rstrip("/")
            if clean and clean not in clean_origins:
                clean_origins.append(clean)

        self.BACKEND_CORS_ORIGINS = clean_origins
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
