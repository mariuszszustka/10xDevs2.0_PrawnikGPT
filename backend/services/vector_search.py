"""
PrawnikGPT Backend - Vector Search Service

Semantic search using Supabase pgvector extension.
Provides similarity search in legal act chunks using embeddings.

Key Features:
- Cosine similarity search
- Distance threshold filtering
- Top-K results
- Related acts graph traversal
- Metadata filtering (optional)

Integration with:
- OLLAMA Service (for embeddings generation)
- Supabase (pgvector + RPC functions)
"""

import logging
from typing import List, Dict, Any, Optional

from backend.db.supabase_client import get_supabase
from backend.services.ollama_service import generate_embedding
from backend.services.exceptions import NoRelevantActsError
from postgrest.exceptions import APIError

logger = logging.getLogger(__name__)


# =========================================================================
# CONFIGURATION
# =========================================================================

# Similarity thresholds (cosine distance)
# Lower distance = more similar
DEFAULT_DISTANCE_THRESHOLD = 0.5  # Keep results with distance < 0.5
MIN_RESULTS_REQUIRED = 3  # Minimum chunks to consider query answerable

# Default top-K for similarity search
DEFAULT_TOP_K = 10


# =========================================================================
# SEMANTIC SEARCH
# =========================================================================

async def semantic_search(
    query_embedding: List[float],
    top_k: int = DEFAULT_TOP_K,
    distance_threshold: float = DEFAULT_DISTANCE_THRESHOLD,
    legal_act_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Perform semantic search in legal act chunks using pgvector RPC.
    
    Args:
        query_embedding: Query embedding vector (768 or 1024-dim)
        top_k: Maximum number of results to return
        distance_threshold: Maximum cosine distance (0-2, lower is better)
        legal_act_ids: Optional filter by legal act IDs (not used in RPC version)
        
    Returns:
        List[Dict]: List of matching chunks with metadata:
            - id: Chunk ID (UUID)
            - legal_act_id: Legal act ID (UUID)
            - chunk_index: Chunk index in act
            - content: Chunk text content
            - distance: Cosine distance (0-2)
            - legal_act: Legal act metadata (title, publisher, etc.)
            
    Raises:
        NoRelevantActsError: If no relevant chunks found
        RuntimeError: If search operation fails
        
    Example:
        ```python
        embedding = await generate_embedding("Kodeks cywilny umowa sprzedaży")
        chunks = await semantic_search(embedding, top_k=10)
        # Returns top 10 most similar chunks
        ```
    """
    # Validation
    if not query_embedding:
        raise ValueError("query_embedding is required")
    
    # Support both 768-dim and 1024-dim embeddings
    embedding_dim = len(query_embedding)
    if embedding_dim not in (768, 1024):
        raise ValueError(f"Expected 768 or 1024-dim embedding, got {embedding_dim}")
    
    # Pad to 1024 if needed (database uses 1024-dim vectors)
    if embedding_dim == 768:
        query_embedding = query_embedding + [0.0] * (1024 - 768)
    
    if top_k < 1:
        raise ValueError("top_k must be >= 1")
    if not (0 <= distance_threshold <= 2):
        raise ValueError("distance_threshold must be 0-2")
    
    try:
        client = get_supabase()
        
        # Use RPC function for pgvector similarity search
        # This is much faster than client-side filtering
        response = client.rpc(
            "semantic_search_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": top_k,
                "similarity_threshold": distance_threshold
            }
        ).execute()
        
        if not response.data:
            logger.warning("No chunks found by semantic search")
            raise NoRelevantActsError("No relevant legal act chunks found")
        
        chunks = response.data
        
        # Transform RPC response to expected format
        results = []
        for chunk in chunks:
            result = {
                "id": chunk["id"],
                "legal_act_id": chunk["legal_act_id"],
                "chunk_index": chunk["chunk_index"],
                "content": chunk["content"],
                "metadata": chunk.get("metadata"),
                "distance": chunk["distance"],
                # Nested legal_act structure for compatibility
                "legal_act": {
                    "id": chunk["legal_act_id"],
                    "title": chunk["act_title"],
                    "publisher": chunk["act_publisher"],
                    "year": chunk["act_year"],
                    "position": chunk["act_position"],
                    "status": chunk["act_status"]
                }
            }
            results.append(result)
        
        if len(results) < MIN_RESULTS_REQUIRED:
            logger.warning(
                f"Insufficient relevant chunks found: {len(results)} < {MIN_RESULTS_REQUIRED}"
            )
            raise NoRelevantActsError(
                f"Only {len(results)} relevant chunks found. "
                f"Query may be outside scope of available legal acts."
            )
        
        logger.info(
            f"Semantic search found {len(results)} chunks "
            f"(top_k={top_k}, threshold={distance_threshold})"
        )
        
        return results
        
    except NoRelevantActsError:
        raise  # Re-raise domain errors
    except APIError as e:
        logger.error(f"Database error in semantic search: {e}")
        raise RuntimeError(f"Semantic search failed: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in semantic search: {e}")
        raise RuntimeError(f"Semantic search failed: {e}")


async def semantic_search_with_query(
    query_text: str,
    top_k: int = DEFAULT_TOP_K,
    distance_threshold: float = DEFAULT_DISTANCE_THRESHOLD
) -> List[Dict[str, Any]]:
    """
    Convenience function: Embed query and perform semantic search.
    
    Args:
        query_text: Query text (will be embedded automatically)
        top_k: Maximum number of results
        distance_threshold: Maximum cosine distance
        
    Returns:
        List[Dict]: List of matching chunks
        
    Raises:
        NoRelevantActsError: If no relevant chunks found
        RuntimeError: If operation fails
        
    Example:
        ```python
        chunks = await semantic_search_with_query(
            "Jakie są warunki zawarcia umowy sprzedaży?",
            top_k=10
        )
        ```
    """
    # Generate embedding for query
    query_embedding = await generate_embedding(query_text)
    
    # Perform search
    return await semantic_search(
        query_embedding=query_embedding,
        top_k=top_k,
        distance_threshold=distance_threshold
    )


# =========================================================================
# RELATED ACTS GRAPH TRAVERSAL
# =========================================================================

async def fetch_related_acts(
    act_ids: List[str],
    depth: int = 1,
    relation_types: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Fetch related legal acts using graph traversal RPC.
    
    Uses recursive CTE in database to find acts related to seed acts
    up to specified depth with cycle detection.
    
    Args:
        act_ids: Seed legal act IDs
        depth: Traversal depth (1-2)
        relation_types: Optional filter by relation types
            ("modifies", "repeals", "implements", "based_on", "amends")
            
    Returns:
        List[Dict]: List of related acts with relation metadata:
            - id: Act ID (UUID)
            - title: Act title
            - publisher: Publisher (e.g., "Dz.U.")
            - year: Publication year
            - position: Position number
            - status: Act status
            - published_date: Publication date
            - relation_type: Type of relation to seed act
            - depth: Graph traversal depth
            
    Raises:
        ValueError: If parameters invalid
        RuntimeError: If operation fails
        
    Example:
        ```python
        # Find acts related to Kodeks Cywilny
        related = await fetch_related_acts(
            act_ids=["kodeks-cywilny-uuid"],
            depth=2,
            relation_types=["modifies", "amends"]
        )
        ```
    """
    # Validation
    if not act_ids:
        raise ValueError("act_ids list cannot be empty")
    if not (1 <= depth <= 2):
        raise ValueError("depth must be 1 or 2")
    if relation_types:
        valid_types = {"modifies", "repeals", "implements", "based_on", "amends"}
        if not all(rt in valid_types for rt in relation_types):
            raise ValueError(f"Invalid relation_types. Must be in {valid_types}")
    
    try:
        client = get_supabase()
        
        # Use RPC function for optimized graph traversal
        rpc_params = {
            "seed_act_ids": act_ids,
            "max_depth": depth
        }
        
        # Add relation_types filter if provided
        if relation_types:
            rpc_params["relation_types"] = relation_types
        
        response = client.rpc("fetch_related_acts", rpc_params).execute()
        
        related_acts = response.data or []
        
        # Transform RPC response to expected format
        results = []
        for act in related_acts:
            result = {
                "id": act["act_id"],
                "title": act["title"],
                "publisher": act["publisher"],
                "year": act["year"],
                "position": act["position"],
                "status": act["status"],
                "published_date": act.get("published_date"),
                "relation_type": act.get("relation_type"),
                "relation_description": act.get("relation_description"),
                "source_act_id": act.get("source_act_id"),
                "depth": act.get("depth", 1)
            }
            results.append(result)
        
        logger.info(
            f"Found {len(results)} related acts for {len(act_ids)} seed acts "
            f"(depth={depth})"
        )
        
        return results
        
    except APIError as e:
        logger.error(f"Database error fetching related acts: {e}")
        raise RuntimeError(f"Failed to fetch related acts: {e}")
    except ValueError:
        raise  # Re-raise validation errors
    except Exception as e:
        logger.error(f"Unexpected error fetching related acts: {e}")
        raise RuntimeError(f"Failed to fetch related acts: {e}")


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def extract_act_ids_from_chunks(
    chunks: List[Dict[str, Any]]
) -> List[str]:
    """
    Extract unique legal act IDs from chunk results.
    
    Args:
        chunks: List of chunk results from semantic_search
        
    Returns:
        List[str]: Unique legal act IDs
    """
    act_ids = set()
    for chunk in chunks:
        if "legal_act_id" in chunk:
            act_ids.add(chunk["legal_act_id"])
    
    return list(act_ids)


def group_chunks_by_act(
    chunks: List[Dict[str, Any]]
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group chunks by legal act ID.
    
    Args:
        chunks: List of chunk results
        
    Returns:
        Dict: Chunks grouped by act_id
        
    Example:
        ```python
        grouped = group_chunks_by_act(chunks)
        # Returns: {"act_id_1": [chunk1, chunk2], "act_id_2": [chunk3]}
        ```
    """
    grouped = {}
    for chunk in chunks:
        act_id = chunk.get("legal_act_id")
        if act_id:
            if act_id not in grouped:
                grouped[act_id] = []
            grouped[act_id].append(chunk)
    
    return grouped

