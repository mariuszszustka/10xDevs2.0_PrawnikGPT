# 2. POST /api/v1/queries - Submit Query (RAG Pipeline)

**Endpoint:** `POST /api/v1/queries`  
**Typ:** Core Functionality - RAG Pipeline  
**Autentykacja:** Wymagana (JWT)  
**Złożoność:** Bardzo wysoka ⭐ **NAJWAŻNIEJSZY ENDPOINT**  
**Szacowany czas implementacji:** 2-3 tygodnie

---

## Przegląd

**Najbardziej złożony endpoint w systemie** - implementuje pełny pipeline RAG do przetwarzania pytań prawnych.

### 8 Kroków Pipeline'u:

1. Generate query embedding (OLLAMA)
2. Similarity search (pgvector)
3. Fetch related acts (graph traversal)
4. Construct prompt
5. Generate LLM response (mistral:7b)
6. Parse sources
7. Store in database
8. Cache context (Redis, 5 min)

---

## Request

**Method:** POST  
**URL:** `/api/v1/queries`

**Body:**

```json
{
  "query_text": "Jakie są podstawowe prawa konsumenta w Polsce?"
}
```

**Validation:**

- `query_text`: 10-1000 characters, required

---

## Response

### 202 Accepted (Immediate)

```json
{
  "query_id": "uuid",
  "query_text": "...",
  "status": "processing",
  "created_at": "2025-11-19T10:30:00Z",
  "fast_response": {
    "status": "pending",
    "estimated_time_seconds": 10
  }
}
```

### After Processing (via polling/WebSocket)

```json
{
  "query_id": "uuid",
  "query_text": "...",
  "status": "completed",
  "fast_response": {
    "content": "Podstawowe prawa konsumenta...",
    "model_name": "mistral:7b",
    "generation_time_ms": 8500,
    "sources": [...]
  }
}
```

---

## Kluczowe Komponenty do Implementacji

### 1. Embedding Service (`backend/services/embedding_service.py`)

```python
class EmbeddingService:
    async def generate_embedding(self, text: str) -> List[float]:
        # OLLAMA API call
        # Returns 768-dim vector
```

### 2. LLM Service (`backend/services/llm_service.py`)

```python
class LLMService:
    async def generate(self, prompt: str, model: str, timeout: float) -> Dict:
        # OLLAMA generation
        # Timeout 15s for fast model
```

### 3. Vector Search Service (`backend/services/vector_search.py`)

```python
class VectorSearchService:
    async def semantic_search(self, embedding: List[float], top_k: int) -> List[Dict]:
        # pgvector similarity search
        # Uses RPC function
```

### 4. RAG Pipeline (`backend/services/rag_pipeline.py`)

```python
class RAGPipeline:
    async def generate_fast_response(self, query_text: str, query_id: UUID) -> Dict:
        # Orchestrates all 8 steps
        # Returns response data
```

---

## Database Functions (Supabase RPC)

### Semantic Search Function

```sql
CREATE OR REPLACE FUNCTION semantic_search_chunks(
    query_embedding vector(768),
    match_count int DEFAULT 10,
    similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (...) AS $$
-- Returns top K similar chunks with metadata
$$;
```

### Related Acts Traversal

```sql
CREATE OR REPLACE FUNCTION fetch_related_acts(
    act_ids uuid[],
    max_depth int DEFAULT 2
)
RETURNS TABLE (...) AS $$
-- Recursive CTE for graph traversal
$$;
```

---

## Bezpieczeństwo

### Zagrożenia:

1. **SQL Injection** - ZAWSZE parametryzowane zapytania
2. **Prompt Injection** - Sanityzacja input, clear prompt structure
3. **DoS** - Rate limiting (10 queries/min), timeouts (15s)
4. **Data Leakage** - RLS policies

---

## Wydajność

**Cele:**

- Initial response: <200ms (202 Accepted)
- Processing time: <15s (p95)
- Embedding: <2s
- Similarity search: <200ms
- LLM generation: <10s

**Optymalizacje:**

- Connection pooling
- Async operations (asyncio)
- Efficient indexes (IVFFlat)
- Context caching (5 min)

---

## Checklist Implementacji

### Infrastructure

- [ ] Struktura katalogów (models, services, db, routers)
- [ ] Config setup (environment variables)
- [ ] Supabase client
- [ ] Redis client

### Services

- [ ] EmbeddingService + testy
- [ ] LLMService + testy
- [ ] VectorSearchService + testy
- [ ] RAGPipeline (orchestration) + testy

### Database

- [ ] semantic_search_chunks RPC function
- [ ] fetch_related_acts RPC function
- [ ] QueryRepository
- [ ] Indexes (pgvector IVFFlat)

### API

- [ ] Pydantic models (QuerySubmitRequest, QuerySubmitResponse, etc.)
- [ ] Custom exceptions (NoRelevantActsError, OLLAMATimeoutError)
- [ ] Auth middleware
- [ ] Rate limiting
- [ ] Router endpoint POST /api/v1/queries
- [ ] Background task orchestration

### Testing

- [ ] Unit tests dla każdego serwisu
- [ ] Integration tests z rzeczywistym OLLAMA
- [ ] Integration tests z Supabase
- [ ] End-to-end test całego pipeline'u
- [ ] Performance tests (<15s)

---

## Kolejność Implementacji

1. **Setup:** Config, struktura katalogów
2. **Modele:** Pydantic models, exceptions
3. **Services:** Embedding → LLM → Vector Search
4. **Database:** RPC functions, repository
5. **Pipeline:** RAG orchestration
6. **API:** Router, middleware, background tasks
7. **Tests:** Unit → Integration → E2E

---

**Pełny szczegółowy plan (1800 linii kodu) dostępny w oryginalnym pliku.**

**Powrót do:** [Index](../api-implementation-index.md)
