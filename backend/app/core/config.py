import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Digital Twin AI"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/digital_twin"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/digital_twin"
    
    # JWT Authentication
    JWT_SECRET: str = "super_secret_jwt_key_development_must_override_in_production_32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Rate Limiting
    RATE_LIMIT_AUTH_PER_MINUTE: int = 15
    RATE_LIMIT_CHAT_PER_MINUTE: int = 25
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # LLM Provider Configuration
    LLM_PROVIDER_CHAIN: Union[List[str], str] = ["gemini", "openai_compatible", "offline"]
    DEMO_MODE: bool = False
    ENABLE_DEMO_LOGIN: bool = False


    # Google Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GEMINI_FALLBACK_MODELS: Union[List[str], str] = ["gemini-3.8-flash-lite", "gemini-3.0-flash"]

    # OpenAI-Compatible Provider
    OPENAI_COMPAT_BASE_URL: str = ""
    OPENAI_COMPAT_API_KEY: str = ""
    OPENAI_COMPAT_MODEL: str = ""

    @field_validator("LLM_PROVIDER_CHAIN", "GEMINI_FALLBACK_MODELS", mode="before")
    @classmethod
    def assemble_string_list(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v.strip():
                return []
            if not v.startswith("["):
                return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i).strip() for i in v if str(i).strip()]
        return []

    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    _backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    _repo_dir = os.path.dirname(_backend_dir)
    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(_backend_dir, ".env"),
            os.path.join(_repo_dir, ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
