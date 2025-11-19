"""
PrawnikGPT Backend - FastAPI Application Entry Point

Main FastAPI application with CORS, middleware, and router configuration.

Environment: Configured via .env file (see .env.example)
Docs: Available at /docs (Swagger UI) and /redoc (ReDoc)
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.routers import health, queries, ratings, legal_acts, onboarding
from backend.middleware import (
    register_error_handlers,
    add_request_id_middleware,
    add_rate_limit_headers
)

# =========================================================================
# LOGGING CONFIGURATION
# =========================================================================

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# =========================================================================
# FASTAPI APPLICATION
# =========================================================================

app = FastAPI(
    title="PrawnikGPT API",
    description="""
    REST API for PrawnikGPT - Legal Question Answering System
    
    Features:
    - RAG-based legal question answering
    - Fast response (<15s) with small model (7B-13B)
    - Accurate response (up to 240s) with large model (120B)
    - Query history management
    - Rating system for responses
    - Legal acts database with relations
    
    Tech Stack:
    - FastAPI (Python 3.11+)
    - Supabase (PostgreSQL + pgvector)
    - OLLAMA (local LLM hosting)
    - Redis (optional, for caching)
    """,
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# =========================================================================
# MIDDLEWARE
# =========================================================================

# CORS Middleware (must be first for proper headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limit Headers Middleware
app.middleware("http")(add_rate_limit_headers)

# Request ID Middleware
app.middleware("http")(add_request_id_middleware)

logger.info(f"CORS enabled for origins: {settings.cors_origins_list}")
logger.info("Middleware configured: CORS, Rate Limiting, Request ID")

# =========================================================================
# ERROR HANDLERS
# =========================================================================

# Register global error handlers
register_error_handlers(app)

logger.info("Global error handlers registered")

# =========================================================================
# ROUTERS
# =========================================================================

# Include health check router (no auth required)
app.include_router(health.router)
logger.info("Health check router registered")

# Include query management router (auth required)
app.include_router(queries.router)
logger.info("Query management router registered")

# Include rating management router (auth required)
app.include_router(ratings.router)
logger.info("Rating management router registered")

# Include legal acts router (public endpoints)
app.include_router(legal_acts.router)
logger.info("Legal acts router registered")

# Include onboarding router (public endpoint)
app.include_router(onboarding.router)
logger.info("Onboarding router registered")

# =========================================================================
# STARTUP/SHUTDOWN EVENTS
# =========================================================================

@app.on_event("startup")
async def startup_event():
    """
    Application startup handler.
    
    Performs initialization tasks:
    - Log application configuration
    - Verify service connectivity (optional)
    """
    logger.info("=" * 80)
    logger.info("PrawnikGPT Backend Starting...")
    logger.info("=" * 80)
    logger.info(f"Version: {settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Supabase URL: {settings.supabase_url}")
    logger.info(f"OLLAMA Host: {settings.ollama_host}")
    logger.info(f"Redis URL: {settings.redis_url or 'Not configured (optional)'}")
    logger.info("=" * 80)


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown handler.
    
    Performs cleanup tasks:
    - Close database connections
    - Flush logs
    """
    logger.info("PrawnikGPT Backend shutting down...")


# =========================================================================
# ROOT ENDPOINT (for testing)
# =========================================================================

@app.get(
    "/",
    tags=["root"],
    summary="Root endpoint",
    description="Simple endpoint to verify API is running"
)
async def root():
    """
    Root endpoint - verifies API is accessible.
    
    Returns:
        dict: Welcome message with API info
    """
    return {
        "message": "PrawnikGPT API",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }
