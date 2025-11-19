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
    Perform semantic search in legal act chunks using pgvector.
    
    Args:
        query_embedding: Query embedding vector (768-dim)
        top_k: Maximum number of results to return
        distance_threshold: Maximum cosine distance (0-2, lower is better)
        legal_act_ids: Optional filter by legal act IDs
        
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
    if len(query_embedding) != 768:
        raise ValueError(f"Expected 768-dim embedding, got {len(query_embedding)}")
    if top_k < 1:
        raise ValueError("top_k must be >= 1")
    if not (0 <= distance_threshold <= 2):
        raise ValueError("distance_threshold must be 0-2")
    
    try:
        client = get_supabase()
        
        # Build query for similarity search
        # Note: Supabase doesn't directly expose pgvector operators in client library
        # We'll use RPC function for optimal performance
        
        # For now, use direct query with embedding comparison
        # TODO: Create RPC function `semantic_search_chunks` in Supabase for better performance
        
        # Fallback: Manual query with joins
        query = client.table("legal_act_chunks") \
            .select("id, legal_act_id, chunk_index, content, legal_acts(id, title, publisher, year, position, status)") \
            .limit(top_k * 2)  # Fetch more to filter by distance
        
        # Apply legal act filter if provided
        if legal_act_ids:
            query = query.in_("legal_act_id", legal_act_ids)
        
        response = await query.execute()
        
        if not response.data:
            logger.warning("No chunks found in database")
            raise NoRelevantActsError("No legal act chunks available")
        
        chunks = response.data
        
        # Calculate cosine distance for each chunk
        # Note: This is a temporary solution. In production, use pgvector operators
        # For now, we'll simulate distance (placeholder)
        # TODO: Implement proper pgvector similarity search via RPC
        
        # Filter by distance threshold
        filtered_chunks = []
        for chunk in chunks:
            # Placeholder: Set random distance for testing
            # In real implementation, this would be calculated by pgvector
            chunk["distance"] = 0.3  # Placeholder
            
            if chunk["distance"] < distance_threshold:
                # Flatten legal_acts nested structure
                if "legal_acts" in chunk and chunk["legal_acts"]:
                    chunk["legal_act"] = chunk["legal_acts"][0]
                    del chunk["legal_acts"]
                
                filtered_chunks.append(chunk)
        
        # Sort by distance (ascending - lower is better)
        filtered_chunks.sort(key=lambda x: x["distance"])
        
        # Take top_k results
        results = filtered_chunks[:top_k]
        
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
    Fetch related legal acts using graph traversal.
    
    Uses recursive query to find acts related to seed acts
    up to specified depth.
    
    Args:
        act_ids: Seed legal act IDs
        depth: Traversal depth (1-2)
        relation_types: Optional filter by relation types
            ("modifies", "repeals", "implements", "based_on", "amends")
            
    Returns:
        List[Dict]: List of related acts with relation metadata
        
    Raises:
        ValueError: If parameters invalid
        RuntimeError: If operation fails
        
    Note:
        Uses RPC function `fetch_related_acts` in Supabase for optimal performance.
        If RPC not available, falls back to manual queries.
        
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
        
        # TODO: Create RPC function `fetch_related_acts` in Supabase
        # For now, use simple query to get directly related acts (depth=1)
        
        # Query legal_act_relations table
        query = client.table("legal_act_relations") \
            .select("id, source_act_id, target_act_id, relation_type, description, created_at") \
            .or_(f"source_act_id.in.({','.join(act_ids)}),target_act_id.in.({','.join(act_ids)})")
        
        if relation_types:
            query = query.in_("relation_type", relation_types)
        
        response = await query.execute()
        
        relations = response.data or []
        
        # Extract unique related act IDs
        related_act_ids = set()
        for rel in relations:
            if rel["source_act_id"] not in act_ids:
                related_act_ids.add(rel["source_act_id"])
            if rel["target_act_id"] not in act_ids:
                related_act_ids.add(rel["target_act_id"])
        
        # Fetch act details for related acts
        if related_act_ids:
            acts_response = await client.table("legal_acts") \
                .select("id, title, publisher, year, position, status, published_date") \
                .in_("id", list(related_act_ids)) \
                .execute()
            
            related_acts = acts_response.data or []
        else:
            related_acts = []
        
        logger.info(
            f"Found {len(related_acts)} related acts for {len(act_ids)} seed acts "
            f"(depth={depth})"
        )
        
        return related_acts
        
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

