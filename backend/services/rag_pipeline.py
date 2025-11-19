"""
PrawnikGPT Backend - RAG Pipeline (CORE)

Retrieval-Augmented Generation pipeline for legal question answering.

Pipeline Steps (Fast Response):
1. Generate query embedding
2. Semantic search (similarity search in pgvector)
3. Fetch related acts (graph traversal)
4. Build legal context
5. Construct prompt
6. Generate LLM response (fast model)
7. Extract sources
8. Store in database
9. Cache context for accurate response

Pipeline Steps (Accurate Response):
1. Retrieve cached context
2. Enhanced prompt construction
3. Generate LLM response (accurate model)
4. Update database

Features:
- Full error handling at each step
- Performance monitoring
- Context caching (Redis, 5min TTL)
- Background task support
"""

import logging
import time
import json
from typing import Dict, Any, List, Optional, Tuple

from backend.services.ollama_service import generate_embedding
from backend.services.vector_search import (
    semantic_search,
    fetch_related_acts,
    extract_act_ids_from_chunks
)
from backend.services.llm_service import (
    generate_text_fast,
    generate_text_accurate,
    build_legal_context,
    build_prompt,
    extract_sources_from_response,
    SYSTEM_PROMPT
)
from backend.services.exceptions import (
    NoRelevantActsError,
    RAGPipelineError,
    GenerationTimeoutError
)
from backend.db.queries import (
    create_query,
    update_query_fast_response,
    update_query_accurate_response
)
from backend.config import settings

logger = logging.getLogger(__name__)


# =========================================================================
# CONFIGURATION
# =========================================================================

# Similarity search parameters
TOP_K_CHUNKS = 10
DISTANCE_THRESHOLD = 0.5

# Graph traversal parameters
RELATED_ACTS_DEPTH = 2

# Cache TTL (seconds)
CACHE_TTL = 300  # 5 minutes


# =========================================================================
# CACHE MANAGEMENT (Simple in-memory, TODO: Redis)
# =========================================================================

# In-memory cache (temporary solution)
_context_cache: Dict[str, Dict[str, Any]] = {}


def cache_rag_context(
    query_id: str,
    chunks: List[Dict[str, Any]],
    related_acts: List[Dict[str, Any]],
    legal_context: str
) -> None:
    """
    Cache RAG context for accurate response generation.
    
    Args:
        query_id: Query ID
        chunks: Retrieved chunks
        related_acts: Related acts
        legal_context: Formatted legal context
        
    Note:
        Currently uses in-memory cache. TODO: Implement Redis backend.
    """
    _context_cache[query_id] = {
        "chunks": chunks,
        "related_acts": related_acts,
        "legal_context": legal_context,
        "cached_at": time.time()
    }
    
    logger.info(f"Cached context for query {query_id}")


def get_cached_context(query_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached RAG context.
    
    Args:
        query_id: Query ID
        
    Returns:
        Optional[Dict]: Cached context or None if expired/not found
    """
    if query_id not in _context_cache:
        return None
    
    cached = _context_cache[query_id]
    cache_age = time.time() - cached["cached_at"]
    
    # Check if expired
    if cache_age > CACHE_TTL:
        logger.info(f"Cache expired for query {query_id} (age: {cache_age:.0f}s)")
        del _context_cache[query_id]
        return None
    
    logger.info(f"Cache hit for query {query_id} (age: {cache_age:.0f}s)")
    return cached


# =========================================================================
# FAST RESPONSE PIPELINE
# =========================================================================

async def process_query_fast(
    user_id: str,
    query_text: str
) -> Dict[str, Any]:
    """
    Full RAG pipeline for fast response generation.
    
    Steps:
    1. Create query in database
    2. Generate query embedding
    3. Semantic search
    4. Fetch related acts
    5. Build context
    6. Generate response (fast model)
    7. Extract sources
    8. Update database
    9. Cache context
    
    Args:
        user_id: User ID
        query_text: User's legal question
        
    Returns:
        Dict: Response data with query_id, content, sources, etc.
        
    Raises:
        NoRelevantActsError: If no relevant chunks found
        GenerationTimeoutError: If generation times out
        RAGPipelineError: If any step fails
        
    Example:
        ```python
        result = await process_query_fast(
            user_id="123e4567-...",
            query_text="Jakie są warunki zawarcia umowy?"
        )
        # Returns: {
        #     "query_id": "...",
        #     "content": "Umowa sprzedaży...",
        #     "sources": [...],
        #     "generation_time_ms": 12450
        # }
        ```
    """
    pipeline_start = time.time()
    
    try:
        # =====================================================================
        # STEP 1: Create query in database
        # =====================================================================
        logger.info(f"[STEP 1/9] Creating query for user {user_id}")
        step_start = time.time()
        
        query_id = await create_query(user_id, query_text)
        
        logger.info(
            f"[STEP 1/9] Query created: {query_id} "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # STEP 2: Generate query embedding
        # =====================================================================
        logger.info(f"[STEP 2/9] Generating embedding for query: {query_text[:50]}...")
        step_start = time.time()
        
        query_embedding = await generate_embedding(query_text)
        
        logger.info(
            f"[STEP 2/9] Embedding generated: {len(query_embedding)} dimensions "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # STEP 3: Semantic search
        # =====================================================================
        logger.info(f"[STEP 3/9] Performing semantic search (top_k={TOP_K_CHUNKS})")
        step_start = time.time()
        
        chunks = await semantic_search(
            query_embedding=query_embedding,
            top_k=TOP_K_CHUNKS,
            distance_threshold=DISTANCE_THRESHOLD
        )
        
        logger.info(
            f"[STEP 3/9] Found {len(chunks)} relevant chunks "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # STEP 4: Fetch related acts
        # =====================================================================
        logger.info(f"[STEP 4/9] Fetching related acts (depth={RELATED_ACTS_DEPTH})")
        step_start = time.time()
        
        act_ids = extract_act_ids_from_chunks(chunks)
        related_acts = await fetch_related_acts(
            act_ids=act_ids,
            depth=RELATED_ACTS_DEPTH
        )
        
        logger.info(
            f"[STEP 4/9] Found {len(related_acts)} related acts "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # STEP 5: Build legal context
        # =====================================================================
        logger.info("[STEP 5/9] Building legal context")
        step_start = time.time()
        
        legal_context = build_legal_context(chunks, related_acts)
        
        logger.info(
            f"[STEP 5/9] Context built: {len(legal_context)} chars "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # STEP 6: Generate LLM response (fast model)
        # =====================================================================
        logger.info("[STEP 6/9] Generating fast response")
        step_start = time.time()
        
        prompt = build_prompt(query_text, legal_context)
        response_text, generation_time_ms = await generate_text_fast(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT
        )
        
        logger.info(
            f"[STEP 6/9] Response generated: {len(response_text)} chars "
            f"in {generation_time_ms}ms"
        )
        
        # =====================================================================
        # STEP 7: Extract sources
        # =====================================================================
        logger.info("[STEP 7/9] Extracting sources")
        step_start = time.time()
        
        sources = extract_sources_from_response(response_text, chunks)
        
        logger.info(
            f"[STEP 7/9] Extracted {len(sources)} sources "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # STEP 8: Update database
        # =====================================================================
        logger.info("[STEP 8/9] Updating database")
        step_start = time.time()
        
        await update_query_fast_response(
            query_id=query_id,
            content=response_text,
            sources=sources,
            model_name=settings.ollama_fast_model,
            generation_time_ms=generation_time_ms
        )
        
        logger.info(
            f"[STEP 8/9] Database updated "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # STEP 9: Cache context for accurate response
        # =====================================================================
        logger.info("[STEP 9/9] Caching context")
        step_start = time.time()
        
        cache_rag_context(
            query_id=query_id,
            chunks=chunks,
            related_acts=related_acts,
            legal_context=legal_context
        )
        
        logger.info(
            f"[STEP 9/9] Context cached "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # PIPELINE COMPLETE
        # =====================================================================
        total_time = time.time() - pipeline_start
        logger.info(
            f"Fast response pipeline completed in {total_time:.2f}s "
            f"(query_id: {query_id})"
        )
        
        return {
            "query_id": query_id,
            "content": response_text,
            "sources": sources,
            "model_name": settings.ollama_fast_model,
            "generation_time_ms": generation_time_ms,
            "pipeline_time_ms": int(total_time * 1000)
        }
        
    except NoRelevantActsError:
        logger.error(f"No relevant acts found for query: {query_text[:50]}...")
        raise
    
    except GenerationTimeoutError:
        logger.error(f"Fast generation timeout for query: {query_text[:50]}...")
        raise
    
    except Exception as e:
        logger.error(f"RAG pipeline failed: {e}", exc_info=True)
        raise RAGPipelineError(f"Fast response pipeline failed: {e}")


# =========================================================================
# ACCURATE RESPONSE PIPELINE
# =========================================================================

async def process_query_accurate(
    query_id: str,
    query_text: str
) -> Dict[str, Any]:
    """
    RAG pipeline for accurate response generation.
    
    Reuses cached context from fast response (if available).
    
    Steps:
    1. Retrieve cached context (or regenerate)
    2. Enhanced prompt construction
    3. Generate response (accurate model)
    4. Update database
    
    Args:
        query_id: Query ID
        query_text: Original user question
        
    Returns:
        Dict: Response data with content, model_name, generation_time_ms
        
    Raises:
        OLLAMATimeoutError: If generation times out (>240s)
        RAGPipelineError: If any step fails
        
    Example:
        ```python
        result = await process_query_accurate(
            query_id="123e4567-...",
            query_text="Jakie są warunki zawarcia umowy?"
        )
        ```
    """
    pipeline_start = time.time()
    
    try:
        # =====================================================================
        # STEP 1: Retrieve cached context
        # =====================================================================
        logger.info(f"[STEP 1/4] Retrieving cached context for {query_id}")
        step_start = time.time()
        
        cached = get_cached_context(query_id)
        
        if cached:
            legal_context = cached["legal_context"]
            chunks = cached["chunks"]
            logger.info(
                f"[STEP 1/4] Using cached context "
                f"({(time.time() - step_start) * 1000:.0f}ms)"
            )
        else:
            logger.warning(f"[STEP 1/4] Cache miss for {query_id}, regenerating context")
            
            # Regenerate context (fallback)
            query_embedding = await generate_embedding(query_text)
            chunks = await semantic_search(query_embedding, TOP_K_CHUNKS, DISTANCE_THRESHOLD)
            act_ids = extract_act_ids_from_chunks(chunks)
            related_acts = await fetch_related_acts(act_ids, RELATED_ACTS_DEPTH)
            legal_context = build_legal_context(chunks, related_acts)
            
            logger.info(
                f"[STEP 1/4] Context regenerated "
                f"({(time.time() - step_start) * 1000:.0f}ms)"
            )
        
        # =====================================================================
        # STEP 2: Enhanced prompt construction
        # =====================================================================
        logger.info("[STEP 2/4] Building enhanced prompt")
        step_start = time.time()
        
        # Enhanced prompt for accurate model (more detailed instructions)
        enhanced_system_prompt = SYSTEM_PROMPT + """

Dla tej odpowiedzi:
- Dokonaj głębszej analizy przepisów
- Rozważ różne interpretacje i konteksty
- Wskaż potencjalne wyjątki lub szczególne przypadki
- Podaj przykłady zastosowania (jeśli relewanatne)
"""
        
        prompt = build_prompt(query_text, legal_context)
        
        logger.info(
            f"[STEP 2/4] Enhanced prompt built "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # STEP 3: Generate response (accurate model)
        # =====================================================================
        logger.info("[STEP 3/4] Generating accurate response (may take up to 240s)")
        step_start = time.time()
        
        response_text, generation_time_ms = await generate_text_accurate(
            prompt=prompt,
            system_prompt=enhanced_system_prompt
        )
        
        logger.info(
            f"[STEP 3/4] Accurate response generated: {len(response_text)} chars "
            f"in {generation_time_ms}ms"
        )
        
        # =====================================================================
        # STEP 4: Update database
        # =====================================================================
        logger.info("[STEP 4/4] Updating database")
        step_start = time.time()
        
        await update_query_accurate_response(
            query_id=query_id,
            content=response_text,
            model_name=settings.ollama_accurate_model,
            generation_time_ms=generation_time_ms
        )
        
        logger.info(
            f"[STEP 4/4] Database updated "
            f"({(time.time() - step_start) * 1000:.0f}ms)"
        )
        
        # =====================================================================
        # PIPELINE COMPLETE
        # =====================================================================
        total_time = time.time() - pipeline_start
        logger.info(
            f"Accurate response pipeline completed in {total_time:.2f}s "
            f"(query_id: {query_id})"
        )
        
        return {
            "query_id": query_id,
            "content": response_text,
            "model_name": settings.ollama_accurate_model,
            "generation_time_ms": generation_time_ms,
            "pipeline_time_ms": int(total_time * 1000)
        }
        
    except Exception as e:
        logger.error(f"Accurate response pipeline failed: {e}", exc_info=True)
        raise RAGPipelineError(f"Accurate response pipeline failed: {e}")


# =========================================================================
# BACKGROUND TASK HELPERS
# =========================================================================

async def process_query_fast_background(user_id: str, query_text: str) -> None:
    """
    Background task wrapper for fast response generation.
    
    Catches exceptions and logs them (doesn't propagate to client).
    
    Args:
        user_id: User ID
        query_text: Query text
    """
    try:
        await process_query_fast(user_id, query_text)
    except Exception as e:
        logger.error(f"Background fast response failed: {e}", exc_info=True)


async def process_query_accurate_background(query_id: str, query_text: str) -> None:
    """
    Background task wrapper for accurate response generation.
    
    Catches exceptions and logs them (doesn't propagate to client).
    
    Args:
        query_id: Query ID
        query_text: Query text
    """
    try:
        await process_query_accurate(query_id, query_text)
    except Exception as e:
        logger.error(f"Background accurate response failed: {e}", exc_info=True)

