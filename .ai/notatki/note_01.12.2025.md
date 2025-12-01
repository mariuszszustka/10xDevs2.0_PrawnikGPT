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

### Do zrobienia:

- [ ] Uruchomić testy i zweryfikować działanie
- [ ] Testy integracyjne z rzeczywistym OLLAMA
- [ ] Optymalizacja wydajności (<15s dla fast response)

---

