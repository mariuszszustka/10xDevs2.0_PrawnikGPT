"""
PrawnikGPT Backend - Legal Acts Endpoint Tests

Unit tests for legal acts management endpoints:
- GET /api/v1/legal-acts (list with filters and pagination)
- GET /api/v1/legal-acts/{act_id} (details with statistics)
- GET /api/v1/legal-acts/{act_id}/relations (relations graph)

All tests use mocks for database operations.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any
from datetime import datetime

from backend.models.legal_act import (
    LegalActListItem,
    LegalActListResponse,
    LegalActDetailResponse,
    LegalActRelationsResponse,
    LegalActStats,
    PaginationMetadata
)


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
def sample_act_id() -> str:
    """Sample legal act ID for tests."""
    return "act-123e4567-e89b-12d3"


@pytest.fixture
def sample_legal_act_from_db() -> Dict[str, Any]:
    """Sample legal act record from database."""
    return {
        "id": "act-123e4567-e89b-12d3",
        "publisher": "Dz.U.",
        "year": 1964,
        "position": 16,
        "title": "Ustawa z dnia 23 kwietnia 1964 r. - Kodeks cywilny",
        "typ_aktu": "Ustawa",
        "status": "obowiazujacy",
        "organ_wydajacy": "Sejm RP",
        "published_date": "1964-04-23T00:00:00Z",
        "effective_date": "1965-01-01T00:00:00Z",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-15T00:00:00Z"
    }


@pytest.fixture
def sample_legal_acts_list(sample_legal_act_from_db) -> List[Dict[str, Any]]:
    """Sample list of legal acts from database."""
    return [
        sample_legal_act_from_db,
        {
            **sample_legal_act_from_db,
            "id": "act-second",
            "title": "Ustawa o prawach konsumenta",
            "year": 2014,
            "position": 827,
            "status": "obowiazujacy"
        },
        {
            **sample_legal_act_from_db,
            "id": "act-third",
            "title": "Ustawa o ochronie danych osobowych",
            "year": 2018,
            "position": 1000,
            "status": "uchylony"
        }
    ]


@pytest.fixture
def sample_act_with_stats(sample_legal_act_from_db) -> Dict[str, Any]:
    """Sample legal act with statistics."""
    return {
        **sample_legal_act_from_db,
        "stats": {
            "total_chunks": 145,
            "related_acts_count": 23
        }
    }


@pytest.fixture
def sample_relations() -> Dict[str, List[Dict[str, Any]]]:
    """Sample relations data from database."""
    return {
        "outgoing": [
            {
                "id": "rel-outgoing-1",
                "target_act_id": "target-act-1",
                "relation_type": "zmienia",
                "article_reference": "Art. 5 zmienia Art. 10",
                "created_at": "2020-01-01T00:00:00Z",
                "target_act": {
                    "id": "target-act-1",
                    "title": "Ustawa docelowa",
                    "typ_aktu": "Ustawa",
                    "status": "obowiazujacy"
                }
            }
        ],
        "incoming": [
            {
                "id": "rel-incoming-1",
                "source_act_id": "source-act-1",
                "relation_type": "powoluje_sie",
                "article_reference": "Powołuje się na Art. 15",
                "created_at": "2019-06-01T00:00:00Z",
                "source_act": {
                    "id": "source-act-1",
                    "title": "Ustawa źródłowa",
                    "typ_aktu": "Rozporządzenie",
                    "status": "obowiazujacy"
                }
            }
        ]
    }


# =========================================================================
# LIST LEGAL ACTS TESTS
# =========================================================================

class TestListLegalActs:
    """Tests for GET /api/v1/legal-acts endpoint."""

    @pytest.mark.asyncio
    async def test_list_legal_acts_success(self, sample_legal_acts_list):
        """Test successful legal acts listing."""
        from backend.routers.legal_acts import list_legal_acts
        
        with patch('backend.routers.legal_acts.db_list_legal_acts', new_callable=AsyncMock) as mock_list:
            mock_list.return_value = (sample_legal_acts_list, 3)
            
            result = await list_legal_acts(
                page=1,
                per_page=20,
                search=None,
                status=None,
                publisher=None,
                year=None,
                order_by="published_date",
                order="desc"
            )
            
            # Verify response structure
            assert len(result.legal_acts) == 3
            assert result.pagination.page == 1
            assert result.pagination.total_count == 3
            assert result.pagination.total_pages == 1
            
            # Verify first act
            first_act = result.legal_acts[0]
            assert first_act.title == "Ustawa z dnia 23 kwietnia 1964 r. - Kodeks cywilny"
            assert first_act.publisher == "Dz.U."
            assert first_act.year == 1964

    @pytest.mark.asyncio
    async def test_list_legal_acts_with_search(self, sample_legal_acts_list):
        """Test listing with search filter."""
        from backend.routers.legal_acts import list_legal_acts
        
        with patch('backend.routers.legal_acts.db_list_legal_acts', new_callable=AsyncMock) as mock_list:
            mock_list.return_value = ([sample_legal_acts_list[0]], 1)
            
            result = await list_legal_acts(
                page=1,
                per_page=20,
                search="Kodeks cywilny",
                status=None,
                publisher=None,
                year=None,
                order_by="published_date",
                order="desc"
            )
            
            assert len(result.legal_acts) == 1
            assert "Kodeks cywilny" in result.legal_acts[0].title
            
            # Verify search was passed to repository
            mock_list.assert_called_once()
            call_args = mock_list.call_args
            assert call_args[1]["search"] == "Kodeks cywilny"

    @pytest.mark.asyncio
    async def test_list_legal_acts_with_status_filter(self, sample_legal_acts_list):
        """Test listing with status filter."""
        from backend.routers.legal_acts import list_legal_acts
        
        with patch('backend.routers.legal_acts.db_list_legal_acts', new_callable=AsyncMock) as mock_list:
            # Return only active acts
            active_acts = [a for a in sample_legal_acts_list if a["status"] == "obowiazujacy"]
            mock_list.return_value = (active_acts, len(active_acts))
            
            result = await list_legal_acts(
                page=1,
                per_page=20,
                search=None,
                status="obowiazujacy",
                publisher=None,
                year=None,
                order_by="published_date",
                order="desc"
            )
            
            assert len(result.legal_acts) == 2
            for act in result.legal_acts:
                assert act.status == "obowiazujacy"

    @pytest.mark.asyncio
    async def test_list_legal_acts_with_year_filter(self, sample_legal_acts_list):
        """Test listing with year filter."""
        from backend.routers.legal_acts import list_legal_acts
        
        with patch('backend.routers.legal_acts.db_list_legal_acts', new_callable=AsyncMock) as mock_list:
            mock_list.return_value = ([sample_legal_acts_list[0]], 1)
            
            result = await list_legal_acts(
                page=1,
                per_page=20,
                search=None,
                status=None,
                publisher=None,
                year=1964,
                order_by="published_date",
                order="desc"
            )
            
            assert len(result.legal_acts) == 1
            assert result.legal_acts[0].year == 1964

    @pytest.mark.asyncio
    async def test_list_legal_acts_empty(self):
        """Test listing when no acts found."""
        from backend.routers.legal_acts import list_legal_acts
        
        with patch('backend.routers.legal_acts.db_list_legal_acts', new_callable=AsyncMock) as mock_list:
            mock_list.return_value = ([], 0)
            
            result = await list_legal_acts(
                page=1,
                per_page=20,
                search="nieistniejący akt",
                status=None,
                publisher=None,
                year=None,
                order_by="published_date",
                order="desc"
            )
            
            assert result.legal_acts == []
            assert result.pagination.total_count == 0

    @pytest.mark.asyncio
    async def test_list_legal_acts_pagination(self, sample_legal_acts_list):
        """Test pagination calculation."""
        from backend.routers.legal_acts import list_legal_acts
        
        with patch('backend.routers.legal_acts.db_list_legal_acts', new_callable=AsyncMock) as mock_list:
            # Simulate 250 total acts, returning page 2
            mock_list.return_value = (sample_legal_acts_list, 250)
            
            result = await list_legal_acts(
                page=2,
                per_page=20,
                search=None,
                status=None,
                publisher=None,
                year=None,
                order_by="published_date",
                order="desc"
            )
            
            assert result.pagination.page == 2
            assert result.pagination.total_count == 250
            assert result.pagination.total_pages == 13  # ceil(250/20) = 13


# =========================================================================
# GET LEGAL ACT DETAILS TESTS
# =========================================================================

class TestGetLegalActDetails:
    """Tests for GET /api/v1/legal-acts/{act_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_legal_act_success(self, sample_act_with_stats, sample_act_id):
        """Test successful legal act details retrieval."""
        from backend.routers.legal_acts import get_legal_act
        
        with patch('backend.routers.legal_acts.get_legal_act_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_act_with_stats
            
            result = await get_legal_act(act_id=sample_act_id)
            
            # Verify response
            assert result.id == sample_act_id
            assert result.title == "Ustawa z dnia 23 kwietnia 1964 r. - Kodeks cywilny"
            assert result.publisher == "Dz.U."
            assert result.year == 1964
            assert result.position == 16
            
            # Verify statistics
            assert result.stats.total_chunks == 145
            assert result.stats.related_acts_count == 23

    @pytest.mark.asyncio
    async def test_get_legal_act_not_found(self, sample_act_id):
        """Test error when act not found."""
        from backend.routers.legal_acts import get_legal_act
        from fastapi import HTTPException
        
        with patch('backend.routers.legal_acts.get_legal_act_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            
            with pytest.raises(HTTPException) as exc_info:
                await get_legal_act(act_id="non-existent-act")
            
            assert exc_info.value.status_code == 404
            assert "not found" in str(exc_info.value.detail).lower()


# =========================================================================
# GET LEGAL ACT RELATIONS TESTS
# =========================================================================

class TestGetLegalActRelations:
    """Tests for GET /api/v1/legal-acts/{act_id}/relations endpoint."""

    @pytest.mark.asyncio
    async def test_get_relations_success(self, sample_relations, sample_act_id):
        """Test successful relations retrieval."""
        from backend.routers.legal_acts import get_legal_act_relations
        
        with patch('backend.routers.legal_acts.db_get_relations', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_relations
            
            result = await get_legal_act_relations(
                act_id=sample_act_id,
                depth=1,
                relation_type=None
            )
            
            # Verify response structure
            assert result.act_id == sample_act_id
            assert result.depth == 1
            
            # Verify outgoing relations
            assert len(result.relations.outgoing) == 1
            outgoing = result.relations.outgoing[0]
            assert outgoing.relation_type == "zmienia"
            assert outgoing.target_act.title == "Ustawa docelowa"
            
            # Verify incoming relations
            assert len(result.relations.incoming) == 1
            incoming = result.relations.incoming[0]
            assert incoming.relation_type == "powoluje_sie"
            assert incoming.source_act.title == "Ustawa źródłowa"

    @pytest.mark.asyncio
    async def test_get_relations_with_depth_2(self, sample_relations, sample_act_id):
        """Test relations with depth=2."""
        from backend.routers.legal_acts import get_legal_act_relations
        
        with patch('backend.routers.legal_acts.db_get_relations', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = sample_relations
            
            result = await get_legal_act_relations(
                act_id=sample_act_id,
                depth=2,
                relation_type=None
            )
            
            assert result.depth == 2
            
            # Verify depth was passed to repository
            mock_get.assert_called_once()
            call_args = mock_get.call_args
            assert call_args[0][1] == 2  # depth argument

    @pytest.mark.asyncio
    async def test_get_relations_with_type_filter(self, sample_act_id):
        """Test relations with relation_type filter."""
        from backend.routers.legal_acts import get_legal_act_relations
        
        # Return only 'modifies' relations (router uses English names)
        filtered_relations = {
            "outgoing": [{
                "id": "rel-outgoing-1",
                "target_act_id": "target-act-1",
                "relation_type": "zmienia",
                "article_reference": "Art. 5 zmienia Art. 10",
                "created_at": "2020-01-01T00:00:00Z",
                "target_act": {
                    "id": "target-act-1",
                    "title": "Ustawa docelowa",
                    "typ_aktu": "Ustawa",
                    "status": "obowiazujacy"
                }
            }],
            "incoming": []
        }
        
        with patch('backend.routers.legal_acts.db_get_relations', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = filtered_relations
            
            # Router uses English relation types
            result = await get_legal_act_relations(
                act_id=sample_act_id,
                depth=1,
                relation_type="modifies"  # English name used in API
            )
            
            assert len(result.relations.outgoing) == 1
            assert len(result.relations.incoming) == 0

    @pytest.mark.asyncio
    async def test_get_relations_empty(self, sample_act_id):
        """Test relations when no relations exist."""
        from backend.routers.legal_acts import get_legal_act_relations
        
        with patch('backend.routers.legal_acts.db_get_relations', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"outgoing": [], "incoming": []}
            
            result = await get_legal_act_relations(
                act_id=sample_act_id,
                depth=1,
                relation_type=None
            )
            
            assert result.relations.outgoing == []
            assert result.relations.incoming == []


# =========================================================================
# REPOSITORY TESTS
# =========================================================================

class TestLegalActsRepository:
    """Tests for legal acts repository functions."""

    @pytest.mark.asyncio
    async def test_list_legal_acts_repository(self, sample_legal_acts_list):
        """Test list_legal_acts repository function."""
        from backend.db.legal_acts import list_legal_acts
        
        mock_response = MagicMock()
        mock_response.data = sample_legal_acts_list
        mock_response.count = 3
        
        with patch('backend.db.legal_acts.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client
            
            acts, total = await list_legal_acts(page=1, per_page=20)
            
            assert len(acts) == 3
            assert total == 3

    @pytest.mark.asyncio
    async def test_get_legal_act_by_id_repository(self, sample_act_with_stats, sample_act_id):
        """Test get_legal_act_by_id repository function."""
        from backend.db.legal_acts import get_legal_act_by_id
        
        mock_act_response = MagicMock()
        mock_act_response.data = {**sample_act_with_stats}
        del mock_act_response.data["stats"]  # Stats are calculated separately
        
        mock_chunks_response = MagicMock()
        mock_chunks_response.count = 145
        
        mock_relations_response = MagicMock()
        mock_relations_response.count = 23
        
        with patch('backend.db.legal_acts.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            
            # Configure different responses
            mock_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_act_response
            mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_chunks_response
            mock_client.table.return_value.select.return_value.or_.return_value.execute.return_value = mock_relations_response
            
            mock_supabase.return_value = mock_client
            
            act = await get_legal_act_by_id(sample_act_id)
            
            assert act is not None
            assert "stats" in act

    @pytest.mark.asyncio
    async def test_search_legal_acts_repository(self, sample_legal_acts_list):
        """Test search_legal_acts repository function."""
        from backend.db.legal_acts import search_legal_acts
        
        mock_response = MagicMock()
        mock_response.data = [sample_legal_acts_list[0]]
        
        with patch('backend.db.legal_acts.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.table.return_value.select.return_value.ilike.return_value.limit.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client
            
            results = await search_legal_acts("Kodeks cywilny")
            
            assert len(results) == 1
            assert "Kodeks" in results[0]["title"]


# =========================================================================
# PYDANTIC MODEL TESTS
# =========================================================================

class TestLegalActModels:
    """Tests for Pydantic model validation."""

    def test_legal_act_list_item_model(self):
        """Test LegalActListItem model creation."""
        item = LegalActListItem(
            id="test-id",
            publisher="Dz.U.",
            year=1964,
            position=16,
            title="Kodeks cywilny",
            typ_aktu="Ustawa",
            status="obowiazujacy",
            organ_wydajacy="Sejm RP",
            published_date=datetime.now(),
            effective_date=None,
            created_at=datetime.now()
        )
        
        assert item.publisher == "Dz.U."
        assert item.year == 1964

    def test_legal_act_list_item_invalid_year(self):
        """Test LegalActListItem rejects invalid year."""
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError) as exc_info:
            LegalActListItem(
                id="test-id",
                publisher="Dz.U.",
                year=1800,  # Invalid - before 1918
                position=16,
                title="Kodeks cywilny",
                typ_aktu="Ustawa",
                status="obowiazujacy",
                organ_wydajacy=None,
                published_date=datetime.now(),
                effective_date=None,
                created_at=datetime.now()
            )
        
        assert "year" in str(exc_info.value)

    def test_legal_act_stats_model(self):
        """Test LegalActStats model creation."""
        stats = LegalActStats(
            total_chunks=100,
            related_acts_count=25
        )
        
        assert stats.total_chunks == 100
        assert stats.related_acts_count == 25

    def test_pagination_metadata_model(self):
        """Test PaginationMetadata model."""
        pagination = PaginationMetadata(
            page=1,
            per_page=20,
            total_pages=10,
            total_count=200
        )
        
        assert pagination.page == 1
        assert pagination.total_count == 200

    def test_legal_act_list_response_model(self):
        """Test LegalActListResponse model."""
        from backend.models.legal_act import LegalActListResponse
        
        items = [
            LegalActListItem(
                id="test-id",
                publisher="Dz.U.",
                year=1964,
                position=16,
                title="Kodeks cywilny",
                typ_aktu="Ustawa",
                status="obowiazujacy",
                organ_wydajacy=None,
                published_date=datetime.now(),
                effective_date=None,
                created_at=datetime.now()
            )
        ]
        
        response = LegalActListResponse(
            legal_acts=items,
            pagination=PaginationMetadata(
                page=1,
                per_page=20,
                total_pages=1,
                total_count=1
            )
        )
        
        assert len(response.legal_acts) == 1
        assert response.pagination.total_count == 1
