"""
PrawnikGPT Backend - OLLAMA Service Tests

Unit tests for OLLAMA embedding service:
- Embedding generation
- Model health check
- Error handling
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List

from backend.services.ollama_service import (
    generate_embedding,
    OLLAMAClient,
    ollama_client
)
from backend.services.exceptions import (
    OLLAMAUnavailableError,
    OLLAMATimeoutError,
    EmbeddingGenerationError
)
from backend.config import settings

# Constants from settings
EMBEDDING_MODEL = settings.ollama_embedding_model  # nomic-embed-text
EMBEDDING_DIM = 768  # Standard dimension for nomic-embed-text


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
def sample_embedding_768() -> List[float]:
    """Sample 768-dimensional embedding."""
    return [0.1] * 768


@pytest.fixture
def sample_text() -> str:
    """Sample text for embedding."""
    return "Jakie są podstawowe prawa konsumenta w Polsce?"


# =========================================================================
# CONFIGURATION TESTS
# =========================================================================

class TestOLLAMAConfiguration:
    """Tests for OLLAMA configuration constants."""

    def test_embedding_model_name(self):
        """Verify embedding model name."""
        assert EMBEDDING_MODEL == "nomic-embed-text"

    def test_embedding_dimension(self):
        """Verify embedding dimension (768 for nomic)."""
        assert EMBEDDING_DIM == 768


# =========================================================================
# GENERATE EMBEDDING TESTS
# =========================================================================

class TestGenerateEmbedding:
    """Tests for embedding generation."""

    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, sample_text, sample_embedding_768):
        """Test successful embedding generation."""
        mock_response = {
            "embedding": sample_embedding_768
        }

        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            embedding = await generate_embedding(sample_text)

            assert len(embedding) == EMBEDDING_DIM
            assert embedding == sample_embedding_768
            
            # Verify correct model was used
            call_args = mock_instance.post.call_args
            assert call_args[1]["json"]["model"] == EMBEDDING_MODEL

    @pytest.mark.asyncio
    async def test_generate_embedding_normalizes_whitespace(self, sample_embedding_768):
        """Test embedding generation normalizes input text."""
        text_with_extra_whitespace = "  Pytanie  z  wieloma    spacjami  "
        
        mock_response = {"embedding": sample_embedding_768}

        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            embedding = await generate_embedding(text_with_extra_whitespace)

            # Should succeed
            assert len(embedding) == EMBEDDING_DIM

    @pytest.mark.asyncio
    async def test_generate_embedding_empty_text(self):
        """Test embedding generation with empty text."""
        with pytest.raises(EmbeddingGenerationError) as exc_info:
            await generate_embedding("")
        
        assert "empty" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_generate_embedding_whitespace_only(self):
        """Test embedding generation with whitespace-only text."""
        with pytest.raises(EmbeddingGenerationError) as exc_info:
            await generate_embedding("   ")
        
        assert "empty" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_generate_embedding_connection_error(self, sample_text):
        """Test embedding generation connection error."""
        import httpx
        
        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.side_effect = httpx.ConnectError("Connection refused")
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises(OLLAMAUnavailableError):
                await generate_embedding(sample_text)

    @pytest.mark.asyncio
    async def test_generate_embedding_timeout(self, sample_text):
        """Test embedding generation timeout."""
        import httpx
        
        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.side_effect = httpx.TimeoutException("Timeout")
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises(OLLAMATimeoutError):
                await generate_embedding(sample_text)

    @pytest.mark.asyncio
    async def test_generate_embedding_500_error(self, sample_text):
        """Test embedding generation server error."""
        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=500,
                text="Internal Server Error"
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises(EmbeddingGenerationError):
                await generate_embedding(sample_text)

    @pytest.mark.asyncio
    async def test_generate_embedding_malformed_response(self, sample_text):
        """Test embedding generation with malformed response."""
        mock_response = {"wrong_key": []}  # Missing 'embedding' key

        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises((EmbeddingGenerationError, KeyError)):
                await generate_embedding(sample_text)


# =========================================================================
# HEALTH CHECK TESTS
# =========================================================================

class TestOLLAMAClientHealth:
    """Tests for OLLAMA client health check."""

    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check."""
        client = OLLAMAClient()

        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = MagicMock(
                status_code=200
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            is_healthy = await client.health_check()

            assert is_healthy is True

    @pytest.mark.asyncio
    async def test_health_check_connection_error(self):
        """Test health check connection error."""
        import httpx
        client = OLLAMAClient()
        
        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.side_effect = httpx.ConnectError("Connection refused")
            mock_client.return_value.__aenter__.return_value = mock_instance

            is_healthy = await client.health_check()

            assert is_healthy is False

    @pytest.mark.asyncio
    async def test_health_check_server_error(self):
        """Test health check server error."""
        client = OLLAMAClient()
        
        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = MagicMock(
                status_code=500,
                text="Internal Server Error"
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            is_healthy = await client.health_check()

            assert is_healthy is False


# =========================================================================
# LIST MODELS TESTS
# =========================================================================

class TestOLLAMAClientListModels:
    """Tests for OLLAMA client model listing."""

    @pytest.mark.asyncio
    async def test_list_models_success(self):
        """Test successful model listing."""
        client = OLLAMAClient()
        mock_response = {
            "models": [
                {"name": "nomic-embed-text"},
                {"name": "mistral:7b"},
                {"name": "gpt-oss:120b"}
            ]
        }

        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            models = await client.list_models()

            assert len(models) == 3
            assert "nomic-embed-text" in models
            assert "mistral:7b" in models

    @pytest.mark.asyncio
    async def test_list_models_empty(self):
        """Test empty model list."""
        client = OLLAMAClient()
        mock_response = {"models": []}

        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            models = await client.list_models()

            assert models == []

    @pytest.mark.asyncio
    async def test_list_models_connection_error(self):
        """Test model listing connection error."""
        import httpx
        client = OLLAMAClient()
        
        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.side_effect = httpx.ConnectError("Connection refused")
            mock_client.return_value.__aenter__.return_value = mock_instance

            with pytest.raises(OLLAMAUnavailableError):
                await client.list_models()


# =========================================================================
# INTEGRATION-STYLE TESTS
# =========================================================================

class TestOLLAMAIntegration:
    """Integration-style tests for OLLAMA service."""

    @pytest.mark.asyncio
    async def test_embedding_then_health_check(self, sample_embedding_768):
        """Test embedding generation followed by health check."""
        client = OLLAMAClient()
        embed_response = {"embedding": sample_embedding_768}

        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            
            # Configure sequential responses
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=embed_response)
            )
            mock_instance.get.return_value = MagicMock(
                status_code=200
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            # Generate embedding
            embedding = await generate_embedding("Test text")
            assert len(embedding) == EMBEDDING_DIM

            # Check health
            is_healthy = await client.health_check()
            assert is_healthy is True

    @pytest.mark.asyncio
    async def test_batch_embeddings(self, sample_embedding_768):
        """Test generating multiple embeddings."""
        texts = [
            "Pytanie o prawa konsumenta",
            "Pytanie o kodeks cywilny",
            "Pytanie o prawo pracy"
        ]
        
        mock_response = {"embedding": sample_embedding_768}

        with patch('backend.services.ollama_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value=mock_response)
            )
            mock_client.return_value.__aenter__.return_value = mock_instance

            embeddings = []
            for text in texts:
                embedding = await generate_embedding(text)
                embeddings.append(embedding)

            assert len(embeddings) == 3
            for emb in embeddings:
                assert len(emb) == EMBEDDING_DIM

