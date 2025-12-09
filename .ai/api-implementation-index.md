# API Implementation Plan - Index

**Wersja:** 1.0 (MVP)  
**Data utworzenia:** 2025-11-19  
**Tech Stack:** FastAPI (Python 3.11+), Supabase (PostgreSQL + pgvector), OLLAMA

---

## 📚 Struktura Dokumentacji

Ze względu na rozbudowaną dokumentację, plan implementacji został podzielony na logiczne moduły. Każdy plik zawiera szczegółowy plan dla konkretnego endpointu lub grupy powiązanych endpointów.

---

## 🗂️ Plany Implementacji Endpointów

### Core System

1. **[Health Check](./implementations/01-health-check.md)**
   - `GET /health`
   - Monitoring i status serwisów
   - ~700 linii

### Query Management (Główna funkcjonalność)

2. **[Submit Query - RAG Pipeline](./implementations/02-submit-query.md)** ⭐ **NAJWAŻNIEJSZY**
   - `POST /api/v1/queries`
   - Pełny pipeline RAG (8 kroków)
   - Embedding, similarity search, LLM generation
   - ~1800 linii

3. **[List Queries](./implementations/03-list-queries.md)**
   - `GET /api/v1/queries`
   - Historia zapytań z paginacją
   - ~800 linii

4. **[Query Details](./implementations/04-query-details.md)**
   - `GET /api/v1/queries/{query_id}`
   - Szczegóły pojedynczego zapytania
   - ~400 linii

5. **[Delete Query](./implementations/05-delete-query.md)**
   - `DELETE /api/v1/queries/{query_id}`
   - Usuwanie z historii
   - ~300 linii

6. **[Accurate Response](./implementations/06-accurate-response.md)**
   - `POST /api/v1/queries/{query_id}/accurate-response`
   - Dokładna odpowiedź z większego modelu (120B)
   - ~600 linii

### Rating System

7. **[Ratings Management](./implementations/07-ratings.md)**
   - `POST /api/v1/queries/{query_id}/ratings` - Create/Update
   - `GET /api/v1/queries/{query_id}/ratings` - List
   - `DELETE /api/v1/ratings/{rating_id}` - Delete
   - ~500 linii

### Legal Acts (Reference Data)

8. **[Legal Acts Management](./implementations/08-legal-acts.md)**
   - `GET /api/v1/legal-acts` - List with filters
   - `GET /api/v1/legal-acts/{act_id}` - Details
   - `GET /api/v1/legal-acts/{act_id}/relations` - Relations graph
   - ~700 linii

### Onboarding

9. **[Onboarding](./implementations/09-onboarding.md)**
   - `GET /api/v1/onboarding/example-questions`
   - Przykładowe pytania dla nowych użytkowników
   - ~200 linii

---

## 🎯 Priorytety Implementacji

### Faza 1: Fundamenty (Tydzień 1-2)

**Krok 1: Infrastruktura**

- [ ] Struktura katalogów (`backend/models/`, `backend/services/`, etc.)
- [ ] Konfiguracja środowiska (`.env`, `config.py`)
- [ ] Supabase client setup
- [ ] OLLAMA client setup

**Krok 2: Podstawowe Endpointy**

- [ ] Implementacja: [Health Check](./implementations/01-health-check.md)
  - Prosty endpoint, dobry start
  - Testuje połączenia z serwisami
- [ ] Testy połączeń (Supabase, OLLAMA, Auth)

### Faza 2: RAG Pipeline (Tydzień 3-4) ⭐

**Krok 3: Kluczowa Funkcjonalność**

- [ ] Implementacja: [Submit Query - RAG](./implementations/02-submit-query.md)
  - Embedding Service
  - LLM Service
  - Vector Search Service
  - RAG Pipeline orchestration
  - Background tasks
- [ ] Testy RAG pipeline
- [ ] Optymalizacja wydajności (<15s)

**Krok 4: Historia Zapytań**

- [ ] Implementacja: [List Queries](./implementations/03-list-queries.md)
- [ ] Implementacja: [Query Details](./implementations/04-query-details.md)
- [ ] Implementacja: [Delete Query](./implementations/05-delete-query.md)

### Faza 3: Rozszerzenia (Tydzień 5)

**Krok 5: Accurate Response**

- [ ] Implementacja: [Accurate Response](./implementations/06-accurate-response.md)
  - Cache management (Redis)
  - Większy model (120B)
  - Timeout handling (240s)

**Krok 6: Rating System**

- [ ] Implementacja: [Ratings](./implementations/07-ratings.md)
  - Upsert logic
  - Agregacje

### Faza 4: Reference Data (Tydzień 6)

**Krok 7: Legal Acts**

- [ ] Implementacja: [Legal Acts](./implementations/08-legal-acts.md)
  - Full-text search
  - Filtry
  - Graph traversal (relacje)

**Krok 8: Onboarding**

- [ ] Implementacja: [Onboarding](./implementations/09-onboarding.md)
  - Static data
  - Przykładowe pytania

---

## 🏗️ Architektura Backend

### Struktura Katalogów

```
backend/
├── main.py                 # FastAPI app entry point
├── config.py              # Environment configuration
├── requirements.txt       # Python dependencies
│
├── models/                # Pydantic models (DTOs)
│   ├── __init__.py
│   ├── query.py          # Query-related models
│   ├── rating.py         # Rating models
│   ├── legal_act.py      # Legal act models
│   ├── health.py         # Health check models
│   └── error.py          # Error response models
│
├── services/              # Business logic
│   ├── __init__.py
│   ├── rag_pipeline.py   # RAG orchestration (⭐ CORE)
│   ├── embedding_service.py  # OLLAMA embeddings
│   ├── llm_service.py    # OLLAMA text generation
│   ├── vector_search.py  # Supabase pgvector queries
│   ├── health_check.py   # Service health checks
│   └── exceptions.py     # Custom exceptions
│
├── db/                    # Database layer
│   ├── __init__.py
│   ├── supabase_client.py  # Supabase setup
│   ├── queries.py        # Query repository
│   ├── ratings.py        # Rating repository
│   └── legal_acts.py     # Legal acts repository
│
├── routers/               # API endpoints
│   ├── __init__.py
│   ├── health.py         # Health check
│   ├── queries.py        # Query endpoints
│   ├── ratings.py        # Rating endpoints
│   ├── legal_acts.py     # Legal acts endpoints
│   └── onboarding.py     # Onboarding endpoints
│
├── middleware/            # FastAPI middleware
│   ├── __init__.py
│   ├── auth.py           # JWT validation
│   ├── rate_limit.py     # Rate limiting
│   └── error_handler.py  # Global error handling
│
└── tests/                 # Tests (pytest)
    ├── __init__.py
    ├── conftest.py       # Pytest fixtures
    ├── test_health.py
    ├── test_queries.py
    ├── test_rag_pipeline.py
    ├── test_ratings.py
    └── test_legal_acts.py
```

---

## 🔗 Powiązane Dokumenty

### Dokumentacja Architektoniczna

- **[api-plan.md](../api-plan.md)** - Specyfikacja REST API (endpoints, validation, responses)
- **[db-plan.md](../db-plan.md)** - Schemat bazy danych (tabele, relacje, indeksy, RLS)
- **[rag-implementation-plan.md](../rag-implementation-plan.md)** - Plan implementacji RAG pipeline
- **[tech-stack.md](../tech-stack.md)** - Stack technologiczny i deployment

### Dokumentacja Projektu

- **[prd.md](../prd.md)** - Product Requirements Document
- **[ui-plan.md](../ui-plan.md)** - Plan interfejsu użytkownika

### Typy i Konfiguracja

- **Frontend:** `src/lib/types.ts` - TypeScript types (DTOs)
- **Frontend:** `src/lib/database.types.ts` - Supabase generated types
- **Backend:** `backend/models/` - Pydantic models (do utworzenia)

---

## 📖 Jak Używać Tej Dokumentacji

### Dla Programisty Implementującego Backend:

1. **Zacznij od tego pliku** (index) - zrozum ogólną strukturę
2. **Przeczytaj [Tech Stack](../tech-stack.md)** - poznaj technologie
3. **Przeczytaj [DB Plan](../db-plan.md)** - zrozum strukturę bazy danych
4. **Implementuj w kolejności:**
   - [01-health-check.md](./implementations/01-health-check.md) - prosty start
   - [02-submit-query.md](./implementations/02-submit-query.md) - kluczowy RAG pipeline ⭐
   - [03-list-queries.md](./implementations/03-list-queries.md) - historia
   - Kolejne według priorytetów

### Dla Każdego Endpointu:

Każdy plik implementacji zawiera:

1. **Przegląd** - cel i charakterystyka
2. **Request** - szczegóły żądania (method, URL, params, body)
3. **Response** - przykłady JSON, status codes
4. **Typy** - Pydantic models + TypeScript types
5. **Przepływ danych** - diagramy + szczegółowy opis
6. **Bezpieczeństwo** - auth, zagrożenia, mitygacje
7. **Obsługa błędów** - scenariusze + implementacja
8. **Wydajność** - cele, optymalizacje, monitoring
9. **Kroki implementacji** - krok po kroku z kodem
10. **Checklist** - zadania do wykonania

### Best Practices:

- ✅ Czytaj cały plan endpointu przed rozpoczęciem implementacji
- ✅ Implementuj dokładnie według kroków w sekcji "Kroki implementacji"
- ✅ Testuj każdy endpoint przed przejściem do kolejnego
- ✅ Używaj checklisty do śledzenia postępów
- ✅ Odnoś się do [api-plan.md](../api-plan.md) dla szczegółów walidacji
- ✅ Sprawdzaj [db-plan.md](../db-plan.md) dla szczegółów SQL

---

## 🚀 Quick Start

### 1. Setup Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### 2. Configure Services

```bash
cp .env.example .env
# Edit .env with your configuration:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - SUPABASE_JWT_SECRET
# - OLLAMA_HOST
# - REDIS_URL
```

### 3. Run Backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# OpenAPI docs
open http://localhost:8000/docs
```

---

## 💡 Wskazówki Implementacyjne

### Kolejność Tworzenia Plików:

1. **Config & Setup** → `backend/config.py`, `backend/main.py`
2. **Models** → `backend/models/` (wszystkie Pydantic models)
3. **Exceptions** → `backend/services/exceptions.py`
4. **DB Client** → `backend/db/supabase_client.py`
5. **Services** → `backend/services/` (jeden po drugim)
6. **Repositories** → `backend/db/` (queries, ratings, etc.)
7. **Middleware** → `backend/middleware/` (auth, rate limiting)
8. **Routers** → `backend/routers/` (endpoints, jeden po drugim)
9. **Tests** → `backend/tests/` (równolegle z implementacją)

### Testowanie:

```bash
# Run all tests
pytest backend/tests/

# Run specific test file
pytest backend/tests/test_health.py -v

# Run with coverage
pytest --cov=backend --cov-report=html
```

---

## 📊 Metryki Sukcesu MVP

- [ ] Wszystkie 13 endpointów zaimplementowane i działają
- [ ] Response time <15s dla fast response (p95)
- [ ] Response time <240s dla accurate response
- [ ] Coverage testów >70% (backend)
- [ ] Dokumentacja OpenAPI aktualna i kompletna
- [ ] RLS policies działają poprawnie
- [ ] Rate limiting skonfigurowany
- [ ] Logging i monitoring działają

---

**Powodzenia z implementacją! 🎉**

_Ostatnia aktualizacja: 2025-11-19_
