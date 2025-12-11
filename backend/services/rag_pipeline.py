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
from collections import defaultdict
import redis

from backend.services.ollama_service import generate_embedding, get_ollama_service
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
# METRICS AND MONITORING
# =========================================================================

class RAGMetrics:
    """
    Simple metrics collector for RAG pipeline.
    
    Tracks:
    - Generation times (fast/accurate)
    - Success/failure rates
    - Pipeline step durations
    - Cache hit rates
    - Memory usage (if available)
    """
    
    def __init__(self):
        self.generation_times: Dict[str, List[float]] = defaultdict(list)
        self.pipeline_times: Dict[str, List[float]] = defaultdict(list)
        self.step_times: Dict[str, List[float]] = defaultdict(list)
        self.success_count: Dict[str, int] = defaultdict(int)
        self.failure_count: Dict[str, int] = defaultdict(int)
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        self.memory_samples: List[float] = []  # Memory usage percentages
        self.max_samples = 1000  # Keep last 1000 samples
    
    def record_generation_time(self, response_type: str, time_ms: float):
        """Record generation time for a response type."""
        self.generation_times[response_type].append(time_ms)
        if len(self.generation_times[response_type]) > self.max_samples:
            self.generation_times[response_type].pop(0)
    
    def record_pipeline_time(self, response_type: str, time_ms: float):
        """Record total pipeline time."""
        self.pipeline_times[response_type].append(time_ms)
        if len(self.pipeline_times[response_type]) > self.max_samples:
            self.pipeline_times[response_type].pop(0)
    
    def record_step_time(self, step_name: str, time_seconds: float):
        """Record time for a specific pipeline step."""
        self.step_times[step_name].append(time_seconds)
        if len(self.step_times[step_name]) > self.max_samples:
            self.step_times[step_name].pop(0)
    
    def record_success(self, response_type: str):
        """Record successful pipeline execution."""
        self.success_count[response_type] += 1
    
    def record_failure(self, response_type: str):
        """Record failed pipeline execution."""
        self.failure_count[response_type] += 1
    
    def record_cache_hit(self):
        """Record cache hit."""
        self.cache_hits += 1
    
    def record_cache_miss(self):
        """Record cache miss."""
        self.cache_misses += 1
    
    def record_memory_usage(self, percent: float | None):
        """Record memory usage percentage."""
        if percent is not None:
            self.memory_samples.append(percent)
            if len(self.memory_samples) > self.max_samples:
                self.memory_samples.pop(0)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get aggregated statistics."""
        stats = {
            "generation_times": {},
            "pipeline_times": {},
            "step_times": {},
            "success_rates": {},
            "cache_hit_rate": 0.0
        }
        
        # Generation time stats
        for response_type, times in self.generation_times.items():
            if times:
                stats["generation_times"][response_type] = {
                    "avg_ms": sum(times) / len(times),
                    "min_ms": min(times),
                    "max_ms": max(times),
                    "count": len(times)
                }
        
        # Pipeline time stats
        for response_type, times in self.pipeline_times.items():
            if times:
                stats["pipeline_times"][response_type] = {
                    "avg_ms": sum(times) / len(times),
                    "min_ms": min(times),
                    "max_ms": max(times),
                    "count": len(times)
                }
        
        # Step time stats
        for step_name, times in self.step_times.items():
            if times:
                stats["step_times"][step_name] = {
                    "avg_s": sum(times) / len(times),
                    "min_s": min(times),
                    "max_s": max(times),
                    "count": len(times)
                }
        
        # Success rates
        for response_type in set(list(self.success_count.keys()) + list(self.failure_count.keys())):
            total = self.success_count[response_type] + self.failure_count[response_type]
            if total > 0:
                stats["success_rates"][response_type] = {
                    "success": self.success_count[response_type],
                    "failures": self.failure_count[response_type],
                    "rate": self.success_count[response_type] / total
                }
        
        # Cache hit rate
        total_cache_requests = self.cache_hits + self.cache_misses
        if total_cache_requests > 0:
            stats["cache_hit_rate"] = self.cache_hits / total_cache_requests
        
        # Memory usage stats
        if self.memory_samples:
            stats["memory_usage"] = {
                "avg_percent": sum(self.memory_samples) / len(self.memory_samples) * 100,
                "max_percent": max(self.memory_samples) * 100,
                "min_percent": min(self.memory_samples) * 100,
                "samples": len(self.memory_samples)
            }
        
        return stats
    
    def log_stats(self):
        """Log aggregated statistics."""
        stats = self.get_stats()
        logger.info(f"RAG Pipeline Metrics: {json.dumps(stats, indent=2)}")


# Global metrics instance
_rag_metrics = RAGMetrics()


def get_rag_metrics() -> RAGMetrics:
    """Get global RAG metrics instance."""
    return _rag_metrics


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
    
    Includes metrics collection for monitoring performance.
    """
    pipeline_start = time.time()
    metrics = get_rag_metrics()
    
    try:
        # STEP 1: Create query in database
        step_start = time.time()
        logger.info(f"[STEP 1/9] Creating query for user {user_id}")
        query_id = await create_query(user_id, query_text)
        metrics.record_step_time("create_query", time.time() - step_start)
        
        # STEP 2: Generate query embedding
        step_start = time.time()
        logger.info(f"[STEP 2/9] Generating embedding for query: {query_text[:50]}...")
        query_embedding = await generate_embedding(query_text)
        metrics.record_step_time("generate_embedding", time.time() - step_start)
        
        # STEP 3: Semantic search
        step_start = time.time()
        logger.info(f"[STEP 3/9] Performing semantic search (top_k={TOP_K_CHUNKS})")
        chunks = await semantic_search(
            query_embedding=query_embedding,
            top_k=TOP_K_CHUNKS,
            distance_threshold=DISTANCE_THRESHOLD
        )
        metrics.record_step_time("semantic_search", time.time() - step_start)
        
        # STEP 4: Fetch related acts
        step_start = time.time()
        logger.info(f"[STEP 4/9] Fetching related acts (depth={RELATED_ACTS_DEPTH})")
        act_ids = extract_act_ids_from_chunks(chunks)
        related_acts = await fetch_related_acts(
            act_ids=act_ids,
            depth=RELATED_ACTS_DEPTH
        )
        metrics.record_step_time("fetch_related_acts", time.time() - step_start)
        
        # STEP 5: Build legal context
        step_start = time.time()
        logger.info("[STEP 5/9] Building legal context")
        legal_context = build_legal_context(chunks, related_acts)
        metrics.record_step_time("build_legal_context", time.time() - step_start)
        
        # STEP 6: Generate LLM response (fast model)
        step_start = time.time()
        logger.info("[STEP 6/9] Generating fast response")
        
        # Record memory before generation
        try:
            from backend.services.ollama_service import get_ollama_service
            ollama_service = get_ollama_service()
            mem_info = ollama_service._get_memory_usage()
            if mem_info.get("percent") is not None:
                metrics.record_memory_usage(mem_info["percent"])
        except Exception:
            pass  # Non-critical, continue without memory info
        
        prompt = build_prompt(query_text, legal_context)
        response_text, generation_time_ms = await generate_text_fast(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT
        )
        metrics.record_generation_time("fast", generation_time_ms)
        metrics.record_step_time("generate_text_fast", time.time() - step_start)
        
        # STEP 7: Extract sources
        step_start = time.time()
        logger.info("[STEP 7/9] Extracting sources")
        sources = extract_sources_from_response(response_text, chunks)
        metrics.record_step_time("extract_sources", time.time() - step_start)
        
        # STEP 8: Update database
        step_start = time.time()
        logger.info("[STEP 8/9] Updating database")
        await update_query_fast_response(
            query_id=query_id,
            content=response_text,
            sources=sources,
            model_name=settings.ollama_fast_model,
            generation_time_ms=generation_time_ms
        )
        metrics.record_step_time("update_database", time.time() - step_start)
        
        # STEP 9: Cache context for accurate response
        step_start = time.time()
        logger.info("[STEP 9/9] Caching context")
        cache_rag_context(
            query_id=query_id,
            chunks=chunks,
            related_acts=related_acts,
            legal_context=legal_context
        )
        metrics.record_step_time("cache_context", time.time() - step_start)
        
        total_time = time.time() - pipeline_start
        total_time_ms = int(total_time * 1000)
        metrics.record_pipeline_time("fast", total_time_ms)
        metrics.record_success("fast")
        
        logger.info(
            f"Fast response pipeline completed in {total_time:.2f}s "
            f"(query_id: {query_id}, generation: {generation_time_ms}ms)"
        )
        
        return {
            "query_id": query_id,
            "content": response_text,
            "sources": sources,
            "model_name": settings.ollama_fast_model,
            "generation_time_ms": generation_time_ms,
            "pipeline_time_ms": total_time_ms
        }
        
    except NoRelevantActsError:
        logger.error(f"No relevant acts found for query: {query_text[:50]}...")
        metrics.record_failure("fast")
        raise
    
    except GenerationTimeoutError:
        logger.error(f"Fast generation timeout for query: {query_text[:50]}...")
        metrics.record_failure("fast")
        raise
    
    except Exception as e:
        logger.error(f"RAG pipeline failed: {e}", exc_info=True)
        metrics.record_failure("fast")
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
    
    Includes metrics collection for monitoring performance.
    """
    pipeline_start = time.time()
    metrics = get_rag_metrics()
    
    try:
        # STEP 1: Retrieve cached context
        step_start = time.time()
        logger.info(f"[STEP 1/4] Retrieving cached context for {query_id}")
        cached = get_cached_context(query_id)
        
        if cached:
            legal_context = cached["legal_context"]
            metrics.record_cache_hit()
        else:
            logger.warning(f"[STEP 1/4] Cache miss for {query_id}, regenerating context")
            metrics.record_cache_miss()
            query_embedding = await generate_embedding(query_text)
            chunks = await semantic_search(query_embedding, TOP_K_CHUNKS, DISTANCE_THRESHOLD)
            act_ids = extract_act_ids_from_chunks(chunks)
            related_acts = await fetch_related_acts(act_ids, RELATED_ACTS_DEPTH)
            legal_context = build_legal_context(chunks, related_acts)
        
        metrics.record_step_time("retrieve_context", time.time() - step_start)
        
        # STEP 2: Enhanced prompt construction
        step_start = time.time()
        logger.info("[STEP 2/4] Building enhanced prompt")
        enhanced_system_prompt = SYSTEM_PROMPT + """

Dla tej odpowiedzi:
- Dokonaj głębszej analizy przepisów
- Rozważ różne interpretacje i konteksty
- Wskaż potencjalne wyjątki lub szczególne przypadki
- Podaj przykłady zastosowania (jeśli relewanatne)
"""
        prompt = build_prompt(query_text, legal_context)
        metrics.record_step_time("build_prompt", time.time() - step_start)
        
        # STEP 3: Generate response (accurate model)
        step_start = time.time()
        logger.info("[STEP 3/4] Generating accurate response (may take up to 240s)")
        response_text, generation_time_ms = await generate_text_accurate(
            prompt=prompt,
            system_prompt=enhanced_system_prompt
        )
        metrics.record_generation_time("accurate", generation_time_ms)
        metrics.record_step_time("generate_text_accurate", time.time() - step_start)
        
        # STEP 4: Update database
        step_start = time.time()
        logger.info("[STEP 4/4] Updating database")
        await update_query_accurate_response(
            query_id=query_id,
            content=response_text,
            model_name=settings.ollama_accurate_model,
            generation_time_ms=generation_time_ms
        )
        metrics.record_step_time("update_database", time.time() - step_start)
        
        total_time = time.time() - pipeline_start
        total_time_ms = int(total_time * 1000)
        metrics.record_pipeline_time("accurate", total_time_ms)
        metrics.record_success("accurate")
        
        logger.info(
            f"Accurate response pipeline completed in {total_time:.2f}s "
            f"(query_id: {query_id}, generation: {generation_time_ms}ms)"
        )
        
        return {
            "query_id": query_id,
            "content": response_text,
            "model_name": settings.ollama_accurate_model,
            "generation_time_ms": generation_time_ms,
            "pipeline_time_ms": total_time_ms
        }
        
    except Exception as e:
        logger.error(f"Accurate response pipeline failed: {e}", exc_info=True)
        metrics.record_failure("accurate")
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


# =========================================================================
# METRICS ENDPOINT HELPERS
# =========================================================================

def get_rag_pipeline_metrics() -> Dict[str, Any]:
    """
    Get current RAG pipeline metrics.
    
    Returns:
        dict: Aggregated metrics including:
            - generation_times: Average/min/max for fast/accurate
            - pipeline_times: Average/min/max for fast/accurate
            - step_times: Average/min/max for each pipeline step
            - success_rates: Success/failure counts and rates
            - cache_hit_rate: Cache hit ratio
    """
    metrics = get_rag_metrics()
    return metrics.get_stats()


def log_rag_pipeline_metrics():
    """Log current RAG pipeline metrics (useful for periodic logging)."""
    metrics = get_rag_metrics()
    metrics.log_stats()


# =========================================================================
# PERIODIC METRICS LOGGING
# =========================================================================

async def periodic_metrics_logging(interval_seconds: int = 300):
    """
    Periodically log RAG pipeline metrics.
    
    This function runs in background and logs metrics every interval_seconds.
    Useful for monitoring pipeline performance over time.
    
    Args:
        interval_seconds: Logging interval in seconds (default: 5 minutes)
    """
    import asyncio
    
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            log_rag_pipeline_metrics()
        except asyncio.CancelledError:
            logger.info("Periodic metrics logging cancelled")
            break
        except Exception as e:
            logger.error(f"Error in periodic metrics logging: {e}", exc_info=True)
            # Continue logging even if one iteration fails
            await asyncio.sleep(interval_seconds)