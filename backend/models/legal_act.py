"""
PrawnikGPT Backend - Legal Act Models

Pydantic models for legal acts endpoints:
- GET /api/v1/legal-acts (list with filters and pagination)
- GET /api/v1/legal-acts/{act_id} (details with statistics)
- GET /api/v1/legal-acts/{act_id}/relations (relations graph)

These models mirror the TypeScript types in src/lib/types.ts for type consistency.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional, List
from datetime import datetime


# =========================================================================
# TYPE ALIASES AND ENUMS
# =========================================================================

LegalActStatus = Literal["obowiazujacy", "uchylony", "zastapiony"]
RelationType = Literal["zmienia", "uchyla", "zastepuje", "powoluje_sie"]


# =========================================================================
# SHARED COMPONENTS
# =========================================================================

class PaginationMetadata(BaseModel):
    """
    Pagination metadata for list responses.
    """
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1, le=100)
    total_pages: int = Field(..., ge=0)
    total_count: int = Field(..., ge=0)


class LegalActStats(BaseModel):
    """
    Statistics for a legal act.
    
    Calculated at query time, not stored in database.
    Used in detail view to show act's impact.
    """
    total_chunks: int = Field(
        ...,
        ge=0,
        description="Number of text chunks for this act"
    )
    related_acts_count: int = Field(
        ...,
        ge=0,
        description="Number of related acts (via relations)"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "total_chunks": 145,
                "related_acts_count": 23
            }
        }
    }


class LegalActReference(BaseModel):
    """
    Simplified legal act reference (used in relations).
    
    Subset of fields for embedding in relation responses
    without full act details.
    """
    id: str = Field(
        ...,
        description="Act ID (UUID)"
    )
    title: str = Field(
        ...,
        description="Full title of legal act"
    )
    publisher: str = Field(
        ...,
        description="Publisher (e.g., 'Dz.U.')"
    )
    year: int = Field(
        ...,
        ge=1918,
        le=2100,
        description="Publication year"
    )
    position: int = Field(
        ...,
        ge=1,
        description="Position number in publisher's journal"
    )
    status: LegalActStatus = Field(
        ...,
        description="Current status of the act"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "title": "Ustawa z dnia 23 kwietnia 1964 r. - Kodeks cywilny",
                "publisher": "Dz.U.",
                "year": 1964,
                "position": 16,
                "status": "obowiazujacy"
            }
        }
    }


# =========================================================================
# LIST MODELS
# =========================================================================

class LegalActListItem(BaseModel):
    """
    Legal act summary for list view.
    
    GET /api/v1/legal-acts
    
    Derived from legal_acts table, excludes internal timestamps.
    """
    id: str = Field(
        ...,
        description="Act ID (UUID)"
    )
    publisher: str = Field(
        ...,
        description="Publisher (e.g., 'Dz.U.', 'M.P.')"
    )
    year: int = Field(
        ...,
        ge=1918,
        le=2100,
        description="Publication year"
    )
    position: int = Field(
        ...,
        ge=1,
        description="Position number"
    )
    title: str = Field(
        ...,
        min_length=1,
        description="Full title of legal act"
    )
    typ_aktu: str = Field(
        ...,
        description="Type of act (ustawa, rozporzadzenie, etc.)"
    )
    status: LegalActStatus = Field(
        ...,
        description="Current status"
    )
    organ_wydajacy: Optional[str] = Field(
        None,
        description="Issuing authority (optional)"
    )
    published_date: datetime = Field(
        ...,
        description="Publication date"
    )
    effective_date: Optional[datetime] = Field(
        None,
        description="Effective date (if different from publication)"
    )
    created_at: datetime = Field(
        ...,
        description="When record was created in database"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "publisher": "Dz.U.",
                "year": 1964,
                "position": 16,
                "title": "Ustawa z dnia 23 kwietnia 1964 r. - Kodeks cywilny",
                "typ_aktu": "Ustawa",
                "status": "obowiazujacy",
                "organ_wydajacy": "Sejm RP",
                "published_date": "1964-04-23T00:00:00Z",
                "effective_date": "1964-01-01T00:00:00Z",
                "created_at": "2025-01-01T00:00:00Z"
            }
        }
    }


class LegalActListResponse(BaseModel):
    """
    Paginated list of legal acts.
    
    GET /api/v1/legal-acts
    
    Supports filtering by:
    - search (full-text in title)
    - status
    - publisher
    - year
    - order_by (published_date, title)
    - order (asc, desc)
    """
    legal_acts: List[LegalActListItem] = Field(
        ...,
        description="List of legal acts for current page"
    )
    pagination: PaginationMetadata = Field(
        ...,
        description="Pagination metadata"
    )


# =========================================================================
# DETAIL MODELS
# =========================================================================

class LegalActDetailResponse(LegalActListItem):
    """
    Legal act detail view with statistics.
    
    GET /api/v1/legal-acts/{act_id}
    
    Extends LegalActListItem with:
    - updated_at timestamp
    - stats (chunks count, relations count)
    """
    updated_at: datetime = Field(
        ...,
        description="When record was last updated"
    )
    stats: LegalActStats = Field(
        ...,
        description="Act statistics"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "publisher": "Dz.U.",
                "year": 1964,
                "position": 16,
                "title": "Ustawa z dnia 23 kwietnia 1964 r. - Kodeks cywilny",
                "typ_aktu": "Ustawa",
                "status": "obowiazujacy",
                "organ_wydajacy": "Sejm RP",
                "published_date": "1964-04-23T00:00:00Z",
                "effective_date": "1964-01-01T00:00:00Z",
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-15T00:00:00Z",
                "stats": {
                    "total_chunks": 145,
                    "related_acts_count": 23
                }
            }
        }
    }


# =========================================================================
# RELATIONS MODELS
# =========================================================================

class OutgoingRelation(BaseModel):
    """
    Outgoing relation (this act affects another).
    
    Example: Act A zmienia Act B → from A's perspective, this is outgoing
    """
    relation_id: str = Field(
        ...,
        description="Relation ID (UUID)"
    )
    target_act: LegalActReference = Field(
        ...,
        description="The act being affected"
    )
    relation_type: RelationType = Field(
        ...,
        description="Type of relation"
    )
    description: str = Field(
        ...,
        description="Human-readable description of relation"
    )
    created_at: datetime = Field(
        ...,
        description="When relation was established"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "relation_id": "rel_123e4567",
                "target_act": {
                    "id": "target_123",
                    "title": "Ustawa o podatku dochodowym",
                    "publisher": "Dz.U.",
                    "year": 1991,
                    "position": 80,
                    "status": "obowiazujacy"
                },
                "relation_type": "zmienia",
                "description": "Niniejsza ustawa zmienia ustawę o podatku dochodowym",
                "created_at": "2025-01-01T00:00:00Z"
            }
        }
    }


class IncomingRelation(BaseModel):
    """
    Incoming relation (another act affects this one).
    
    Example: Act A zmienia Act B → from B's perspective, this is incoming
    """
    relation_id: str = Field(
        ...,
        description="Relation ID (UUID)"
    )
    source_act: LegalActReference = Field(
        ...,
        description="The act causing the effect"
    )
    relation_type: RelationType = Field(
        ...,
        description="Type of relation"
    )
    description: str = Field(
        ...,
        description="Human-readable description of relation"
    )
    created_at: datetime = Field(
        ...,
        description="When relation was established"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "relation_id": "rel_789e4567",
                "source_act": {
                    "id": "source_789",
                    "title": "Ustawa o zmianie ustawy o podatku dochodowym",
                    "publisher": "Dz.U.",
                    "year": 2020,
                    "position": 123,
                    "status": "obowiazujacy"
                },
                "relation_type": "zmienia",
                "description": "Niniejsza ustawa została zmieniona",
                "created_at": "2020-05-01T00:00:00Z"
            }
        }
    }


class LegalActRelations(BaseModel):
    """
    Relations container (outgoing + incoming).
    """
    outgoing: List[OutgoingRelation] = Field(
        ...,
        description="Relations where this act affects others"
    )
    incoming: List[IncomingRelation] = Field(
        ...,
        description="Relations where others affect this act"
    )


class LegalActRelationsResponse(BaseModel):
    """
    Response for legal act relations (graph structure).
    
    GET /api/v1/legal-acts/{act_id}/relations
    
    Query parameters:
    - depth: 1-2 (graph traversal depth)
    - relation_type: optional filter by relation type
    
    Returns bidirectional relations (outgoing + incoming) with
    specified depth of graph traversal.
    """
    act_id: str = Field(
        ...,
        description="ID of the act"
    )
    relations: LegalActRelations = Field(
        ...,
        description="Bidirectional relations"
    )
    depth: int = Field(
        ...,
        ge=1,
        le=2,
        description="Depth of graph traversal used"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "act_id": "123e4567-e89b-12d3-a456-426614174000",
                "relations": {
                    "outgoing": [
                        {
                            "relation_id": "rel_123",
                            "target_act": {
                                "id": "target_123",
                                "title": "Ustawa docelowa",
                                "publisher": "Dz.U.",
                                "year": 2020,
                                "position": 100,
                                "status": "obowiazujacy"
                            },
                            "relation_type": "zmienia",
                            "description": "Niniejsza ustawa zmienia...",
                            "created_at": "2020-01-01T00:00:00Z"
                        }
                    ],
                    "incoming": [
                        {
                            "relation_id": "rel_456",
                            "source_act": {
                                "id": "source_456",
                                "title": "Ustawa źródłowa",
                                "publisher": "Dz.U.",
                                "year": 2019,
                                "position": 50,
                                "status": "obowiazujacy"
                            },
                            "relation_type": "powoluje_sie",
                            "description": "Powołuje się na niniejszą ustawę",
                            "created_at": "2019-06-01T00:00:00Z"
                        }
                    ]
                },
                "depth": 1
            }
        }
    }

