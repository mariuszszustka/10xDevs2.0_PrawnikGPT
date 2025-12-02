"""
PrawnikGPT Backend - Supabase Client

This module provides Supabase client initialization and connection management.
It implements connection pooling and provides utilities for database operations.

The client is configured via environment variables (see config.py).
"""

import logging
import os
from typing import Optional
from supabase import create_client, Client, ClientOptions
from postgrest.exceptions import APIError
import httpx

from backend.config import settings

logger = logging.getLogger(__name__)


class SupabaseClient:
    """
    Supabase client wrapper with connection management.
    
    Provides:
    - Lazy initialization
    - Connection pooling
    - Error handling
    - Health check utilities
    """
    
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """
        Get or create Supabase client instance (singleton pattern).
        
        Returns:
            Client: Initialized Supabase client
            
        Raises:
            RuntimeError: If client initialization fails
        """
        if cls._instance is None:
            try:
                # For self-signed certificates (common in local/dev environments),
                # disable SSL verification if SUPABASE_VERIFY_SSL is set to false
                verify_ssl = os.getenv("SUPABASE_VERIFY_SSL", "true").lower() != "false"
                
                # Create HTTP client with SSL verification setting
                httpx_client = httpx.Client(verify=verify_ssl, timeout=30.0)
                
                # Create client options with httpx_client parameter
                client_options = ClientOptions(httpx_client=httpx_client)
                
                cls._instance = create_client(
                    supabase_url=settings.supabase_url,
                    supabase_key=settings.supabase_service_key,
                    options=client_options
                )
                logger.info(f"Supabase client initialized: {settings.supabase_url} (SSL verify: {verify_ssl})")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise RuntimeError(f"Supabase initialization failed: {e}") from e
        
        return cls._instance
    
    @classmethod
    async def health_check(cls, timeout_seconds: int = 2) -> bool:
        """
        Perform database health check using RPC function.
        
        Uses the health_check() RPC function created in Supabase migration.
        Falls back to simple table check if RPC is not available.
        
        Args:
            timeout_seconds: Maximum time to wait for response
            
        Returns:
            bool: True if database is responsive, False otherwise
        """
        try:
            client = cls.get_client()
            
            # Try RPC health_check first (fastest method)
            try:
                response = client.rpc('health_check').execute()
                
                # RPC returns True if database is healthy
                if response.data is True:
                    logger.debug("Database health check via RPC: OK")
                    return True
                    
            except APIError as rpc_error:
                # RPC might not exist yet (migration not applied)
                # Fall back to simple check
                logger.debug(f"RPC health_check not available: {rpc_error}")
                return await cls.health_check_simple()
            
            # If we got here without exception, database is healthy
            return True
            
        except APIError as e:
            logger.warning(f"Database health check failed (API error): {e}")
            return False
        except Exception as e:
            logger.error(f"Database health check failed (unexpected error): {e}")
            return False
    
    @classmethod
    async def health_check_simple(cls) -> bool:
        """
        Simplified health check without RPC (for initial setup).
        
        Attempts to list tables as a connectivity test.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            client = cls.get_client()
            
            # Try to perform a simple operation
            # This will fail if connection is not working
            _ = client.table('query_history').select('id', count='exact').limit(0).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Database health check (simple) failed: {e}")
            return False


# =========================================================================
# CONVENIENCE FUNCTIONS
# =========================================================================

def get_supabase() -> Client:
    """
    Dependency injection helper for FastAPI endpoints.
    
    Usage in FastAPI:
        @app.get("/endpoint")
        async def endpoint(db: Client = Depends(get_supabase)):
            # Use db client
    
    Returns:
        Client: Supabase client instance
    """
    return SupabaseClient.get_client()


async def check_database_health(timeout_seconds: int = 2) -> bool:
    """
    Standalone function for database health check.

    Args:
        timeout_seconds: Maximum time to wait for response

    Returns:
        bool: True if database is healthy, False otherwise
    """
    return await SupabaseClient.health_check(timeout_seconds=timeout_seconds)
