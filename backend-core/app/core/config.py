from pydantic_settings import BaseSettings
from typing import Optional
import os
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinanceHub Pro"
    API_V1_STR: str = "/api/v1"
    
    # Security — REQUIRED, validated below after Settings() is built (so values
    # from backend-core/.env still count). The old fallback silently signed every
    # JWT with a publicly-known placeholder string when the env var was missing.
    SECRET_KEY: str = os.getenv("SECRET_KEY") or ""

    ALGORITHM: str = "HS256"
    # CRITICAL: Shortened access token for security (e.g. 15 mins), extended refresh token
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # External Services
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")  # Claude API - set in .env or server env
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    CEREBRAS_API_KEY: Optional[str] = os.getenv("CEREBRAS_API_KEY")
    MISTRAL_API_KEY: Optional[str] = os.getenv("MISTRAL_API_KEY")
    OPENROUTER_API_KEY: Optional[str] = None  # Backup provider
    
    # Email (Resend)
    RESEND_API_KEY: Optional[str] = os.getenv("RESEND_API_KEY")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
    
    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_PUBLISHABLE_KEY: Optional[str] = os.getenv("STRIPE_PUBLISHABLE_KEY")
    STRIPE_WEBHOOK_SECRET: Optional[str] = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    # Google OAuth
    # Google OAuth - Enterprise Hardcoded Fallbacks Removed for Security
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI") or "https://finhub-pro.vercel.app/api/auth/google/callback"

    # Data feed primacy — TradingView is the unconditional primary for both markets.
    # yfinance is the automatic fallback inside EGXFeedRouter / KSAFeedRouter.
    # These flags are intentionally True-by-default; set False only in isolated tests.
    EGX_PRIMARY_TV: bool = True
    KSA_PRIMARY_TV: bool = True

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Fail-fast: refuse to boot without a real signing key (audit 2026-06-11).
# The backend-deploy workflow guarantees the server env has one; for local dev,
# add SECRET_KEY to backend-core/.env. Generate with:
#   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
if not settings.SECRET_KEY or settings.SECRET_KEY == "placeholder-secret-key-must-be-replaced-in-production":
    raise RuntimeError(
        "SECRET_KEY is not configured — refusing to start (JWTs would be signed "
        "with a known placeholder). Set SECRET_KEY in the environment or "
        "backend-core/.env."
    )
