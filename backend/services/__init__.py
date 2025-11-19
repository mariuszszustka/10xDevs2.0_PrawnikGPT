"""
PrawnikGPT Backend - Services Package

This package contains business logic services that implement core functionality.

Services are organized by domain:
- health_check.py: Health check logic for services
- exceptions.py: Custom exception classes
- ollama_service.py: OLLAMA client and embeddings
- vector_search.py: Semantic search with pgvector
- llm_service.py: LLM text generation
- rag_pipeline.py: RAG orchestration (CORE functionality)
"""

from backend.services.exceptions import (
    PrawnikGPTError,
    ServiceUnavailableError,
    DatabaseUnavailableError,
    OLLAMAUnavailableError,
    RAGPipelineError,
    NoRelevantActsError,
    EmbeddingGenerationError,
    TimeoutError,
    OLLAMATimeoutError,
    GenerationTimeoutError
)

from backend.services.rag_pipeline import (
    process_query_fast,
    process_query_accurate,
    process_query_fast_background,
    process_query_accurate_background
)

__all__ = [
    # Exceptions
    "PrawnikGPTError",
    "ServiceUnavailableError",
    "DatabaseUnavailableError",
    "OLLAMAUnavailableError",
    "RAGPipelineError",
    "NoRelevantActsError",
    "EmbeddingGenerationError",
    "TimeoutError",
    "OLLAMATimeoutError",
    "GenerationTimeoutError",
    # RAG Pipeline
    "process_query_fast",
    "process_query_accurate",
    "process_query_fast_background",
    "process_query_accurate_background"
]
