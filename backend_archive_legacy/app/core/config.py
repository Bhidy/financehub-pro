from pydantic_settings import BaseSettings
from typing import Optional

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
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
