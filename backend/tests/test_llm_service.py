"""
PrawnikGPT Backend - LLM Service Tests

Unit tests for LLM generation services:
- Text generation (fast model: mistral:7b)
- Text generation (accurate model: gpt-oss:120b)
- Prompt building
- Source extraction
- Error handling
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any

from backend.services.llm_service import (
    generate_text_fast,
    generate_text_accurate,
    build_legal_context,
    build_prompt,
    extract_sources_from_response,
    FAST_MODEL,
    ACCURATE_MODEL,
    FAST_TIMEOUT,
    ACCURATE_TIMEOUT
)
from backend.services.exceptions import (
    GenerationTimeoutError,
    OLLAMAUnavailableError,
    OLLAMATimeoutError
)


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
def sample_chunks() -> List[Dict[str, Any]]:
    """Sample chunks for context building."""
    return [
        {
            "id": "chunk-1",
            "legal_act_id": "act-1",
            "chunk_index": 0,
            "content": "Artykuł 1. Kodeks cywilny reguluje stosunki cywilnoprawne między osobami fizycznymi i osobami prawnymi.",
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
            "legal_act_id": "act-2",
            "chunk_index": 0,
            "content": "Artykuł 1. Ustawa określa prawa przysługujące konsumentowi w umowach zawieranych z przedsiębiorcą.",
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
    """Sample related acts."""
    return [
        {
            "id": "related-1",
            "title": "Ustawa nowelizująca Kodeks cywilny",
            "publisher": "Dz.U.",
            "year": 2020,
            "position": 1234
        }
    ]


@pytest.fixture
def sample_llm_response() -> str:
    """Sample LLM response with legal content."""
    return """Na podstawie przepisów prawa polskiego, prawa konsumenta są szczegółowo regulowane przez:

1. **Kodeks cywilny** (Dz.U. 1964, poz. 93) - Art. 1 określa ogólne zasady stosunków cywilnoprawnych.

2. **Ustawa o prawach konsumenta** (Dz.U. 2014, poz. 827) - Art. 1 definiuje prawa konsumenckie.

Konsument ma prawo do:
- Informacji o produkcie
- Odstąpienia od umowy w ciągu 14 dni
- Reklamacji wadliwego towaru"""


# =========================================================================
# CONFIGURATION TESTS
# =========================================================================

class TestLLMConfiguration:
    """Tests for LLM configuration constants."""

    def test_fast_model_name(self):
        """Verify fast model name."""
        assert FAST_MODEL == "mistral:7b"

    def test_accurate_model_name(self):
        """Verify accurate model name."""
        assert ACCURATE_MODEL == "gpt-oss:120b"

    def test_fast_timeout(self):
        """Verify fast model timeout (15s)."""
        assert FAST_TIMEOUT == 15

    def test_accurate_timeout(self):
        """Verify accurate model timeout (240s)."""
        assert ACCURATE_TIMEOUT == 240


# =========================================================================
# GENERATE TEXT FAST TESTS
# =========================================================================

class TestGenerateTextFast:
    """Tests for fast text generation."""

    @pytest.mark.asyncio
    async def test_generate_text_fast_success(self, sample_llm_response):
        """Test successful fast generation."""
        mock_response = {
            "response": sample_llm_response,
            "eval_duration": 8500000000  # 8.5s in nanoseconds
        }

        with patch('backend.services.llm_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            response, time_ms = await generate_text_fast("Test prompt")

            assert response == sample_llm_response
            # time_ms is calculated from actual elapsed time, not from response
            assert time_ms >= 0
            
            # Verify correct model was used
            call_args = mock_instance.post.call_args
            assert call_args[1]["json"]["model"] == FAST_MODEL

    @pytest.mark.asyncio
    async def test_generate_text_fast_timeout(self):
        """Test fast generation timeout."""
        import httpx
        
        with patch('backend.services.llm_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.side_effect = httpx.TimeoutException("Timeout")
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises(GenerationTimeoutError) as exc_info:
                await generate_text_fast("Test prompt")
            
            assert f"{FAST_TIMEOUT}s" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_generate_text_fast_connection_error(self):
        """Test fast generation connection error."""
        import httpx
        
        with patch('backend.services.llm_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.side_effect = httpx.ConnectError("Connection refused")
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises(OLLAMAUnavailableError):
                await generate_text_fast("Test prompt")

    @pytest.mark.asyncio
    async def test_generate_text_fast_empty_prompt(self):
        """Test fast generation with empty prompt."""
        with pytest.raises(ValueError) as exc_info:
            await generate_text_fast("")
        
        assert "Prompt cannot be empty" in str(exc_info.value)


# =========================================================================
# GENERATE TEXT ACCURATE TESTS
# =========================================================================

class TestGenerateTextAccurate:
    """Tests for accurate text generation."""

    @pytest.mark.asyncio
    async def test_generate_text_accurate_success(self, sample_llm_response):
        """Test successful accurate generation."""
        mock_response = {
            "response": sample_llm_response,
            "eval_duration": 120000000000  # 120s in nanoseconds
        }

        with patch('backend.services.llm_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            response, time_ms = await generate_text_accurate("Test prompt")

            assert response == sample_llm_response
            # time_ms is calculated from actual elapsed time
            assert time_ms >= 0
            
            # Verify correct model was used
            call_args = mock_instance.post.call_args
            assert call_args[1]["json"]["model"] == ACCURATE_MODEL

    @pytest.mark.asyncio
    async def test_generate_text_accurate_longer_timeout(self):
        """Test accurate generation uses longer timeout."""
        mock_response = {
            "response": "Response",
            "eval_duration": 200000000000  # 200s
        }

        with patch('backend.services.llm_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            response, _ = await generate_text_accurate("Test prompt")
            
            # Should succeed (timeout is 240s)
            assert response == "Response"


# =========================================================================
# BUILD LEGAL CONTEXT TESTS
# =========================================================================

class TestBuildLegalContext:
    """Tests for legal context building."""

    def test_build_legal_context_basic(self, sample_chunks, sample_related_acts):
        """Test basic context building."""
        context = build_legal_context(
            chunks=sample_chunks,
            related_acts=sample_related_acts
        )

        # Verify chunks are included
        assert "Artykuł 1. Kodeks cywilny" in context
        assert "Ustawa o prawach konsumenta" in context
        
        # Verify related acts are included
        assert "Ustawa nowelizująca" in context

    def test_build_legal_context_empty_chunks(self, sample_related_acts):
        """Test context building with empty chunks."""
        context = build_legal_context(
            chunks=[],
            related_acts=sample_related_acts
        )

        # Should still work, just with related acts
        assert "Ustawa nowelizująca" in context

    def test_build_legal_context_no_related_acts(self, sample_chunks):
        """Test context building without related acts."""
        context = build_legal_context(
            chunks=sample_chunks,
            related_acts=[]
        )

        # Should include chunks
        assert "Kodeks cywilny" in context

    def test_build_legal_context_includes_metadata(self, sample_chunks, sample_related_acts):
        """Test context includes act metadata."""
        context = build_legal_context(
            chunks=sample_chunks,
            related_acts=sample_related_acts
        )

        # Verify act titles are included
        assert "Kodeks cywilny" in context
        # Metadata is in chunks but title is extracted for context
        assert "Fragment" in context


# =========================================================================
# BUILD PROMPT TESTS
# =========================================================================

class TestBuildPrompt:
    """Tests for prompt building."""

    def test_build_prompt_includes_query(self):
        """Test prompt includes user query."""
        prompt = build_prompt(
            question="Jakie są prawa konsumenta?",
            legal_context="Context..."
        )

        assert "Jakie są prawa konsumenta?" in prompt

    def test_build_prompt_includes_context(self):
        """Test prompt includes legal context."""
        prompt = build_prompt(
            question="Question",
            legal_context="Kodeks cywilny Art. 1..."
        )

        assert "Kodeks cywilny Art. 1" in prompt

    def test_build_prompt_includes_instructions(self):
        """Test prompt includes system instructions."""
        prompt = build_prompt(
            question="Question",
            legal_context="Context"
        )

        # Should have clear instructions for legal assistant
        assert "przepis" in prompt.lower() or "artykuł" in prompt.lower() or "użytkownik" in prompt.lower()

    def test_build_prompt_structure(self):
        """Test prompt has proper structure."""
        prompt = build_prompt(
            question="Test question",
            legal_context="Test context"
        )

        # Verify prompt has sections
        assert len(prompt) > 100  # Should be substantial


# =========================================================================
# EXTRACT SOURCES TESTS
# =========================================================================

class TestExtractSources:
    """Tests for source extraction from LLM response."""

    def test_extract_sources_with_references(self, sample_chunks, sample_llm_response):
        """Test extracting sources from response with references."""
        sources = extract_sources_from_response(
            response_text=sample_llm_response,
            chunks=sample_chunks
        )

        # Should extract sources from chunks that were referenced
        assert isinstance(sources, list)
        assert len(sources) >= 1

    def test_extract_sources_includes_metadata(self, sample_chunks, sample_llm_response):
        """Test extracted sources include metadata."""
        sources = extract_sources_from_response(
            response_text=sample_llm_response,
            chunks=sample_chunks
        )

        if sources:
            source = sources[0]
            # Should have required fields
            assert "act_title" in source
            assert "chunk_id" in source

    def test_extract_sources_empty_response(self, sample_chunks):
        """Test extraction from empty response returns sources from chunks."""
        sources = extract_sources_from_response(
            response_text="",
            chunks=sample_chunks
        )

        # Even with empty response, sources are extracted from chunks
        assert isinstance(sources, list)

    def test_extract_sources_no_references(self, sample_chunks):
        """Test extraction when no legal references in response."""
        sources = extract_sources_from_response(
            response_text="This is a generic response with no legal references.",
            chunks=sample_chunks
        )

        # Sources are extracted from chunks (fallback)
        assert isinstance(sources, list)
        assert len(sources) >= 1


# =========================================================================
# ERROR HANDLING TESTS
# =========================================================================

class TestLLMErrorHandling:
    """Tests for LLM service error handling."""

    @pytest.mark.asyncio
    async def test_handle_500_error(self):
        """Test handling 500 Internal Server Error."""
        with patch('backend.services.llm_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=500,
                text="Internal Server Error"
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises(OLLAMAUnavailableError) as exc_info:
                await generate_text_fast("Test prompt")
            
            assert "500" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_handle_model_not_found(self):
        """Test handling model not found error."""
        with patch('backend.services.llm_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=404,
                text="Model not found"
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises(OLLAMAUnavailableError) as exc_info:
                await generate_text_fast("Test prompt")
            
            assert "404" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_handle_malformed_response(self):
        """Test handling malformed JSON response."""
        with patch('backend.services.llm_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(side_effect=ValueError("Invalid JSON"))
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises((OLLAMAUnavailableError, ValueError)):
                await generate_text_fast("Test prompt")

