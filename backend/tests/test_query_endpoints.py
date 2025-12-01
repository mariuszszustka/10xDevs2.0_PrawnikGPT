"""
PrawnikGPT Backend - Query Management Endpoint Tests

Unit tests for query management endpoints:
- GET /api/v1/queries (list queries)
- GET /api/v1/queries/{query_id} (get query details)
- DELETE /api/v1/queries/{query_id} (delete query)
- POST /api/v1/queries/{query_id}/accurate-response (request accurate)

All tests use mocks for database and authentication.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any
from datetime import datetime

from backend.models.query import (
    QueryListItem,
    QueryListItemFastResponse,
    QueryListItemAccurateResponse,
    QueryDetailResponse,
    PaginationMetadata
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
def sample_query_from_db() -> Dict[str, Any]:
    """Sample query record from database."""
    return {
        "id": "query-123e4567-e89b-12d3",
        "user_id": "user-123e4567-e89b-12d3",
        "query_text": "Jakie są prawa konsumenta przy zakupach online?",
        "fast_response_content": "Na podstawie ustawy o prawach konsumenta...",
        "accurate_response_content": None,
        "sources": [
            {
                "act_title": "Ustawa o prawach konsumenta",
                "article": "Art. 27",
                "link": "https://isap.sejm.gov.pl/...",
                "chunk_id": "chunk-123"
            }
        ],
        "fast_model_name": "mistral:7b",
        "accurate_model_name": None,
        "fast_generation_time_ms": 8500,
        "accurate_generation_time_ms": None,
        "created_at": "2025-12-01T10:00:00Z"
    }


@pytest.fixture
def sample_queries_list(sample_query_from_db) -> List[Dict[str, Any]]:
    """Sample list of queries from database."""
    return [
        sample_query_from_db,
        {
            **sample_query_from_db,
            "id": "query-second",
            "query_text": "Jakie są warunki umowy sprzedaży?",
            "accurate_response_content": "Szczegółowa analiza umowy...",
            "accurate_model_name": "gpt-oss:120b",
            "accurate_generation_time_ms": 120000
        },
        {
            **sample_query_from_db,
            "id": "query-third",
            "query_text": "Jak działa reklamacja towaru?",
            "sources": []
        }
    ]


@pytest.fixture
def sample_ratings() -> List[Dict[str, Any]]:
    """Sample ratings from database (matching db column names)."""
    return [
        {
            "id": "rating-1",
            "user_id": "user-123",
            "query_history_id": "query-123",
            "response_type": "fast",
            "rating_value": "up",  # This is db column name
            "created_at": "2025-12-01T10:05:00Z"
        }
    ]


# =========================================================================
# LIST QUERIES TESTS (GET /api/v1/queries)
# =========================================================================

class TestListQueries:
    """Tests for GET /api/v1/queries endpoint."""

    @pytest.mark.asyncio
    async def test_list_queries_success(self, sample_queries_list, sample_user_id):
        """Test successful query listing with pagination."""
        from backend.routers.queries import get_queries
        
        with patch('backend.routers.queries.list_queries', new_callable=AsyncMock) as mock_list:
            mock_list.return_value = (sample_queries_list, 3)
            
            # Mock get_current_user dependency
            with patch('backend.routers.queries.get_current_user', return_value=sample_user_id):
                result = await get_queries(
                    page=1,
                    per_page=20,
                    order="desc",
                    user_id=sample_user_id
                )
            
            # Verify response structure
            assert len(result.queries) == 3
            assert result.pagination.page == 1
            assert result.pagination.per_page == 20
            assert result.pagination.total_count == 3
            assert result.pagination.total_pages == 1
            
            # Verify first query item
            first_query = result.queries[0]
            assert first_query.query_id == "query-123e4567-e89b-12d3"
            assert "prawa konsumenta" in first_query.query_text.lower()
            assert first_query.fast_response.model_name == "mistral:7b"
            assert first_query.fast_response.sources_count == 1
            assert first_query.accurate_response is None
            
            # Verify second query has accurate response
            second_query = result.queries[1]
            assert second_query.accurate_response is not None
            assert second_query.accurate_response.exists is True
            assert second_query.accurate_response.model_name == "gpt-oss:120b"

    @pytest.mark.asyncio
    async def test_list_queries_empty(self, sample_user_id):
        """Test listing when user has no queries."""
        from backend.routers.queries import get_queries
        
        with patch('backend.routers.queries.list_queries', new_callable=AsyncMock) as mock_list:
            mock_list.return_value = ([], 0)
            
            result = await get_queries(
                page=1,
                per_page=20,
                order="desc",
                user_id=sample_user_id
            )
            
            assert result.queries == []
            assert result.pagination.total_count == 0
            assert result.pagination.total_pages == 0

    @pytest.mark.asyncio
    async def test_list_queries_pagination(self, sample_queries_list, sample_user_id):
        """Test pagination metadata calculation."""
        from backend.routers.queries import get_queries
        
        with patch('backend.routers.queries.list_queries', new_callable=AsyncMock) as mock_list:
            # Simulate 45 total queries, returning page 2
            mock_list.return_value = (sample_queries_list[:2], 45)
            
            result = await get_queries(
                page=2,
                per_page=20,
                order="desc",
                user_id=sample_user_id
            )
            
            assert result.pagination.page == 2
            assert result.pagination.total_count == 45
            assert result.pagination.total_pages == 3  # ceil(45/20) = 3

    @pytest.mark.asyncio
    async def test_list_queries_invalid_page(self, sample_user_id):
        """Test error when page is invalid."""
        from backend.routers.queries import get_queries
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            await get_queries(
                page=0,  # Invalid
                per_page=20,
                order="desc",
                user_id=sample_user_id
            )
        
        assert exc_info.value.status_code == 422
        assert "Page must be >= 1" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_list_queries_invalid_per_page(self, sample_user_id):
        """Test error when per_page exceeds maximum."""
        from backend.routers.queries import get_queries
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            await get_queries(
                page=1,
                per_page=150,  # Exceeds max (100)
                order="desc",
                user_id=sample_user_id
            )
        
        assert exc_info.value.status_code == 422
        assert "1-100" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_list_queries_invalid_order(self, sample_user_id):
        """Test error when order is invalid."""
        from backend.routers.queries import get_queries
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            await get_queries(
                page=1,
                per_page=20,
                order="invalid",  # Should be 'desc' or 'asc'
                user_id=sample_user_id
            )
        
        assert exc_info.value.status_code == 422


# =========================================================================
# GET QUERY DETAILS TESTS (GET /api/v1/queries/{query_id})
# =========================================================================

class TestGetQueryDetails:
    """Tests for GET /api/v1/queries/{query_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_query_success(self, sample_query_from_db, sample_user_id, sample_ratings):
        """Test successful query details retrieval."""
        from backend.routers.queries import get_query
        
        with patch('backend.routers.queries.get_query_by_id', new_callable=AsyncMock) as mock_get, \
             patch('backend.routers.queries.get_ratings_by_query', new_callable=AsyncMock) as mock_ratings:
            
            mock_get.return_value = sample_query_from_db
            mock_ratings.return_value = sample_ratings
            
            result = await get_query(
                query_id="query-123e4567-e89b-12d3",
                user_id=sample_user_id
            )
            
            # Verify response
            assert result.query_id == "query-123e4567-e89b-12d3"
            assert "prawa konsumenta" in result.query_text.lower()
            assert result.status == "completed"
            
            # Verify fast response
            assert result.fast_response.content is not None
            assert result.fast_response.model_name == "mistral:7b"
            assert result.fast_response.generation_time_ms == 8500
            assert result.fast_response.rating is not None
            assert result.fast_response.rating.rating_id == "rating-1"
            
            # Verify no accurate response
            assert result.accurate_response is None

    @pytest.mark.asyncio
    async def test_get_query_with_accurate_response(self, sample_query_from_db, sample_user_id):
        """Test query details with accurate response."""
        from backend.routers.queries import get_query
        
        query_with_accurate = {
            **sample_query_from_db,
            "accurate_response_content": "Szczegółowa analiza prawna...",
            "accurate_model_name": "gpt-oss:120b",
            "accurate_generation_time_ms": 180000,
            "accurate_response_status": "completed"
        }
        
        with patch('backend.routers.queries.get_query_by_id', new_callable=AsyncMock) as mock_get, \
             patch('backend.routers.queries.get_ratings_by_query', new_callable=AsyncMock) as mock_ratings:
            
            mock_get.return_value = query_with_accurate
            mock_ratings.return_value = []
            
            result = await get_query(
                query_id="query-123",
                user_id=sample_user_id
            )
            
            # Verify accurate response
            assert result.accurate_response is not None
            assert result.accurate_response.content == "Szczegółowa analiza prawna..."
            assert result.accurate_response.model_name == "gpt-oss:120b"

    @pytest.mark.asyncio
    async def test_get_query_not_found(self, sample_user_id):
        """Test error when query not found."""
        from backend.routers.queries import get_query
        from fastapi import HTTPException
        
        with patch('backend.routers.queries.get_query_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            
            with pytest.raises(HTTPException) as exc_info:
                await get_query(
                    query_id="non-existent-query",
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 404
            assert "not found" in str(exc_info.value.detail).lower()


# =========================================================================
# DELETE QUERY TESTS (DELETE /api/v1/queries/{query_id})
# =========================================================================

class TestDeleteQuery:
    """Tests for DELETE /api/v1/queries/{query_id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_query_success(self, sample_user_id):
        """Test successful query deletion."""
        from backend.routers.queries import delete_query_endpoint
        
        with patch('backend.routers.queries.delete_query', new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = True
            
            result = await delete_query_endpoint(
                query_id="query-to-delete",
                user_id=sample_user_id
            )
            
            # Should return 204 No Content response
            assert result.status_code == 204
            
            # Verify delete was called with correct args
            mock_delete.assert_called_once_with("query-to-delete", sample_user_id)

    @pytest.mark.asyncio
    async def test_delete_query_not_found(self, sample_user_id):
        """Test error when query to delete not found."""
        from backend.routers.queries import delete_query_endpoint
        from fastapi import HTTPException
        
        with patch('backend.routers.queries.delete_query', new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = False
            
            with pytest.raises(HTTPException) as exc_info:
                await delete_query_endpoint(
                    query_id="non-existent-query",
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 404


# =========================================================================
# REQUEST ACCURATE RESPONSE TESTS
# =========================================================================

class TestRequestAccurateResponse:
    """Tests for POST /api/v1/queries/{query_id}/accurate-response endpoint."""

    @pytest.mark.asyncio
    async def test_request_accurate_success(self, sample_query_from_db, sample_user_id):
        """Test successful accurate response request."""
        from backend.routers.queries import request_accurate_response
        from fastapi import BackgroundTasks
        
        with patch('backend.routers.queries.get_query_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_query_from_db
            
            background_tasks = BackgroundTasks()
            
            result = await request_accurate_response(
                query_id="query-123",
                background_tasks=background_tasks,
                user_id=sample_user_id
            )
            
            # Verify response
            assert result.query_id == "query-123"
            assert result.accurate_response.status == "processing"
            assert result.accurate_response.estimated_time_seconds == 180

    @pytest.mark.asyncio
    async def test_request_accurate_query_not_found(self, sample_user_id):
        """Test error when query not found."""
        from backend.routers.queries import request_accurate_response
        from fastapi import HTTPException, BackgroundTasks
        
        with patch('backend.routers.queries.get_query_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            
            background_tasks = BackgroundTasks()
            
            with pytest.raises(HTTPException) as exc_info:
                await request_accurate_response(
                    query_id="non-existent",
                    background_tasks=background_tasks,
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_request_accurate_already_exists(self, sample_query_from_db, sample_user_id):
        """Test error when accurate response already exists."""
        from backend.routers.queries import request_accurate_response
        from fastapi import HTTPException, BackgroundTasks
        
        query_with_accurate = {
            **sample_query_from_db,
            "accurate_response_content": "Already generated..."
        }
        
        with patch('backend.routers.queries.get_query_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = query_with_accurate
            
            background_tasks = BackgroundTasks()
            
            with pytest.raises(HTTPException) as exc_info:
                await request_accurate_response(
                    query_id="query-123",
                    background_tasks=background_tasks,
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 409
            assert "already exists" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_request_accurate_fast_not_completed(self, sample_user_id):
        """Test error when fast response not completed yet."""
        from backend.routers.queries import request_accurate_response
        from fastapi import HTTPException, BackgroundTasks
        
        query_without_fast = {
            "id": "query-123",
            "user_id": sample_user_id,
            "query_text": "Test query",
            "fast_response_content": None,  # Not completed
            "accurate_response_content": None,
            "sources": [],
            "fast_model_name": None,
            "fast_generation_time_ms": None,
            "created_at": "2025-12-01T10:00:00Z"
        }
        
        with patch('backend.routers.queries.get_query_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = query_without_fast
            
            background_tasks = BackgroundTasks()
            
            with pytest.raises(HTTPException) as exc_info:
                await request_accurate_response(
                    query_id="query-123",
                    background_tasks=background_tasks,
                    user_id=sample_user_id
                )
            
            assert exc_info.value.status_code == 409
            assert "fast response" in str(exc_info.value.detail).lower()


# =========================================================================
# DATABASE REPOSITORY TESTS
# =========================================================================

class TestQueryRepository:
    """Tests for query repository functions."""

    @pytest.mark.asyncio
    async def test_list_queries_repository(self, sample_user_id):
        """Test list_queries repository function."""
        from backend.db.queries import list_queries
        
        mock_response = MagicMock()
        mock_response.data = [{"id": "1"}, {"id": "2"}]
        mock_response.count = 2
        
        with patch('backend.db.queries.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute = AsyncMock(return_value=mock_response)
            mock_supabase.return_value = mock_client
            
            queries, total = await list_queries(
                user_id=sample_user_id,
                page=1,
                per_page=20,
                order="desc"
            )
            
            assert len(queries) == 2
            assert total == 2

    @pytest.mark.asyncio
    async def test_list_queries_validation_error(self, sample_user_id):
        """Test list_queries validation errors."""
        from backend.db.queries import list_queries
        
        # Invalid page
        with pytest.raises(ValueError) as exc_info:
            await list_queries(sample_user_id, page=0, per_page=20)
        assert "page must be >= 1" in str(exc_info.value)
        
        # Invalid per_page
        with pytest.raises(ValueError) as exc_info:
            await list_queries(sample_user_id, page=1, per_page=200)
        assert "per_page must be 1-100" in str(exc_info.value)
        
        # Invalid order
        with pytest.raises(ValueError) as exc_info:
            await list_queries(sample_user_id, page=1, per_page=20, order="invalid")
        assert "order must be" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_query_by_id_repository(self, sample_query_from_db, sample_user_id):
        """Test get_query_by_id repository function."""
        from backend.db.queries import get_query_by_id
        
        mock_response = MagicMock()
        mock_response.data = sample_query_from_db
        
        with patch('backend.db.queries.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_response)
            mock_supabase.return_value = mock_client
            
            query = await get_query_by_id("query-123", sample_user_id)
            
            assert query is not None
            assert query["id"] == sample_query_from_db["id"]

    @pytest.mark.asyncio
    async def test_delete_query_repository(self, sample_user_id):
        """Test delete_query repository function."""
        from backend.db.queries import delete_query
        
        mock_response = MagicMock()
        mock_response.data = [{"id": "deleted-query"}]
        
        with patch('backend.db.queries.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute = AsyncMock(return_value=mock_response)
            mock_supabase.return_value = mock_client
            
            deleted = await delete_query("query-123", sample_user_id)
            
            assert deleted is True


# =========================================================================
# PYDANTIC MODEL TESTS
# =========================================================================

class TestQueryModels:
    """Tests for Pydantic model validation."""

    def test_query_list_item_model(self):
        """Test QueryListItem model creation."""
        fast_response = QueryListItemFastResponse(
            content="Test response content",
            model_name="mistral:7b",
            generation_time_ms=8500,
            sources_count=3,
            rating=None
        )
        
        query = QueryListItem(
            query_id="test-id",
            query_text="Test query",
            created_at=datetime.now(),
            fast_response=fast_response,
            accurate_response=None
        )
        
        assert query.query_id == "test-id"
        assert query.fast_response.sources_count == 3

    def test_pagination_metadata_model(self):
        """Test PaginationMetadata model validation."""
        pagination = PaginationMetadata(
            page=1,
            per_page=20,
            total_pages=5,
            total_count=100
        )
        
        assert pagination.page == 1
        assert pagination.total_count == 100

    def test_pagination_metadata_invalid_page(self):
        """Test PaginationMetadata rejects invalid page."""
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            PaginationMetadata(
                page=0,  # Invalid - must be >= 1
                per_page=20,
                total_pages=5,
                total_count=100
            )

    def test_pagination_metadata_invalid_per_page(self):
        """Test PaginationMetadata rejects invalid per_page."""
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            PaginationMetadata(
                page=1,
                per_page=150,  # Invalid - max 100
                total_pages=5,
                total_count=100
            )

