[2x4] Generowanie kontraktów i endpointów Rest API

## 1. Health Check Endpoint (01-health-check.md) ✅

**Data implementacji:** 2025-12-01  
**Status:** UKOŃCZONY

### Zaimplementowane komponenty:

| Plik | Opis |
|------|------|
| `supabase/migrations/20251201120000_create_health_check_function.sql` | Funkcja RPC `health_check()` w PostgreSQL |
| `backend/models/health.py` | Modele Pydantic (HealthResponse, ServiceHealthStatus) |
| `backend/services/health_check.py` | Logika sprawdzania serwisów (DB, OLLAMA, Auth) |
| `backend/routers/health.py` | Endpoint GET /health z rate limiting |
| `backend/db/supabase_client.py` | Obsługa RPC z fallback do simple check |
| `backend/middleware/rate_limit.py` | Dodany `check_rate_limit_health` (60 req/min) |
| `backend/config.py` | Dodana konfiguracja `rate_limit_health_per_ip` |
| `backend/tests/conftest.py` | Fixtures pytest dla testów |
| `backend/tests/test_health.py` | 23 testy jednostkowe i integracyjne |

### Funkcjonalność:

- **Endpoint:** `GET /health`
- **Autentykacja:** Nie wymagana (publiczny)
- **Rate limiting:** 60 req/min per IP
- **Sprawdzane serwisy:**
  - Database (Supabase PostgreSQL)
  - OLLAMA (LLM service)
  - Supabase Auth (JWT configuration)
- **Statusy:** `ok`, `degraded`, `down`
- **Kody HTTP:** 200 (ok/degraded), 503 (down)

### Poprawki dodatkowe:

- Naprawiono `backend/routers/onboarding.py` - zmiana z Enum na Literal dla kategorii pytań
- Utworzono nowe venv i zainstalowano zależności
- Wszystkie 23 testy przechodzą pomyślnie

---

## 2. Submit Query - RAG Pipeline (02-submit-query.md) 🔄

**Data rozpoczęcia:** 2025-12-01  
**Status:** W TRAKCIE (infrastruktura bazy danych)

### Zaimplementowane komponenty (wcześniej):

| Plik | Opis | Status |
|------|------|--------|
| `backend/models/query.py` | Modele Pydantic (QuerySubmitRequest, QueryDetailResponse, etc.) | ✅ |
| `backend/services/rag_pipeline.py` | Orkiestracja RAG (9 kroków) | ✅ |
| `backend/services/llm_service.py` | Generowanie tekstu z OLLAMA | ✅ |
| `backend/services/ollama_service.py` | Embeddings generation | ✅ |
| `backend/services/exceptions.py` | Custom exceptions | ✅ |
| `backend/db/queries.py` | Query repository | ✅ |
| `backend/routers/queries.py` | Endpoints queries | ✅ |

### Nowe komponenty (2025-12-01):

| Plik | Opis |
|------|------|
| `supabase/migrations/20251201130000_create_semantic_search_function.sql` | RPC `semantic_search_chunks` - pgvector similarity search |
| `supabase/migrations/20251201130100_create_fetch_related_acts_function.sql` | RPC `fetch_related_acts` - recursive graph traversal |
| `backend/services/vector_search.py` | Zaktualizowany do użycia RPC (usunięte placeholdery) |
| `backend/tests/test_vector_search.py` | 20+ testów jednostkowych dla vector search |

### Funkcje RPC w Supabase:

1. **`semantic_search_chunks(query_embedding, match_count, similarity_threshold)`**
   - Wyszukiwanie semantyczne przez pgvector
   - Cosine distance z IVFFlat index
   - Target: <200ms dla 500k wektorów

2. **`fetch_related_acts(seed_act_ids, max_depth, relation_types)`**
   - Rekursywne CTE dla BFS graph traversal
   - Bidirectional relations (incoming + outgoing)
   - Detekcja cykli, deduplikacja

### Testy jednostkowe (2025-12-01):

| Plik | Testy | Status |
|------|-------|--------|
| `backend/tests/test_vector_search.py` | 21 testów | ✅ PASS |
| `backend/tests/test_rag_pipeline.py` | 16 testów | ✅ PASS |
| `backend/tests/test_llm_service.py` | 21 testów | ✅ PASS |
| `backend/tests/test_ollama_service.py` | 18 testów | ✅ PASS |
| **SUMA** | **76 testów** | ✅ **ALL PASS** |

### Do zrobienia:

- [x] ~~Uruchomić testy i zweryfikować działanie~~
- [ ] Testy integracyjne z rzeczywistym OLLAMA
- [ ] Optymalizacja wydajności (<15s dla fast response)
- [ ] Uruchomić migracje na Supabase (`supabase db push`)

---

## 3. Query Management (03-05-query-management.md) ✅

**Data implementacji:** 2025-12-01  
**Status:** UKOŃCZONY

### Endpointy:

| Endpoint | Opis | Status |
|----------|------|--------|
| `GET /api/v1/queries` | Lista zapytań z paginacją | ✅ |
| `GET /api/v1/queries/{query_id}` | Szczegóły zapytania | ✅ |
| `DELETE /api/v1/queries/{query_id}` | Usunięcie zapytania | ✅ |
| `POST /api/v1/queries/{query_id}/accurate-response` | Żądanie dokładnej odpowiedzi | ✅ |

### Naprawione problemy:

1. **Router `get_queries`** - poprawiono mapowanie danych z bazy do modeli Pydantic
   - Dodano `QueryListItemFastResponse` i `QueryListItemAccurateResponse`
   - Poprawiono liczenie źródeł (`sources_count`)
   
2. **Router `get_query`** - naprawiono logikę statusu
   - Status określany z obecności `fast_response_content` (nie z nieistniejącego pola)
   - Poprawiono mapowanie `rating_value` → `value` w `RatingDetail`
   - Poprawiono parsowanie JSONB sources

### Testy:

| Plik | Testy | Status |
|------|-------|--------|
| `backend/tests/test_query_endpoints.py` | 23 testy | ✅ PASS |

### Kategorie testów:
- List queries (6 testów)
- Get query details (3 testy)
- Delete query (2 testy)
- Request accurate response (4 testy)
- Query repository (4 testy)
- Pydantic models (4 testy)

---

## 4. Rating System (07-ratings.md) ✅

**Data implementacji:** 2025-12-01  
**Status:** UKOŃCZONY

### Endpointy:

| Endpoint | Opis | Status |
|----------|------|--------|
| `POST /api/v1/queries/{query_id}/ratings` | Utwórz/zaktualizuj ocenę | ✅ |
| `GET /api/v1/queries/{query_id}/ratings` | Lista ocen zapytania | ✅ |
| `DELETE /api/v1/ratings/{rating_id}` | Usuń ocenę | ✅ |

### Nowe migracje:

| Plik | Opis |
|------|------|
| `20251201140000_add_unique_rating_constraint.sql` | Unique index na (query_id, user_id, response_type) |

### Testy:

| Plik | Testy | Status |
|------|-------|--------|
| `backend/tests/test_rating_endpoints.py` | 21 testów | ✅ PASS |

### Kategorie testów:
- Create/Update rating (5 testów)
- List ratings (3 testy)
- Delete rating (3 testy)
- Repository (4 testy)
- Pydantic models (6 testów)

---

