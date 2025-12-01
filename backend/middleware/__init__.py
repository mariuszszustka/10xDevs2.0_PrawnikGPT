"""
PrawnikGPT Backend - Middleware Package

This package contains FastAPI middleware for cross-cutting concerns.

Middleware:
- auth.py: JWT validation and user authentication
- rate_limit.py: Rate limiting (per user, per IP)
- error_handler.py: Global error handling and logging
"""

from backend.middleware.auth import (
    get_current_user,
    get_optional_user,
    create_test_token
)
from backend.middleware.rate_limit import (
    check_rate_limit,
    check_rate_limit_health,
    add_rate_limit_headers
)
from backend.middleware.error_handler import (
    register_error_handlers,
    add_request_id_middleware
)

__all__ = [
    # Auth
    "get_current_user",
    "get_optional_user",
    "create_test_token",
    # Rate Limiting
    "check_rate_limit",
    "check_rate_limit_health",
    "add_rate_limit_headers",
    # Error Handling
    "register_error_handlers",
    "add_request_id_middleware"
]
