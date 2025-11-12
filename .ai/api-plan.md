# REST API Plan – PrawnikGPT (FastAPI)

## 1. Resources (Zasoby)

- **Users (Użytkownicy)**
  - *Database Table*: `auth.users` (zarządzany przez Supabase Auth)
  - Operacje: rejestracja, logowanie, wylogowanie, usuwanie konta

- **Queries (Zapytania użytkownika)**
  - *Database Table*: `queries`
  - Przechowuje pytania użytkowników wraz z metadanymi (timestamp, user_id)

- **Responses (Odpowiedzi)**
  - *Database Table*: `responses`
  - Przechowuje odpowiedzi LLM (szybkie i dokładne) powiązane z zapytaniami
  - Fields: `id`, `query_id`, `response_type` (fast/detailed), `content`, `model_name`, `generation_time_ms`, `sources` (JSON), `created_at`

- **Ratings (Oceny odpowiedzi)**
  - *Database Table*: `ratings`
  - Przechowuje oceny użytkowników (thumbs up/down) dla odpowiedzi
  - Fields: `id`, `response_id`, `user_id`, `rating` (up/down), `created_at`

- **Legal Acts (Akty prawne)** - Read-only w MVP
  - *Database Table*: `legal_acts`
  - Metadane aktów prawnych (tytuł, data publikacji, status, organ wydający)

- **Legal Act Chunks (Fragmenty aktów)** - Read-only w MVP
  - *Database Table*: `legal_act_chunks`
  - Fragmenty tekstowe z embeddingami dla RAG

- **Legal Act Relations (Powiązania aktów)** - Read-only w MVP
  - *Database Table*: `legal_act_relations`
  - Graf relacji między aktami (modifies, repeals, implements)

---

## 2. Endpoints (Punkty końcowe API)

### 2.1. Authentication (Uwierzytelnianie) - Supabase Auth

**Note:** Autentykacja obsługiwana przez Supabase Auth SDK. Poniższe endpointy są opcjonalne (można używać bezpośrednio Supabase client w Astro).

- **POST `/auth/register`** *(opcjonalny wrapper)*
  - **Description**: Rejestracja nowego użytkownika
  - **Request JSON**:
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123"
    }
    ```
  - **Response JSON**:
    ```json
    {
      "user": { "id": "uuid", "email": "user@example.com" },
      "session": { "access_token": "jwt_token", "refresh_token": "..." }
    }
    ```
  - **Errors**: 400 (email already exists), 422 (validation error)

- **POST `/auth/login`** *(opcjonalny wrapper)*
  - **Description**: Logowanie użytkownika
  - **Request JSON**:
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123"
    }
    ```
  - **Response JSON**: Same as register
  - **Errors**: 401 (invalid credentials), 422 (validation error)

- **POST `/auth/logout`** *(opcjonalny wrapper)*
  - **Description**: Wylogowanie użytkownika (invalidate token)
  - **Headers**: `Authorization: Bearer <jwt_token>`
  - **Response**: 204 No Content

---

### 2.2. Queries (Zapytania) - Główna funkcjonalność

- **POST `/queries`**
  - **Description**: Wysłanie pytania i otrzymanie szybkiej odpowiedzi (<15s)
  - **Headers**: `Authorization: Bearer <jwt_token>`
  - **Request JSON**:
    ```json
    {
      "question": "Jakie są podstawowe prawa konsumenta?"
    }
    ```
  - **Business Logic**:
    1. Walidacja: `question` musi mieć 10-1000 znaków
    2. Konwersja pytania na embedding (OLLAMA embedding model)
    3. Similarity search w `legal_act_chunks` (pgvector cosine similarity)
    4. Pobieranie metadanych z `legal_acts` i relacji z `legal_act_relations`
    5. Konstruowanie promptu dla LLM (context + question)
    6. Generowanie odpowiedzi przez mniejszy model (7B-13B) - **timeout 15s**
    7. Parsowanie źródeł (tytuł aktu + artykuł) z odpowiedzi LLM
    8. Zapis zapytania do `queries` i odpowiedzi do `responses`
    9. **Cachowanie kontekstu RAG na 5 minut** (Redis lub memory cache)
  - **Response JSON**:
    ```json
    {
      "query_id": 123,
      "question": "Jakie są podstawowe prawa konsumenta?",
      "response": {
        "id": 456,
        "response_type": "fast",
        "content": "Podstawowe prawa konsumenta obejmują...",
        "sources": [
          {
            "act_title": "Ustawa o prawach konsumenta",
            "article": "Art. 5 ust. 1",
            "link": "/acts/dz-u/2023/1234"
          }
        ],
        "model_name": "mistral:7b",
        "generation_time_ms": 8234
      },
      "created_at": "2025-01-15T10:30:00Z"
    }
    ```
  - **Errors**:
    - 400: Invalid question (too short/long)
    - 404: No relevant legal acts found (similarity score < threshold)
    - 408: Request timeout (>15s for fast response)
    - 500: LLM service error, database error
    - 401: Unauthorized (invalid/missing JWT)

- **POST `/queries/{query_id}/detailed-response`**
  - **Description**: Żądanie dokładniejszej odpowiedzi dla istniejącego zapytania
  - **Headers**: `Authorization: Bearer <jwt_token>`
  - **Business Logic**:
    1. Sprawdzenie, czy `query_id` należy do użytkownika (RLS)
    2. Pobranie cachowanego kontekstu RAG (jeśli < 5 min) lub regeneracja
    3. Generowanie odpowiedzi przez większy model (gpt-oss:120b) - **timeout 240s**
    4. Zapis drugiej odpowiedzi do `responses` (response_type: 'detailed')
  - **Response JSON**:
    ```json
    {
      "response": {
        "id": 789,
        "response_type": "detailed",
        "content": "Szczegółowa analiza praw konsumenta...",
        "sources": [...],
        "model_name": "gpt-oss:120b",
        "generation_time_ms": 187234
      }
    }
    ```
  - **Errors**:
    - 404: Query not found or doesn't belong to user
    - 408: Request timeout (>240s)
    - 409: Detailed response already exists for this query
    - 500: LLM service error
    - 401: Unauthorized

- **GET `/queries`**
  - **Description**: Pobranie historii zapytań użytkownika (chronologicznie, od najnowszych)
  - **Headers**: `Authorization: Bearer <jwt_token>`
  - **Query Parameters**:
    - `page` (default: 1)
    - `limit` (default: 20, max: 100)
  - **Response JSON**:
    ```json
    {
      "queries": [
        {
          "id": 123,
          "question": "Jakie są podstawowe prawa konsumenta?",
          "created_at": "2025-01-15T10:30:00Z",
          "responses": [
            {
              "id": 456,
              "response_type": "fast",
              "content": "...",
              "sources": [...],
              "rating": { "user_rating": "up" }
            },
            {
              "id": 789,
              "response_type": "detailed",
              "content": "...",
              "sources": [...],
              "rating": { "user_rating": null }
            }
          ]
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 156,
        "has_more": true
      }
    }
    ```
  - **Errors**: 401 Unauthorized

- **GET `/queries/{query_id}`**
  - **Description**: Pobranie szczegółów pojedynczego zapytania
  - **Headers**: `Authorization: Bearer <jwt_token>`
  - **Response JSON**: Single query object (same structure as above)
  - **Errors**: 404 Not Found, 401 Unauthorized

- **DELETE `/queries/{query_id}`**
  - **Description**: Usunięcie zapytania z historii (kaskadowo usuwa responses i ratings)
  - **Headers**: `Authorization: Bearer <jwt_token>`
  - **Response**: 204 No Content
  - **Errors**: 404 Not Found, 401 Unauthorized

---

### 2.3. Ratings (Oceny odpowiedzi)

- **POST `/responses/{response_id}/ratings`**
  - **Description**: Dodanie lub aktualizacja oceny odpowiedzi (thumbs up/down)
  - **Headers**: `Authorization: Bearer <jwt_token>`
  - **Request JSON**:
    ```json
    {
      "rating": "up"  // "up" or "down"
    }
    ```
  - **Business Logic**:
    - Sprawdzenie, czy response należy do użytkownika (przez query_id)
    - Upsert: jeśli rating już istnieje, aktualizuj; jeśli nie, utwórz nowy
  - **Response JSON**:
    ```json
    {
      "rating": {
        "id": 999,
        "response_id": 456,
        "rating": "up",
        "created_at": "2025-01-15T10:35:00Z"
      }
    }
    ```
  - **Errors**:
    - 400: Invalid rating value (must be "up" or "down")
    - 404: Response not found
    - 401: Unauthorized

- **DELETE `/responses/{response_id}/ratings`**
  - **Description**: Usunięcie oceny odpowiedzi (opcjonalne w MVP)
  - **Headers**: `Authorization: Bearer <jwt_token>`
  - **Response**: 204 No Content
  - **Errors**: 404 Not Found, 401 Unauthorized

---

### 2.4. Legal Acts (Akty prawne) - Read-only (opcjonalne w MVP)

- **GET `/legal-acts`**
  - **Description**: Pobranie listy aktów prawnych z filtrowaniem
  - **Query Parameters**:
    - `search` (full-text search w tytule)
    - `year` (rok publikacji)
    - `type` (typ aktu: ustawa, rozporządzenie, etc.)
    - `page`, `limit`
  - **Response JSON**:
    ```json
    {
      "legal_acts": [
        {
          "id": 1,
          "title": "Ustawa o prawach konsumenta",
          "publisher": "dz-u",
          "year": 2023,
          "position": 1234,
          "type": "ustawa",
          "status": "obowiązująca",
          "published_date": "2023-06-15"
        }
      ],
      "pagination": {...}
    }
    ```
  - **Errors**: None (public endpoint)

- **GET `/legal-acts/{act_id}`**
  - **Description**: Pobranie szczegółów aktu prawnego
  - **Response JSON**: Single legal_act object + related acts
  - **Errors**: 404 Not Found

---

## 3. Authentication and Authorization (Uwierzytelnianie i Autoryzacja)

### Mechanism
- **Token-based authentication** using Supabase Auth (JWT)
- JWT token przechowywany w cookies (HttpOnly, Secure) lub localStorage
- Token dołączany do każdego żądania w nagłówku `Authorization: Bearer <token>`

### Authorization Flow
1. User logs in → Supabase Auth returns JWT
2. Frontend (Astro) stores JWT in cookies
3. Every API call includes JWT in Authorization header
4. FastAPI middleware validates JWT using Supabase public key
5. FastAPI extracts `user_id` from JWT payload
6. Database-level RLS ensures user can only access their own data

### Row-Level Security (RLS) Policies
- **queries table**: `user_id = auth.uid()`
- **responses table**: via JOIN with queries table
- **ratings table**: via JOIN with responses → queries
- **legal_acts, legal_act_chunks, legal_act_relations**: Public read access (no RLS needed)

---

## 4. Validation and Business Logic (Walidacja i Logika Biznesowa)

### Validation Rules

#### Queries
- `question`: 10-1000 characters, required, must contain at least one Polish word
- Rate limiting: Max 10 queries per minute per user (prevent abuse)

#### Ratings
- `rating`: Must be "up" or "down", required
- User can rate each response only once (upsert pattern)

#### Detailed Response
- Can only request if fast response already exists
- Subsequent requests return cached detailed response (idempotent)
- Cache context for 5 minutes to avoid re-running RAG

### Business Logic Implementation

#### RAG Pipeline (Retrieval-Augmented Generation)
1. **Embedding Generation**:
   - Input: user question
   - Model: nomic-embed-text or mxbai-embed-large (OLLAMA)
   - Output: 768-dim vector

2. **Similarity Search**:
   - Query: `SELECT * FROM legal_act_chunks ORDER BY embedding <=> query_embedding LIMIT 10`
   - Threshold: cosine similarity > 0.7 (configurable)
   - Fallback: If no results, return "out of scope" message

3. **Context Construction**:
   - Fetch metadata for matched chunks from `legal_acts`
   - Fetch relations from `legal_act_relations` (breadth-first, max depth 2)
   - Format context as prompt:
     ```
     Kontekst prawny:
     [Akt 1: Tytuł, Art. X]
     [Treść fragmentu 1]

     [Akt 2: Tytuł, Art. Y]
     [Treść fragmentu 2]

     Pytanie: {user_question}

     Odpowiedz na pytanie w języku polskim, bazując wyłącznie na podanym kontekście.
     Na końcu wymień źródła w formacie: [Tytuł aktu, Art. X]
     ```

4. **LLM Generation**:
   - Fast model (7B-13B): timeout 15s, temperature 0.3
   - Detailed model (120B): timeout 240s, temperature 0.5
   - Streaming response (opcjonalnie dla lepszego UX)

5. **Response Parsing**:
   - Extract sources using regex: `\[(.*?), (Art\. \d+.*?)\]`
   - Generate clickable links: `/acts/{publisher}/{year}/{position}#{article}`
   - Store structured sources as JSON in database

#### Context Caching Strategy
- **Key**: `rag_context:{query_id}`
- **Value**: JSON with retrieved chunks + metadata
- **TTL**: 5 minutes (300 seconds)
- **Storage**: Redis (production) or in-memory dict (development)
- **Purpose**: Reuse context when user requests detailed response

#### Error Handling
- **LLM timeout**: Retry once, then return 408 with friendly message
- **No relevant acts found**: Return 404 with informative message ("Moja baza wiedzy jest ograniczona do 20k najnowszych ustaw")
- **OLLAMA service down**: Return 503 with retry-after header
- **Database errors**: Log to Sentry, return 500 with generic message

---

## 5. Performance Considerations

### Caching
- RAG context: 5 minutes (as specified)
- Legal acts metadata: 1 hour (rarely changes)
- Embeddings: permanent (stored in database)

### Rate Limiting
- Per user: 10 queries/minute (prevent abuse)
- Per IP: 30 queries/minute (unauthenticated endpoints)
- Use Redis for distributed rate limiting

### Async Processing
- All OLLAMA calls are async (FastAPI native async/await)
- Use background tasks for logging/analytics (non-blocking)

### Database Optimization
- Index on `legal_act_chunks.embedding` (IVFFlat or HNSW for pgvector)
- Index on `queries.user_id`, `queries.created_at` (for history pagination)
- Index on `responses.query_id` (for fast lookups)

---

## 6. API Documentation

### Auto-generated with FastAPI
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### Example Request (curl)

**Note:** Backend runs on Windows PC at `localhost:8000`, but connects to:
- Supabase at `http://192.168.0.11:8444` (configured via `SUPABASE_URL` env var)
- OLLAMA at `http://192.168.0.11:11434` (configured via `OLLAMA_HOST` env var)

```bash
# From Windows PC - Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "pass123"}'

# Ask question
curl -X POST http://localhost:8000/queries \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Jakie są podstawowe prawa konsumenta?"}'

# Rate response
curl -X POST http://localhost:8000/responses/456/ratings \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"rating": "up"}'
```

**Testing Remote Services:**
```bash
# From Windows PC - Test Supabase connectivity
curl http://192.168.0.11:8444/health

# Test OLLAMA connectivity
curl http://192.168.0.11:11434/api/version

# Test OLLAMA models
curl http://192.168.0.11:11434/api/tags
```

---

## 7. Security Considerations

### Input Validation
- Use Pydantic models for all request bodies
- Sanitize user input to prevent SQL injection (parameterized queries)
- Validate JWT signature on every request

### Rate Limiting
- Prevent brute-force attacks on auth endpoints
- Limit expensive LLM operations

### CORS
- Allow only frontend domain in production
- Use credentials: include for cookies

### Secrets Management
- Store SUPABASE_KEY, OLLAMA_HOST in environment variables
- Never commit secrets to git (.env.example only)

### Logging
- Log all queries for analytics (anonymized in production)
- Log errors to Sentry or CloudWatch
- Don't log sensitive data (passwords, full JWT tokens)
