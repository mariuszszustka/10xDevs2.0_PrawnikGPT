"""
PrawnikGPT Backend - Health Check Router

Endpoint: GET /health

Public endpoint for monitoring system health and service availability.
Used by load balancers, monitoring systems, and DevOps tools.

No authentication required.
Rate limited: 60 requests per minute per IP.
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from backend.models.health import HealthResponse, ServiceHealthStatus
from backend.services.health_check import perform_health_check
from backend.services.rag_pipeline import get_rag_pipeline_metrics
from backend.middleware.rate_limit import check_rate_limit_health
from backend.config import settings

logger = logging.getLogger(__name__)

# Create router for health check endpoints
router = APIRouter(
    prefix="",  # No prefix - endpoint is at root level
    tags=["health"],
    dependencies=[Depends(check_rate_limit_health)],  # Rate limit: 60 req/min per IP
    responses={
        200: {
            "description": "System is operational (ok or degraded)",
            "model": HealthResponse
        },
        429: {
            "description": "Rate limit exceeded"
        },
        503: {
            "description": "System is down (all services unavailable)",
            "model": HealthResponse
        }
    }
)


@router.get(
    "/health",
    summary="System health check",
    description="""
    Check health status of all critical services.
    
    Optional query parameter:
    - `metrics=true`: Include RAG pipeline metrics in response
    """,
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health Check",
    description="""
    Check the health status of all critical services.
    
    Returns:
    - 200 OK: System is operational (status: "ok" or "degraded")
    - 503 Service Unavailable: System is down (status: "down")
    
    Individual service statuses:
    - database: PostgreSQL database connectivity
    - ollama: OLLAMA LLM service availability
    - supabase_auth: Authentication service configuration
    
    This endpoint does not require authentication and is safe to call
    frequently for monitoring purposes.
    """,
    response_description="Current system health status"
)
async def health_check():
    """
    GET /health - System health check endpoint.
    
    Performs concurrent health checks on all critical services:
    - Database (Supabase PostgreSQL)
    - OLLAMA (LLM service)
    - Supabase Auth (JWT configuration)
    
    Returns:
        HealthResponse: System health status with individual service statuses
        
    Status Codes:
        200: System operational (ok or degraded)
        503: System down (all services unavailable)
    """
    try:
        # Perform health check for all services
        overall_status, service_statuses = await perform_health_check()
        
        # Build response
        response_data = HealthResponse(
            status=overall_status,
            version=settings.app_version,
            timestamp=datetime.utcnow(),
            services=ServiceHealthStatus(
                database=service_statuses["database"],
                ollama=service_statuses["ollama"],
                supabase_auth=service_statuses["supabase_auth"]
            )
        )
        
        # Return 503 if system is completely down
        if overall_status == "down":
            logger.error("Health check: System DOWN")
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=response_data.model_dump(mode='json')
            )
        
        # Return 200 for ok or degraded status
        if overall_status == "degraded":
            logger.warning(f"Health check: System DEGRADED - {service_statuses}")
        else:
            logger.debug("Health check: System OK")
        
        return response_data
        
    except Exception as e:
        # If health check itself fails, return 503
        logger.error(f"Health check endpoint failed: {e}", exc_info=True)
        
        error_response = HealthResponse(
            status="down",
            version=settings.app_version,
            timestamp=datetime.utcnow(),
            services=ServiceHealthStatus(
                database="down",
                ollama="down",
                supabase_auth="down"
            )
        )
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=error_response.model_dump(mode='json')
        )


@router.get(
    "/health/metrics",
    summary="RAG Pipeline Metrics",
    description="""
    Get performance metrics for RAG pipeline.
    
    Returns aggregated statistics including:
    - Generation times (fast/accurate models)
    - Pipeline execution times
    - Step-by-step durations
    - Success/failure rates
    - Cache hit rates
    
    This endpoint does not require authentication.
    """,
    response_description="RAG pipeline performance metrics"
)
async def health_metrics():
    """
    GET /health/metrics - RAG pipeline metrics endpoint.
    
    Returns current aggregated metrics for RAG pipeline including:
    - Generation times (average, min, max) for fast/accurate responses
    - Pipeline execution times
    - Individual step durations
    - Success/failure rates
    - Cache hit rate
    
    Returns:
        dict: Aggregated metrics dictionary
    """
    try:
        metrics = get_rag_pipeline_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Metrics endpoint failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Failed to retrieve metrics"}
        )

