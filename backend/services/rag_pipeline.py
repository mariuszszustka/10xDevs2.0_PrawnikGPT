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
import redis

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
CACHE_TTL = settings.redis_rag_context_ttl


# =========================================================================
# REDIS CACHE MANAGEMENT
# =========================================================================

_redis_client = None

def get_redis_client():
    """Get or create Redis client instance."""
    global _redis_client
    if _redis_client is None and settings.redis_url:
        try:
            _redis_client = redis.from_url(settings.redis_url)
            logger.info("Redis client initialized.")
        except redis.exceptions.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            _redis_client = None
    return _redis_client

def cache_rag_context(
    query_id: str,
    chunks: List[Dict[str, Any]],
    related_acts: List[Dict[str, Any]],
    legal_context: str
) -> None:
    """
    Cache RAG context for accurate response generation in Redis.
    """
    redis_client = get_redis_client()
    if not redis_client:
        logger.warning("Redis not configured. Skipping cache.")
        return

    try:
        context_data = {
            "chunks": chunks,
            "related_acts": related_acts,
            "legal_context": legal_context,
        }
        redis_client.set(
            f"rag_context:{query_id}",
            json.dumps(context_data),
            ex=CACHE_TTL
        )
        logger.info(f"Cached context for query {query_id} in Redis.")
    except redis.exceptions.RedisError as e:
        logger.error(f"Failed to cache context for query {query_id}: {e}")

def get_cached_context(query_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached RAG context from Redis.
    """
    redis_client = get_redis_client()
    if not redis_client:
        return None

    try:
        cached_data = redis_client.get(f"rag_context:{query_id}")
        if cached_data:
            logger.info(f"Cache hit for query {query_id} in Redis.")
            return json.loads(cached_data)
        else:
            logger.info(f"Cache miss for query {query_id} in Redis.")
            return None
    except redis.exceptions.RedisError as e:
        logger.error(f"Failed to retrieve cached context for query {query_id}: {e}")
        return None


# =========================================================================
# FAST RESPONSE PIPELINE
# =========================================================================

async def process_query_fast(
    user_id: str,
    query_text: str
) -> Dict[str, Any]:
    """
    Full RAG pipeline for fast response generation.
    """
    pipeline_start = time.time()
    
    try:
        # STEP 1: Create query in database
        logger.info(f"[STEP 1/9] Creating query for user {user_id}")
        query_id = await create_query(user_id, query_text)
        
        # STEP 2: Generate query embedding
        logger.info(f"[STEP 2/9] Generating embedding for query: {query_text[:50]}...")
        query_embedding = await generate_embedding(query_text)
        
        # STEP 3: Semantic search
        logger.info(f"[STEP 3/9] Performing semantic search (top_k={TOP_K_CHUNKS})")
        chunks = await semantic_search(
            query_embedding=query_embedding,
            top_k=TOP_K_CHUNKS,
            distance_threshold=DISTANCE_THRESHOLD
        )
        
        # STEP 4: Fetch related acts
        logger.info(f"[STEP 4/9] Fetching related acts (depth={RELATED_ACTS_DEPTH})")
        act_ids = extract_act_ids_from_chunks(chunks)
        related_acts = await fetch_related_acts(
            act_ids=act_ids,
            depth=RELATED_ACTS_DEPTH
        )
        
        # STEP 5: Build legal context
        logger.info("[STEP 5/9] Building legal context")
        legal_context = build_legal_context(chunks, related_acts)
        
        # STEP 6: Generate LLM response (fast model)
        logger.info("[STEP 6/9] Generating fast response")
        prompt = build_prompt(query_text, legal_context)
        response_text, generation_time_ms = await generate_text_fast(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT
        )
        
        # STEP 7: Extract sources
        logger.info("[STEP 7/9] Extracting sources")
        sources = extract_sources_from_response(response_text, chunks)
        
        # STEP 8: Update database
        logger.info("[STEP 8/9] Updating database")
        await update_query_fast_response(
            query_id=query_id,
            content=response_text,
            sources=sources,
            model_name=settings.ollama_fast_model,
            generation_time_ms=generation_time_ms
        )
        
        # STEP 9: Cache context for accurate response
        logger.info("[STEP 9/9] Caching context")
        cache_rag_context(
            query_id=query_id,
            chunks=chunks,
            related_acts=related_acts,
            legal_context=legal_context
        )
        
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
    """
    pipeline_start = time.time()
    
    try:
        # STEP 1: Retrieve cached context
        logger.info(f"[STEP 1/4] Retrieving cached context for {query_id}")
        cached = get_cached_context(query_id)
        
        if cached:
            legal_context = cached["legal_context"]
        else:
            logger.warning(f"[STEP 1/4] Cache miss for {query_id}, regenerating context")
            query_embedding = await generate_embedding(query_text)
            chunks = await semantic_search(query_embedding, TOP_K_CHUNKS, DISTANCE_THRESHOLD)
            act_ids = extract_act_ids_from_chunks(chunks)
            related_acts = await fetch_related_acts(act_ids, RELATED_ACTS_DEPTH)
            legal_context = build_legal_context(chunks, related_acts)
        
        # STEP 2: Enhanced prompt construction
        logger.info("[STEP 2/4] Building enhanced prompt")
        enhanced_system_prompt = SYSTEM_PROMPT + """

Dla tej odpowiedzi:
- Dokonaj głębszej analizy przepisów
- Rozważ różne interpretacje i konteksty
- Wskaż potencjalne wyjątki lub szczególne przypadki
- Podaj przykłady zastosowania (jeśli relewanatne)
"""
        prompt = build_prompt(query_text, legal_context)
        
        # STEP 3: Generate response (accurate model)
        logger.info("[STEP 3/4] Generating accurate response (may take up to 240s)")
        response_text, generation_time_ms = await generate_text_accurate(
            prompt=prompt,
            system_prompt=enhanced_system_prompt
        )
        
        # STEP 4: Update database
        logger.info("[STEP 4/4] Updating database")
        await update_query_accurate_response(
            query_id=query_id,
            content=response_text,
            model_name=settings.ollama_accurate_model,
            generation_time_ms=generation_time_ms
        )
        
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
    """
    try:
        await process_query_fast(user_id, query_text)
    except Exception as e:
        logger.error(f"Background fast response failed: {e}", exc_info=True)


async def process_query_accurate_background(query_id: str, query_text: str) -> None:
    """
    Background task wrapper for accurate response generation.
    """
    try:
        await process_query_accurate(query_id, query_text)
    except Exception as e:
        logger.error(f"Background accurate response failed: {e}", exc_info=True)