"""
PrawnikGPT Backend - Vector Search Tests

Unit tests for the vector search service:
- Semantic search (pgvector RPC)
- Related acts fetch (graph traversal RPC)
- Helper functions

All tests use mocks to avoid database dependency.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any

from backend.services.vector_search import (
    semantic_search,
    semantic_search_with_query,
    fetch_related_acts,
    extract_act_ids_from_chunks,
    group_chunks_by_act,
    DEFAULT_TOP_K,
    DEFAULT_DISTANCE_THRESHOLD,
    MIN_RESULTS_REQUIRED
)
from backend.services.exceptions import NoRelevantActsError


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
def sample_embedding_768() -> List[float]:
    """Sample 768-dimensional embedding vector."""
    return [0.1] * 768


@pytest.fixture
def sample_embedding_1024() -> List[float]:
    """Sample 1024-dimensional embedding vector."""
    return [0.1] * 1024


@pytest.fixture
def sample_chunks_response() -> List[Dict[str, Any]]:
    """Sample response from semantic_search_chunks RPC."""
    return [
        {
            "id": "chunk-1",
            "legal_act_id": "act-1",
            "chunk_index": 0,
            "content": "Artykuł 1. Kodeks cywilny reguluje stosunki cywilnoprawne...",
            "metadata": {"type": "article", "number": "1"},
            "distance": 0.25,
            "act_title": "Kodeks cywilny",
            "act_publisher": "Dz.U.",
            "act_year": 1964,
            "act_position": 93,
            "act_status": "obowiązująca"
        },
        {
            "id": "chunk-2",
            "legal_act_id": "act-1",
            "chunk_index": 1,
            "content": "Artykuł 2. Ustawa określa zasady...",
            "metadata": {"type": "article", "number": "2"},
            "distance": 0.30,
            "act_title": "Kodeks cywilny",
            "act_publisher": "Dz.U.",
            "act_year": 1964,
            "act_position": 93,
            "act_status": "obowiązująca"
        },
        {
            "id": "chunk-3",
            "legal_act_id": "act-2",
            "chunk_index": 0,
            "content": "Artykuł 1. Ustawa o prawach konsumenta...",
            "metadata": {"type": "article", "number": "1"},
            "distance": 0.35,
            "act_title": "Ustawa o prawach konsumenta",
            "act_publisher": "Dz.U.",
            "act_year": 2014,
            "act_position": 827,
            "act_status": "obowiązująca"
        }
    ]


@pytest.fixture
def sample_related_acts_response() -> List[Dict[str, Any]]:
    """Sample response from fetch_related_acts RPC."""
    return [
        {
            "act_id": "related-act-1",
            "title": "Ustawa nowelizująca Kodeks cywilny",
            "publisher": "Dz.U.",
            "year": 2020,
            "position": 1234,
            "status": "obowiązująca",
            "published_date": "2020-06-15",
            "relation_type": "modifies",
            "relation_description": "Art. 5 modyfikuje Art. 10 KC",
            "source_act_id": "act-1",
            "depth": 1
        },
        {
            "act_id": "related-act-2",
            "title": "Rozporządzenie wykonawcze",
            "publisher": "Dz.U.",
            "year": 2021,
            "position": 567,
            "status": "obowiązująca",
            "published_date": "2021-03-20",
            "relation_type": "implements",
            "relation_description": None,
            "source_act_id": "act-1",
            "depth": 1
        }
    ]


# =========================================================================
# SEMANTIC SEARCH TESTS
# =========================================================================

class TestSemanticSearch:
    """Tests for semantic_search function."""

    @pytest.mark.asyncio
    async def test_semantic_search_success(self, sample_embedding_1024, sample_chunks_response):
        """Test successful semantic search with valid embedding."""
        mock_response = MagicMock()
        mock_response.data = sample_chunks_response

        with patch('backend.services.vector_search.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.rpc.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client

            results = await semantic_search(
                query_embedding=sample_embedding_1024,
                top_k=10,
                distance_threshold=0.5
            )

            assert len(results) == 3
            assert results[0]["id"] == "chunk-1"
            assert results[0]["distance"] == 0.25
            assert results[0]["legal_act"]["title"] == "Kodeks cywilny"

    @pytest.mark.asyncio
    async def test_semantic_search_with_768_dim_embedding(self, sample_embedding_768, sample_chunks_response):
        """Test semantic search with 768-dim embedding (should pad to 1024)."""
        mock_response = MagicMock()
        mock_response.data = sample_chunks_response

        with patch('backend.services.vector_search.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.rpc.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client

            results = await semantic_search(
                query_embedding=sample_embedding_768,
                top_k=10,
                distance_threshold=0.5
            )

            # Verify RPC was called with padded embedding
            call_args = mock_client.rpc.call_args
            assert call_args[0][0] == "semantic_search_chunks"
            assert len(call_args[0][1]["query_embedding"]) == 1024

    @pytest.mark.asyncio
    async def test_semantic_search_no_results(self, sample_embedding_1024):
        """Test semantic search when no chunks found."""
        mock_response = MagicMock()
        mock_response.data = []

        with patch('backend.services.vector_search.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.rpc.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client

            with pytest.raises(NoRelevantActsError):
                await semantic_search(
                    query_embedding=sample_embedding_1024,
                    top_k=10,
                    distance_threshold=0.5
                )

    @pytest.mark.asyncio
    async def test_semantic_search_insufficient_results(self, sample_embedding_1024):
        """Test semantic search with fewer results than MIN_RESULTS_REQUIRED."""
        mock_response = MagicMock()
        mock_response.data = [
            {
                "id": "chunk-1",
                "legal_act_id": "act-1",
                "chunk_index": 0,
                "content": "Test content...",
                "metadata": None,
                "distance": 0.25,
                "act_title": "Test Act",
                "act_publisher": "Dz.U.",
                "act_year": 2024,
                "act_position": 1,
                "act_status": "obowiązująca"
            }
        ]  # Only 1 result, less than MIN_RESULTS_REQUIRED (3)

        with patch('backend.services.vector_search.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.rpc.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client

            with pytest.raises(NoRelevantActsError) as exc_info:
                await semantic_search(
                    query_embedding=sample_embedding_1024,
                    top_k=10,
                    distance_threshold=0.5
                )
            
            assert "Only 1 relevant chunks found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_semantic_search_invalid_embedding_empty(self):
        """Test semantic search with empty embedding."""
        with pytest.raises(ValueError) as exc_info:
            await semantic_search(
                query_embedding=[],
                top_k=10,
                distance_threshold=0.5
            )
        
        assert "query_embedding is required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_semantic_search_invalid_embedding_wrong_dim(self):
        """Test semantic search with wrong dimension embedding."""
        with pytest.raises(ValueError) as exc_info:
            await semantic_search(
                query_embedding=[0.1] * 512,  # Wrong dimension
                top_k=10,
                distance_threshold=0.5
            )
        
        assert "Expected 768 or 1024-dim embedding" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_semantic_search_invalid_top_k(self, sample_embedding_1024):
        """Test semantic search with invalid top_k."""
        with pytest.raises(ValueError) as exc_info:
            await semantic_search(
                query_embedding=sample_embedding_1024,
                top_k=0,  # Invalid
                distance_threshold=0.5
            )
        
        assert "top_k must be >= 1" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_semantic_search_invalid_threshold(self, sample_embedding_1024):
        """Test semantic search with invalid distance threshold."""
        with pytest.raises(ValueError) as exc_info:
            await semantic_search(
                query_embedding=sample_embedding_1024,
                top_k=10,
                distance_threshold=3.0  # Invalid, max is 2
            )
        
        assert "distance_threshold must be 0-2" in str(exc_info.value)


# =========================================================================
# FETCH RELATED ACTS TESTS
# =========================================================================

class TestFetchRelatedActs:
    """Tests for fetch_related_acts function."""

    @pytest.mark.asyncio
    async def test_fetch_related_acts_success(self, sample_related_acts_response):
        """Test successful fetch of related acts."""
        mock_response = MagicMock()
        mock_response.data = sample_related_acts_response

        with patch('backend.services.vector_search.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.rpc.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client

            results = await fetch_related_acts(
                act_ids=["act-1"],
                depth=2
            )

            assert len(results) == 2
            assert results[0]["id"] == "related-act-1"
            assert results[0]["relation_type"] == "modifies"
            assert results[0]["depth"] == 1

    @pytest.mark.asyncio
    async def test_fetch_related_acts_with_filter(self, sample_related_acts_response):
        """Test fetch related acts with relation type filter."""
        mock_response = MagicMock()
        mock_response.data = [sample_related_acts_response[0]]  # Only 'modifies'

        with patch('backend.services.vector_search.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.rpc.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client

            results = await fetch_related_acts(
                act_ids=["act-1"],
                depth=2,
                relation_types=["modifies"]
            )

            # Verify RPC was called with relation_types
            call_args = mock_client.rpc.call_args
            assert call_args[0][1]["relation_types"] == ["modifies"]
            assert len(results) == 1

    @pytest.mark.asyncio
    async def test_fetch_related_acts_no_results(self):
        """Test fetch related acts when no relations found."""
        mock_response = MagicMock()
        mock_response.data = []

        with patch('backend.services.vector_search.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            mock_client.rpc.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client

            results = await fetch_related_acts(
                act_ids=["act-1"],
                depth=2
            )

            assert results == []

    @pytest.mark.asyncio
    async def test_fetch_related_acts_empty_act_ids(self):
        """Test fetch related acts with empty act_ids."""
        with pytest.raises(ValueError) as exc_info:
            await fetch_related_acts(
                act_ids=[],
                depth=2
            )
        
        assert "act_ids list cannot be empty" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_fetch_related_acts_invalid_depth(self):
        """Test fetch related acts with invalid depth."""
        with pytest.raises(ValueError) as exc_info:
            await fetch_related_acts(
                act_ids=["act-1"],
                depth=3  # Invalid, max is 2
            )
        
        assert "depth must be 1 or 2" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_fetch_related_acts_invalid_relation_type(self):
        """Test fetch related acts with invalid relation type."""
        with pytest.raises(ValueError) as exc_info:
            await fetch_related_acts(
                act_ids=["act-1"],
                depth=2,
                relation_types=["invalid_type"]
            )
        
        assert "Invalid relation_types" in str(exc_info.value)


# =========================================================================
# SEMANTIC SEARCH WITH QUERY TESTS
# =========================================================================

class TestSemanticSearchWithQuery:
    """Tests for semantic_search_with_query convenience function."""

    @pytest.mark.asyncio
    async def test_semantic_search_with_query_success(self, sample_chunks_response):
        """Test semantic search with query text."""
        mock_embedding = [0.1] * 768
        mock_response = MagicMock()
        mock_response.data = sample_chunks_response

        with patch('backend.services.vector_search.generate_embedding', new_callable=AsyncMock) as mock_embed, \
             patch('backend.services.vector_search.get_supabase') as mock_supabase:
            
            mock_embed.return_value = mock_embedding
            mock_client = MagicMock()
            mock_client.rpc.return_value.execute.return_value = mock_response
            mock_supabase.return_value = mock_client

            results = await semantic_search_with_query(
                query_text="Jakie są prawa konsumenta?",
                top_k=10,
                distance_threshold=0.5
            )

            # Verify embedding was generated
            mock_embed.assert_called_once_with("Jakie są prawa konsumenta?")
            assert len(results) == 3


# =========================================================================
# HELPER FUNCTION TESTS
# =========================================================================

class TestHelperFunctions:
    """Tests for helper functions."""

    def test_extract_act_ids_from_chunks(self):
        """Test extracting unique act IDs from chunks."""
        chunks = [
            {"legal_act_id": "act-1", "content": "..."},
            {"legal_act_id": "act-1", "content": "..."},
            {"legal_act_id": "act-2", "content": "..."},
            {"content": "..."},  # No legal_act_id
        ]

        act_ids = extract_act_ids_from_chunks(chunks)

        assert len(act_ids) == 2
        assert "act-1" in act_ids
        assert "act-2" in act_ids

    def test_extract_act_ids_from_empty_chunks(self):
        """Test extracting act IDs from empty list."""
        act_ids = extract_act_ids_from_chunks([])
        assert act_ids == []

    def test_group_chunks_by_act(self):
        """Test grouping chunks by legal act ID."""
        chunks = [
            {"legal_act_id": "act-1", "chunk_index": 0, "content": "Chunk 1"},
            {"legal_act_id": "act-1", "chunk_index": 1, "content": "Chunk 2"},
            {"legal_act_id": "act-2", "chunk_index": 0, "content": "Chunk 3"},
        ]

        grouped = group_chunks_by_act(chunks)

        assert len(grouped) == 2
        assert len(grouped["act-1"]) == 2
        assert len(grouped["act-2"]) == 1
        assert grouped["act-1"][0]["chunk_index"] == 0

    def test_group_chunks_by_act_empty(self):
        """Test grouping empty chunk list."""
        grouped = group_chunks_by_act([])
        assert grouped == {}

    def test_group_chunks_by_act_no_act_id(self):
        """Test grouping chunks without legal_act_id."""
        chunks = [
            {"content": "Chunk without act_id"},
        ]

        grouped = group_chunks_by_act(chunks)
        assert grouped == {}


# =========================================================================
# INTEGRATION-STYLE TESTS (with mocked RPC)
# =========================================================================

class TestVectorSearchIntegration:
    """Integration-style tests verifying complete workflows."""

    @pytest.mark.asyncio
    async def test_full_rag_retrieval_flow(self, sample_chunks_response, sample_related_acts_response):
        """Test complete RAG retrieval: semantic search + related acts."""
        mock_chunks = MagicMock()
        mock_chunks.data = sample_chunks_response
        
        mock_related = MagicMock()
        mock_related.data = sample_related_acts_response

        with patch('backend.services.vector_search.get_supabase') as mock_supabase:
            mock_client = MagicMock()
            
            # Configure different responses for different RPC calls
            def rpc_side_effect(func_name, params):
                mock_result = MagicMock()
                if func_name == "semantic_search_chunks":
                    mock_result.execute.return_value = mock_chunks
                elif func_name == "fetch_related_acts":
                    mock_result.execute.return_value = mock_related
                return mock_result
            
            mock_client.rpc.side_effect = rpc_side_effect
            mock_supabase.return_value = mock_client

            # Step 1: Semantic search
            embedding = [0.1] * 1024
            chunks = await semantic_search(embedding, top_k=10)
            
            # Step 2: Extract act IDs
            act_ids = extract_act_ids_from_chunks(chunks)
            
            # Step 3: Fetch related acts
            related = await fetch_related_acts(act_ids, depth=2)

            # Verify workflow
            assert len(chunks) == 3
            assert len(act_ids) == 2
            assert len(related) == 2
            assert "act-1" in act_ids
            assert "act-2" in act_ids

