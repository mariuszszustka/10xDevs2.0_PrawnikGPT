"""
PrawnikGPT Backend - Query Repository

Database operations for query_history table:
- Create query
- Get query by ID
- List queries with pagination
- Delete query
- Update query fields

All operations respect Row Level Security (RLS) policies.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from backend.db.supabase_client import get_supabase
from postgrest.exceptions import APIError

logger = logging.getLogger(__name__)


# =========================================================================
# CREATE OPERATIONS
# =========================================================================

async def create_query(
    user_id: str,
    query_text: str
) -> str:
    """
    Create new query in query_history table (initial state).
    
    Args:
        user_id: User ID (UUID from auth)
        query_text: Query text (10-1000 chars)
        
    Returns:
        str: Created query ID (UUID)
        
    Raises:
        ValueError: If validation fails
        RuntimeError: If database operation fails
        
    Note:
        Initial query has only id, user_id, query_text, created_at.
        Response fields will be updated after generation completes.
    """
    # Validation
    if not user_id:
        raise ValueError("user_id is required")
    if not query_text or not (10 <= len(query_text.strip()) <= 1000):
        raise ValueError("query_text must be 10-1000 characters")
    
    try:
        client = get_supabase()
        
        # Insert with only required fields
        # Response fields will be NULL until generation completes
        response = await client.table("query_history").insert({
            "user_id": user_id,
            "query_text": query_text.strip(),
            # Response fields will be updated later:
            # fast_response_content, sources, fast_model_name, fast_generation_time_ms
            # accurate_response_content, accurate_model_name, accurate_generation_time_ms
        }).execute()
        
        if not response.data:
            raise RuntimeError("Failed to create query: no data returned")
        
        query_id = response.data[0]["id"]
        logger.info(f"Created query: {query_id} for user: {user_id}")
        
        return query_id
        
    except APIError as e:
        logger.error(f"Database error creating query: {e}")
        raise RuntimeError(f"Failed to create query: {e}")
    except Exception as e:
        logger.error(f"Unexpected error creating query: {e}")
        raise RuntimeError(f"Failed to create query: {e}")


# =========================================================================
# READ OPERATIONS
# =========================================================================

async def get_query_by_id(
    query_id: str,
    user_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get query by ID with RLS check.
    
    Args:
        query_id: Query ID (UUID)
        user_id: User ID for RLS validation
        
    Returns:
        Optional[Dict]: Query data or None if not found
        
    Raises:
        RuntimeError: If database operation fails
        
    Note:
        RLS policy ensures users can only access their own queries.
    """
    try:
        client = get_supabase()
        
        response = await client.table("query_history") \
            .select("*") \
            .eq("id", query_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not response.data:
            logger.debug(f"Query not found: {query_id}")
            return None
        
        logger.debug(f"Retrieved query: {query_id}")
        return response.data
        
    except APIError as e:
        if "PGRST116" in str(e):  # Not found error
            return None
        logger.error(f"Database error getting query: {e}")
        raise RuntimeError(f"Failed to get query: {e}")
    except Exception as e:
        logger.error(f"Unexpected error getting query: {e}")
        raise RuntimeError(f"Failed to get query: {e}")


async def list_queries(
    user_id: str,
    page: int = 1,
    per_page: int = 20,
    order: str = "desc"
) -> tuple[List[Dict[str, Any]], int]:
    """
    List queries for user with pagination using RPC function.
    
    Args:
        user_id: User ID
        page: Page number (1-indexed)
        per_page: Items per page (1-100)
        order: Sort order ("desc" or "asc") by created_at
        
    Returns:
        tuple: (list of queries, total count)
        
    Raises:
        ValueError: If pagination parameters invalid
        RuntimeError: If database operation fails
    """
    # Validation
    if page < 1:
        raise ValueError("page must be >= 1")
    if not (1 <= per_page <= 100):
        raise ValueError("per_page must be 1-100")
    if order not in ("desc", "asc"):
        raise ValueError("order must be 'desc' or 'asc'")
    
    try:
        client = get_supabase()
        
        # Call the RPC function
        response = await client.rpc(
            "list_user_queries",
            {
                "p_user_id": user_id,
                "p_page": page,
                "p_per_page": per_page,
                "p_order": order,
            },
        ).execute()
        
        queries = response.data or []
        
        # Get total count from the first record if it exists
        total_count = queries[0].get("total_count", 0) if queries else 0
        
        logger.info(
            f"Listed queries for user {user_id} via RPC: "
            f"{len(queries)} items (page {page}, total {total_count})"
        )
        
        return queries, total_count
        
    except APIError as e:
        logger.error(f"Database error listing queries via RPC: {e}")
        raise RuntimeError(f"Failed to list queries: {e}")
    except Exception as e:
        logger.error(f"Unexpected error listing queries via RPC: {e}")
        raise RuntimeError(f"Failed to list queries: {e}")


# =========================================================================
# UPDATE OPERATIONS
# =========================================================================

async def update_query_fast_response(
    query_id: str,
    content: str,
    sources: List[Dict[str, Any]],
    model_name: str,
    generation_time_ms: int
) -> bool:
    """
    Update query with fast response data.
    
    Args:
        query_id: Query ID
        content: Generated response text
        sources: List of source references (as JSON)
        model_name: Model name used (e.g., "mistral:7b")
        generation_time_ms: Generation time in milliseconds
        
    Returns:
        bool: True if updated successfully
        
    Raises:
        RuntimeError: If database operation fails
    """
    try:
        client = get_supabase()
        
        response = await client.table("query_history") \
            .update({
                "fast_response_content": content,
                "sources": sources,
                "fast_model_name": model_name,
                "fast_generation_time_ms": generation_time_ms
            }) \
            .eq("id", query_id) \
            .execute()
        
        if not response.data:
            logger.error(f"Failed to update fast response for query: {query_id}")
            return False
        
        logger.info(f"Updated fast response for query: {query_id}")
        return True
        
    except APIError as e:
        logger.error(f"Database error updating fast response: {e}")
        raise RuntimeError(f"Failed to update fast response: {e}")
    except Exception as e:
        logger.error(f"Unexpected error updating fast response: {e}")
        raise RuntimeError(f"Failed to update fast response: {e}")


async def update_query_accurate_response(
    query_id: str,
    content: str,
    model_name: str,
    generation_time_ms: int
) -> bool:
    """
    Update query with accurate response data.
    
    Args:
        query_id: Query ID
        content: Generated response text
        model_name: Model name used (e.g., "gpt-oss:120b")
        generation_time_ms: Generation time in milliseconds
        
    Returns:
        bool: True if updated successfully
        
    Raises:
        RuntimeError: If database operation fails
        
    Note:
        Sources are reused from fast response (not regenerated).
    """
    try:
        client = get_supabase()
        
        response = await client.table("query_history") \
            .update({
                "accurate_response_content": content,
                "accurate_model_name": model_name,
                "accurate_generation_time_ms": generation_time_ms
            }) \
            .eq("id", query_id) \
            .execute()
        
        if not response.data:
            logger.error(f"Failed to update accurate response for query: {query_id}")
            return False
        
        logger.info(f"Updated accurate response for query: {query_id}")
        return True
        
    except APIError as e:
        logger.error(f"Database error updating accurate response: {e}")
        raise RuntimeError(f"Failed to update accurate response: {e}")
    except Exception as e:
        logger.error(f"Unexpected error updating accurate response: {e}")
        raise RuntimeError(f"Failed to update accurate response: {e}")


# =========================================================================
# DELETE OPERATIONS
# =========================================================================

async def delete_query(
    query_id: str,
    user_id: str
) -> bool:
    """
    Delete query by ID with RLS check.
    
    Args:
        query_id: Query ID (UUID)
        user_id: User ID for RLS validation
        
    Returns:
        bool: True if deleted, False if not found
        
    Raises:
        RuntimeError: If database operation fails
        
    Note:
        Cascade deletes ratings associated with this query.
    """
    try:
        client = get_supabase()
        
        response = await client.table("query_history") \
            .delete() \
            .eq("id", query_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            logger.debug(f"Query not found for deletion: {query_id}")
            return False
        
        logger.info(f"Deleted query: {query_id}")
        return True
        
    except APIError as e:
        logger.error(f"Database error deleting query: {e}")
        raise RuntimeError(f"Failed to delete query: {e}")
    except Exception as e:
        logger.error(f"Unexpected error deleting query: {e}")
        raise RuntimeError(f"Failed to delete query: {e}")

