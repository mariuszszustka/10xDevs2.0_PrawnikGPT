"""
PrawnikGPT Backend - RAG Pipeline Tests

Unit tests for the RAG pipeline orchestration:
- Fast response generation (9 steps)
- Accurate response generation (4 steps)
- Cache management
- Background task helpers
- Error handling
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any
import time

from backend.services.rag_pipeline import (
    process_query_fast,
    process_query_accurate,
    process_query_fast_background,
    process_query_accurate_background,
    cache_rag_context,
    get_cached_context,
    _context_cache,
    TOP_K_CHUNKS,
    DISTANCE_THRESHOLD,
    CACHE_TTL
)
from backend.services.exceptions import (
    NoRelevantActsError,
    GenerationTimeoutError,
    RAGPipelineError
)


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
def sample_embedding() -> List[float]:
    """Sample 768-dimensional embedding."""
    return [0.1] * 768


@pytest.fixture
def sample_chunks() -> List[Dict[str, Any]]:
    """Sample chunks from semantic search."""
    return [
        {
            "id": "chunk-1",
            "legal_act_id": "act-1",
            "chunk_index": 0,
            "content": "Artykuł 1. Kodeks cywilny reguluje stosunki...",
            "distance": 0.25,
            "legal_act": {
                "id": "act-1",
                "title": "Kodeks cywilny",
                "publisher": "Dz.U.",
                "year": 1964,
                "position": 93,
                "status": "obowiązująca"
            }
        },
        {
            "id": "chunk-2",
            "legal_act_id": "act-1",
            "chunk_index": 1,
            "content": "Artykuł 2. Osoby fizyczne mają zdolność...",
            "distance": 0.30,
            "legal_act": {
                "id": "act-1",
                "title": "Kodeks cywilny",
                "publisher": "Dz.U.",
                "year": 1964,
                "position": 93,
                "status": "obowiązująca"
            }
        },
        {
            "id": "chunk-3",
            "legal_act_id": "act-2",
            "chunk_index": 0,
            "content": "Artykuł 1. Ustawa reguluje prawa konsumenta...",
            "distance": 0.35,
            "legal_act": {
                "id": "act-2",
                "title": "Ustawa o prawach konsumenta",
                "publisher": "Dz.U.",
                "year": 2014,
                "position": 827,
                "status": "obowiązująca"
            }
        }
    ]


@pytest.fixture
def sample_related_acts() -> List[Dict[str, Any]]:
    """Sample related acts from graph traversal."""
    return [
        {
            "id": "related-1",
            "title": "Ustawa nowelizująca",
            "publisher": "Dz.U.",
            "year": 2020,
            "position": 1234,
            "status": "obowiązująca"
        }
    ]


@pytest.fixture
def sample_llm_response() -> str:
    """Sample LLM generated response."""
    return """Zgodnie z Kodeksem cywilnym (Art. 1), stosunki cywilnoprawne są regulowane 
    przez przepisy tego kodeksu. Osoby fizyczne mają zdolność prawną od chwili urodzenia.
    
    Ponadto, Ustawa o prawach konsumenta określa szczególne prawa przysługujące konsumentom
    w transakcjach z przedsiębiorcami."""


@pytest.fixture
def sample_sources() -> List[Dict[str, str]]:
    """Sample extracted sources."""
    return [
        {
            "act_title": "Kodeks cywilny",
            "article": "Fragment 1",
            "link": "https://isap.sejm.gov.pl/...",
            "chunk_id": "chunk-1"
        },
        {
            "act_title": "Ustawa o prawach konsumenta",
            "article": "Fragment 1",
            "link": "https://isap.sejm.gov.pl/...",
            "chunk_id": "chunk-3"
        }
    ]


# =========================================================================
# CACHE TESTS
# =========================================================================

class TestCacheManagement:
    """Tests for RAG context caching."""

    def test_cache_rag_context(self, sample_chunks, sample_related_acts):
        """Test caching RAG context."""
        query_id = "test-query-123"
        legal_context = "Test legal context..."
        
        cache_rag_context(
            query_id=query_id,
            chunks=sample_chunks,
            related_acts=sample_related_acts,
            legal_context=legal_context
        )
        
        cached = get_cached_context(query_id)
        
        assert cached is not None
        assert cached["chunks"] == sample_chunks
        assert cached["related_acts"] == sample_related_acts
        assert cached["legal_context"] == legal_context
        assert "cached_at" in cached

    def test_cache_miss(self):
        """Test cache miss for non-existent query."""
        cached = get_cached_context("non-existent-query")
        assert cached is None

    def test_cache_expiration(self, sample_chunks, sample_related_acts):
        """Test cache expiration after TTL."""
        query_id = "expiring-query"
        
        # Cache with modified cached_at (expired)
        from backend.services.rag_pipeline import _context_cache
        _context_cache[query_id] = {
            "chunks": sample_chunks,
            "related_acts": sample_related_acts,
            "legal_context": "Test",
            "cached_at": time.time() - CACHE_TTL - 10  # Expired
        }
        
        cached = get_cached_context(query_id)
        assert cached is None  # Should be expired


# =========================================================================
# FAST RESPONSE PIPELINE TESTS
# =========================================================================

class TestProcessQueryFast:
    """Tests for fast response pipeline."""

    @pytest.mark.asyncio
    async def test_process_query_fast_success(
        self,
        sample_embedding,
        sample_chunks,
        sample_related_acts,
        sample_llm_response,
        sample_sources
    ):
        """Test successful fast response generation."""
        with patch('backend.services.rag_pipeline.create_query', new_callable=AsyncMock) as mock_create, \
             patch('backend.services.rag_pipeline.generate_embedding', new_callable=AsyncMock) as mock_embed, \
             patch('backend.services.rag_pipeline.semantic_search', new_callable=AsyncMock) as mock_search, \
             patch('backend.services.rag_pipeline.extract_act_ids_from_chunks') as mock_extract, \
             patch('backend.services.rag_pipeline.fetch_related_acts', new_callable=AsyncMock) as mock_related, \
             patch('backend.services.rag_pipeline.build_legal_context') as mock_context, \
             patch('backend.services.rag_pipeline.build_prompt') as mock_prompt, \
             patch('backend.services.rag_pipeline.generate_text_fast', new_callable=AsyncMock) as mock_generate, \
             patch('backend.services.rag_pipeline.extract_sources_from_response') as mock_sources, \
             patch('backend.services.rag_pipeline.update_query_fast_response', new_callable=AsyncMock) as mock_update:

            # Configure mocks
            mock_create.return_value = "query-123"
            mock_embed.return_value = sample_embedding
            mock_search.return_value = sample_chunks
            mock_extract.return_value = ["act-1", "act-2"]
            mock_related.return_value = sample_related_acts
            mock_context.return_value = "Legal context..."
            mock_prompt.return_value = "Full prompt..."
            mock_generate.return_value = (sample_llm_response, 8500)
            mock_sources.return_value = sample_sources
            mock_update.return_value = True

            result = await process_query_fast(
                user_id="user-123",
                query_text="Jakie są prawa konsumenta?"
            )

            # Verify result
            assert result["query_id"] == "query-123"
            assert result["content"] == sample_llm_response
            assert result["sources"] == sample_sources
            assert result["generation_time_ms"] == 8500
            assert "pipeline_time_ms" in result

            # Verify all steps were called
            mock_create.assert_called_once()
            mock_embed.assert_called_once()
            mock_search.assert_called_once()
            mock_related.assert_called_once()
            mock_generate.assert_called_once()
            mock_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_query_fast_no_relevant_acts(self, sample_embedding):
        """Test fast response when no relevant acts found."""
        with patch('backend.services.rag_pipeline.create_query', new_callable=AsyncMock) as mock_create, \
             patch('backend.services.rag_pipeline.generate_embedding', new_callable=AsyncMock) as mock_embed, \
             patch('backend.services.rag_pipeline.semantic_search', new_callable=AsyncMock) as mock_search:

            mock_create.return_value = "query-123"
            mock_embed.return_value = sample_embedding
            mock_search.side_effect = NoRelevantActsError("No relevant chunks found")

            with pytest.raises(NoRelevantActsError):
                await process_query_fast(
                    user_id="user-123",
                    query_text="Jakie są prawa marsjańskie?"
                )

    @pytest.mark.asyncio
    async def test_process_query_fast_generation_timeout(
        self,
        sample_embedding,
        sample_chunks,
        sample_related_acts
    ):
        """Test fast response when LLM generation times out."""
        with patch('backend.services.rag_pipeline.create_query', new_callable=AsyncMock) as mock_create, \
             patch('backend.services.rag_pipeline.generate_embedding', new_callable=AsyncMock) as mock_embed, \
             patch('backend.services.rag_pipeline.semantic_search', new_callable=AsyncMock) as mock_search, \
             patch('backend.services.rag_pipeline.extract_act_ids_from_chunks') as mock_extract, \
             patch('backend.services.rag_pipeline.fetch_related_acts', new_callable=AsyncMock) as mock_related, \
             patch('backend.services.rag_pipeline.build_legal_context') as mock_context, \
             patch('backend.services.rag_pipeline.build_prompt') as mock_prompt, \
             patch('backend.services.rag_pipeline.generate_text_fast', new_callable=AsyncMock) as mock_generate:

            mock_create.return_value = "query-123"
            mock_embed.return_value = sample_embedding
            mock_search.return_value = sample_chunks
            mock_extract.return_value = ["act-1"]
            mock_related.return_value = sample_related_acts
            mock_context.return_value = "Legal context..."
            mock_prompt.return_value = "Full prompt..."
            mock_generate.side_effect = GenerationTimeoutError("Timeout after 15s")

            with pytest.raises(GenerationTimeoutError):
                await process_query_fast(
                    user_id="user-123",
                    query_text="Test query"
                )

    @pytest.mark.asyncio
    async def test_process_query_fast_unexpected_error(self, sample_embedding):
        """Test fast response with unexpected error."""
        with patch('backend.services.rag_pipeline.create_query', new_callable=AsyncMock) as mock_create, \
             patch('backend.services.rag_pipeline.generate_embedding', new_callable=AsyncMock) as mock_embed:

            mock_create.return_value = "query-123"
            mock_embed.side_effect = Exception("Unexpected error")

            with pytest.raises(RAGPipelineError) as exc_info:
                await process_query_fast(
                    user_id="user-123",
                    query_text="Test query"
                )
            
            assert "Fast response pipeline failed" in str(exc_info.value)


# =========================================================================
# ACCURATE RESPONSE PIPELINE TESTS
# =========================================================================

class TestProcessQueryAccurate:
    """Tests for accurate response pipeline."""

    @pytest.mark.asyncio
    async def test_process_query_accurate_with_cache(
        self,
        sample_chunks,
        sample_related_acts,
        sample_llm_response
    ):
        """Test accurate response using cached context."""
        query_id = "cached-query"
        
        # Pre-cache context
        cache_rag_context(
            query_id=query_id,
            chunks=sample_chunks,
            related_acts=sample_related_acts,
            legal_context="Cached legal context..."
        )

        with patch('backend.services.rag_pipeline.build_prompt') as mock_prompt, \
             patch('backend.services.rag_pipeline.generate_text_accurate', new_callable=AsyncMock) as mock_generate, \
             patch('backend.services.rag_pipeline.update_query_accurate_response', new_callable=AsyncMock) as mock_update:

            mock_prompt.return_value = "Full prompt..."
            mock_generate.return_value = (sample_llm_response, 120000)  # 120s
            mock_update.return_value = True

            result = await process_query_accurate(
                query_id=query_id,
                query_text="Test query"
            )

            assert result["query_id"] == query_id
            assert result["content"] == sample_llm_response
            assert result["generation_time_ms"] == 120000

    @pytest.mark.asyncio
    async def test_process_query_accurate_cache_miss(
        self,
        sample_embedding,
        sample_chunks,
        sample_related_acts,
        sample_llm_response
    ):
        """Test accurate response with cache miss (regenerates context)."""
        with patch('backend.services.rag_pipeline.generate_embedding', new_callable=AsyncMock) as mock_embed, \
             patch('backend.services.rag_pipeline.semantic_search', new_callable=AsyncMock) as mock_search, \
             patch('backend.services.rag_pipeline.extract_act_ids_from_chunks') as mock_extract, \
             patch('backend.services.rag_pipeline.fetch_related_acts', new_callable=AsyncMock) as mock_related, \
             patch('backend.services.rag_pipeline.build_legal_context') as mock_context, \
             patch('backend.services.rag_pipeline.build_prompt') as mock_prompt, \
             patch('backend.services.rag_pipeline.generate_text_accurate', new_callable=AsyncMock) as mock_generate, \
             patch('backend.services.rag_pipeline.update_query_accurate_response', new_callable=AsyncMock) as mock_update:

            mock_embed.return_value = sample_embedding
            mock_search.return_value = sample_chunks
            mock_extract.return_value = ["act-1"]
            mock_related.return_value = sample_related_acts
            mock_context.return_value = "Regenerated context..."
            mock_prompt.return_value = "Full prompt..."
            mock_generate.return_value = (sample_llm_response, 150000)
            mock_update.return_value = True

            result = await process_query_accurate(
                query_id="uncached-query",
                query_text="Test query"
            )

            # Verify context was regenerated
            mock_embed.assert_called_once()
            mock_search.assert_called_once()
            assert result["generation_time_ms"] == 150000


# =========================================================================
# BACKGROUND TASK TESTS
# =========================================================================

class TestBackgroundTasks:
    """Tests for background task wrappers."""

    @pytest.mark.asyncio
    async def test_process_query_fast_background_success(self):
        """Test background wrapper catches and logs success."""
        with patch('backend.services.rag_pipeline.process_query_fast', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = {"query_id": "123"}

            # Should not raise
            await process_query_fast_background(
                user_id="user-123",
                query_text="Test query"
            )

            mock_process.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_query_fast_background_error(self):
        """Test background wrapper catches and logs errors."""
        with patch('backend.services.rag_pipeline.process_query_fast', new_callable=AsyncMock) as mock_process:
            mock_process.side_effect = Exception("Background error")

            # Should not raise (error is logged)
            await process_query_fast_background(
                user_id="user-123",
                query_text="Test query"
            )

    @pytest.mark.asyncio
    async def test_process_query_accurate_background_success(self):
        """Test accurate background wrapper."""
        with patch('backend.services.rag_pipeline.process_query_accurate', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = {"query_id": "123"}

            await process_query_accurate_background(
                query_id="query-123",
                query_text="Test query"
            )

            mock_process.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_query_accurate_background_error(self):
        """Test accurate background wrapper catches errors."""
        with patch('backend.services.rag_pipeline.process_query_accurate', new_callable=AsyncMock) as mock_process:
            mock_process.side_effect = Exception("Background error")

            # Should not raise
            await process_query_accurate_background(
                query_id="query-123",
                query_text="Test query"
            )


# =========================================================================
# CONFIGURATION TESTS
# =========================================================================

class TestPipelineConfiguration:
    """Tests for pipeline configuration constants."""

    def test_top_k_chunks_default(self):
        """Verify TOP_K_CHUNKS default."""
        assert TOP_K_CHUNKS == 10

    def test_distance_threshold_default(self):
        """Verify DISTANCE_THRESHOLD default."""
        assert DISTANCE_THRESHOLD == 0.5

    def test_cache_ttl_default(self):
        """Verify CACHE_TTL default (5 minutes)."""
        assert CACHE_TTL == 300

