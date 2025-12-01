"""
PrawnikGPT Backend - Configuration Management

This module handles all environment variables and application configuration
using Pydantic Settings for type safety and validation.

Environment variables are loaded from .env file (see .env.example for template).
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    """
    Application settings with type validation and environment variable loading.
    
    All settings are loaded from environment variables or .env file.
    See .env.example for configuration examples and deployment scenarios.
    """
    
    # =========================================================================
    # SUPABASE CONFIGURATION
    # =========================================================================
    
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str
    
    # =========================================================================
    # OLLAMA CONFIGURATION
    # =========================================================================
    
    ollama_host: str
    ollama_fast_model: str = "mistral:7b"
    ollama_accurate_model: str = "gpt-oss:120b"
    ollama_embedding_model: str = "nomic-embed-text"
    
    # Timeouts (seconds)
    ollama_fast_timeout: int = 15
    ollama_accurate_timeout: int = 240
    ollama_embedding_timeout: int = 30
    
    # =========================================================================
    # REDIS CONFIGURATION (Optional)
    # =========================================================================
    
    redis_url: str | None = None
    redis_rag_context_ttl: int = 300  # 5 minutes
    
    # =========================================================================
    # APPLICATION CONFIGURATION
    # =========================================================================
    
    app_version: str = "1.0.0"
    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"
    debug: bool = True
    
    # =========================================================================
    # RATE LIMITING
    # =========================================================================
    
    rate_limit_per_user: int = 10  # requests per minute
    rate_limit_per_ip: int = 30    # requests per minute
    rate_limit_health_per_ip: int = 60  # requests per minute for health endpoint
    
    # =========================================================================
    # CORS CONFIGURATION
    # =========================================================================
    
    cors_origins: str = "http://localhost:4321,http://localhost:3000"
    
    # =========================================================================
    # PYDANTIC SETTINGS CONFIGURATION
    # =========================================================================
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into list"""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == "development"


# =========================================================================
# GLOBAL SETTINGS INSTANCE
# =========================================================================

# Create a single instance of settings to be imported throughout the app
settings = Settings()

