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

