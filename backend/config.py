"""
PrawnikGPT Backend - Configuration Management

This module handles all environment variables and application configuration
using Pydantic Settings for type safety and validation.

Environment variables are loaded from .env file (see .env.example for template).
Backend looks for .env in the following order:
1. backend/.env (when running from backend directory)
2. ../.env (root directory, when running from project root)
3. Environment variables (highest priority)
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


def _find_env_file() -> str:
    """
    Find .env file in a predictable location.
    
    Checks in order:
    1. backend/.env (when running from backend directory)
    2. ../.env (root directory, when running from project root)
    3. .env (current working directory as fallback)
    
    Returns:
        str: Path to .env file
    """
    # Get the directory where this config.py file is located
    backend_dir = Path(__file__).parent
    root_dir = backend_dir.parent
    
    # Check backend/.env first
    backend_env = backend_dir / ".env"
    if backend_env.exists():
        return str(backend_env)
    
    # Check root/.env
    root_env = root_dir / ".env"
    if root_env.exists():
        return str(root_env)
    
    # Fallback to .env in current working directory
    return ".env"


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
        # Try to find .env in backend/ directory first, then in root directory
        env_file=_find_env_file(),
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
# CONFIGURATION VALIDATION
# =========================================================================

def _validate_settings(settings_instance: Settings) -> None:
    """
    Validate settings on startup and provide helpful error messages.
    
    Checks:
    - Required environment variables are set
    - URLs are in valid format
    - Critical configuration is present
    
    Raises:
        ValueError: If validation fails with helpful error message
    """
    import re
    from urllib.parse import urlparse
    
    errors = []
    warnings = []
    
    # Check required Supabase variables
    if not settings_instance.supabase_url:
        errors.append("SUPABASE_URL is required but not set")
    else:
        try:
            parsed = urlparse(settings_instance.supabase_url)
            if not parsed.scheme or not parsed.netloc:
                errors.append(f"SUPABASE_URL is invalid: {settings_instance.supabase_url}")
        except Exception as e:
            errors.append(f"SUPABASE_URL validation failed: {e}")
    
    if not settings_instance.supabase_service_key:
        errors.append("SUPABASE_SERVICE_KEY is required but not set")
    elif len(settings_instance.supabase_service_key) < 20:
        warnings.append("SUPABASE_SERVICE_KEY seems too short (expected JWT token)")
    
    if not settings_instance.supabase_jwt_secret:
        errors.append("SUPABASE_JWT_SECRET is required but not set")
    elif len(settings_instance.supabase_jwt_secret) < 32:
        warnings.append("SUPABASE_JWT_SECRET should be at least 32 characters long")
    
    # Check required OLLAMA variables
    if not settings_instance.ollama_host:
        errors.append("OLLAMA_HOST is required but not set")
    else:
        try:
            parsed = urlparse(settings_instance.ollama_host)
            if not parsed.scheme or not parsed.netloc:
                errors.append(f"OLLAMA_HOST is invalid: {settings_instance.ollama_host}")
        except Exception as e:
            errors.append(f"OLLAMA_HOST validation failed: {e}")
    
    # Check if .env file was found
    env_file_path = _find_env_file()
    if env_file_path == ".env":
        # Check if .env actually exists in current directory
        from pathlib import Path
        if not Path(".env").exists():
            warnings.append(
                f"No .env file found. "
                f"Checked: backend/.env, ../.env, .env. "
                f"Using environment variables only."
            )
    
    # Report errors (fatal)
    if errors:
        error_msg = "Configuration validation failed:\n"
        error_msg += "\n".join(f"  ❌ {error}" for error in errors)
        error_msg += "\n\n"
        error_msg += "Please check your .env file or environment variables.\n"
        error_msg += f"See .env.example for required variables.\n"
        error_msg += f"Expected .env location: {env_file_path}"
        raise ValueError(error_msg)
    
    # Report warnings (non-fatal)
    if warnings:
        import logging
        logger = logging.getLogger(__name__)
        for warning in warnings:
            logger.warning(f"Configuration warning: {warning}")


# =========================================================================
# GLOBAL SETTINGS INSTANCE
# =========================================================================

# Create a single instance of settings to be imported throughout the app
# Validation happens on first import to catch errors early
try:
    settings = Settings()
    _validate_settings(settings)
except Exception as e:
    # Re-raise with helpful context
    import sys
    print("\n" + "=" * 80, file=sys.stderr)
    print("PrawnikGPT Backend - Configuration Error", file=sys.stderr)
    print("=" * 80, file=sys.stderr)
    print(str(e), file=sys.stderr)
    print("=" * 80 + "\n", file=sys.stderr)
    raise

