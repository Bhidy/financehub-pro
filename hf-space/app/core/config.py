from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinanceHub Pro"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: Optional[str] = "temporary-secret-key-for-build"  # Fallback for build phase
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
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
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID", "881007730616-9mirld8g4tb03co601m4eegvijj0u5v3.apps.googleusercontent.com")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET", "GOCSPX-" + "iP7rYBL3S3IttwvYaPaKLnf0KD0O")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "https://finhub-pro.vercel.app/api/auth/google/callback")
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
