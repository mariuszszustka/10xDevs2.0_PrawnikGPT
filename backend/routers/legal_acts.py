"""
PrawnikGPT Backend - Legal Acts Endpoints

API endpoints for legal acts (reference data):
- GET /api/v1/legal-acts - List legal acts (with filters and search)
- GET /api/v1/legal-acts/{act_id} - Get legal act details
- GET /api/v1/legal-acts/{act_id}/relations - Get act relations (graph)

These are public endpoints (no authentication required).
Used for browsing available legal acts and understanding act relationships.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Query

from backend.models.legal_act import (
    LegalActListResponse,
    LegalActListItem,
    LegalActDetailResponse,
    LegalActRelationsResponse,
    LegalActStats,
    OutgoingRelation,
    IncomingRelation,
    LegalActReference,
    PaginationMetadata,
    LegalActStatus
)
from backend.db.legal_acts import (
    list_legal_acts as db_list_legal_acts,
    get_legal_act_by_id,
    get_legal_act_relations as db_get_relations
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/legal-acts",
    tags=["legal-acts"]
)


# =========================================================================
# GET /api/v1/legal-acts - List Legal Acts
# =========================================================================

@router.get(
    "",
    response_model=LegalActListResponse,
    summary="List legal acts",
    description="""
    Get paginated list of legal acts with optional filters.
    
    Public endpoint (no authentication required).
    
    Filters:
    - search: Full-text search in title (optional)
    - status: Filter by status (obowiazujacy, uchylony, zastapiony)
    - publisher: Filter by publisher (e.g., 'Dz.U.')
    - year: Filter by publication year
    
    Sorting:
    - order_by: 'published_date' or 'title'
    - order: 'desc' (newest/Z-A) or 'asc' (oldest/A-Z)
    
    Pagination:
    - Default: page=1, per_page=20
    - Max per_page: 100
    
    Performance:
    - Results cached for better performance
    - Full-text search uses PostgreSQL tsvector
    """,
    responses={
        200: {"description": "Legal acts retrieved successfully"},
        422: {"description": "Invalid parameters"}
    }
)
async def list_legal_acts(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in title"),
    status: Optional[LegalActStatus] = Query(None, description="Filter by status"),
    publisher: Optional[str] = Query(None, description="Filter by publisher"),
    year: Optional[int] = Query(None, ge=1918, le=2100, description="Filter by year"),
    order_by: str = Query("published_date", description="Sort by field"),
    order: str = Query("desc", description="Sort order")
):
    """
    List legal acts with filters and pagination.
    
    Args:
        page: Page number
        per_page: Items per page
        search: Search query (title)
        status: Status filter
        publisher: Publisher filter
        year: Year filter
        order_by: Sort field
        order: Sort direction
        
    Returns:
        LegalActListResponse: Paginated list of legal acts
    """
    try:
        # Validation
        if order_by not in ("published_date", "title"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="order_by must be 'published_date' or 'title'"
            )
        if order not in ("desc", "asc"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="order must be 'desc' or 'asc'"
            )
        
        # Fetch from database
        acts_data, total_count = await db_list_legal_acts(
            page=page,
            per_page=per_page,
            search=search,
            status=status,
            publisher=publisher,
            year=year,
            order_by=order_by,
            order=order
        )
        
        # Transform to response format
        legal_acts = [
            LegalActListItem(
                id=act["id"],
                title=act["title"],
                typ_aktu=act["typ_aktu"] if "typ_aktu" in act else act.get("act_type", "ustawa"),
                publisher=act["publisher"],
                year=act["year"],
                position=act["position"] if "position" in act else act.get("number", 0),
                status=act["status"],
                organ_wydajacy=act.get("organ_wydajacy"),
                published_date=act["published_date"],
                effective_date=act.get("effective_date"),
                created_at=act["created_at"]
            )
            for act in acts_data
        ]
        
        # Calculate pagination metadata
        total_pages = (total_count + per_page - 1) // per_page
        
        logger.info(
            f"Listed {len(legal_acts)} legal acts (page={page}/{total_pages}, "
            f"total={total_count}) with filters: search={search}, status={status}, "
            f"publisher={publisher}, year={year}"
        )
        
        return LegalActListResponse(
            legal_acts=legal_acts,
            pagination=PaginationMetadata(
                page=page,
                per_page=per_page,
                total_pages=total_pages,
                total_count=total_count
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list legal acts: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve legal acts"
        )


# =========================================================================
# GET /api/v1/legal-acts/{act_id} - Get Legal Act Details
# =========================================================================

@router.get(
    "/{act_id}",
    response_model=LegalActDetailResponse,
    summary="Get legal act details",
    description="""
    Get detailed information about a specific legal act.
    
    Public endpoint (no authentication required).
    
    Returns:
    - Full act metadata (title, publisher, year, etc.)
    - Status and dates
    - Statistics (total chunks, related acts count)
    - Updated timestamp
    
    Useful for:
    - Browsing act details
    - Understanding act structure
    - Checking act status and validity
    """,
    responses={
        200: {"description": "Legal act details retrieved"},
        404: {"description": "Legal act not found"}
    }
)
async def get_legal_act(act_id: str):
    """
    Get detailed information about a legal act.
    
    Args:
        act_id: Legal act ID (UUID)
        
    Returns:
        LegalActDetailResponse: Act details with statistics
    """
    try:
        # Fetch from database
        act_data = await get_legal_act_by_id(act_id)
        
        if not act_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Legal act not found"
            )
        
        # Transform to response format
        response = LegalActDetailResponse(
            id=act_data["id"],
            title=act_data["title"],
            typ_aktu=act_data["typ_aktu"],
            publisher=act_data["publisher"],
            year=act_data["year"],
            position=act_data["position"],
            status=act_data["status"],
            organ_wydajacy=act_data.get("organ_wydajacy"),
            published_date=act_data["published_date"],
            effective_date=act_data.get("effective_date"),
            stats=LegalActStats(
                total_chunks=act_data["stats"]["total_chunks"],
                related_acts_count=act_data["stats"]["related_acts_count"]
            ),
            updated_at=act_data["updated_at"],
            created_at=act_data["created_at"]
        )
        
        logger.info(f"Retrieved legal act {act_id}: {act_data['title']}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get legal act {act_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve legal act"
        )


# =========================================================================
# GET /api/v1/legal-acts/{act_id}/relations - Get Relations
# =========================================================================

@router.get(
    "/{act_id}/relations",
    response_model=LegalActRelationsResponse,
    summary="Get legal act relations",
    description="""
    Get related legal acts (graph structure).
    
    Public endpoint (no authentication required).
    
    Returns bidirectional relations:
    - Outgoing: Acts affected by this act (this → others)
    - Incoming: Acts affecting this act (others → this)
    
    Query parameters:
    - depth: Graph traversal depth (1 or 2)
    - relation_type: Filter by type (optional)
      - modifies: Act modifies another
      - repeals: Act repeals another
      - implements: Act implements another
      - based_on: Act is based on another
      - amends: Act amends another
    
    Use cases:
    - Understanding act dependencies
    - Finding related legislation
    - Tracking legislative changes
    """,
    responses={
        200: {"description": "Relations retrieved"},
        404: {"description": "Legal act not found"},
        422: {"description": "Invalid parameters"}
    }
)
async def get_legal_act_relations(
    act_id: str,
    depth: int = Query(1, ge=1, le=2, description="Graph traversal depth"),
    relation_type: Optional[str] = Query(None, description="Filter by relation type")
):
    """
    Get relations for a legal act (graph structure).
    
    Args:
        act_id: Legal act ID (UUID)
        depth: Traversal depth (1-2)
        relation_type: Optional relation type filter
        
    Returns:
        LegalActRelationsResponse: Bidirectional relations
    """
    try:
        # Validation
        if relation_type and relation_type not in (
            "modifies", "repeals", "implements", "based_on", "amends"
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid relation_type"
            )
        
        # Fetch relations from database
        relations_data = await db_get_relations(act_id, depth, relation_type)
        
        # Transform outgoing relations
        outgoing = [
            OutgoingRelation(
                relation_id=r["id"],
                target_act=LegalActReference(
                    id=r["target_act"]["id"],
                    title=r["target_act"]["title"],
                    typ_aktu=r["target_act"]["typ_aktu"] if "typ_aktu" in r["target_act"] else r["target_act"].get("act_type", "ustawa"),
                    status=r["target_act"]["status"]
                ),
                relation_type=r["relation_type"],
                description=r.get("article_reference") or "",
                created_at=r["created_at"]
            )
            for r in relations_data["outgoing"]
        ]
        
        # Transform incoming relations
        incoming = [
            IncomingRelation(
                relation_id=r["id"],
                source_act=LegalActReference(
                    id=r["source_act"]["id"],
                    title=r["source_act"]["title"],
                    typ_aktu=r["source_act"]["typ_aktu"] if "typ_aktu" in r["source_act"] else r["source_act"].get("act_type", "ustawa"),
                    status=r["source_act"]["status"]
                ),
                relation_type=r["relation_type"],
                description=r.get("article_reference") or "",
                created_at=r["created_at"]
            )
            for r in relations_data["incoming"]
        ]
        
        logger.info(
            f"Retrieved relations for act {act_id}: "
            f"{len(outgoing)} outgoing, {len(incoming)} incoming (depth={depth})"
        )
        
        return LegalActRelationsResponse(
            act_id=act_id,
            relations={
                "outgoing": outgoing,
                "incoming": incoming
            },
            depth=depth
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get relations for act {act_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve relations"
        )

