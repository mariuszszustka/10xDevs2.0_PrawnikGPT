"""
PrawnikGPT Backend - Pydantic Models Package

This package contains all Pydantic models (DTOs) used for request/response
validation throughout the API.

Models are organized by domain:
- health.py: Health check models
- query.py: Query-related models (requests, responses)
- rating.py: Rating models
- legal_act.py: Legal act models
- onboarding.py: Onboarding models
- error.py: Error response models
"""

# Health Check Models
from backend.models.health import (
    ServiceStatus,
    ServiceHealthStatus,
    HealthResponse,
)

# Error Models
from backend.models.error import (
    ApiErrorCode,
    ErrorDetail,
    ErrorResponse,
    create_error_response,
)

# Query Models
from backend.models.query import (
    QueryProcessingStatus,
    ResponseType,
    SourceReference,
    RatingSummary,
    RatingDetail,
    PaginationMetadata,
    QuerySubmitRequest,
    QuerySubmitResponse,
    QueryDetailResponse,
    QueryListItem,
    QueryListResponse,
    FastResponseData,
    AccurateResponseData,
    AccurateResponseSubmitResponse,
    AccurateResponseCompletedResponse,
)

# Rating Models
from backend.models.rating import (
    RatingValue,
    RatingCreateRequest,
    RatingResponse,
    RatingListResponse,
)

# Legal Act Models
from backend.models.legal_act import (
    LegalActStatus,
    RelationType,
    LegalActStats,
    LegalActReference,
    LegalActListItem,
    LegalActListResponse,
    LegalActDetailResponse,
    OutgoingRelation,
    IncomingRelation,
    LegalActRelations,
    LegalActRelationsResponse,
)

# Onboarding Models
from backend.models.onboarding import (
    QuestionCategory,
    ExampleQuestion,
    ExampleQuestionsResponse,
)

__all__ = [
    # Health
    "ServiceStatus",
    "ServiceHealthStatus",
    "HealthResponse",
    # Errors
    "ApiErrorCode",
    "ErrorDetail",
    "ErrorResponse",
    "create_error_response",
    # Query
    "QueryProcessingStatus",
    "ResponseType",
    "SourceReference",
    "RatingSummary",
    "RatingDetail",
    "PaginationMetadata",
    "QuerySubmitRequest",
    "QuerySubmitResponse",
    "QueryDetailResponse",
    "QueryListItem",
    "QueryListResponse",
    "FastResponseData",
    "AccurateResponseData",
    "AccurateResponseSubmitResponse",
    "AccurateResponseCompletedResponse",
    # Rating
    "RatingValue",
    "RatingCreateRequest",
    "RatingResponse",
    "RatingListResponse",
    # Legal Act
    "LegalActStatus",
    "RelationType",
    "LegalActStats",
    "LegalActReference",
    "LegalActListItem",
    "LegalActListResponse",
    "LegalActDetailResponse",
    "OutgoingRelation",
    "IncomingRelation",
    "LegalActRelations",
    "LegalActRelationsResponse",
    # Onboarding
    "QuestionCategory",
    "ExampleQuestion",
    "ExampleQuestionsResponse",
]
