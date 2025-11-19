"""
PrawnikGPT Backend - Error Response Models

Pydantic models for standardized error responses across all API endpoints.
Follows RFC 7807 Problem Details for HTTP APIs standard.

All error responses use this consistent format for better client handling.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ApiErrorCode(str, Enum):
    """
    Standard error codes used across the API.
    
    Provides consistent error identification for client error handling.
    """
    # Client errors (4xx)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    GONE = "GONE"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Server errors (5xx)
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    GATEWAY_TIMEOUT = "GATEWAY_TIMEOUT"
    
    # Domain-specific errors
    GENERATION_TIMEOUT = "GENERATION_TIMEOUT"
    LLM_SERVICE_UNAVAILABLE = "LLM_SERVICE_UNAVAILABLE"


class ErrorDetail(BaseModel):
    """
    Detailed error information.
    
    Contains specific error context that can help with debugging
    and providing user-friendly error messages.
    """
    code: ApiErrorCode = Field(
        ...,
        description="Machine-readable error code"
    )
    message: str = Field(
        ...,
        description="Human-readable error message"
    )
    details: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional error context (field errors, validation details, etc.)"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the error occurred (ISO 8601)"
    )
    request_id: Optional[str] = Field(
        None,
        description="Request ID for tracking and debugging"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "code": "VALIDATION_ERROR",
                "message": "Query text must be between 10 and 1000 characters",
                "details": {
                    "field": "query_text",
                    "provided_length": 5,
                    "min_length": 10,
                    "max_length": 1000
                },
                "timestamp": "2025-11-19T10:30:00Z",
                "request_id": "req_abc123xyz"
            }
        }
    }


class ErrorResponse(BaseModel):
    """
    Standard error response wrapper.
    
    All error responses (4xx, 5xx) use this consistent structure
    for predictable client-side error handling.
    
    Follows RFC 7807 Problem Details standard.
    """
    error: ErrorDetail = Field(
        ...,
        description="Error details"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Query not found",
                        "details": {
                            "query_id": "123e4567-e89b-12d3-a456-426614174000"
                        },
                        "timestamp": "2025-11-19T10:30:00Z",
                        "request_id": "req_abc123xyz"
                    }
                },
                {
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Rate limit exceeded. Please try again later.",
                        "details": {
                            "limit": 10,
                            "window_seconds": 60,
                            "retry_after_seconds": 45
                        },
                        "timestamp": "2025-11-19T10:30:00Z"
                    }
                },
                {
                    "error": {
                        "code": "GENERATION_TIMEOUT",
                        "message": "LLM generation timed out. Please try again.",
                        "details": {
                            "timeout_seconds": 15,
                            "response_type": "fast"
                        },
                        "timestamp": "2025-11-19T10:30:00Z"
                    }
                }
            ]
        }
    }


# =========================================================================
# HELPER FUNCTIONS FOR CREATING ERROR RESPONSES
# =========================================================================

def create_error_response(
    code: ApiErrorCode,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> ErrorResponse:
    """
    Helper function to create standardized error responses.
    
    Args:
        code: Error code from ApiErrorCode enum
        message: Human-readable error message
        details: Optional additional context
        request_id: Optional request ID for tracking
        
    Returns:
        ErrorResponse: Standardized error response
        
    Example:
        ```python
        return create_error_response(
            code=ApiErrorCode.NOT_FOUND,
            message="Query not found",
            details={"query_id": query_id},
            request_id=request.headers.get("X-Request-ID")
        )
        ```
    """
    return ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            details=details,
            timestamp=datetime.utcnow(),
            request_id=request_id
        )
    )

