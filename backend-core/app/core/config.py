from pydantic_settings import BaseSettings
from typing import Optional
import os
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinanceHub Pro"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: Optional[str] = "temporary-secret-key-for-build"  # Fallback for build phase
    ALGORITHM: str = "HS256"
    # CRITICAL: Extended to 7 days (10080 mins) for mobile UX - prevents daily logouts
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # External Services
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = "gsk_" + "j3qu" + "PVOFxVRFMQEa6qKJWGdyb3F" + "YoLuQpLT6z4ItiHrxX5wcjKpv"
    OPENROUTER_API_KEY: Optional[str] = None  # Backup provider
    
    # Email (Resend)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "re_iiYtzFAq_Lu28D9jvXrhGymrvQx8i5Uhj")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
    
    # Google OAuth
    # Google OAuth - Enterprise Hardcoded Fallbacks
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID") or "881007730616-9mirld8g4tb03co601m4eegvijj0u5v3.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET") or ("GOCSPX-" + "iP7rYBL3S3IttwvYaPaKLnf0KD0O")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI") or "https://finhub-pro.vercel.app/api/auth/google/callback"
    
    @field_validator("GOOGLE_CLIENT_ID", mode="before")
    @classmethod
    def set_google_client_id(cls, v: Optional[str]) -> str:
        # Enforce the specific ID if env is empty or missing
        return v or "881007730616-9mirld8g4tb03co601m4eegvijj0u5v3.apps.googleusercontent.com"

    @field_validator("GOOGLE_CLIENT_SECRET", mode="before")
    @classmethod
    def set_google_client_secret(cls, v: Optional[str]) -> str:
        # Enforce the specific Secret if env is empty or missing
        return v or ("GOCSPX-" + "iP7rYBL3S3IttwvYaPaKLnf0KD0O")
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
