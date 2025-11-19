"""
PrawnikGPT Backend - Rating Models

Pydantic models for rating-related endpoints:
- POST /api/v1/queries/{query_id}/ratings (create/update rating)
- GET /api/v1/queries/{query_id}/ratings (list ratings)
- DELETE /api/v1/ratings/{rating_id} (delete rating)

These models mirror the TypeScript types in src/lib/types.ts for type consistency.
"""

from pydantic import BaseModel, Field
from typing import Literal, List
from datetime import datetime


# =========================================================================
# TYPE ALIASES
# =========================================================================

RatingValue = Literal["up", "down"]
ResponseType = Literal["fast", "accurate"]


# =========================================================================
# REQUEST MODELS
# =========================================================================

class RatingCreateRequest(BaseModel):
    """
    Request body for creating or updating a rating.
    
    POST /api/v1/queries/{query_id}/ratings
    
    This is an idempotent operation:
    - If rating doesn't exist → creates new rating (201 Created)
    - If rating exists → updates existing rating (200 OK)
    
    Users can rate both fast and accurate responses independently.
    """
    response_type: ResponseType = Field(
        ...,
        description="Which response is being rated (fast or accurate)"
    )
    rating_value: RatingValue = Field(
        ...,
        description="Rating value (up for positive, down for negative)"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "response_type": "fast",
                    "rating_value": "up"
                },
                {
                    "response_type": "accurate",
                    "rating_value": "down"
                }
            ]
        }
    }


# =========================================================================
# RESPONSE MODELS
# =========================================================================

class RatingResponse(BaseModel):
    """
    Response for rating operations.
    
    POST /api/v1/queries/{query_id}/ratings (create/update)
    
    Status code indicates operation:
    - 201 Created: New rating created
    - 200 OK: Existing rating updated
    """
    rating_id: str = Field(
        ...,
        description="Unique rating identifier (UUID)"
    )
    query_id: str = Field(
        ...,
        description="ID of the query being rated"
    )
    response_type: ResponseType = Field(
        ...,
        description="Which response was rated"
    )
    rating_value: RatingValue = Field(
        ...,
        description="Rating value (up or down)"
    )
    created_at: datetime = Field(
        ...,
        description="When rating was first created"
    )
    updated_at: datetime = Field(
        ...,
        description="When rating was last updated"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "rating_id": "123e4567-e89b-12d3-a456-426614174000",
                "query_id": "789e4567-e89b-12d3-a456-426614174000",
                "response_type": "fast",
                "rating_value": "up",
                "created_at": "2025-11-19T10:30:00Z",
                "updated_at": "2025-11-19T10:30:00Z"
            }
        }
    }


class RatingListResponse(BaseModel):
    """
    Response for listing all ratings for a query.
    
    GET /api/v1/queries/{query_id}/ratings
    
    Returns all ratings (fast + accurate) for the specified query.
    Usually 0-2 ratings (one per response type).
    """
    query_id: str = Field(
        ...,
        description="ID of the query"
    )
    ratings: List[RatingResponse] = Field(
        ...,
        description="List of ratings for this query (max 2: fast + accurate)"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "query_id": "789e4567-e89b-12d3-a456-426614174000",
                "ratings": [
                    {
                        "rating_id": "123e4567-e89b-12d3-a456-426614174001",
                        "query_id": "789e4567-e89b-12d3-a456-426614174000",
                        "response_type": "fast",
                        "rating_value": "up",
                        "created_at": "2025-11-19T10:30:00Z",
                        "updated_at": "2025-11-19T10:30:00Z"
                    },
                    {
                        "rating_id": "123e4567-e89b-12d3-a456-426614174002",
                        "query_id": "789e4567-e89b-12d3-a456-426614174000",
                        "response_type": "accurate",
                        "rating_value": "up",
                        "created_at": "2025-11-19T10:35:00Z",
                        "updated_at": "2025-11-19T10:35:00Z"
                    }
                ]
            }
        }
    }

