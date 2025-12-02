"""
PrawnikGPT Backend - Legal Acts Repository

Database operations for legal acts:
- List legal acts with filters and pagination
- Get legal act details by ID
- Get legal act relations (graph traversal)
- Full-text search in act titles

All queries are optimized for performance with proper indexes.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from backend.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


# =========================================================================
# List Legal Acts (with filters and pagination)
# =========================================================================

async def list_legal_acts(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    publisher: Optional[str] = None,
    year: Optional[int] = None,
    order_by: str = "published_date",
    order: str = "desc"
) -> tuple[List[Dict[str, Any]], int]:
    """
    List legal acts with filters and pagination.
    
    Args:
        page: Page number (1-indexed)
        per_page: Items per page (max 100)
        search: Search query for title (optional)
        status: Filter by status (optional)
        publisher: Filter by publisher (optional)
        year: Filter by publication year (optional)
        order_by: Sort field (published_date or title)
        order: Sort direction (desc or asc)
        
    Returns:
        Tuple of (list of acts, total count)
        
    Raises:
        Exception: If database query fails
    """
    try:
        supabase = get_supabase()
        
        # Build query
        query = supabase.table("legal_acts").select(
            "id, title, typ_aktu, publisher, year, position, "
            "status, organ_wydajacy, published_date, effective_date, created_at",
            count="exact"
        )
        
        # Apply filters
        if search:
            # Use RPC for efficient full-text search
            query = query.rpc("search_legal_acts", {"p_search_query": search})
        
        if status:
            query = query.eq("status", status)
        
        if publisher:
            query = query.eq("publisher", publisher)
        
        if year:
            query = query.eq("year", year)
        
        # Apply sorting
        ascending = (order == "asc")
        query = query.order(order_by, desc=not ascending)
        
        # Apply pagination
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)
        
        # Execute query
        response = query.execute()
        
        acts = response.data or []
        total_count = response.count or 0
        
        logger.info(
            f"Listed {len(acts)} legal acts (page {page}, total {total_count}) "
            f"with filters: search={search}, status={status}, "
            f"publisher={publisher}, year={year}"
        )
        
        return acts, total_count
        
    except Exception as e:
        logger.error(f"Failed to list legal acts: {e}", exc_info=True)
        raise


# =========================================================================
# Get Legal Act by ID
# =========================================================================

async def get_legal_act_by_id(act_id: str) -> Optional[Dict[str, Any]]:
    """
    Get legal act details by ID.
    
    Args:
        act_id: Legal act ID (UUID)
        
    Returns:
        Act data dict or None if not found
        
    Raises:
        Exception: If database query fails
    """
    try:
        supabase = get_supabase()
        
        # Query act with related data
        response = supabase.table("legal_acts").select(
            "id, title, typ_aktu, publisher, year, position, "
            "status, organ_wydajacy, published_date, effective_date, "
            "updated_at, created_at"
        ).eq("id", act_id).single().execute()
        
        act = response.data
        
        if not act:
            logger.warning(f"Legal act not found: {act_id}")
            return None
        
        # Get statistics (chunks count)
        chunks_response = supabase.table("legal_act_chunks")\
            .select("id", count="exact")\
            .eq("legal_act_id", act_id)\
            .execute()
        
        total_chunks = chunks_response.count or 0
        
        # Get related acts count
        relations_response = supabase.table("legal_act_relations")\
            .select("id", count="exact")\
            .or_(f"source_act_id.eq.{act_id},target_act_id.eq.{act_id}")\
            .execute()
        
        related_acts_count = relations_response.count or 0
        
        # Add statistics to response
        act["stats"] = {
            "total_chunks": total_chunks,
            "related_acts_count": related_acts_count
        }
        
        logger.info(f"Retrieved legal act {act_id}: {act.get('title', 'N/A')}")
        
        return act
        
    except Exception as e:
        logger.error(f"Failed to get legal act {act_id}: {e}", exc_info=True)
        raise


# =========================================================================
# Get Legal Act Relations (Graph Traversal)
# =========================================================================

async def get_legal_act_relations(
    act_id: str,
    depth: int = 1,
    relation_type: Optional[str] = None
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get legal act relations using graph traversal.
    
    Args:
        act_id: Legal act ID (UUID)
        depth: Traversal depth (1 or 2)
        relation_type: Optional filter by relation type
        
    Returns:
        Dict with 'outgoing' and 'incoming' relations
        
    Raises:
        Exception: If database query fails
    """
    try:
        supabase = get_supabase()
        
        # Outgoing relations (this act → others)
        outgoing_query = supabase.table("legal_act_relations").select(
            "id, target_act_id, relation_type, article_reference, created_at, "
            "target_act:legal_acts!target_act_id(id, title, typ_aktu, status)"
        ).eq("source_act_id", act_id)
        
        if relation_type:
            outgoing_query = outgoing_query.eq("relation_type", relation_type)
        
        outgoing_response = outgoing_query.execute()
        outgoing = outgoing_response.data or []
        
        # Incoming relations (others → this act)
        incoming_query = supabase.table("legal_act_relations").select(
            "id, source_act_id, relation_type, article_reference, created_at, "
            "source_act:legal_acts!source_act_id(id, title, typ_aktu, status)"
        ).eq("target_act_id", act_id)
        
        if relation_type:
            incoming_query = incoming_query.eq("relation_type", relation_type)
        
        incoming_response = incoming_query.execute()
        incoming = incoming_response.data or []
        
        # If depth=2, fetch second-level relations
        if depth == 2:
            # Get IDs of directly related acts
            outgoing_ids = [r["target_act_id"] for r in outgoing]
            incoming_ids = [r["source_act_id"] for r in incoming]
            
            # Fetch second-level outgoing relations
            if outgoing_ids:
                second_outgoing_query = supabase.table("legal_act_relations").select(
                    "id, source_act_id, target_act_id, relation_type, article_reference, created_at, "
                    "target_act:legal_acts!target_act_id(id, title, typ_aktu, status)"
                ).in_("source_act_id", outgoing_ids)
                
                if relation_type:
                    second_outgoing_query = second_outgoing_query.eq("relation_type", relation_type)
                
                second_outgoing_response = second_outgoing_query.execute()
                # Append to outgoing (mark as second-level in practice)
                # For simplicity, we append to the same list
                outgoing.extend(second_outgoing_response.data or [])
            
            # Fetch second-level incoming relations
            if incoming_ids:
                second_incoming_query = supabase.table("legal_act_relations").select(
                    "id, source_act_id, target_act_id, relation_type, article_reference, created_at, "
                    "source_act:legal_acts!source_act_id(id, title, typ_aktu, status)"
                ).in_("target_act_id", incoming_ids)
                
                if relation_type:
                    second_incoming_query = second_incoming_query.eq("relation_type", relation_type)
                
                second_incoming_response = second_incoming_query.execute()
                incoming.extend(second_incoming_response.data or [])
        
        logger.info(
            f"Retrieved relations for act {act_id}: "
            f"{len(outgoing)} outgoing, {len(incoming)} incoming (depth={depth})"
        )
        
        return {
            "outgoing": outgoing,
            "incoming": incoming
        }
        
    except Exception as e:
        logger.error(f"Failed to get relations for act {act_id}: {e}", exc_info=True)
        raise


# =========================================================================
# Search Legal Acts (Full-text)
# =========================================================================

async def search_legal_acts(
    query: str,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """
    Full-text search in legal act titles.
    
    Args:
        query: Search query
        limit: Maximum results
        
    Returns:
        List of matching acts
        
    Raises:
        Exception: If database query fails
    """
    try:
        supabase = get_supabase()
        
        # Simple ILIKE search for MVP
        # In production, use PostgreSQL tsvector/tsquery for better performance
        response = supabase.table("legal_acts").select(
            "id, title, typ_aktu, publisher, year, position, status"
        ).ilike("title", f"%{query}%").limit(limit).execute()
        
        acts = response.data or []
        
        logger.info(f"Search for '{query}' returned {len(acts)} results")
        
        return acts
        
    except Exception as e:
        logger.error(f"Failed to search legal acts: {e}", exc_info=True)
        raise

