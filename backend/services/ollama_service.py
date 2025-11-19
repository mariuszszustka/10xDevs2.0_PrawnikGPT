"""
PrawnikGPT Backend - OLLAMA Service

This module provides integration with OLLAMA API for:
- Text generation (fast and accurate responses)
- Embeddings generation
- Health checks

OLLAMA models used:
- Fast model: mistral:7b (fast responses <15s)
- Accurate model: gpt-oss:120b (detailed responses <240s)
- Embedding model: nomic-embed-text (768-dim vectors)

All operations use httpx AsyncClient for async/await support.
"""

import logging
import httpx
from typing import Optional, Dict, Any, List

from backend.config import settings
from backend.services.exceptions import (
    OLLAMAUnavailableError,
    OLLAMATimeoutError,
    EmbeddingGenerationError
)

logger = logging.getLogger(__name__)


# =========================================================================
# OLLAMA CLIENT
# =========================================================================

class OLLAMAClient:
    """
    OLLAMA API client wrapper.
    
    Provides:
    - Connection management
    - Health checks
    - Error handling
    - Timeout management
    """
    
    def __init__(self):
        """Initialize OLLAMA client with configuration from settings."""
        self.base_url = settings.ollama_host
        self.fast_model = settings.ollama_fast_model
        self.accurate_model = settings.ollama_accurate_model
        self.embedding_model = settings.ollama_embedding_model
        
        # Timeouts
        self.fast_timeout = settings.ollama_fast_timeout
        self.accurate_timeout = settings.ollama_accurate_timeout
        self.embedding_timeout = settings.ollama_embedding_timeout
        
        logger.info(f"OLLAMA client initialized: {self.base_url}")
    
    async def health_check(self) -> bool:
        """
        Check OLLAMA service availability.
        
        Sends GET request to /api/version endpoint.
        
        Returns:
            bool: True if service is available, False otherwise
        """
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"{self.base_url}/api/version")
                
                if response.status_code == 200:
                    logger.debug("OLLAMA health check: OK")
                    return True
                else:
                    logger.warning(f"OLLAMA health check failed: {response.status_code}")
                    return False
                    
        except httpx.TimeoutException:
            logger.warning("OLLAMA health check: TIMEOUT")
            return False
        except httpx.ConnectError:
            logger.warning("OLLAMA health check: CONNECTION REFUSED")
            return False
        except Exception as e:
            logger.error(f"OLLAMA health check: UNEXPECTED ERROR - {e}")
            return False
    
    async def list_models(self) -> List[str]:
        """
        List available OLLAMA models.
        
        Returns:
            List[str]: List of model names
            
        Raises:
            OLLAMAUnavailableError: If service is not available
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                
                if response.status_code == 200:
                    data = response.json()
                    models = [model["name"] for model in data.get("models", [])]
                    logger.info(f"Available OLLAMA models: {models}")
                    return models
                else:
                    raise OLLAMAUnavailableError(
                        f"Failed to list models: HTTP {response.status_code}"
                    )
                    
        except httpx.TimeoutException:
            raise OLLAMATimeoutError("Timeout while listing models")
        except httpx.ConnectError:
            raise OLLAMAUnavailableError("Cannot connect to OLLAMA service")
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            raise OLLAMAUnavailableError(f"Unexpected error: {e}")


# =========================================================================
# EMBEDDING GENERATION
# =========================================================================

async def generate_embedding(
    text: str,
    model: Optional[str] = None,
    timeout: Optional[int] = None
) -> List[float]:
    """
    Generate embedding vector for text.
    
    Args:
        text: Input text to embed
        model: Model name (defaults to settings.ollama_embedding_model)
        timeout: Timeout in seconds (defaults to settings.ollama_embedding_timeout)
        
    Returns:
        List[float]: Embedding vector (768-dim for nomic-embed-text)
        
    Raises:
        EmbeddingGenerationError: If embedding generation fails
        OLLAMATimeoutError: If request times out
        
    Example:
        ```python
        embedding = await generate_embedding("Kodeks cywilny")
        # Returns: [0.123, -0.456, ..., 0.789]  # 768 dimensions
        ```
    """
    # Validation
    if not text or len(text.strip()) == 0:
        raise EmbeddingGenerationError("Text cannot be empty")
    
    # Use defaults from settings if not provided
    model = model or settings.ollama_embedding_model
    timeout = timeout or settings.ollama_embedding_timeout
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.ollama_host}/api/embeddings",
                json={
                    "model": model,
                    "prompt": text.strip()
                }
            )
            
            if response.status_code != 200:
                raise EmbeddingGenerationError(
                    f"Embedding generation failed: HTTP {response.status_code}"
                )
            
            data = response.json()
            embedding = data.get("embedding")
            
            if not embedding:
                raise EmbeddingGenerationError("No embedding in response")
            
            logger.debug(f"Generated embedding: {len(embedding)} dimensions")
            return embedding
            
    except httpx.TimeoutException:
        logger.error(f"Embedding generation timeout ({timeout}s): {text[:50]}...")
        raise OLLAMATimeoutError(f"Embedding generation timed out after {timeout}s")
    except httpx.ConnectError:
        raise OLLAMAUnavailableError("Cannot connect to OLLAMA service")
    except EmbeddingGenerationError:
        raise  # Re-raise our custom errors
    except Exception as e:
        logger.error(f"Embedding generation error: {e}")
        raise EmbeddingGenerationError(f"Unexpected error: {e}")


async def generate_embeddings_batch(
    texts: List[str],
    model: Optional[str] = None,
    timeout: Optional[int] = None
) -> List[List[float]]:
    """
    Generate embeddings for multiple texts concurrently.
    
    Uses asyncio.gather() for parallel processing.
    
    Args:
        texts: List of input texts
        model: Model name (optional)
        timeout: Timeout per request (optional)
        
    Returns:
        List[List[float]]: List of embedding vectors
        
    Raises:
        EmbeddingGenerationError: If any embedding fails
        
    Example:
        ```python
        texts = ["Kodeks cywilny", "Prawo pracy", "Prawo karne"]
        embeddings = await generate_embeddings_batch(texts)
        # Returns: [[...], [...], [...]]  # 3 vectors
        ```
    """
    import asyncio
    
    tasks = [generate_embedding(text, model, timeout) for text in texts]
    
    try:
        embeddings = await asyncio.gather(*tasks)
        logger.info(f"Generated {len(embeddings)} embeddings in batch")
        return embeddings
    except Exception as e:
        logger.error(f"Batch embedding generation failed: {e}")
        raise EmbeddingGenerationError(f"Batch generation failed: {e}")


# =========================================================================
# TEXT GENERATION (PLACEHOLDER - TO BE IMPLEMENTED)
# =========================================================================

async def generate_text(
    prompt: str,
    model: str,
    timeout: int,
    **kwargs
) -> str:
    """
    Generate text using OLLAMA model.
    
    TODO: Full implementation in next phase (RAG Pipeline).
    
    Args:
        prompt: Input prompt
        model: Model name (fast or accurate)
        timeout: Timeout in seconds
        **kwargs: Additional generation parameters
        
    Returns:
        str: Generated text
    """
    # Placeholder for now
    raise NotImplementedError("Text generation will be implemented in RAG Pipeline phase")


# =========================================================================
# GLOBAL CLIENT INSTANCE
# =========================================================================

# Create a single instance for reuse
ollama_client = OLLAMAClient()

