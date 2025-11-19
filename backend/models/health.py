"""
PrawnikGPT Backend - Health Check Models

Pydantic models for health check endpoint responses.
These models ensure type safety and automatic validation for health status reporting.

Endpoint: GET /health
"""

from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


# Type alias for service status values
ServiceStatus = Literal["ok", "degraded", "down"]


class ServiceHealthStatus(BaseModel):
    """
    Health status for individual services.
    
    Each service returns one of three states:
    - ok: Service is fully operational
    - degraded: Service is experiencing issues but partially functional
    - down: Service is not available
    """
    
    database: ServiceStatus = Field(
        ...,
        description="PostgreSQL database status (via Supabase)"
    )
    ollama: ServiceStatus = Field(
        ...,
        description="OLLAMA LLM service status"
    )
    supabase_auth: ServiceStatus = Field(
        ...,
        description="Supabase authentication service status"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "database": "ok",
                "ollama": "ok",
                "supabase_auth": "ok"
            }
        }
    }


class HealthResponse(BaseModel):
    """
    Overall system health response.
    
    The overall status is derived from individual service statuses:
    - ok: All services are operational
    - degraded: At least one service is down/degraded, but system is partially functional
    - down: All critical services are down
    
    Used by:
    - Load balancers for health checks
    - Monitoring systems for alerting
    - DevOps dashboards
    """
    
    status: ServiceStatus = Field(
        ...,
        description="Overall system health status"
    )
    version: str = Field(
        ...,
        description="Application version (semver)"
    )
    timestamp: datetime = Field(
        ...,
        description="Timestamp of health check (ISO 8601)"
    )
    services: ServiceHealthStatus = Field(
        ...,
        description="Individual service health statuses"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "status": "ok",
                    "version": "1.0.0",
                    "timestamp": "2025-11-19T10:30:00Z",
                    "services": {
                        "database": "ok",
                        "ollama": "ok",
                        "supabase_auth": "ok"
                    }
                },
                {
                    "status": "degraded",
                    "version": "1.0.0",
                    "timestamp": "2025-11-19T10:30:00Z",
                    "services": {
                        "database": "ok",
                        "ollama": "down",
                        "supabase_auth": "ok"
                    }
                }
            ]
        }
    }

