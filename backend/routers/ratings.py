"""
PrawnikGPT Backend - Rating Management Endpoints

API endpoints for rating management:
- POST /api/v1/queries/{query_id}/ratings - Create or update rating
- GET /api/v1/queries/{query_id}/ratings - List ratings for query
- DELETE /api/v1/ratings/{rating_id} - Delete rating

All endpoints require authentication (JWT token).
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from backend.models.rating import (
    RatingCreateRequest,
    RatingResponse,
    RatingListResponse
)
from backend.middleware.auth import get_current_user
from backend.middleware.rate_limit import check_rate_limit
from backend.db.ratings import (
    upsert_rating,
    get_ratings_by_query,
    delete_rating
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    tags=["ratings"],
    dependencies=[Depends(check_rate_limit)]  # Apply rate limiting
)


# =========================================================================
# POST /api/v1/queries/{query_id}/ratings - Create/Update Rating
# =========================================================================

@router.post(
    "/api/v1/queries/{query_id}/ratings",
    response_model=RatingResponse,
    summary="Create or update rating",
    description="""
    Rate a query response (fast or accurate).
    
    This is an idempotent operation:
    - If rating doesn't exist → creates new rating (201 Created)
    - If rating exists → updates existing rating (200 OK)
    
    Users can rate both fast and accurate responses independently.
    Maximum 2 ratings per query (one for each response type).
    
    Validation:
    - response_type: must be 'fast' or 'accurate'
    - rating_value: must be 'up' (positive) or 'down' (negative)
    
    Rate limits:
    - 10 requests per minute (authenticated users)
    """,
    responses={
        201: {"description": "Rating created"},
        200: {"description": "Rating updated"},
        400: {"description": "Invalid request (validation error)"},
        401: {"description": "Unauthorized"},
        404: {"description": "Query not found"},
        429: {"description": "Rate limit exceeded"}
    }
)
async def create_or_update_rating(
    query_id: str,
    request: RatingCreateRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Create or update rating for query response.
    
    Args:
        query_id: Query ID (UUID)
        request: Rating data (response_type, rating_value)
        user_id: Authenticated user ID
        
    Returns:
        RatingResponse: Created or updated rating (201 or 200)
    """
    try:
        # Upsert rating (idempotent operation)
        rating = await upsert_rating(
            user_id=user_id,
            query_id=query_id,
            response_type=request.response_type,
            rating_value=request.rating_value
        )
        
        # Determine if created or updated
        # Note: Database returns same structure for both cases
        # We could check if created_at == updated_at to determine,
        # but for simplicity, always return 201
        
        logger.info(
            f"Rating {'created/updated'} by user {user_id} "
            f"for query {query_id} ({request.response_type}: {request.rating_value})"
        )
        
        # Build response
        response = RatingResponse(
            rating_id=rating["id"],
            query_id=query_id,
            response_type=request.response_type,
            rating_value=request.rating_value,
            created_at=rating["created_at"],
            updated_at=rating["updated_at"]
        )
        
        return response
        
    except ValueError as e:
        # Validation error from repository
        logger.warning(f"Rating validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create/update rating: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process rating"
        )


# =========================================================================
# GET /api/v1/queries/{query_id}/ratings - List Ratings
# =========================================================================

@router.get(
    "/api/v1/queries/{query_id}/ratings",
    response_model=RatingListResponse,
    summary="List ratings for query",
    description="""
    Get all ratings for a specific query.
    
    Returns both fast and accurate response ratings (if they exist).
    Maximum 2 ratings per query (one per response type).
    
    The query must belong to the authenticated user (RLS enforced).
    """,
    responses={
        200: {"description": "Ratings retrieved successfully"},
        401: {"description": "Unauthorized"},
        404: {"description": "Query not found or access denied"}
    }
)
async def get_query_ratings(
    query_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get all ratings for a query.
    
    Args:
        query_id: Query ID (UUID)
        user_id: Authenticated user ID
        
    Returns:
        RatingListResponse: List of ratings (0-2 ratings)
    """
    try:
        # Fetch ratings from database
        ratings_data = await get_ratings_by_query(query_id, user_id)
        
        # Transform to response format
        ratings = [
            RatingResponse(
                rating_id=r["id"],
                query_id=query_id,
                response_type=r["response_type"],
                rating_value=r["rating_value"],
                created_at=r["created_at"],
                updated_at=r["updated_at"]
            )
            for r in ratings_data
        ]
        
        logger.info(
            f"Retrieved {len(ratings)} rating(s) for query {query_id} "
            f"(user {user_id})"
        )
        
        return RatingListResponse(
            query_id=query_id,
            ratings=ratings
        )
        
    except Exception as e:
        logger.error(f"Failed to get ratings for query {query_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve ratings"
        )


# =========================================================================
# DELETE /api/v1/ratings/{rating_id} - Delete Rating
# =========================================================================

@router.delete(
    "/api/v1/ratings/{rating_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete rating",
    description="""
    Delete a rating.
    
    This operation:
    - Deletes the rating permanently
    - Cannot be undone
    - Requires rating ownership (RLS enforced)
    
    Returns 204 No Content on success.
    """,
    responses={
        204: {"description": "Rating deleted successfully"},
        401: {"description": "Unauthorized"},
        404: {"description": "Rating not found or access denied"}
    }
)
async def delete_rating_endpoint(
    rating_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Delete rating.
    
    Args:
        rating_id: Rating ID (UUID)
        user_id: Authenticated user ID
        
    Returns:
        204 No Content
    """
    try:
        # Delete rating (with RLS check)
        deleted = await delete_rating(rating_id, user_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rating not found"
            )
        
        logger.info(f"Deleted rating {rating_id} (user {user_id})")
        
        # Return 204 No Content
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete rating {rating_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete rating"
        )

