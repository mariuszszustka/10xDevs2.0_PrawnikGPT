"""
PrawnikGPT Backend - Rate Limiting Middleware

Rate limiting for API endpoints to prevent abuse.

Limits:
- 10 requests/minute per authenticated user
- 30 requests/minute per IP address (for unauthenticated)

Uses sliding window algorithm with Redis backend (optional).
Falls back to in-memory storage if Redis unavailable.
"""

import logging
import time
from typing import Optional, Dict, Tuple
from collections import defaultdict, deque
from fastapi import Request, HTTPException, status

from backend.config import settings

logger = logging.getLogger(__name__)


# =========================================================================
# CONFIGURATION
# =========================================================================

# Rate limits (requests per minute)
RATE_LIMIT_PER_USER = settings.rate_limit_per_user  # 10 req/min
RATE_LIMIT_PER_IP = settings.rate_limit_per_ip      # 30 req/min

# Window size for sliding window algorithm
WINDOW_SIZE_SECONDS = 60  # 1 minute


# =========================================================================
# IN-MEMORY RATE LIMITER (fallback)
# =========================================================================

class InMemoryRateLimiter:
    """
    In-memory rate limiter using sliding window algorithm.
    
    Fallback when Redis is not available.
    Uses deque to store timestamps of recent requests.
    """
    
    def __init__(self):
        # Store timestamps per key (user_id or IP)
        # Format: {key: deque([timestamp1, timestamp2, ...])}
        self.requests: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.last_cleanup = time.time()
    
    def _cleanup_old_entries(self):
        """Remove entries older than 5 minutes to prevent memory leak."""
        current_time = time.time()
        
        # Cleanup every 5 minutes
        if current_time - self.last_cleanup < 300:
            return
        
        cutoff_time = current_time - 300  # 5 minutes ago
        
        # Remove old keys
        keys_to_remove = []
        for key, timestamps in self.requests.items():
            # Remove old timestamps
            while timestamps and timestamps[0] < cutoff_time:
                timestamps.popleft()
            
            # Remove key if no recent requests
            if not timestamps:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.requests[key]
        
        self.last_cleanup = current_time
        logger.debug(f"Rate limiter cleanup: removed {len(keys_to_remove)} inactive keys")
    
    def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int = WINDOW_SIZE_SECONDS
    ) -> Tuple[bool, int, int]:
        """
        Check if request is within rate limit.
        
        Args:
            key: Identifier (user_id or IP)
            limit: Max requests per window
            window_seconds: Window size in seconds
            
        Returns:
            Tuple[bool, int, int]: (is_allowed, requests_made, retry_after_seconds)
        """
        current_time = time.time()
        cutoff_time = current_time - window_seconds
        
        # Get timestamps for this key
        timestamps = self.requests[key]
        
        # Remove timestamps outside window
        while timestamps and timestamps[0] < cutoff_time:
            timestamps.popleft()
        
        requests_in_window = len(timestamps)
        
        # Check if limit exceeded
        if requests_in_window >= limit:
            # Calculate retry_after (seconds until oldest request expires)
            if timestamps:
                oldest_timestamp = timestamps[0]
                retry_after = int(window_seconds - (current_time - oldest_timestamp)) + 1
            else:
                retry_after = window_seconds
            
            logger.warning(
                f"Rate limit exceeded for {key}: {requests_in_window}/{limit} requests"
            )
            return False, requests_in_window, retry_after
        
        # Add current timestamp
        timestamps.append(current_time)
        
        # Periodic cleanup
        self._cleanup_old_entries()
        
        return True, requests_in_window + 1, 0


# Global in-memory rate limiter instance
in_memory_limiter = InMemoryRateLimiter()


# =========================================================================
# REDIS RATE LIMITER (optional, for production)
# =========================================================================

class RedisRateLimiter:
    """
    Redis-based rate limiter (TODO - implement when Redis added).
    
    More efficient and works across multiple backend instances.
    """
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        # TODO: Initialize Redis connection
        logger.warning("Redis rate limiter not yet implemented, using in-memory fallback")
    
    def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int = WINDOW_SIZE_SECONDS
    ) -> Tuple[bool, int, int]:
        """Check rate limit using Redis."""
        # TODO: Implement Redis-based rate limiting
        # For now, fall back to in-memory
        return in_memory_limiter.check_rate_limit(key, limit, window_seconds)


# =========================================================================
# RATE LIMITER SELECTION
# =========================================================================

def get_rate_limiter():
    """
    Get appropriate rate limiter based on configuration.
    
    Returns:
        Rate limiter instance (Redis or in-memory)
    """
    if settings.redis_url:
        # Use Redis if available
        return RedisRateLimiter(settings.redis_url)
    else:
        # Fall back to in-memory
        logger.info("Using in-memory rate limiter (Redis not configured)")
        return in_memory_limiter


# Global rate limiter
rate_limiter = get_rate_limiter()


# =========================================================================
# FASTAPI MIDDLEWARE
# =========================================================================

async def check_rate_limit(request: Request):
    """
    FastAPI dependency: Check rate limit for incoming request.
    
    Extracts user_id from request state (set by auth middleware)
    or falls back to IP address for unauthenticated requests.
    
    Args:
        request: FastAPI request object
        
    Raises:
        HTTPException: 429 if rate limit exceeded
        
    Usage:
        ```python
        @app.get("/endpoint", dependencies=[Depends(check_rate_limit)])
        async def route():
            return {"message": "ok"}
        ```
    """
    # Determine rate limit key and limit
    user_id = getattr(request.state, "user_id", None)
    
    if user_id:
        # Authenticated user
        key = f"user:{user_id}"
        limit = RATE_LIMIT_PER_USER
    else:
        # Unauthenticated - use IP
        client_ip = request.client.host if request.client else "unknown"
        key = f"ip:{client_ip}"
        limit = RATE_LIMIT_PER_IP
    
    # Check rate limit
    is_allowed, requests_made, retry_after = rate_limiter.check_rate_limit(
        key=key,
        limit=limit,
        window_seconds=WINDOW_SIZE_SECONDS
    )
    
    # Add rate limit headers
    remaining = max(0, limit - requests_made)
    request.state.rate_limit_remaining = remaining
    request.state.rate_limit_limit = limit
    
    if not is_allowed:
        logger.warning(f"Rate limit exceeded: {key} ({requests_made}/{limit})")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Retry after {retry_after} seconds.",
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                "Retry-After": str(retry_after)
            }
        )
    
    logger.debug(f"Rate limit check passed: {key} ({requests_made}/{limit})")


# =========================================================================
# RESPONSE HEADERS MIDDLEWARE
# =========================================================================

async def add_rate_limit_headers(request: Request, call_next):
    """
    Middleware to add rate limit headers to all responses.
    
    Headers added:
    - X-RateLimit-Limit: Maximum requests per window
    - X-RateLimit-Remaining: Remaining requests in current window
    - X-RateLimit-Reset: Unix timestamp when limit resets
    """
    # Process request
    response = await call_next(request)
    
    # Add headers if rate limit was checked
    if hasattr(request.state, "rate_limit_remaining"):
        response.headers["X-RateLimit-Limit"] = str(request.state.rate_limit_limit)
        response.headers["X-RateLimit-Remaining"] = str(request.state.rate_limit_remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + WINDOW_SIZE_SECONDS)
    
    return response

