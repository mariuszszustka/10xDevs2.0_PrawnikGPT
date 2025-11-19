"""
PrawnikGPT Backend - Authentication Middleware

JWT-based authentication using Supabase Auth.
Provides FastAPI dependency for protected endpoints.

Usage:
    @app.get("/protected")
    async def protected_route(user_id: str = Depends(get_current_user)):
        # user_id is extracted from JWT token
        return {"user_id": user_id}
"""

import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from backend.config import settings

logger = logging.getLogger(__name__)

# HTTP Bearer scheme for Authorization header
security = HTTPBearer()


# =========================================================================
# JWT VALIDATION
# =========================================================================

def decode_jwt(token: str) -> dict:
    """
    Decode and validate JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        dict: Decoded token payload with user_id, email, etc.
        
    Raises:
        JWTError: If token is invalid or expired
        
    Note:
        Uses Supabase JWT secret for validation.
        Tokens are signed with HS256 algorithm.
    """
    try:
        # Decode JWT with Supabase secret
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,  # Check expiration
                "verify_aud": False  # Don't verify audience (Supabase doesn't set it)
            }
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token expired")
        raise JWTError("Token expired")
    except jwt.JWTClaimsError as e:
        logger.warning(f"JWT claims error: {e}")
        raise JWTError("Invalid token claims")
    except JWTError as e:
        logger.warning(f"JWT validation error: {e}")
        raise JWTError("Invalid token")
    except Exception as e:
        logger.error(f"Unexpected error decoding JWT: {e}")
        raise JWTError("Token validation failed")


def extract_user_id(payload: dict) -> Optional[str]:
    """
    Extract user ID from JWT payload.
    
    Args:
        payload: Decoded JWT payload
        
    Returns:
        Optional[str]: User ID (UUID) or None if not found
        
    Note:
        Supabase JWT stores user ID in 'sub' claim.
    """
    user_id = payload.get("sub")
    
    if not user_id:
        logger.error("JWT payload missing 'sub' claim")
        return None
    
    return user_id


# =========================================================================
# FASTAPI DEPENDENCIES
# =========================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    FastAPI dependency: Extract and validate user from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials (auto-extracted from header)
        
    Returns:
        str: User ID (UUID)
        
    Raises:
        HTTPException: 401 if token invalid or missing
        
    Usage:
        ```python
        @app.get("/protected")
        async def protected_route(user_id: str = Depends(get_current_user)):
            return {"user_id": user_id}
        ```
    """
    token = credentials.credentials
    
    try:
        # Decode and validate JWT
        payload = decode_jwt(token)
        
        # Extract user ID
        user_id = extract_user_id(payload)
        
        if not user_id:
            logger.error("User ID not found in token payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        logger.debug(f"Authenticated user: {user_id}")
        return user_id
        
    except JWTError as e:
        logger.warning(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        logger.error(f"Unexpected authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    FastAPI dependency: Extract user from JWT token (optional).
    
    Similar to get_current_user but doesn't raise error if token missing.
    Useful for endpoints that work for both authenticated and anonymous users.
    
    Args:
        credentials: HTTP Bearer credentials (optional)
        
    Returns:
        Optional[str]: User ID or None if not authenticated
        
    Usage:
        ```python
        @app.get("/optional-auth")
        async def route(user_id: Optional[str] = Depends(get_optional_user)):
            if user_id:
                return {"message": f"Hello user {user_id}"}
            return {"message": "Hello anonymous"}
        ```
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_jwt(token)
        user_id = extract_user_id(payload)
        
        if user_id:
            logger.debug(f"Optional auth: user {user_id}")
        else:
            logger.debug("Optional auth: no user ID in token")
        
        return user_id
        
    except JWTError:
        logger.debug("Optional auth: invalid token, treating as anonymous")
        return None
    except Exception as e:
        logger.error(f"Optional auth error: {e}")
        return None


# =========================================================================
# TOKEN UTILITIES (for testing)
# =========================================================================

def create_test_token(user_id: str, expires_in_seconds: int = 3600) -> str:
    """
    Create test JWT token for development/testing.
    
    Args:
        user_id: User ID to encode in token
        expires_in_seconds: Token validity duration
        
    Returns:
        str: JWT token
        
    Warning:
        For testing only! Production tokens should come from Supabase Auth.
    """
    import time
    
    payload = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + expires_in_seconds,
        "role": "authenticated"
    }
    
    token = jwt.encode(
        payload,
        settings.supabase_jwt_secret,
        algorithm="HS256"
    )
    
    logger.warning(f"Created test token for user: {user_id} (testing only!)")
    return token

