"""
PrawnikGPT Backend - Ollama Service Tests

Unit tests for OllamaService:
- Health checks
- Model validation
- Text generation
- Structured outputs (JSON)
- Embedding generation
- Error handling and retry logic
"""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List

import httpx

from backend.services.ollama_service import (
    OllamaService,
    get_ollama_service,
    generate_embedding  # Compatibility function
)
from backend.services.exceptions import (
    OLLAMAUnavailableError,
    OLLAMATimeoutError,
    EmbeddingGenerationError,
    ModelNotFoundError,
    OutOfMemoryError
)


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
def ollama_service():
    """Create OllamaService instance for testing."""
    return OllamaService(
        base_url="http://localhost:11434",
        timeout_connect=5,
        timeout_read=60,
        max_retries=2,
        retry_delay=0.1  # Fast retry for tests
    )


@pytest.fixture
def sample_embedding_768() -> List[float]:
    """Sample 768-dimensional embedding."""
    return [0.1] * 768


@pytest.fixture
def sample_text() -> str:
    """Sample text for embedding."""
    return "Jakie są podstawowe prawa konsumenta w Polsce?"


@pytest.fixture
def mock_httpx_client():
    """Mock httpx.AsyncClient for testing."""
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


# =========================================================================
# HEALTH CHECK TESTS
# =========================================================================

class TestHealthCheck:
    """Tests for health_check() method."""

    @pytest.mark.asyncio
    async def test_health_check_success(self, ollama_service, mock_httpx_client):
        """Test successful health check."""
        mock_response = MagicMock(status_code=200)
        mock_httpx_client.get = AsyncMock(return_value=mock_response)
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            result = await ollama_service.health_check()
            
            assert result is True
            assert ollama_service.is_available is True

    @pytest.mark.asyncio
    async def test_health_check_connection_error(self, ollama_service, mock_httpx_client):
        """Test health check with connection error."""
        mock_httpx_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            result = await ollama_service.health_check()
            
            assert result is False
            assert ollama_service.is_available is False

    @pytest.mark.asyncio
    async def test_health_check_timeout(self, ollama_service, mock_httpx_client):
        """Test health check with timeout."""
        mock_httpx_client.get = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            result = await ollama_service.health_check()
            
            assert result is False

    @pytest.mark.asyncio
    async def test_health_check_cache(self, ollama_service, mock_httpx_client):
        """Test health check caching."""
        import time
        
        mock_response = MagicMock(status_code=200)
        mock_httpx_client.get = AsyncMock(return_value=mock_response)
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            # First call
            result1 = await ollama_service.health_check()
            assert result1 is True
            
            # Second call should use cache (no new HTTP call)
            result2 = await ollama_service.health_check()
            assert result2 is True
            
            # Verify only one HTTP call was made
            assert mock_httpx_client.get.call_count == 1


# =========================================================================
# MODEL VALIDATION TESTS
# =========================================================================

class TestModelValidation:
    """Tests for validate_model() and list_models() methods."""

    @pytest.mark.asyncio
    async def test_list_models_success(self, ollama_service, mock_httpx_client):
        """Test successful model listing."""
        mock_response = MagicMock(
            status_code=200,
            json=MagicMock(return_value={
                "models": [
                    {"name": "mistral:7b"},
                    {"name": "gpt-oss:120b"},
                    {"name": "nomic-embed-text"}
                ]
            })
        )
        mock_httpx_client.get = AsyncMock(return_value=mock_response)
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            models = await ollama_service.list_models()
            
            assert len(models) == 3
            assert "mistral:7b" in models
            assert "gpt-oss:120b" in models
            assert ollama_service.available_models == models

    @pytest.mark.asyncio
    async def test_validate_model_success(self, ollama_service, mock_httpx_client):
        """Test successful model validation."""
        mock_response = MagicMock(
            status_code=200,
            json=MagicMock(return_value={
                "models": [{"name": "mistral:7b"}]
            })
        )
        mock_httpx_client.get = AsyncMock(return_value=mock_response)
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            result = await ollama_service.validate_model("mistral:7b")
            
            assert result is True
            assert ollama_service._model_cache["mistral:7b"] is True

    @pytest.mark.asyncio
    async def test_validate_model_not_found(self, ollama_service, mock_httpx_client):
        """Test model validation when model doesn't exist."""
        mock_response = MagicMock(
            status_code=200,
            json=MagicMock(return_value={
                "models": [{"name": "mistral:7b"}]
            })
        )
        mock_httpx_client.get = AsyncMock(return_value=mock_response)
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            result = await ollama_service.validate_model("nonexistent:model")
            
            assert result is False
            assert ollama_service._model_cache["nonexistent:model"] is False


# =========================================================================
# TEXT GENERATION TESTS
# =========================================================================

class TestTextGeneration:
    """Tests for generate_text() method."""

    @pytest.mark.asyncio
    async def test_generate_text_success(self, ollama_service, mock_httpx_client):
        """Test successful text generation."""
        mock_response = MagicMock(
            status_code=200,
            json=MagicMock(return_value={
                "response": "To jest przykładowa odpowiedź."
            })
        )
        mock_httpx_client.post = AsyncMock(return_value=mock_response)
        
        # Mock validate_model to return True
        with patch.object(ollama_service, 'validate_model', return_value=True), \
             patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            
            result = await ollama_service.generate_text(
                prompt="Test prompt",
                model="mistral:7b",
                timeout=15
            )
            
            assert result == "To jest przykładowa odpowiedź."
            assert mock_httpx_client.post.called

    @pytest.mark.asyncio
    async def test_generate_text_model_not_found(self, ollama_service):
        """Test text generation with non-existent model."""
        with patch.object(ollama_service, 'validate_model', return_value=False), \
             patch.object(ollama_service, 'list_models', return_value=["other:model"]):
            
            with pytest.raises(ModelNotFoundError):
                await ollama_service.generate_text(
                    prompt="Test",
                    model="nonexistent:model",
                    timeout=15
                )

    @pytest.mark.asyncio
    async def test_generate_text_timeout(self, ollama_service, mock_httpx_client):
        """Test text generation timeout."""
        mock_httpx_client.post = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
        
        with patch.object(ollama_service, 'validate_model', return_value=True), \
             patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            
            with pytest.raises(OLLAMATimeoutError):
                await ollama_service.generate_text(
                    prompt="Test",
                    model="mistral:7b",
                    timeout=15
                )

    @pytest.mark.asyncio
    async def test_generate_text_out_of_memory(self, ollama_service, mock_httpx_client):
        """Test text generation with OOM error."""
        mock_response = MagicMock(
            status_code=500,
            text="out of memory"
        )
        mock_httpx_client.post = AsyncMock(return_value=mock_response)
        
        with patch.object(ollama_service, 'validate_model', return_value=True), \
             patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            
            with pytest.raises(OutOfMemoryError):
                await ollama_service.generate_text(
                    prompt="Test",
                    model="gpt-oss:120b",
                    timeout=240
                )

    @pytest.mark.asyncio
    async def test_generate_text_empty_prompt(self, ollama_service):
        """Test text generation with empty prompt."""
        with pytest.raises(ValueError, match="empty"):
            await ollama_service.generate_text(
                prompt="",
                model="mistral:7b",
                timeout=15
            )

    @pytest.mark.asyncio
    async def test_generate_text_invalid_temperature(self, ollama_service):
        """Test text generation with invalid temperature."""
        with pytest.raises(ValueError, match="Temperature"):
            await ollama_service.generate_text(
                prompt="Test",
                model="mistral:7b",
                temperature=2.0,  # Invalid: > 1.0
                timeout=15
            )


# =========================================================================
# STRUCTURED OUTPUT TESTS
# =========================================================================

class TestStructuredOutput:
    """Tests for generate_text_structured() method."""

    @pytest.mark.asyncio
    async def test_generate_text_structured_success(self, ollama_service, mock_httpx_client):
        """Test successful structured JSON generation."""
        json_response = {
            "answer": "Odpowiedź testowa",
            "sources": [{"act_title": "Test Act", "article": "Art. 1"}],
            "confidence": 0.95
        }
        
        mock_response = MagicMock(
            status_code=200,
            json=MagicMock(return_value={
                "response": json.dumps(json_response)
            })
        )
        mock_httpx_client.post = AsyncMock(return_value=mock_response)
        
        schema = {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "sources": {"type": "array"},
                "confidence": {"type": "number"}
            }
        }
        
        with patch.object(ollama_service, 'validate_model', return_value=True), \
             patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            
            result = await ollama_service.generate_text_structured(
                prompt="Test prompt",
                model="mistral:7b",
                json_schema=schema
            )
            
            assert result == json_response
            assert "answer" in result
            assert "sources" in result

    @pytest.mark.asyncio
    async def test_generate_text_structured_invalid_json(self, ollama_service, mock_httpx_client):
        """Test structured generation with invalid JSON response."""
        mock_response = MagicMock(
            status_code=200,
            json=MagicMock(return_value={
                "response": "This is not JSON"
            })
        )
        mock_httpx_client.post = AsyncMock(return_value=mock_response)
        
        schema = {"type": "object"}
        
        with patch.object(ollama_service, 'validate_model', return_value=True), \
             patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            
            with pytest.raises(ValueError, match="JSON"):
                await ollama_service.generate_text_structured(
                    prompt="Test",
                    model="mistral:7b",
                    json_schema=schema
                )


# =========================================================================
# EMBEDDING GENERATION TESTS
# =========================================================================

class TestEmbeddingGeneration:
    """Tests for generate_embedding() method."""

    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, ollama_service, mock_httpx_client, sample_embedding_768):
        """Test successful embedding generation."""
        mock_response = MagicMock(
            status_code=200,
            json=MagicMock(return_value={
                "embedding": sample_embedding_768
            })
        )
        mock_httpx_client.post = AsyncMock(return_value=mock_response)
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            result = await ollama_service.generate_embedding("Test text")
            
            assert len(result) == 768
            assert result == sample_embedding_768

    @pytest.mark.asyncio
    async def test_generate_embedding_empty_text(self, ollama_service):
        """Test embedding generation with empty text."""
        with pytest.raises(EmbeddingGenerationError, match="empty"):
            await ollama_service.generate_embedding("")

    @pytest.mark.asyncio
    async def test_generate_embedding_timeout(self, ollama_service, mock_httpx_client):
        """Test embedding generation timeout."""
        mock_httpx_client.post = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client):
            with pytest.raises(OLLAMATimeoutError):
                await ollama_service.generate_embedding("Test text")

    @pytest.mark.asyncio
    async def test_generate_embedding_compatibility_function(self, sample_embedding_768):
        """Test compatibility function generate_embedding()."""
        with patch('backend.services.ollama_service.get_ollama_service') as mock_get_service:
            mock_service = AsyncMock()
            mock_service.generate_embedding = AsyncMock(return_value=sample_embedding_768)
            mock_get_service.return_value = mock_service
            
            result = await generate_embedding("Test text")
            
            assert result == sample_embedding_768
            mock_service.generate_embedding.assert_called_once_with("Test text", None, None)


# =========================================================================
# RETRY LOGIC TESTS
# =========================================================================

class TestRetryLogic:
    """Tests for retry logic with exponential backoff."""

    @pytest.mark.asyncio
    async def test_retry_on_connection_error(self, ollama_service, mock_httpx_client):
        """Test retry on connection error."""
        # First call fails, second succeeds
        mock_httpx_client.get = AsyncMock(
            side_effect=[
                httpx.ConnectError("Connection refused"),
                MagicMock(status_code=200)
            ]
        )
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client), \
             patch('asyncio.sleep', new_callable=AsyncMock):  # Mock sleep to speed up test
            result = await ollama_service.health_check(force=True)
            
            assert result is True
            assert mock_httpx_client.get.call_count == 2

    @pytest.mark.asyncio
    async def test_retry_exhausted(self, ollama_service, mock_httpx_client):
        """Test retry exhausted after max attempts."""
        mock_httpx_client.get = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )
        
        with patch.object(ollama_service, '_get_client', return_value=mock_httpx_client), \
             patch('asyncio.sleep', new_callable=AsyncMock):
            
            with pytest.raises(OLLAMAUnavailableError):
                await ollama_service.health_check(force=True)


# =========================================================================
# SINGLETON TESTS
# =========================================================================

class TestSingleton:
    """Tests for singleton pattern."""

    def test_get_ollama_service_singleton(self):
        """Test that get_ollama_service() returns same instance."""
        # Reset singleton
        import backend.services.ollama_service as ollama_module
        ollama_module._ollama_service = None
        
        service1 = get_ollama_service()
        service2 = get_ollama_service()
        
        assert service1 is service2
        assert isinstance(service1, OllamaService)
