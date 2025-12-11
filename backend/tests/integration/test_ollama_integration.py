"""
PrawnikGPT Backend - Ollama Service Integration Tests

Integration tests for OllamaService that require a running Ollama instance.

These tests will be skipped if Ollama is not available.
Run with: pytest -m integration backend/tests/integration/test_ollama_integration.py

Prerequisites:
- Ollama must be running (ollama serve)
- Required models must be pulled:
  - ollama pull mistral:7b
  - ollama pull nomic-embed-text
"""

import pytest
import asyncio
import logging
from typing import List

from backend.services.ollama_service import OllamaService, get_ollama_service

logger = logging.getLogger(__name__)
from backend.services.exceptions import (
    OLLAMAUnavailableError,
    OLLAMATimeoutError,
    ModelNotFoundError
)
from backend.config import settings


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
async def ollama_service():
    """Create OllamaService instance for integration testing."""
    service = OllamaService(
        base_url=settings.ollama_host,
        timeout_connect=5,
        timeout_read=60,  # Shorter timeout for tests
        max_retries=1,
        retry_delay=0.5
    )
    
    # Check if Ollama is available, skip tests if not
    try:
        is_available = await service.health_check(force=True)
        if not is_available:
            pytest.skip("Ollama service is not available")
    except Exception as e:
        pytest.skip(f"Ollama service check failed: {e}")
    
    return service


@pytest.fixture
async def ensure_models(ollama_service):
    """Ensure required models are available, skip if not."""
    required_models = [
        settings.ollama_fast_model,
        settings.ollama_embedding_model
    ]
    
    for model in required_models:
        is_available = await ollama_service.validate_model(model)
        if not is_available:
            pytest.skip(
                f"Required model '{model}' is not available. "
                f"Run: ollama pull {model}"
            )


# =========================================================================
# HEALTH CHECK INTEGRATION TESTS
# =========================================================================

@pytest.mark.integration
class TestOllamaHealthCheckIntegration:
    """Integration tests for health check functionality."""

    @pytest.mark.asyncio
    async def test_health_check_with_real_ollama(self, ollama_service):
        """Test health check with real Ollama instance."""
        is_healthy = await ollama_service.health_check(force=True)
        
        assert is_healthy is True
        assert ollama_service.is_available is True

    @pytest.mark.asyncio
    async def test_health_check_cache(self, ollama_service):
        """Test health check caching behavior."""
        # First call
        result1 = await ollama_service.health_check(force=True)
        assert result1 is True
        
        # Second call should use cache (no new HTTP request)
        result2 = await ollama_service.health_check(force=False)
        assert result2 is True


# =========================================================================
# MODEL VALIDATION INTEGRATION TESTS
# =========================================================================

@pytest.mark.integration
class TestModelValidationIntegration:
    """Integration tests for model validation."""

    @pytest.mark.asyncio
    async def test_list_models_with_real_ollama(self, ollama_service):
        """Test listing models with real Ollama instance."""
        models = await ollama_service.list_models(refresh=True)
        
        assert isinstance(models, list)
        assert len(models) > 0
        # Check that at least embedding model is available
        assert settings.ollama_embedding_model in models or any(
            "embed" in model.lower() for model in models
        )

    @pytest.mark.asyncio
    async def test_validate_model_exists(self, ollama_service, ensure_models):
        """Test validating an existing model."""
        result = await ollama_service.validate_model(settings.ollama_embedding_model)
        
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_model_not_exists(self, ollama_service):
        """Test validating a non-existent model."""
        result = await ollama_service.validate_model("nonexistent-model:999")
        
        assert result is False


# =========================================================================
# EMBEDDING GENERATION INTEGRATION TESTS
# =========================================================================

@pytest.mark.integration
class TestEmbeddingGenerationIntegration:
    """Integration tests for embedding generation."""

    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, ollama_service, ensure_models):
        """Test successful embedding generation with real Ollama."""
        text = "Kodeks cywilny - umowa sprzedaży"
        
        embedding = await ollama_service.generate_embedding(text)
        
        assert isinstance(embedding, list)
        assert len(embedding) > 0
        # nomic-embed-text produces 768-dimensional vectors
        assert len(embedding) == 768
        # Check that values are floats
        assert all(isinstance(x, float) for x in embedding)

    @pytest.mark.asyncio
    async def test_generate_embedding_different_texts(self, ollama_service, ensure_models):
        """Test that different texts produce different embeddings."""
        text1 = "Kodeks cywilny"
        text2 = "Prawo pracy"
        
        embedding1 = await ollama_service.generate_embedding(text1)
        embedding2 = await ollama_service.generate_embedding(text2)
        
        # Embeddings should be different
        assert embedding1 != embedding2
        
        # But should have same dimension
        assert len(embedding1) == len(embedding2)

    @pytest.mark.asyncio
    async def test_generate_embedding_empty_text(self, ollama_service):
        """Test embedding generation with empty text."""
        from backend.services.exceptions import EmbeddingGenerationError
        
        with pytest.raises(EmbeddingGenerationError):
            await ollama_service.generate_embedding("")


# =========================================================================
# TEXT GENERATION INTEGRATION TESTS
# =========================================================================

@pytest.mark.integration
class TestTextGenerationIntegration:
    """Integration tests for text generation."""

    @pytest.mark.asyncio
    async def test_generate_text_success(self, ollama_service, ensure_models):
        """Test successful text generation with real Ollama."""
        prompt = "What is 2+2? Answer in one sentence."
        
        response = await ollama_service.generate_text(
            prompt=prompt,
            model=settings.ollama_fast_model,
            timeout=30
        )
        
        assert isinstance(response, str)
        assert len(response) > 0
        # Response should contain some indication of the answer
        assert "4" in response or "cztery" in response.lower() or "four" in response.lower()

    @pytest.mark.asyncio
    async def test_generate_text_with_system_prompt(self, ollama_service, ensure_models):
        """Test text generation with system prompt."""
        prompt = "Explain what a contract is in one sentence."
        system_prompt = "You are a legal expert. Answer concisely."
        
        response = await ollama_service.generate_text(
            prompt=prompt,
            model=settings.ollama_fast_model,
            system_prompt=system_prompt,
            temperature=0.3,
            timeout=30
        )
        
        assert isinstance(response, str)
        assert len(response) > 0

    @pytest.mark.asyncio
    async def test_generate_text_model_not_found(self, ollama_service):
        """Test text generation with non-existent model."""
        with pytest.raises(ModelNotFoundError):
            await ollama_service.generate_text(
                prompt="Test",
                model="nonexistent-model:999",
                timeout=10
            )

    @pytest.mark.asyncio
    async def test_generate_text_timeout(self, ollama_service, ensure_models):
        """Test text generation timeout (if model is very slow)."""
        # Use very short timeout to trigger timeout error
        with pytest.raises(OLLAMATimeoutError):
            await ollama_service.generate_text(
                prompt="Write a very long essay about law.",
                model=settings.ollama_fast_model,
                timeout=0.1  # 100ms - should timeout
            )


# =========================================================================
# STRUCTURED OUTPUT INTEGRATION TESTS
# =========================================================================

@pytest.mark.integration
class TestStructuredOutputIntegration:
    """Integration tests for structured JSON output generation."""

    @pytest.mark.asyncio
    async def test_generate_text_structured_success(self, ollama_service, ensure_models):
        """Test successful structured JSON generation."""
        schema = {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            },
            "required": ["answer", "confidence"]
        }
        
        prompt = "What is 2+2? Answer as JSON with 'answer' and 'confidence' fields."
        
        response = await ollama_service.generate_text_structured(
            prompt=prompt,
            model=settings.ollama_fast_model,
            json_schema=schema,
            timeout=30
        )
        
        assert isinstance(response, dict)
        assert "answer" in response
        assert "confidence" in response
        assert isinstance(response["confidence"], (int, float))
        assert 0 <= response["confidence"] <= 1

    @pytest.mark.asyncio
    async def test_generate_text_structured_complex_schema(self, ollama_service, ensure_models):
        """Test structured generation with complex schema."""
        schema = {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "sources": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "article": {"type": "string"}
                        }
                    }
                }
            },
            "required": ["answer", "sources"]
        }
        
        prompt = "What is a contract? Provide answer and sources as JSON."
        
        response = await ollama_service.generate_text_structured(
            prompt=prompt,
            model=settings.ollama_fast_model,
            json_schema=schema,
            timeout=30
        )
        
        assert isinstance(response, dict)
        assert "answer" in response
        assert "sources" in response
        assert isinstance(response["sources"], list)


# =========================================================================
# RETRY LOGIC INTEGRATION TESTS
# =========================================================================

@pytest.mark.integration
class TestRetryLogicIntegration:
    """Integration tests for retry logic (if we can simulate failures)."""

    @pytest.mark.asyncio
    async def test_singleton_instance(self):
        """Test that get_ollama_service() returns singleton."""
        service1 = get_ollama_service()
        service2 = get_ollama_service()
        
        assert service1 is service2
        assert isinstance(service1, OllamaService)


# =========================================================================
# PERFORMANCE TESTS
# =========================================================================

@pytest.mark.integration
@pytest.mark.slow
class TestPerformanceIntegration:
    """Performance tests for OllamaService."""

    @pytest.mark.asyncio
    async def test_embedding_generation_performance(self, ollama_service, ensure_models):
        """Test embedding generation performance."""
        import time
        
        text = "Test legal question about contract law"
        
        start = time.time()
        embedding = await ollama_service.generate_embedding(text)
        elapsed = time.time() - start
        
        assert len(embedding) == 768
        # Embedding generation should be reasonably fast (<5s for local Ollama)
        assert elapsed < 5.0, f"Embedding generation took {elapsed:.2f}s (expected <5s)"

    @pytest.mark.asyncio
    async def test_concurrent_embeddings(self, ollama_service, ensure_models):
        """Test concurrent embedding generation."""
        texts = [
            "Kodeks cywilny",
            "Prawo pracy",
            "Prawo karne",
            "Prawo administracyjne"
        ]
        
        start = time.time()
        embeddings = await asyncio.gather(*[
            ollama_service.generate_embedding(text) for text in texts
        ])
        elapsed = time.time() - start
        
        assert len(embeddings) == 4
        assert all(len(emb) == 768 for emb in embeddings)
        # Concurrent should be faster than sequential (but may be limited by Ollama)
        logger.info(f"Generated {len(embeddings)} embeddings concurrently in {elapsed:.2f}s")
