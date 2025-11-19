"""
PrawnikGPT Backend - Global Error Handler

Centralized error handling for FastAPI application.
Converts exceptions to standardized ErrorResponse format.

Features:
- Custom exception mapping
- Request ID tracking
- Error logging with context
- Graceful 500 error handling
"""

import logging
import traceback
import uuid
from datetime import datetime
from typing import Union
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.models.error import ApiErrorCode, ErrorResponse, ErrorDetail, create_error_response
from backend.services.exceptions import (
    PrawnikGPTError,
    NoRelevantActsError,
    OLLAMAUnavailableError,
    OLLAMATimeoutError,
    EmbeddingGenerationError,
    GenerationTimeoutError,
    DatabaseUnavailableError
)

logger = logging.getLogger(__name__)


# =========================================================================
# REQUEST ID TRACKING
# =========================================================================

def generate_request_id() -> str:
    """Generate unique request ID for tracking."""
    return f"req_{uuid.uuid4().hex[:12]}"


async def add_request_id_middleware(request: Request, call_next):
    """
    Middleware to add request ID to all requests.
    
    Request ID is:
    - Stored in request.state for use in handlers
    - Added to response headers
    - Included in error responses
    """
    # Generate or use provided request ID
    request_id = request.headers.get("X-Request-ID") or generate_request_id()
    request.state.request_id = request_id
    
    # Process request
    response = await call_next(request)
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    return response


# =========================================================================
# EXCEPTION TO HTTP STATUS MAPPING
# =========================================================================

def map_exception_to_status(exception: Exception) -> int:
    """
    Map exception type to HTTP status code.
    
    Args:
        exception: Exception instance
        
    Returns:
        int: HTTP status code
    """
    # Custom exceptions
    if isinstance(exception, NoRelevantActsError):
        return status.HTTP_404_NOT_FOUND
    
    if isinstance(exception, (OLLAMATimeoutError, GenerationTimeoutError)):
        return status.HTTP_504_GATEWAY_TIMEOUT
    
    if isinstance(exception, (OLLAMAUnavailableError, DatabaseUnavailableError)):
        return status.HTTP_503_SERVICE_UNAVAILABLE
    
    if isinstance(exception, EmbeddingGenerationError):
        return status.HTTP_500_INTERNAL_SERVER_ERROR
    
    if isinstance(exception, ValueError):
        return status.HTTP_400_BAD_REQUEST
    
    # Default to 500
    return status.HTTP_500_INTERNAL_SERVER_ERROR


def map_exception_to_error_code(exception: Exception) -> ApiErrorCode:
    """
    Map exception type to API error code.
    
    Args:
        exception: Exception instance
        
    Returns:
        ApiErrorCode: Standardized error code
    """
    # Custom exceptions
    if isinstance(exception, NoRelevantActsError):
        return ApiErrorCode.NOT_FOUND
    
    if isinstance(exception, (OLLAMATimeoutError, GenerationTimeoutError)):
        return ApiErrorCode.GATEWAY_TIMEOUT
    
    if isinstance(exception, OLLAMAUnavailableError):
        return ApiErrorCode.LLM_SERVICE_UNAVAILABLE
    
    if isinstance(exception, DatabaseUnavailableError):
        return ApiErrorCode.SERVICE_UNAVAILABLE
    
    if isinstance(exception, EmbeddingGenerationError):
        return ApiErrorCode.INTERNAL_SERVER_ERROR
    
    if isinstance(exception, ValueError):
        return ApiErrorCode.VALIDATION_ERROR
    
    # Default
    return ApiErrorCode.INTERNAL_SERVER_ERROR


# =========================================================================
# EXCEPTION HANDLERS
# =========================================================================

async def custom_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for custom exceptions.
    
    Converts PrawnikGPTError exceptions to ErrorResponse format.
    
    Args:
        request: FastAPI request
        exc: Exception instance
        
    Returns:
        JSONResponse: Standardized error response
    """
    # Get request ID
    request_id = getattr(request.state, "request_id", None)
    
    # Map exception to status and code
    status_code = map_exception_to_status(exc)
    error_code = map_exception_to_error_code(exc)
    
    # Create error response
    error_response = create_error_response(
        code=error_code,
        message=str(exc),
        details={"exception_type": type(exc).__name__},
        request_id=request_id
    )
    
    # Log error
    logger.error(
        f"Request {request_id} failed: {error_code} - {str(exc)}",
        extra={
            "request_id": request_id,
            "error_code": error_code,
            "exception_type": type(exc).__name__,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_response.model_dump(mode='json')
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
    """
    Handler for Pydantic validation errors.
    
    Args:
        request: FastAPI request
        exc: RequestValidationError
        
    Returns:
        JSONResponse: Validation error response with field details
    """
    # Get request ID
    request_id = getattr(request.state, "request_id", None)
    
    # Extract validation errors
    validation_errors = []
    for error in exc.errors():
        validation_errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    # Create error response
    error_response = create_error_response(
        code=ApiErrorCode.VALIDATION_ERROR,
        message="Request validation failed",
        details={"validation_errors": validation_errors},
        request_id=request_id
    )
    
    # Log error
    logger.warning(
        f"Request {request_id} validation failed: {len(validation_errors)} errors",
        extra={
            "request_id": request_id,
            "validation_errors": validation_errors,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump(mode='json')
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException
) -> JSONResponse:
    """
    Handler for HTTP exceptions (401, 403, 404, etc.).
    
    Args:
        request: FastAPI request
        exc: HTTPException
        
    Returns:
        JSONResponse: HTTP error response
    """
    # Get request ID
    request_id = getattr(request.state, "request_id", None)
    
    # Map status code to error code
    status_to_code = {
        401: ApiErrorCode.UNAUTHORIZED,
        403: ApiErrorCode.FORBIDDEN,
        404: ApiErrorCode.NOT_FOUND,
        409: ApiErrorCode.CONFLICT,
        410: ApiErrorCode.GONE,
        429: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        500: ApiErrorCode.INTERNAL_SERVER_ERROR,
        503: ApiErrorCode.SERVICE_UNAVAILABLE,
        504: ApiErrorCode.GATEWAY_TIMEOUT
    }
    
    error_code = status_to_code.get(exc.status_code, ApiErrorCode.INTERNAL_SERVER_ERROR)
    
    # Create error response
    error_response = create_error_response(
        code=error_code,
        message=exc.detail,
        request_id=request_id
    )
    
    # Log error (only for 5xx errors)
    if exc.status_code >= 500:
        logger.error(
            f"Request {request_id} failed: HTTP {exc.status_code} - {exc.detail}",
            extra={
                "request_id": request_id,
                "status_code": exc.status_code,
                "path": request.url.path,
                "method": request.method
            }
        )
    else:
        logger.debug(f"Request {request_id}: HTTP {exc.status_code} - {exc.detail}")
    
    # Preserve headers from original exception (e.g., WWW-Authenticate)
    headers = getattr(exc, "headers", None)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(mode='json'),
        headers=headers
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception
) -> JSONResponse:
    """
    Handler for unhandled exceptions (500 errors).
    
    Catches all exceptions not handled by other handlers.
    Logs full traceback and returns generic error to client.
    
    Args:
        request: FastAPI request
        exc: Exception instance
        
    Returns:
        JSONResponse: Generic 500 error response
    """
    # Get request ID
    request_id = getattr(request.state, "request_id", None)
    
    # Log full error with traceback
    logger.error(
        f"Unhandled exception in request {request_id}",
        exc_info=True,
        extra={
            "request_id": request_id,
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc()
        }
    )
    
    # Create generic error response (don't expose internal details)
    error_response = create_error_response(
        code=ApiErrorCode.INTERNAL_SERVER_ERROR,
        message="An unexpected error occurred. Please try again later.",
        details={"error_type": type(exc).__name__} if not settings.is_production else None,
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump(mode='json')
    )


# =========================================================================
# REGISTER HANDLERS
# =========================================================================

def register_error_handlers(app):
    """
    Register all error handlers with FastAPI app.
    
    Args:
        app: FastAPI application instance
        
    Usage:
        ```python
        from backend.middleware.error_handler import register_error_handlers
        
        app = FastAPI()
        register_error_handlers(app)
        ```
    """
    # Custom exceptions
    app.add_exception_handler(PrawnikGPTError, custom_exception_handler)
    
    # Validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # HTTP exceptions
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    
    # Catch-all for unhandled exceptions
    app.add_exception_handler(Exception, unhandled_exception_handler)
    
    logger.info("Error handlers registered")

