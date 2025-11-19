"""
PrawnikGPT Backend - Rating Repository

Database operations for ratings table:
- Upsert rating (create or update)
- Get ratings by query
- Delete rating

All operations respect Row Level Security (RLS) policies.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from backend.db.supabase_client import get_supabase
from postgrest.exceptions import APIError

logger = logging.getLogger(__name__)


# =========================================================================
# UPSERT OPERATIONS
# =========================================================================

async def upsert_rating(
    user_id: str,
    query_id: str,
    response_type: str,
    rating_value: str
) -> Dict[str, Any]:
    """
    Create or update rating (idempotent operation).
    
    If rating exists for (user_id, query_id, response_type) → update
    If rating doesn't exist → create new
    
    Args:
        user_id: User ID (UUID)
        query_id: Query ID (UUID) - references query_history.id
        response_type: "fast" or "accurate"
        rating_value: "up" or "down"
        
    Returns:
        Dict: Created or updated rating data
        
    Raises:
        ValueError: If validation fails
        RuntimeError: If database operation fails
        
    Example:
        ```python
        rating = await upsert_rating(
            user_id="123e4567-...",
            query_id="789e4567-...",
            response_type="fast",
            rating_value="up"
        )
        # Returns: {"id": "...", "created_at": "...", ...}
        ```
    """
    # Validation
    if not user_id:
        raise ValueError("user_id is required")
    if not query_id:
        raise ValueError("query_id is required")
    if response_type not in ("fast", "accurate"):
        raise ValueError("response_type must be 'fast' or 'accurate'")
    if rating_value not in ("up", "down"):
        raise ValueError("rating_value must be 'up' or 'down'")
    
    try:
        client = get_supabase()
        
        # Check if rating already exists
        existing = await client.table("ratings") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("query_history_id", query_id) \
            .eq("response_type", response_type) \
            .execute()
        
        if existing.data and len(existing.data) > 0:
            # Update existing rating
            rating_id = existing.data[0]["id"]
            
            response = await client.table("ratings") \
                .update({
                    "rating_value": rating_value,
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("id", rating_id) \
                .execute()
            
            logger.info(f"Updated rating: {rating_id} (query: {query_id}, type: {response_type})")
        else:
            # Create new rating
            response = await client.table("ratings") \
                .insert({
                    "user_id": user_id,
                    "query_history_id": query_id,
                    "response_type": response_type,
                    "rating_value": rating_value
                }) \
                .execute()
            
            logger.info(f"Created rating for query: {query_id}, type: {response_type}")
        
        if not response.data:
            raise RuntimeError("Failed to upsert rating: no data returned")
        
        return response.data[0]
        
    except APIError as e:
        logger.error(f"Database error upserting rating: {e}")
        raise RuntimeError(f"Failed to upsert rating: {e}")
    except ValueError:
        raise  # Re-raise validation errors
    except Exception as e:
        logger.error(f"Unexpected error upserting rating: {e}")
        raise RuntimeError(f"Failed to upsert rating: {e}")


# =========================================================================
# READ OPERATIONS
# =========================================================================

async def get_ratings_by_query(
    query_id: str,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Get all ratings for a query (both fast and accurate).
    
    Args:
        query_id: Query ID (UUID)
        user_id: User ID for RLS validation
        
    Returns:
        List[Dict]: List of ratings (0-2 ratings)
        
    Raises:
        RuntimeError: If database operation fails
        
    Note:
        Maximum 2 ratings per query (one for fast, one for accurate).
    """
    try:
        client = get_supabase()
        
        response = await client.table("ratings") \
            .select("*") \
            .eq("query_history_id", query_id) \
            .eq("user_id", user_id) \
            .execute()
        
        ratings = response.data or []
        
        logger.debug(f"Retrieved {len(ratings)} rating(s) for query: {query_id}")
        return ratings
        
    except APIError as e:
        logger.error(f"Database error getting ratings: {e}")
        raise RuntimeError(f"Failed to get ratings: {e}")
    except Exception as e:
        logger.error(f"Unexpected error getting ratings: {e}")
        raise RuntimeError(f"Failed to get ratings: {e}")


async def get_rating_by_id(
    rating_id: str,
    user_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get rating by ID with RLS check.
    
    Args:
        rating_id: Rating ID (UUID)
        user_id: User ID for RLS validation
        
    Returns:
        Optional[Dict]: Rating data or None if not found
        
    Raises:
        RuntimeError: If database operation fails
    """
    try:
        client = get_supabase()
        
        response = await client.table("ratings") \
            .select("*") \
            .eq("id", rating_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not response.data:
            logger.debug(f"Rating not found: {rating_id}")
            return None
        
        return response.data
        
    except APIError as e:
        if "PGRST116" in str(e):  # Not found error
            return None
        logger.error(f"Database error getting rating: {e}")
        raise RuntimeError(f"Failed to get rating: {e}")
    except Exception as e:
        logger.error(f"Unexpected error getting rating: {e}")
        raise RuntimeError(f"Failed to get rating: {e}")


# =========================================================================
# DELETE OPERATIONS
# =========================================================================

async def delete_rating(
    rating_id: str,
    user_id: str
) -> bool:
    """
    Delete rating by ID with RLS check.
    
    Args:
        rating_id: Rating ID (UUID)
        user_id: User ID for RLS validation
        
    Returns:
        bool: True if deleted, False if not found
        
    Raises:
        RuntimeError: If database operation fails
    """
    try:
        client = get_supabase()
        
        response = await client.table("ratings") \
            .delete() \
            .eq("id", rating_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not response.data:
            logger.debug(f"Rating not found for deletion: {rating_id}")
            return False
        
        logger.info(f"Deleted rating: {rating_id}")
        return True
        
    except APIError as e:
        logger.error(f"Database error deleting rating: {e}")
        raise RuntimeError(f"Failed to delete rating: {e}")
    except Exception as e:
        logger.error(f"Unexpected error deleting rating: {e}")
        raise RuntimeError(f"Failed to delete rating: {e}")


# =========================================================================
# STATISTICS (Optional - for future use)
# =========================================================================

async def get_rating_stats_by_query(
    query_id: str
) -> Dict[str, Any]:
    """
    Get rating statistics for a query (future feature).
    
    Args:
        query_id: Query ID (UUID)
        
    Returns:
        Dict: Statistics (count_up, count_down per response_type)
        
    Note:
        This is for future analytics/monitoring features.
        Currently, each user can only rate once per response type.
    """
    try:
        client = get_supabase()
        
        response = await client.table("ratings") \
            .select("response_type, rating_value") \
            .eq("query_history_id", query_id) \
            .execute()
        
        ratings = response.data or []
        
        stats = {
            "fast": {"up": 0, "down": 0},
            "accurate": {"up": 0, "down": 0}
        }
        
        for rating in ratings:
            response_type = rating["response_type"]
            rating_value = rating["rating_value"]
            stats[response_type][rating_value] += 1
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting rating stats: {e}")
        return {"fast": {"up": 0, "down": 0}, "accurate": {"up": 0, "down": 0}}

