"""
PrawnikGPT Backend - Custom Exceptions

This module defines custom exception classes for the application.
All exceptions inherit from PrawnikGPTError for consistent error handling.

Exception hierarchy:
- PrawnikGPTError (base)
  - ServiceUnavailableError
    - DatabaseUnavailableError
    - OLLAMAUnavailableError
  - RAGPipelineError
    - NoRelevantActsError
    - EmbeddingGenerationError
  - TimeoutError
    - OLLAMATimeoutError
    - GenerationTimeoutError
"""


class PrawnikGPTError(Exception):
    """
    Base exception for all PrawnikGPT errors.
    
    All custom exceptions should inherit from this class for consistent
    error handling and logging.
    """
    pass


# =========================================================================
# SERVICE AVAILABILITY ERRORS
# =========================================================================

class ServiceUnavailableError(PrawnikGPTError):
    """Raised when a required service is unavailable"""
    pass


class DatabaseUnavailableError(ServiceUnavailableError):
    """Raised when database connection fails"""
    pass


class OLLAMAUnavailableError(ServiceUnavailableError):
    """Raised when OLLAMA service is unavailable"""
    pass


# =========================================================================
# RAG PIPELINE ERRORS
# =========================================================================

class RAGPipelineError(PrawnikGPTError):
    """Base exception for RAG pipeline errors"""
    pass


class NoRelevantActsError(RAGPipelineError):
    """
    Raised when no relevant legal acts are found for a query.
    
    This can happen when:
    - Similarity search returns no results
    - All results have low similarity scores (<threshold)
    - Query is outside the scope of available legal acts
    """
    pass


class EmbeddingGenerationError(RAGPipelineError):
    """Raised when embedding generation fails"""
    pass


# =========================================================================
# TIMEOUT ERRORS
# =========================================================================

class TimeoutError(PrawnikGPTError):
    """Base exception for timeout errors"""
    pass


class OLLAMATimeoutError(TimeoutError):
    """Raised when OLLAMA request times out"""
    pass


class GenerationTimeoutError(TimeoutError):
    """
    Raised when LLM generation exceeds timeout.
    
    Timeouts:
    - Fast response: 15 seconds
    - Accurate response: 240 seconds
    """
    pass

