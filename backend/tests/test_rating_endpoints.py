"""
PrawnikGPT Backend - Rating Endpoint Tests

Unit tests for rating management endpoints:
- POST /api/v1/queries/{query_id}/ratings (create/update rating)
- GET /api/v1/queries/{query_id}/ratings (list ratings)
- DELETE /api/v1/ratings/{rating_id} (delete rating)

All tests use mocks for database and authentication.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any
from datetime import datetime

from backend.models.rating import (
    RatingCreateRequest,
    RatingResponse,
    RatingListResponse
)


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
def sample_user_id() -> str:
    """Sample user ID for tests."""
    return "user-123e4567-e89b-12d3"


@pytest.fixture
def sample_query_id() -> str:
    """Sample query ID for tests."""
    return "query-123e4567-e89b-12d3"


@pytest.fixture
def sample_rating_id() -> str:
    """Sample rating ID for tests."""
    return "rating-123e4567-e89b-12d3"


@pytest.fixture
def sample_rating_from_db() -> Dict[str, Any]:
    """Sample rating record from database."""
    return {
        "id": "rating-123e4567-e89b-12d3",
        "user_id": "user-123e4567-e89b-12d3",
        "query_history_id": "query-123e4567-e89b-12d3",
        "response_type": "fast",
        "rating_value": "up",
        "comment": None,
        "created_at": "2025-12-01T10:00:00Z",
        "updated_at": "2025-12-01T10:00:00Z"
    }


@pytest.fixture
def sample_ratings_list() -> List[Dict[str, Any]]:
    """Sample list of ratings from database."""
    return [
        {
            "id": "rating-fast-123",
            "user_id": "user-123",
            "query_history_id": "query-123",
            "response_type": "fast",
            "rating_value": "up",
            "comment": None,
            "created_at": "2025-12-01T10:00:00Z",
            "updated_at": "2025-12-01T10:00:00Z"
        },
        {
            "id": "rating-accurate-123",
            "user_id": "user-123",
            "query_history_id": "query-123",
            "response_type": "accurate",
            "rating_value": "down",
            "comment": None,
            "created_at": "2025-12-01T10:05:00Z",
            "updated_at": "2025-12-01T10:05:00Z"
        }
    ]


# =========================================================================
# CREATE/UPDATE RATING TESTS
# =========================================================================

class TestCreateOrUpdateRating:
    """Tests for POST /api/v1/queries/{query_id}/ratings endpoint."""

    @pytest.mark.asyncio
    async def test_create_rating_success(self, sample_rating_from_db, sample_user_id, sample_query_id):
        """Test successful rating creation."""
        from backend.routers.ratings import create_or_update_rating
        
        with patch('backend.routers.ratings.upsert_rating', new_callable=AsyncMock) as mock_upsert:
            mock_upsert.return_value = sample_rating_from_db
            
            request = RatingCreateRequest(
                response_type="fast",
                rating_value="up"
            )
            
            result = await create_or_update_rating(
                query_id=sample_query_id,
                request=request,
                user_id=sample_user_id
            )
            
            # Verify response
            assert result.rating_id == sample_rating_from_db["id"]
            assert result.query_id == sample_query_id
            assert result.response_type == "fast"
            assert result.rating_value == "up"
            
            # Verify upsert was called with correct args
            mock_upsert.assert_called_once_with(
                user_id=sample_user_id,
                query_id=sample_query_id,
                response_type="fast",
                rating_value="up"
            )

    @pytest.mark.asyncio
    async def test_update_rating_success(self, sample_rating_from_db, sample_user_id, sample_query_id):
        """Test successful rating update (change from up to down)."""
        from backend.routers.ratings import create_or_update_rating
        
        updated_rating = {
            **sample_rating_from_db,
            "rating_value": "down",
            "updated_at": "2025-12-01T10:30:00Z"
        }
        
        with patch('backend.routers.ratings.upsert_rating', new_callable=AsyncMock) as mock_upsert:
            mock_upsert.return_value = updated_rating
            
            request = RatingCreateRequest(
                response_type="fast",
                rating_value="down"  # Changed from "up"
            )
            
            result = await create_or_update_rating(
                query_id=sample_query_id,
                request=request,
                user_id=sample_user_id
            )
            
            # Verify response reflects update
            assert result.rating_value == "down"

    @pytest.mark.asyncio
    async def test_create_rating_accurate_response(self, sample_rating_from_db, sample_user_id, sample_query_id):
        """Test rating accurate response type."""
        from backend.routers.ratings import create_or_update_rating
        
        accurate_rating = {
            **sample_rating_from_db,
            "id": "rating-accurate-123",
            "response_type": "accurate",
            "rating_value": "up"
        }
        
        with patch('backend.routers.ratings.upsert_rating', new_callable=AsyncMock) as mock_upsert:
            mock_upsert.return_value = accurate_rating
            
            request = RatingCreateRequest(
                response_type="accurate",
                rating_value="up"
            )
            
            result = await create_or_update_rating(
                query_id=sample_query_id,
                request=request,
                user_id=sample_user_id
            )
            
            assert result.response_type == "accurate"

    @pytest.mark.asyncio
    async def test_create_rating_validation_error(self, sample_user_id, sample_query_id):
        """Test validation error from repository."""
        from backend.routers.ratings import create_or_update_rating
        from fastapi import HTTPException
        
        with patch('backend.routers.ratings.upsert_rating', new_callable=AsyncMock) as mock_upsert:
            mock_upsert.side_effect = ValueError("Invalid rating_value: must be 'up' or 'down'")
            
            request = RatingCreateRequest(
                response_type="fast",
                rating_value="up"
            )
            
            with pytest.raises(HTTPException) as exc_info:
                await create_or_update_rating(
                    query_id=sample_query_id,
                    request=request,
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_create_rating_database_error(self, sample_user_id, sample_query_id):
        """Test database error handling."""
        from backend.routers.ratings import create_or_update_rating
        from fastapi import HTTPException
        
        with patch('backend.routers.ratings.upsert_rating', new_callable=AsyncMock) as mock_upsert:
            mock_upsert.side_effect = RuntimeError("Database connection failed")
            
            request = RatingCreateRequest(
                response_type="fast",
                rating_value="up"
            )
            
            with pytest.raises(HTTPException) as exc_info:
                await create_or_update_rating(
                    query_id=sample_query_id,
                    request=request,
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 500


# =========================================================================
# LIST RATINGS TESTS
# =========================================================================

class TestListRatings:
    """Tests for GET /api/v1/queries/{query_id}/ratings endpoint."""

    @pytest.mark.asyncio
    async def test_list_ratings_success(self, sample_ratings_list, sample_user_id, sample_query_id):
        """Test successful ratings listing."""
        from backend.routers.ratings import get_query_ratings
        
        with patch('backend.routers.ratings.get_ratings_by_query', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_ratings_list
            
            result = await get_query_ratings(
                query_id=sample_query_id,
                user_id=sample_user_id
            )
            
            # Verify response
            assert result.query_id == sample_query_id
            assert len(result.ratings) == 2
            
            # Verify first rating (fast)
            fast_rating = result.ratings[0]
            assert fast_rating.response_type == "fast"
            assert fast_rating.rating_value == "up"
            
            # Verify second rating (accurate)
            accurate_rating = result.ratings[1]
            assert accurate_rating.response_type == "accurate"
            assert accurate_rating.rating_value == "down"

    @pytest.mark.asyncio
    async def test_list_ratings_empty(self, sample_user_id, sample_query_id):
        """Test listing ratings when none exist."""
        from backend.routers.ratings import get_query_ratings
        
        with patch('backend.routers.ratings.get_ratings_by_query', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = []
            
            result = await get_query_ratings(
                query_id=sample_query_id,
                user_id=sample_user_id
            )
            
            assert result.query_id == sample_query_id
            assert result.ratings == []

    @pytest.mark.asyncio
    async def test_list_ratings_single(self, sample_rating_from_db, sample_user_id, sample_query_id):
        """Test listing when only one rating exists."""
        from backend.routers.ratings import get_query_ratings
        
        with patch('backend.routers.ratings.get_ratings_by_query', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = [sample_rating_from_db]
            
            result = await get_query_ratings(
                query_id=sample_query_id,
                user_id=sample_user_id
            )
            
            assert len(result.ratings) == 1
            assert result.ratings[0].response_type == "fast"


# =========================================================================
# DELETE RATING TESTS
# =========================================================================

class TestDeleteRating:
    """Tests for DELETE /api/v1/ratings/{rating_id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_rating_success(self, sample_rating_id, sample_user_id):
        """Test successful rating deletion."""
        from backend.routers.ratings import delete_rating_endpoint
        
        with patch('backend.routers.ratings.delete_rating', new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = True
            
            result = await delete_rating_endpoint(
                rating_id=sample_rating_id,
                user_id=sample_user_id
            )
            
            # Should return 204 No Content response
            assert result.status_code == 204
            
            # Verify delete was called with correct args
            mock_delete.assert_called_once_with(sample_rating_id, sample_user_id)

    @pytest.mark.asyncio
    async def test_delete_rating_not_found(self, sample_rating_id, sample_user_id):
        """Test error when rating not found."""
        from backend.routers.ratings import delete_rating_endpoint
        from fastapi import HTTPException
        
        with patch('backend.routers.ratings.delete_rating', new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = False
            
            with pytest.raises(HTTPException) as exc_info:
                await delete_rating_endpoint(
                    rating_id=sample_rating_id,
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_rating_database_error(self, sample_rating_id, sample_user_id):
        """Test database error handling."""
        from backend.routers.ratings import delete_rating_endpoint
        from fastapi import HTTPException
        
        with patch('backend.routers.ratings.delete_rating', new_callable=AsyncMock) as mock_delete:
            mock_delete.side_effect = RuntimeError("Database error")
            
            with pytest.raises(HTTPException) as exc_info:
                await delete_rating_endpoint(
                    rating_id=sample_rating_id,
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 500


# =========================================================================
# REPOSITORY TESTS
# =========================================================================

class TestRatingRepository:
    """Tests for rating repository functions."""

    @pytest.mark.asyncio
    async def test_upsert_rating_create(self, sample_user_id, sample_query_id):
        """Test upsert_rating creates new rating."""
        from backend.db.ratings import upsert_rating
        
        mock_response = MagicMock()
        mock_response.data = [{
            "id": "new-rating-123",
            "created_at": "2025-12-01T10:00:00Z",
            "updated_at": "2025-12-01T10:00:00Z"
        }]
        
        with patch('backend.db.ratings.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            
            # First call: check existing (returns empty)
            mock_existing = MagicMock()
            mock_existing.data = []
            mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute = AsyncMock(return_value=mock_existing)
            
            # Second call: insert
            mock_client.table.return_value.insert.return_value.execute = AsyncMock(return_value=mock_response)
            
            mock_supabase.return_value = mock_client
            
            rating = await upsert_rating(
                user_id=sample_user_id,
                query_id=sample_query_id,
                response_type="fast",
                rating_value="up"
            )
            
            assert rating is not None
            assert rating["id"] == "new-rating-123"

    @pytest.mark.asyncio
    async def test_upsert_rating_validation(self, sample_user_id, sample_query_id):
        """Test upsert_rating validation errors."""
        from backend.db.ratings import upsert_rating
        
        # Invalid response_type
        with pytest.raises(ValueError) as exc_info:
            await upsert_rating(
                user_id=sample_user_id,
                query_id=sample_query_id,
                response_type="invalid",
                rating_value="up"
            )
        assert "response_type" in str(exc_info.value)
        
        # Invalid rating_value
        with pytest.raises(ValueError) as exc_info:
            await upsert_rating(
                user_id=sample_user_id,
                query_id=sample_query_id,
                response_type="fast",
                rating_value="invalid"
            )
        assert "rating_value" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_ratings_by_query(self, sample_ratings_list, sample_user_id, sample_query_id):
        """Test get_ratings_by_query repository function."""
        from backend.db.ratings import get_ratings_by_query
        
        mock_response = MagicMock()
        mock_response.data = sample_ratings_list
        
        with patch('backend.db.ratings.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute = AsyncMock(return_value=mock_response)
            mock_supabase.return_value = mock_client
            
            ratings = await get_ratings_by_query(sample_query_id, sample_user_id)
            
            assert len(ratings) == 2
            assert ratings[0]["response_type"] == "fast"
            assert ratings[1]["response_type"] == "accurate"

    @pytest.mark.asyncio
    async def test_delete_rating_success(self, sample_user_id, sample_rating_id):
        """Test delete_rating repository function."""
        from backend.db.ratings import delete_rating
        
        mock_response = MagicMock()
        mock_response.data = [{"id": sample_rating_id}]
        
        with patch('backend.db.ratings.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute = AsyncMock(return_value=mock_response)
            mock_supabase.return_value = mock_client
            
            deleted = await delete_rating(sample_rating_id, sample_user_id)
            
            assert deleted is True


# =========================================================================
# PYDANTIC MODEL TESTS
# =========================================================================

class TestRatingModels:
    """Tests for Pydantic model validation."""

    def test_rating_create_request_valid(self):
        """Test valid RatingCreateRequest."""
        request = RatingCreateRequest(
            response_type="fast",
            rating_value="up"
        )
        
        assert request.response_type == "fast"
        assert request.rating_value == "up"

    def test_rating_create_request_accurate(self):
        """Test RatingCreateRequest with accurate type."""
        request = RatingCreateRequest(
            response_type="accurate",
            rating_value="down"
        )
        
        assert request.response_type == "accurate"
        assert request.rating_value == "down"

    def test_rating_create_request_invalid_response_type(self):
        """Test RatingCreateRequest rejects invalid response_type."""
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            RatingCreateRequest(
                response_type="invalid",  # Should be 'fast' or 'accurate'
                rating_value="up"
            )
        
        assert "response_type" in str(exc_info.value)

    def test_rating_create_request_invalid_rating_value(self):
        """Test RatingCreateRequest rejects invalid rating_value."""
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            RatingCreateRequest(
                response_type="fast",
                rating_value="invalid"  # Should be 'up' or 'down'
            )
        
        assert "rating_value" in str(exc_info.value)

    def test_rating_response_model(self):
        """Test RatingResponse model creation."""
        response = RatingResponse(
            rating_id="rating-123",
            query_id="query-123",
            response_type="fast",
            rating_value="up",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        assert response.rating_id == "rating-123"
        assert response.response_type == "fast"

    def test_rating_list_response_model(self):
        """Test RatingListResponse model creation."""
        ratings = [
            RatingResponse(
                rating_id="rating-1",
                query_id="query-123",
                response_type="fast",
                rating_value="up",
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            RatingResponse(
                rating_id="rating-2",
                query_id="query-123",
                response_type="accurate",
                rating_value="down",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        response = RatingListResponse(
            query_id="query-123",
            ratings=ratings
        )
        
        assert response.query_id == "query-123"
        assert len(response.ratings) == 2

