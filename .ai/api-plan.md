# REST API Plan – PrawnikGPT

**Version:** 1.0 (MVP)  
**Last Updated:** 2025-11-19  
**Tech Stack:** FastAPI (Python), Supabase Auth, PostgreSQL + pgvector

---

## Table of Contents

1. [Overview](#1-overview)
2. [Resources](#2-resources)
3. [Endpoints](#3-endpoints)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Validation & Business Logic](#5-validation--business-logic)
6. [Error Handling](#6-error-handling)
7. [Rate Limiting](#7-rate-limiting)
8. [Performance Considerations](#8-performance-considerations)
9. [API Versioning](#9-api-versioning)

---

## 1. Overview

The PrawnikGPT REST API provides endpoints for:
- **User query submission** with RAG-powered responses (fast & accurate tiers)
- **Query history management** (read, delete)
- **Rating system** for response quality feedback
- **Legal acts information** (read-only metadata and search)
- **Onboarding support** (example questions)

**Base URL:** `http://localhost:8000/api/v1` (configurable via `PUBLIC_API_BASE_URL` env variable)

**Protocol:** HTTP/HTTPS  
**Data Format:** JSON  
**Authentication:** JWT tokens from Supabase Auth

---

## 2. Resources

| Resource | Database Table | Description | Access Level |
|----------|---------------|-------------|--------------|
| **Queries** | `query_history` | User questions and AI-generated responses (fast + accurate) | User-owned (RLS) |
| **Ratings** | `ratings` | User ratings for responses (thumbs up/down) | User-owned (RLS) |
| **Legal Acts** | `legal_acts` | Metadata of legal acts (20k Polish laws) | Public (read-only) |
| **Legal Act Chunks** | `legal_act_chunks` | Text fragments with embeddings (RAG) | Public (read-only, internal use) |
| **Legal Act Relations** | `legal_act_relations` | Relations between legal acts (modifies, repeals, etc.) | Public (read-only) |
| **Onboarding** | N/A | Static example questions for new users | Public (no auth) |

---

## 3. Endpoints

### 3.1. Health & Status

#### GET /health

**Description:** Health check endpoint for monitoring service availability.

**Authentication:** None

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-11-19T10:30:00Z",
  "services": {
    "database": "ok",
    "ollama": "ok",
    "supabase_auth": "ok"
  }
}
```

**Status Codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Service is degraded or down

---

### 3.2. Queries (User Questions & Responses)

#### POST /api/v1/queries

**Description:** Submit a new legal question. Generates a fast response (<15s) using smaller LLM model. Returns immediately with query ID and starts async generation.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "query_text": "Jakie są podstawowe prawa konsumenta w Polsce?"
}
```

**Validation:**
- `query_text`: string, required, length 10-1000 characters

**Response (202 Accepted):**
```json
{
  "query_id": "550e8400-e29b-41d4-a716-446655440000",
  "query_text": "Jakie są podstawowe prawa konsumenta w Polsce?",
  "status": "processing",
  "created_at": "2025-11-19T10:30:00Z",
  "fast_response": {
    "status": "pending",
    "estimated_time_seconds": 10
  }
}
```

**Response (after processing, via polling or WebSocket):**
```json
{
  "query_id": "550e8400-e29b-41d4-a716-446655440000",
  "query_text": "Jakie są podstawowe prawa konsumenta w Polsce?",
  "status": "completed",
  "created_at": "2025-11-19T10:30:00Z",
  "fast_response": {
    "status": "completed",
    "content": "Podstawowe prawa konsumenta w Polsce są określone w Ustawie o prawach konsumenta...",
    "model_name": "mistral:7b",
    "generation_time_ms": 8500,
    "sources": [
      {
        "act_title": "Ustawa o prawach konsumenta",
        "article": "Art. 5 ust. 1",
        "link": "/acts/dz-u/2023/1234#art-5",
        "chunk_id": "uuid-chunk-1"
      }
    ]
  },
  "accurate_response": null
}
```

**Status Codes:**
- `202 Accepted` - Query submitted, processing started
- `400 Bad Request` - Invalid input (e.g., text too short/long)
- `401 Unauthorized` - Missing or invalid JWT token
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error during processing

**Rate Limiting:**
- 10 queries/minute per user
- 30 queries/minute per IP

**Business Logic:**
1. Validate query length (10-1000 chars)
2. Generate embedding for query using OLLAMA embedding model
3. Perform similarity search in `legal_act_chunks` (top 10 results)
4. Fetch metadata from `legal_acts` for found chunks
5. Construct prompt with context (chunks + metadata)
6. Generate response using fast model (7B-13B)
7. Save to `query_history` table
8. Cache RAG context for 5 minutes (for potential accurate response request)

---

#### GET /api/v1/queries/{query_id}

**Description:** Retrieve a specific query with all responses (fast + accurate if available).

**Authentication:** Required (JWT, must own the query)

**Path Parameters:**
- `query_id`: UUID of the query

**Response (200 OK):**
```json
{
  "query_id": "550e8400-e29b-41d4-a716-446655440000",
  "query_text": "Jakie są podstawowe prawa konsumenta w Polsce?",
  "created_at": "2025-11-19T10:30:00Z",
  "fast_response": {
    "content": "Podstawowe prawa konsumenta...",
    "model_name": "mistral:7b",
    "generation_time_ms": 8500,
    "sources": [
      {
        "act_title": "Ustawa o prawach konsumenta",
        "article": "Art. 5 ust. 1",
        "link": "/acts/dz-u/2023/1234#art-5",
        "chunk_id": "uuid-chunk-1"
      }
    ],
    "rating": {
      "rating_id": "rating-uuid",
      "value": "up",
      "created_at": "2025-11-19T10:35:00Z"
    }
  },
  "accurate_response": null
}
```

**Status Codes:**
- `200 OK` - Query found
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Query belongs to another user
- `404 Not Found` - Query does not exist

---

#### GET /api/v1/queries

**Description:** Retrieve user's query history (chronological, newest first). Supports pagination.

**Authentication:** Required (JWT)

**Query Parameters:**
- `page` (optional): integer, default=1, min=1
- `per_page` (optional): integer, default=20, min=1, max=100
- `order` (optional): string, enum=['desc', 'asc'], default='desc' (newest first)

**Response (200 OK):**
```json
{
  "queries": [
    {
      "query_id": "550e8400-e29b-41d4-a716-446655440000",
      "query_text": "Jakie są podstawowe prawa konsumenta w Polsce?",
      "created_at": "2025-11-19T10:30:00Z",
      "fast_response": {
        "content": "Podstawowe prawa konsumenta...",
        "model_name": "mistral:7b",
        "generation_time_ms": 8500,
        "sources_count": 2,
        "rating": {
          "value": "up"
        }
      },
      "accurate_response": {
        "exists": true,
        "model_name": "gpt-oss:120b",
        "generation_time_ms": 120000,
        "rating": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_pages": 3,
    "total_count": 45
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid pagination parameters

**Business Logic:**
1. Fetch queries for authenticated user (RLS policy enforces ownership)
2. Order by `created_at DESC` by default
3. Include summary of ratings (if any)
4. Include flag if accurate response exists

---

#### DELETE /api/v1/queries/{query_id}

**Description:** Delete a query from user's history. Cascades to delete all associated ratings (per database schema).

**Authentication:** Required (JWT, must own the query)

**Path Parameters:**
- `query_id`: UUID of the query

**Response (204 No Content):**
No body returned.

**Status Codes:**
- `204 No Content` - Query successfully deleted
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Query belongs to another user
- `404 Not Found` - Query does not exist

**Business Logic:**
1. Verify user owns the query (RLS policy)
2. Delete from `query_history` table
3. Cascade delete from `ratings` table (handled by database constraint `ON DELETE CASCADE`)

---

#### POST /api/v1/queries/{query_id}/accurate-response

**Description:** Request a detailed, accurate response using the larger LLM model (120B). Uses cached RAG context from initial query (valid for 5 minutes). Timeout: 240 seconds.

**Authentication:** Required (JWT, must own the query)

**Path Parameters:**
- `query_id`: UUID of the query

**Request Body:** Empty (no body required)

**Response (202 Accepted):**
```json
{
  "query_id": "550e8400-e29b-41d4-a716-446655440000",
  "accurate_response": {
    "status": "processing",
    "estimated_time_seconds": 180
  }
}
```

**Response (after completion):**
```json
{
  "query_id": "550e8400-e29b-41d4-a716-446655440000",
  "accurate_response": {
    "status": "completed",
    "content": "Podstawowe prawa konsumenta w Polsce są szczegółowo określone w Ustawie o prawach konsumenta z dnia...",
    "model_name": "gpt-oss:120b",
    "generation_time_ms": 120000,
    "sources": [
      {
        "act_title": "Ustawa o prawach konsumenta",
        "article": "Art. 5 ust. 1",
        "link": "/acts/dz-u/2023/1234#art-5",
        "chunk_id": "uuid-chunk-1"
      }
    ]
  }
}
```

**Status Codes:**
- `202 Accepted` - Request accepted, processing started
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Query belongs to another user
- `404 Not Found` - Query does not exist
- `409 Conflict` - Accurate response already exists for this query
- `410 Gone` - RAG context expired (>5 minutes since query), re-submit query
- `504 Gateway Timeout` - Generation exceeded 240s timeout

**Business Logic:**
1. Check if accurate response already exists (return 409 if yes)
2. Retrieve cached RAG context (if expired, return 410)
3. Construct prompt with same context as fast response
4. Generate response using accurate model (gpt-oss:120b)
5. Update `query_history` table with accurate response
6. Timeout after 240 seconds (return 504)

---

### 3.3. Ratings (Response Feedback)

#### POST /api/v1/queries/{query_id}/ratings

**Description:** Create or update a rating for a specific response (fast or accurate). Idempotent - if rating exists, it will be updated.

**Authentication:** Required (JWT, must own the query)

**Path Parameters:**
- `query_id`: UUID of the query

**Request Body:**
```json
{
  "response_type": "fast",
  "rating_value": "up"
}
```

**Validation:**
- `response_type`: string, required, enum=['fast', 'accurate']
- `rating_value`: string, required, enum=['up', 'down']

**Response (200 OK for update, 201 Created for new rating):**
```json
{
  "rating_id": "rating-uuid-123",
  "query_id": "550e8400-e29b-41d4-a716-446655440000",
  "response_type": "fast",
  "rating_value": "up",
  "created_at": "2025-11-19T10:35:00Z",
  "updated_at": "2025-11-19T10:35:00Z"
}
```

**Status Codes:**
- `201 Created` - New rating created
- `200 OK` - Existing rating updated
- `400 Bad Request` - Invalid input (e.g., invalid enum value)
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Query belongs to another user
- `404 Not Found` - Query does not exist

**Business Logic:**
1. Verify query exists and user owns it (RLS policy)
2. Check if rating already exists for (query_id, user_id, response_type)
3. If exists: UPDATE rating_value and updated_at
4. If not exists: INSERT new rating
5. Return appropriate status code (200 vs 201)

---

#### GET /api/v1/queries/{query_id}/ratings

**Description:** Retrieve all ratings for a specific query (both fast and accurate responses). Used for analytics or UI display.

**Authentication:** Required (JWT, must own the query)

**Path Parameters:**
- `query_id`: UUID of the query

**Response (200 OK):**
```json
{
  "query_id": "550e8400-e29b-41d4-a716-446655440000",
  "ratings": [
    {
      "rating_id": "rating-uuid-123",
      "response_type": "fast",
      "rating_value": "up",
      "created_at": "2025-11-19T10:35:00Z",
      "updated_at": "2025-11-19T10:35:00Z"
    },
    {
      "rating_id": "rating-uuid-456",
      "response_type": "accurate",
      "rating_value": "up",
      "created_at": "2025-11-19T11:00:00Z",
      "updated_at": "2025-11-19T11:00:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success (may return empty array if no ratings)
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Query belongs to another user
- `404 Not Found` - Query does not exist

---

#### DELETE /api/v1/ratings/{rating_id}

**Description:** Delete a specific rating. Optional endpoint (may not be needed in MVP UI).

**Authentication:** Required (JWT, must own the rating)

**Path Parameters:**
- `rating_id`: UUID of the rating

**Response (204 No Content):**
No body returned.

**Status Codes:**
- `204 No Content` - Rating successfully deleted
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Rating belongs to another user
- `404 Not Found` - Rating does not exist

---

### 3.4. Legal Acts (Reference Data)

#### GET /api/v1/legal-acts

**Description:** List legal acts with optional filtering and search. Supports pagination. Public access (no auth required, but respects rate limits).

**Authentication:** Optional (for personalization, not required for MVP)

**Query Parameters:**
- `page` (optional): integer, default=1, min=1
- `per_page` (optional): integer, default=20, min=1, max=100
- `search` (optional): string, full-text search on title (min 3 chars)
- `status` (optional): string, enum=['obowiązująca', 'uchylona', 'nieobowiązująca']
- `publisher` (optional): string, filter by publisher (e.g., 'dz-u', 'mp')
- `year` (optional): integer, filter by year (e.g., 2023)
- `order_by` (optional): string, enum=['published_date', 'title'], default='published_date'
- `order` (optional): string, enum=['desc', 'asc'], default='desc'

**Response (200 OK):**
```json
{
  "legal_acts": [
    {
      "id": "act-uuid-123",
      "publisher": "dz-u",
      "year": 2023,
      "position": 1234,
      "title": "Ustawa o prawach konsumenta",
      "typ_aktu": "ustawa",
      "status": "obowiązująca",
      "organ_wydajacy": "Sejm RP",
      "published_date": "2023-06-15",
      "effective_date": "2023-07-01",
      "created_at": "2025-01-10T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_pages": 1000,
    "total_count": 20000
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters (e.g., search string too short)

**Business Logic:**
1. Apply filters (status, publisher, year)
2. If search query provided: use PostgreSQL full-text search on title (GIN index `idx_legal_acts_title_fts`)
3. Order by specified field and direction
4. Paginate results

---

#### GET /api/v1/legal-acts/{act_id}

**Description:** Retrieve detailed information about a specific legal act, including metadata.

**Authentication:** Optional

**Path Parameters:**
- `act_id`: UUID of the legal act

**Response (200 OK):**
```json
{
  "id": "act-uuid-123",
  "publisher": "dz-u",
  "year": 2023,
  "position": 1234,
  "title": "Ustawa o prawach konsumenta",
  "typ_aktu": "ustawa",
  "status": "obowiązująca",
  "organ_wydajacy": "Sejm RP",
  "published_date": "2023-06-15",
  "effective_date": "2023-07-01",
  "created_at": "2025-01-10T08:00:00Z",
  "updated_at": "2025-01-10T08:00:00Z",
  "stats": {
    "total_chunks": 45,
    "related_acts_count": 12
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Legal act does not exist

---

#### GET /api/v1/legal-acts/{act_id}/relations

**Description:** Retrieve all relations for a specific legal act (what it modifies, what modifies it, etc.). Supports depth parameter for graph traversal.

**Authentication:** Optional

**Path Parameters:**
- `act_id`: UUID of the legal act

**Query Parameters:**
- `depth` (optional): integer, default=1, min=1, max=2 (graph traversal depth)
- `relation_type` (optional): string, enum=['modifies', 'repeals', 'implements', 'based_on', 'amends'] (filter by type)

**Response (200 OK):**
```json
{
  "act_id": "act-uuid-123",
  "relations": {
    "outgoing": [
      {
        "relation_id": "rel-uuid-1",
        "target_act": {
          "id": "act-uuid-456",
          "title": "Kodeks cywilny",
          "publisher": "dz-u",
          "year": 1964,
          "position": 16,
          "status": "obowiązująca"
        },
        "relation_type": "modifies",
        "description": "Modyfikuje przepisy dotyczące konsumentów",
        "created_at": "2025-01-10T08:00:00Z"
      }
    ],
    "incoming": [
      {
        "relation_id": "rel-uuid-2",
        "source_act": {
          "id": "act-uuid-789",
          "title": "Ustawa o zmianie ustawy o prawach konsumenta",
          "publisher": "dz-u",
          "year": 2024,
          "position": 567,
          "status": "obowiązująca"
        },
        "relation_type": "amends",
        "description": "Zmienia przepisy ustawy o prawach konsumenta",
        "created_at": "2025-01-15T10:00:00Z"
      }
    ]
  },
  "depth": 1
}
```

**Status Codes:**
- `200 OK` - Success (may return empty arrays if no relations)
- `400 Bad Request` - Invalid parameters (e.g., depth > 2)
- `404 Not Found` - Legal act does not exist

**Business Logic:**
1. Fetch outgoing relations (source_act_id = act_id)
2. Fetch incoming relations (target_act_id = act_id)
3. If depth > 1: Recursively fetch relations for related acts (max depth 2 per DB plan)
4. Filter by relation_type if specified
5. Return structured graph data

---

### 3.5. Onboarding

#### GET /api/v1/onboarding/example-questions

**Description:** Retrieve a list of example questions for new users. Static content, no database query. Can be i18n in future.

**Authentication:** Optional (can be called before login)

**Response (200 OK):**
```json
{
  "examples": [
    {
      "id": 1,
      "question": "Jakie są podstawowe prawa konsumenta w Polsce?",
      "category": "consumer_rights"
    },
    {
      "id": 2,
      "question": "Co to jest przedawnienie w prawie cywilnym?",
      "category": "civil_law"
    },
    {
      "id": 3,
      "question": "Jakie są zasady zwrotu towaru kupionego online?",
      "category": "consumer_rights"
    },
    {
      "id": 4,
      "question": "Czym różni się umowa zlecenia od umowy o pracę?",
      "category": "labor_law"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success

**Business Logic:**
- Return hardcoded list of example questions (defined in code)
- Can be extended with database storage in future versions

---

## 4. Authentication & Authorization

### Authentication Mechanism

**Provider:** Supabase Auth  
**Method:** JWT (JSON Web Tokens)  
**Token Location:** `Authorization` header with `Bearer` scheme

**Example:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authentication Flow

1. **User Registration & Login:** Handled by Supabase Auth (frontend calls Supabase SDK directly)
   - Endpoint: `https://{SUPABASE_URL}/auth/v1/signup` (email/password)
   - Endpoint: `https://{SUPABASE_URL}/auth/v1/token?grant_type=password` (login)
   - Returns JWT token + refresh token

2. **API Request Authentication:**
   - Frontend includes JWT in `Authorization: Bearer {token}` header
   - FastAPI backend validates JWT using Supabase secret key
   - Backend extracts `user_id` from JWT payload (`sub` claim)
   - User ID is used in queries with RLS policies

3. **Token Refresh:**
   - Handled by Supabase SDK on frontend
   - Refresh tokens stored in localStorage/cookies

### Authorization (Row-Level Security)

**Database-Level Authorization:**
- All user-owned tables (`query_history`, `ratings`) have RLS policies
- Policies enforce `user_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE
- Backend uses Supabase SDK with user's JWT token (not service role key for user queries)

**API-Level Authorization:**
- Middleware validates JWT on every protected endpoint
- Extracts `user_id` from JWT
- Passes user context to Supabase client
- RLS policies automatically filter results

**Public Endpoints (No Auth Required):**
- `GET /health`
- `GET /api/v1/onboarding/example-questions`
- `GET /api/v1/legal-acts` (read-only reference data)
- `GET /api/v1/legal-acts/{act_id}`
- `GET /api/v1/legal-acts/{act_id}/relations`

**Protected Endpoints (Auth Required):**
- All `/api/v1/queries/*` endpoints
- All `/api/v1/ratings/*` endpoints

### Security Headers

**Required Request Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Response Security Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 5. Validation & Business Logic

### Input Validation Rules

#### Query Submission (`POST /api/v1/queries`)
- **query_text:**
  - Type: string
  - Required: yes
  - Min length: 10 characters
  - Max length: 1000 characters
  - Validation: Trim whitespace, reject empty/whitespace-only strings
  - Error: `400 Bad Request` with message "Query text must be between 10 and 1000 characters"

#### Rating Creation (`POST /api/v1/queries/{query_id}/ratings`)
- **response_type:**
  - Type: string
  - Required: yes
  - Enum: ['fast', 'accurate']
  - Error: `400 Bad Request` with message "Invalid response_type. Must be 'fast' or 'accurate'"

- **rating_value:**
  - Type: string
  - Required: yes
  - Enum: ['up', 'down']
  - Error: `400 Bad Request` with message "Invalid rating_value. Must be 'up' or 'down'"

#### Pagination Parameters (all list endpoints)
- **page:**
  - Type: integer
  - Default: 1
  - Min: 1
  - Error: `400 Bad Request` with message "Page must be >= 1"

- **per_page:**
  - Type: integer
  - Default: 20
  - Min: 1
  - Max: 100
  - Error: `400 Bad Request` with message "Per page must be between 1 and 100"

### Business Logic Implementation

#### RAG Pipeline (Query Submission)

**Step 1: Query Embedding Generation**
```python
# Generate embedding using OLLAMA embedding model
embedding = ollama.embeddings(
    model="nomic-embed-text",
    prompt=query_text
)
```

**Step 2: Similarity Search**
```sql
-- Find top 10 most similar chunks (cosine similarity)
SELECT 
  lac.id, lac.content, lac.metadata,
  la.title, la.publisher, la.year, la.position,
  (lac.embedding <=> $1::vector) AS distance
FROM legal_act_chunks lac
JOIN legal_acts la ON la.id = lac.legal_act_id
WHERE la.status = 'obowiązująca'
ORDER BY lac.embedding <=> $1::vector
LIMIT 10;
```

**Step 3: Context Construction**
- Combine retrieved chunks with metadata
- Format as structured prompt for LLM
- Include source references (act title, article number)

**Step 4: Fast Response Generation**
```python
# Generate fast response (7B-13B model)
response = ollama.generate(
    model="mistral:7b",
    prompt=constructed_prompt,
    timeout=15  # 15 second timeout
)
```

**Step 5: Context Caching**
- Cache RAG context (retrieved chunks) in Redis/memory for 5 minutes
- Key: `rag_context:{query_id}`
- Used for accurate response generation without re-searching

**Step 6: Database Storage**
```python
# Save to query_history table
supabase.table('query_history').insert({
    'user_id': user_id,
    'query_text': query_text,
    'fast_response_content': response.text,
    'fast_model_name': 'mistral:7b',
    'fast_generation_time_ms': response.generation_time,
    'sources': formatted_sources  # JSONB array
})
```

#### Accurate Response Generation

**Preconditions:**
1. Fast response must already exist (query_id valid)
2. RAG context must be cached (< 5 minutes old)
3. No accurate response exists yet

**Process:**
```python
# 1. Retrieve cached context
context = cache.get(f"rag_context:{query_id}")
if not context:
    raise ContextExpiredError()  # 410 Gone

# 2. Generate accurate response (120B model)
response = ollama.generate(
    model="gpt-oss:120b",
    prompt=context.prompt,
    timeout=240  # 240 second timeout
)

# 3. Update query_history with accurate response
supabase.table('query_history').update({
    'accurate_response_content': response.text,
    'accurate_model_name': 'gpt-oss:120b',
    'accurate_generation_time_ms': response.generation_time
}).eq('id', query_id).execute()
```

#### Rating Upsert Logic

**Idempotent Rating Creation/Update:**
```python
# Check if rating exists
existing_rating = supabase.table('ratings').select('*').match({
    'query_history_id': query_id,
    'user_id': user_id,
    'response_type': response_type
}).execute()

if existing_rating.data:
    # Update existing rating
    result = supabase.table('ratings').update({
        'rating_value': rating_value,
        'updated_at': 'now()'
    }).eq('id', existing_rating.data[0]['id']).execute()
    status_code = 200  # OK
else:
    # Insert new rating
    result = supabase.table('ratings').insert({
        'query_history_id': query_id,
        'user_id': user_id,
        'response_type': response_type,
        'rating_value': rating_value
    }).execute()
    status_code = 201  # Created
```

#### Query Deletion (Cascade)

**Database Constraint Handles Cascade:**
```sql
-- Defined in database schema (ON DELETE CASCADE)
-- When query is deleted, all ratings are automatically deleted
DELETE FROM query_history WHERE id = $1 AND user_id = $2;
-- Ratings are cascade-deleted by PostgreSQL constraint
```

#### Empty Results Handling

**When RAG finds no relevant chunks:**
```python
if similarity_results.distance > threshold:  # e.g., 0.8
    # Return predefined message
    return {
        "content": "Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu. Aktualnie dysponuję informacjami o 20 000 najnowszych ustaw.",
        "sources": [],
        "is_fallback": true
    }
```

---

## 6. Error Handling

### Standard Error Response Format

All errors return consistent JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query text must be between 10 and 1000 characters",
    "details": {
      "field": "query_text",
      "value_length": 5,
      "min_length": 10,
      "max_length": 1000
    },
    "timestamp": "2025-11-19T10:30:00Z",
    "request_id": "req-uuid-123"
  }
}
```

### Error Codes and Status Codes

| HTTP Status | Error Code | Description | Example |
|-------------|------------|-------------|---------|
| 400 | `VALIDATION_ERROR` | Invalid input data | Query text too short |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token | No Authorization header |
| 403 | `FORBIDDEN` | Insufficient permissions | Trying to access another user's query |
| 404 | `NOT_FOUND` | Resource does not exist | Query ID not found |
| 409 | `CONFLICT` | Resource state conflict | Accurate response already exists |
| 410 | `GONE` | Resource expired | RAG context cache expired (>5 min) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests | 10 queries/min per user exceeded |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error | Database connection failed |
| 503 | `SERVICE_UNAVAILABLE` | External service unavailable | OLLAMA server down |
| 504 | `GATEWAY_TIMEOUT` | Upstream timeout | LLM generation exceeded 240s |

### Error Handling for LLM Generation

**Fast Response Timeout (15s):**
```json
{
  "error": {
    "code": "GENERATION_TIMEOUT",
    "message": "Fast response generation exceeded 15 seconds. Please try again.",
    "details": {
      "timeout_seconds": 15,
      "model": "mistral:7b"
    }
  }
}
```
Status: `504 Gateway Timeout`

**Accurate Response Timeout (240s):**
```json
{
  "error": {
    "code": "GENERATION_TIMEOUT",
    "message": "Accurate response generation exceeded 240 seconds. Please try again later.",
    "details": {
      "timeout_seconds": 240,
      "model": "gpt-oss:120b"
    }
  }
}
```
Status: `504 Gateway Timeout`

**OLLAMA Service Unavailable:**
```json
{
  "error": {
    "code": "LLM_SERVICE_UNAVAILABLE",
    "message": "AI model service is currently unavailable. Please try again later.",
    "details": {
      "service": "OLLAMA",
      "host": "http://localhost:11434"
    }
  }
}
```
Status: `503 Service Unavailable`

### Validation Error Details

**Example: Query Text Too Short**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query text must be between 10 and 1000 characters",
    "details": {
      "field": "query_text",
      "value": "Short",
      "constraints": {
        "min_length": 10,
        "max_length": 1000,
        "actual_length": 5
      }
    }
  }
}
```
Status: `400 Bad Request`

---

## 7. Rate Limiting

### Rate Limit Configuration

**Per-User Limits (Authenticated):**
- **Query submission:** 10 requests/minute per user
- **Accurate response requests:** 5 requests/minute per user
- **Other endpoints:** 60 requests/minute per user

**Per-IP Limits (All Traffic):**
- **Query submission:** 30 requests/minute per IP
- **Other endpoints:** 100 requests/minute per IP

### Rate Limit Headers

**Included in all responses:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1637328000
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please wait before making another request.",
    "details": {
      "limit": 10,
      "window_seconds": 60,
      "retry_after_seconds": 45
    }
  }
}
```

**Status:** `429 Too Many Requests`

**Headers:**
```
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1637328045
```

### Implementation Strategy

**Backend (FastAPI):**
```python
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/v1/queries")
@limiter.limit("10/minute")
async def submit_query(request: Request, ...):
    # Endpoint logic
```

**Storage:** Redis (for distributed rate limiting)

---

## 8. Performance Considerations

### Response Time SLAs

| Endpoint | Target Latency (p95) | Timeout |
|----------|---------------------|---------|
| POST /api/v1/queries (fast) | <15 seconds | 15s |
| POST /api/v1/queries/{id}/accurate-response | <240 seconds | 240s |
| GET /api/v1/queries | <200ms | 5s |
| GET /api/v1/queries/{id} | <100ms | 5s |
| DELETE /api/v1/queries/{id} | <100ms | 5s |
| POST /api/v1/queries/{id}/ratings | <100ms | 5s |
| GET /api/v1/legal-acts | <200ms | 5s |
| GET /api/v1/legal-acts/{id} | <100ms | 5s |

### Caching Strategy

**RAG Context Cache:**
- **Key:** `rag_context:{query_id}`
- **TTL:** 5 minutes
- **Storage:** Redis or in-memory (for MVP)
- **Purpose:** Reuse similarity search results for accurate response generation

**Example Questions Cache:**
- **Key:** `onboarding:example_questions`
- **TTL:** 1 hour (static content)
- **Storage:** Redis or in-memory

**Legal Acts Metadata (Optional):**
- **Key:** `legal_act:{act_id}`
- **TTL:** 1 hour
- **Storage:** Redis
- **Purpose:** Reduce database load for frequently accessed acts

### Database Query Optimization

**Critical Indexes Used:**
- `idx_query_history_user_id` - Fast user history queries
- `idx_query_history_created_at` - Chronological sorting
- `idx_legal_act_chunks_embedding_ivfflat` - Similarity search (RAG)
- `idx_legal_acts_title_fts` - Full-text search on titles
- `idx_ratings_query_history_id` - Fast rating lookups

**Connection Pooling:**
- Use Supabase SDK connection pooling (default)
- Max connections: 20-50 (configurable)
- Connection timeout: 10 seconds

### Async Processing

**Background Tasks (FastAPI):**
- Use `BackgroundTasks` for non-critical operations
- Example: Logging, analytics events

**Async LLM Generation:**
- Use `asyncio` for parallel processing
- Prevents blocking FastAPI event loop
- Timeout handling with `asyncio.wait_for()`

---

## 9. API Versioning

### Versioning Strategy

**URL-Based Versioning:**
- All endpoints prefixed with `/api/v1/`
- Version is part of the URL path
- Example: `http://localhost:8000/api/v1/queries`

**Version Lifecycle:**
- **v1 (current):** MVP version, stable API contract
- **v2 (future):** Breaking changes will be released as new version
- **Deprecation:** v1 will be maintained for at least 12 months after v2 release

### Breaking vs Non-Breaking Changes

**Non-Breaking Changes (Allowed in v1):**
- Adding new optional query parameters
- Adding new fields to response bodies
- Adding new endpoints
- Adding new enum values (with backward compatibility)

**Breaking Changes (Requires v2):**
- Removing or renaming endpoints
- Removing or renaming fields in request/response
- Changing validation rules (stricter)
- Changing authentication mechanism
- Removing enum values

### Version Negotiation

**Default Version:**
- If no version specified in URL, redirect to latest stable (v1)

**Deprecated Version Warning Header:**
```
X-API-Deprecated: true
X-API-Deprecated-Version: v1
X-API-Latest-Version: v2
X-API-Sunset-Date: 2026-12-31
```

---

## 10. OpenAPI Documentation

### Auto-Generated Documentation

**FastAPI Automatic Documentation:**
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

### Pydantic Models for Type Safety

**Example Request/Response Models:**

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class QuerySubmitRequest(BaseModel):
    query_text: str = Field(
        ..., 
        min_length=10, 
        max_length=1000,
        description="User's legal question in natural language"
    )

class SourceReference(BaseModel):
    act_title: str
    article: str
    link: str
    chunk_id: str

class FastResponse(BaseModel):
    content: str
    model_name: str
    generation_time_ms: int
    sources: List[SourceReference]

class QueryResponse(BaseModel):
    query_id: str
    query_text: str
    created_at: datetime
    fast_response: Optional[FastResponse]
    accurate_response: Optional[FastResponse]

class RatingCreateRequest(BaseModel):
    response_type: Literal["fast", "accurate"]
    rating_value: Literal["up", "down"]
```

---

## 11. Testing & Monitoring

### API Testing Strategy

**Unit Tests (pytest):**
- Test individual endpoint handlers
- Mock Supabase and OLLAMA clients
- Test validation logic

**Integration Tests:**
- Test with local Supabase (test database)
- Test with local OLLAMA (test models)
- Test rate limiting behavior
- Test authentication flow

**Load Tests:**
- Use Locust or k6 for load testing
- Target: 100 concurrent users
- Monitor: response times, error rates, resource usage

### Monitoring & Logging

**Key Metrics to Track:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (by endpoint, by error code)
- LLM generation time (fast vs accurate)
- Cache hit rate (RAG context)
- Rate limit hits

**Logging Format (JSON):**
```json
{
  "timestamp": "2025-11-19T10:30:00Z",
  "level": "INFO",
  "request_id": "req-uuid-123",
  "user_id": "user-uuid-456",
  "endpoint": "POST /api/v1/queries",
  "status_code": 202,
  "response_time_ms": 12500,
  "message": "Query submitted successfully"
}
```

**Alerting Thresholds:**
- Error rate > 5% (alert)
- Response time p95 > 20s for fast queries (alert)
- OLLAMA service unavailable (critical alert)
- Database connection failures (critical alert)

---

## 12. Future Enhancements (Post-MVP)

**Potential API Extensions:**

1. **WebSocket Support for Real-Time Responses:**
   - `ws://localhost:8000/api/v1/queries/stream`
   - Stream LLM tokens as they're generated
   - Better UX for long responses

2. **Batch Query Submission:**
   - `POST /api/v1/queries/batch`
   - Submit multiple queries at once
   - Useful for bulk analysis

3. **Query Search in History:**
   - `GET /api/v1/queries/search?q=konsument`
   - Full-text search in user's history

4. **Export to PDF/DOCX:**
   - `GET /api/v1/queries/{id}/export?format=pdf`
   - Generate formatted document with query + response

5. **Shared Queries:**
   - `POST /api/v1/queries/{id}/share`
   - Generate public link for sharing
   - New table: `shared_queries`

6. **Admin Analytics API:**
   - `GET /api/v1/admin/stats`
   - Aggregate metrics for quality monitoring
   - Requires admin role

7. **User Preferences:**
   - `GET/PUT /api/v1/users/me/preferences`
   - Store UI preferences (theme, language, default model)
   - New table: `user_profiles`

---

**End of Document** • REST API Plan v1.0 MVP • PrawnikGPT • 2025-11-19
