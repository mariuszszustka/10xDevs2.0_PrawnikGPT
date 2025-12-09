/**
 * PrawnikGPT - DTO & Command Models
 * 
 * This file contains all Data Transfer Objects (DTOs) and Command Models
 * used for API communication. All types are derived from database models
 * defined in database.types.ts to ensure type safety across the stack.
 * 
 * @see database.types.ts for base entity types
 * @see .ai/api-plan.md for API endpoint specifications
 */

import type { Database, Tables, Enums } from "./database.types";

// =============================================================================
// BASE TYPES & ENUMS (derived from database)
// =============================================================================

/**
 * Type aliases for database enums to improve readability
 */
export type LegalActStatus = Enums<"legal_act_status_enum">;
export type RatingValue = Enums<"rating_value_enum">;
export type ResponseType = Enums<"response_type_enum">;
export type RelationType = Enums<"relation_type_enum">;

/**
 * Base entity types from database
 */
export type LegalActEntity = Tables<"legal_acts">;
export type LegalActChunkEntity = Tables<"legal_act_chunks">;
export type QueryHistoryEntity = Tables<"query_history">;
export type RatingEntity = Tables<"ratings">;

// =============================================================================
// SHARED DTO COMPONENTS
// =============================================================================

/**
 * Pagination metadata for list responses
 * Used across all paginated endpoints
 */
export interface PaginationMetadata {
  page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
}

/**
 * Source reference for legal act citations in responses
 * Links response content back to specific legal act articles
 */
export interface SourceReference {
  act_title: string;
  article: string;
  link: string;
  chunk_id: string;
}

/**
 * Rating summary embedded in responses
 * Simplified version without full rating details
 */
export interface RatingSummary {
  value: RatingValue;
}

/**
 * Rating summary with ID for detailed views
 */
export interface RatingDetail extends RatingSummary {
  rating_id: string;
  created_at: string;
}

// =============================================================================
// QUERY-RELATED DTOs
// =============================================================================

/**
 * Command: Submit a new legal query
 * POST /api/v1/queries
 * 
 * @validation query_text: 10-1000 characters, required
 */
export interface QuerySubmitRequest {
  query_text: string;
}

/**
 * Response status for async query processing
 */
export type QueryProcessingStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Fast response structure (nested in query responses)
 * Represents the quick answer from smaller LLM model
 */
export interface FastResponseData {
  content: string;
  model_name: string;
  generation_time_ms: number;
  sources: SourceReference[];
  rating?: RatingDetail;
}

/**
 * Accurate response structure (nested in query responses)
 * Represents the detailed answer from larger LLM model
 */
export interface AccurateResponseData {
  content: string;
  model_name: string;
  generation_time_ms: number;
  sources: SourceReference[];
  rating?: RatingDetail;
}

/**
 * Response: Initial query submission (202 Accepted)
 * POST /api/v1/queries
 * 
 * Returned immediately when query is submitted, before processing completes
 */
export interface QuerySubmitResponse {
  query_id: string;
  query_text: string;
  status: QueryProcessingStatus;
  created_at: string;
  fast_response: {
    status: QueryProcessingStatus;
    estimated_time_seconds: number;
  };
}

/**
 * Response: Completed query with fast response
 * POST /api/v1/queries (after processing)
 * GET /api/v1/queries/{query_id}
 * 
 * Full query details with all responses (fast + accurate if available)
 */
export interface QueryDetailResponse {
  query_id: string;
  query_text: string;
  status: QueryProcessingStatus;
  created_at: string;
  fast_response: {
    status: QueryProcessingStatus;
    content?: string;
    model_name?: string;
    generation_time_ms?: number;
    sources?: SourceReference[];
    rating?: RatingDetail;
  };
  accurate_response: {
    status: QueryProcessingStatus;
    content?: string;
    model_name?: string;
    generation_time_ms?: number;
    sources?: SourceReference[];
    rating?: RatingDetail;
  } | null;
}

/**
 * Query list item (summary view for history)
 * GET /api/v1/queries
 * 
 * Simplified query representation for list views
 */
export interface QueryListItem {
  query_id: string;
  query_text: string;
  created_at: string;
  fast_response: {
    content: string;
    model_name: string;
    generation_time_ms: number;
    sources_count: number;
    rating?: RatingSummary;
  };
  accurate_response: {
    exists: boolean;
    model_name?: string;
    generation_time_ms?: number;
    rating?: RatingSummary;
  } | null;
}

/**
 * Response: Query list with pagination
 * GET /api/v1/queries
 */
export interface QueryListResponse {
  queries: QueryListItem[];
  pagination: PaginationMetadata;
}

/**
 * Response: Accurate response request accepted
 * POST /api/v1/queries/{query_id}/accurate-response
 * 
 * Initial response (202 Accepted)
 */
export interface AccurateResponseSubmitResponse {
  query_id: string;
  accurate_response: {
    status: QueryProcessingStatus;
    estimated_time_seconds: number;
  };
}

/**
 * Response: Completed accurate response
 * POST /api/v1/queries/{query_id}/accurate-response (after completion)
 */
export interface AccurateResponseCompletedResponse {
  query_id: string;
  accurate_response: {
    status: QueryProcessingStatus;
    content: string;
    model_name: string;
    generation_time_ms: number;
    sources: SourceReference[];
  };
}

// =============================================================================
// RATING-RELATED DTOs
// =============================================================================

/**
 * Command: Create or update a rating
 * POST /api/v1/queries/{query_id}/ratings
 * 
 * @validation response_type: 'fast' | 'accurate'
 * @validation rating_value: 'up' | 'down'
 * 
 * Idempotent operation - creates new rating or updates existing one
 */
export interface RatingCreateRequest {
  response_type: ResponseType;
  rating_value: RatingValue;
}

/**
 * Response: Created or updated rating
 * POST /api/v1/queries/{query_id}/ratings
 * 
 * Status code indicates operation:
 * - 201 Created: New rating created
 * - 200 OK: Existing rating updated
 */
export interface RatingResponse {
  rating_id: string;
  query_id: string;
  response_type: ResponseType;
  rating_value: RatingValue;
  created_at: string;
  updated_at: string;
}

/**
 * Response: List of ratings for a query
 * GET /api/v1/queries/{query_id}/ratings
 * 
 * Returns all ratings (fast + accurate) for the specified query
 */
export interface RatingListResponse {
  query_id: string;
  ratings: RatingResponse[];
}

// =============================================================================
// LEGAL ACTS DTOs
// =============================================================================

/**
 * Legal act summary (list view)
 * GET /api/v1/legal-acts
 * 
 * Derived from legal_acts table, excludes internal timestamps
 */
export interface LegalActListItem {
  id: string;
  publisher: string;
  year: number;
  position: number;
  title: string;
  typ_aktu: string;
  status: LegalActStatus;
  organ_wydajacy: string | null;
  published_date: string;
  effective_date: string | null;
  created_at: string;
}

/**
 * Response: Legal acts list with pagination
 * GET /api/v1/legal-acts
 */
export interface LegalActListResponse {
  legal_acts: LegalActListItem[];
  pagination: PaginationMetadata;
}

/**
 * Statistics for a legal act
 * Calculated at query time, not stored in database
 */
export interface LegalActStats {
  total_chunks: number;
  related_acts_count: number;
}

/**
 * Legal act detail view with statistics
 * GET /api/v1/legal-acts/{act_id}
 * 
 * Extends LegalActListItem with additional stats and updated_at
 */
export interface LegalActDetailResponse extends LegalActListItem {
  updated_at: string;
  stats: LegalActStats;
}

/**
 * Simplified legal act reference (used in relations)
 * Subset of fields for embedding in relation responses
 */
export interface LegalActReference {
  id: string;
  title: string;
  publisher: string;
  year: number;
  position: number;
  status: LegalActStatus;
}

/**
 * Outgoing relation (this act affects another)
 */
export interface OutgoingRelation {
  relation_id: string;
  target_act: LegalActReference;
  relation_type: RelationType;
  description: string;
  created_at: string;
}

/**
 * Incoming relation (another act affects this one)
 */
export interface IncomingRelation {
  relation_id: string;
  source_act: LegalActReference;
  relation_type: RelationType;
  description: string;
  created_at: string;
}

/**
 * Response: Legal act relations (graph structure)
 * GET /api/v1/legal-acts/{act_id}/relations
 * 
 * @query depth: 1-2 (graph traversal depth)
 * @query relation_type: optional filter by relation type
 */
export interface LegalActRelationsResponse {
  act_id: string;
  relations: {
    outgoing: OutgoingRelation[];
    incoming: IncomingRelation[];
  };
  depth: number;
}

// =============================================================================
// ONBOARDING DTOs
// =============================================================================

/**
 * Example question for new users
 * Static content, not stored in database (MVP)
 */
export interface ExampleQuestion {
  id: number;
  question: string;
  category: "consumer_rights" | "civil_law" | "labor_law" | "criminal_law";
}

/**
 * Response: List of example questions
 * GET /api/v1/onboarding/example-questions
 */
export interface ExampleQuestionsResponse {
  examples: ExampleQuestion[];
}

// =============================================================================
// HEALTH CHECK DTOs
// =============================================================================

/**
 * Service health status
 */
export type ServiceStatus = "ok" | "degraded" | "down";

/**
 * Response: System health check
 * GET /health
 */
export interface HealthResponse {
  status: ServiceStatus;
  version: string;
  timestamp: string;
  services: {
    database: ServiceStatus;
    ollama: ServiceStatus;
    supabase_auth: ServiceStatus;
  };
}

// =============================================================================
// ERROR HANDLING DTOs
// =============================================================================

/**
 * Standard error codes used across API
 */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "GONE"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_SERVER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT"
  | "GENERATION_TIMEOUT"
  | "LLM_SERVICE_UNAVAILABLE";

/**
 * Error details object (flexible structure)
 */
export type ErrorDetails = Record<string, unknown>;

/**
 * Response: Standard error format
 * Returned for all error conditions (4xx, 5xx)
 */
export interface ErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ErrorDetails;
    timestamp: string;
    request_id?: string;
  };
}

// =============================================================================
// QUERY PARAMETERS (for type-safe API calls)
// =============================================================================

/**
 * Query parameters for listing queries
 * GET /api/v1/queries
 */
export interface QueryListParams {
  page?: number;
  per_page?: number;
  order?: "desc" | "asc";
}

/**
 * Query parameters for listing legal acts
 * GET /api/v1/legal-acts
 */
export interface LegalActListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: LegalActStatus;
  publisher?: string;
  year?: number;
  order_by?: "published_date" | "title";
  order?: "desc" | "asc";
}

/**
 * Query parameters for legal act relations
 * GET /api/v1/legal-acts/{act_id}/relations
 */
export interface LegalActRelationsParams {
  depth?: 1 | 2;
  relation_type?: RelationType;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Generic API response wrapper for consistent handling
 */
export type ApiResponse<T> = Promise<T>;

/**
 * Generic API error for consistent error handling
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: ApiErrorCode,
    public details?: ErrorDetails,
    public requestId?: string
  ) {
    super(`API Error: ${errorCode}`);
    this.name = "ApiError";
  }
}

// =============================================================================
// AUTH-RELATED TYPES (Login/Register Forms)
// =============================================================================

/**
 * Login form data DTO
 * Used for user authentication via Supabase Auth
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Login form validation errors
 * ViewModel for displaying validation errors in UI
 */
export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

/**
 * Login form component props
 */
export interface LoginFormProps {
  redirectTo?: string;
  showExpiredMessage?: boolean;
}

/**
 * Register form data DTO
 * Used for user registration via Supabase Auth
 */
export interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
}

/**
 * Register form validation errors
 * ViewModel for displaying validation errors in UI
 */
export interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  acceptTerms?: string;
  general?: string;
}

/**
 * Register form component props
 */
export interface RegisterFormProps {
  redirectTo?: string;
}

/**
 * Password strength type for password strength indicator
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong';

