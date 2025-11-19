"""
PrawnikGPT Backend - Health Check Service

This module implements health check logic for all critical services:
- Database (Supabase PostgreSQL)
- OLLAMA (LLM service)
- Supabase Auth (JWT validation)

All checks run asynchronously with timeouts to ensure fast responses.
"""

import logging
import asyncio
import httpx
from typing import Literal

from backend.config import settings
from backend.db.supabase_client import check_database_health

logger = logging.getLogger(__name__)

# Type alias for service status
ServiceStatus = Literal["ok", "degraded", "down"]


# =========================================================================
# INDIVIDUAL SERVICE CHECKS
# =========================================================================

async def check_database() -> ServiceStatus:
    """
    Check database connectivity and responsiveness.
    
    Performs a simple SELECT query to verify database is accessible.
    Times out after 2 seconds to prevent hanging.
    
    Returns:
        ServiceStatus: "ok" if responsive, "down" if not
    """
    try:
        # Use asyncio timeout to prevent hanging
        async with asyncio.timeout(2.0):
            is_healthy = await check_database_health()
            
            if is_healthy:
                logger.debug("Database health check: OK")
                return "ok"
            else:
                logger.warning("Database health check: FAILED")
                return "down"
                
    except asyncio.TimeoutError:
        logger.warning("Database health check: TIMEOUT")
        return "down"
    except Exception as e:
        logger.error(f"Database health check: ERROR - {e}")
        return "down"


async def check_ollama() -> ServiceStatus:
    """
    Check OLLAMA service availability.
    
    Sends GET request to /api/version endpoint to verify service is running.
    Times out after 2 seconds.
    
    Returns:
        ServiceStatus: "ok" if responsive, "down" if not
    """
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.ollama_host}/api/version")
            
            if response.status_code == 200:
                logger.debug("OLLAMA health check: OK")
                return "ok"
            else:
                logger.warning(f"OLLAMA health check: FAILED (status {response.status_code})")
                return "down"
                
    except httpx.TimeoutException:
        logger.warning("OLLAMA health check: TIMEOUT")
        return "down"
    except httpx.ConnectError:
        logger.warning("OLLAMA health check: CONNECTION REFUSED")
        return "down"
    except Exception as e:
        logger.error(f"OLLAMA health check: ERROR - {e}")
        return "down"


async def check_supabase_auth() -> ServiceStatus:
    """
    Check Supabase Auth configuration.
    
    Validates that JWT secret is properly configured.
    This is a local check (no network request) so it's always fast.
    
    Returns:
        ServiceStatus: "ok" if configured, "down" if not
    """
    try:
        # Check if JWT secret is configured and non-empty
        if not settings.supabase_jwt_secret:
            logger.error("Supabase Auth check: JWT_SECRET not configured")
            return "down"
        
        # Basic validation: JWT secret should be at least 32 characters
        if len(settings.supabase_jwt_secret) < 32:
            logger.warning("Supabase Auth check: JWT_SECRET too short (potential security issue)")
            return "degraded"
        
        logger.debug("Supabase Auth health check: OK")
        return "ok"
        
    except Exception as e:
        logger.error(f"Supabase Auth health check: ERROR - {e}")
        return "down"


# =========================================================================
# AGGREGATED HEALTH CHECK
# =========================================================================

async def perform_health_check() -> tuple[ServiceStatus, dict[str, ServiceStatus]]:
    """
    Perform health check for all services concurrently.
    
    Runs all checks in parallel using asyncio.gather() for optimal performance.
    Determines overall system status based on individual service statuses.
    
    Overall status logic:
    - All services "ok" → overall "ok"
    - At least one service "down" or "degraded" → overall "degraded"
    - All services "down" → overall "down"
    
    Returns:
        tuple: (overall_status, service_statuses_dict)
            - overall_status: ServiceStatus for entire system
            - service_statuses_dict: Individual status for each service
    """
    try:
        # Run all checks concurrently for best performance
        database_status, ollama_status, auth_status = await asyncio.gather(
            check_database(),
            check_ollama(),
            check_supabase_auth(),
            return_exceptions=False  # Let exceptions propagate
        )
        
        # Build service status dictionary
        service_statuses = {
            "database": database_status,
            "ollama": ollama_status,
            "supabase_auth": auth_status
        }
        
        # Determine overall status
        all_statuses = [database_status, ollama_status, auth_status]
        
        if all(status == "ok" for status in all_statuses):
            overall_status = "ok"
        elif all(status == "down" for status in all_statuses):
            overall_status = "down"
        else:
            overall_status = "degraded"
        
        logger.info(f"Health check completed: {overall_status} - {service_statuses}")
        
        return overall_status, service_statuses
        
    except Exception as e:
        logger.error(f"Health check failed with unexpected error: {e}")
        # If health check itself fails, report all services as down
        return "down", {
            "database": "down",
            "ollama": "down",
            "supabase_auth": "down"
        }

