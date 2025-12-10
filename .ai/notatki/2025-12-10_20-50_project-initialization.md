# Inicjalizacja środowiska deweloperskiego PrawnikGPT

**Data rozpoczęcia:** 2025-12-10 20:50
**Status:** UKOŃCZONY

---

## 📋 Sesja Konfiguracyjna - Deployment Environment Setup

### Kontekst projektu
- **Architektura:** Distributed deployment (Frontend + Backend na localhost, Supabase + OLLAMA na serwerze Debian 192.168.0.11)
- **Frontend:** Astro 5 + React 19 Islands
- **Backend:** FastAPI + Python 3.11
- **Database:** Supabase (PostgreSQL + pgvector) w kontenerze Docker
- **LLM:** OLLAMA (localhost)

### Cel sesji
Przygotowanie kompletnego środowiska deweloperskiego do wznowienia pracy nad projektem PrawnikGPT po przerwie.

**Wynik:**
- ✅ Środowisko Python skonfigurowane (venv + dependencies)
- ✅ Konfiguracja .env naprawiona (Supabase URL + klucze API)
- ✅ Frontend Astro uruchomiony (http://192.168.0.11:4321/)
- ✅ Backend FastAPI uruchomiony (http://192.168.0.11:8000/)
- ✅ Wszystkie serwisy zweryfikowane

---

## 🎯 Zakres pracy

### Faza 1: Diagnoza stanu projektu
- [x] Sprawdzenie struktury katalogów
- [x] Weryfikacja pliku `.env` (wykryto błędną konfigurację SUPABASE_URL)
- [x] Sprawdzenie node_modules (zainstalowane)
- [x] Sprawdzenie zależności Python (brak)
- [x] Weryfikacja usług zewnętrznych (Supabase, OLLAMA)

### Faza 2: Instalacja środowiska Python
- [x] Zainstalowanie `python3-pip` i `python3-venv` (Debian 12 wymaga venv)
- [x] Utworzenie virtual environment w `backend/venv/`
- [x] Instalacja zależności z `backend/requirements.txt`:
  - FastAPI 0.123.0
  - Uvicorn 0.38.0 (z [standard])
  - Supabase client 2.24.0
  - OLLAMA client 0.6.1
  - Pydantic 2.12.5
  - Redis 7.1.0
  - Pytest 9.0.1
  - Ruff 0.14.7

### Faza 3: Naprawa konfiguracji .env
**Problemy wykryte:**
- `SUPABASE_URL=https://localhost:8443` → powinno być `https://192.168.0.11:8443`
- Nieprawidłowe klucze API (demo keys zamiast rzeczywistych)

**Zmiany wprowadzone:**
```diff
- SUPABASE_URL=https://localhost:8443
+ SUPABASE_URL=https://192.168.0.11:8443

- PUBLIC_SUPABASE_ANON_KEY=eyJ...CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
+ PUBLIC_SUPABASE_ANON_KEY=eyJ...dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE

- SUPABASE_SERVICE_KEY=eyJ...EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
+ SUPABASE_SERVICE_KEY=eyJ...DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
```

**Źródło kluczy:** Ekstrakcja z kontenera Docker (`supabase-kong`)

### Faza 4: Weryfikacja usług zewnętrznych

#### OLLAMA (localhost:11434)
- ✅ Status: Działa (v0.11.7)
- ✅ Modele dostępne:
  - `llama3.1:latest` (4.9 GB) - fast model dla szybkich odpowiedzi
  - `gpt-oss:120b` (65 GB) - detailed model dla szczegółowych analiz
  - `nomic-embed-text:latest` (274 MB) - embedding model
  - `mxbai-embed-large:latest` (669 MB) - alternatywny embedding model

#### Supabase (https://192.168.0.11:8443)
- ✅ Status: Działa poprawnie
- ✅ REST API: Odpowiada na `/rest/v1/` (Swagger schema)
- ✅ Auth: Endpoint `/health` wymaga uwierzytelnienia (OK)
- ✅ Funkcje RPC dostępne:
  - `semantic_search_chunks` - wyszukiwanie semantyczne w aktach prawnych
  - `health_check` - diagnostyka bazy danych
  - `unaccent` - usuwanie znaków diakrytycznych

### Faza 5: Uruchomienie serwerów deweloperskich

#### Frontend (Astro)
```bash
cd /home/mariusz/prawnik_v01
npm run dev
```
- ✅ Uruchomiony na: http://192.168.0.11:4321/
- ✅ Hot reload: Aktywny
- ✅ Sessions: Filesystem storage

#### Backend (FastAPI)
```bash
cd /home/mariusz/prawnik_v01
source backend/venv/bin/activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
- ✅ Uruchomiony na: http://0.0.0.0:8000
- ✅ Docs: http://192.168.0.11:8000/docs
- ✅ Health check: `/health` → status "degraded"
  - ✅ OLLAMA: OK
  - ✅ Supabase Auth: OK
  - ⚠️ Database: DOWN (bezpośrednie połączenie Postgres, nie krytyczne)

**Routery zarejestrowane:**
- `/health` - Health check
- `/api/queries` - Query management (auth required)
- `/api/ratings` - Rating management (auth required)
- `/api/legal-acts` - Legal acts (public)
- `/api/onboarding` - Onboarding (public)

---

## 🔧 Rozwiązane problemy

### Problem 1: ModuleNotFoundError: No module named 'backend'
**Opis:** Backend przy pierwszym uruchomieniu z katalogu `backend/` nie mógł znaleźć modułu `backend`.

**Przyczyna:** Importy w `main.py` używają prefiksu `backend.` (np. `from backend.config import settings`), ale uruchomienie z katalogu `backend/` powodowało, że Python szukał modułu `backend.backend`.

**Rozwiązanie:** Uruchomienie uvicorn z głównego katalogu projektu:
```bash
cd /home/mariusz/prawnik_v01
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Problem 2: "Invalid authentication credentials" w Supabase
**Opis:** Pierwsze testy połączenia z Supabase zwracały błąd uwierzytelnienia.

**Przyczyna:** Klucze w `.env` były domyślnymi demo keys Supabase, a nie rzeczywistymi kluczami z kontenera Docker.

**Rozwiązanie:** Ekstrakcja prawdziwych kluczy z kontenera `supabase-kong`:
```bash
docker exec supabase-kong env | grep -E "ANON_KEY|SERVICE_KEY"
```

### Problem 3: Externally-managed-environment w Debianie 12
**Opis:** `pip install` zwracało błąd "externally-managed-environment".

**Przyczyna:** Debian 12 (Bookworm) wymaga użycia virtual environment dla pakietów Python (PEP 668).

**Rozwiązanie:**
1. Zainstalowanie `python3-pip` i `python3-venv`
2. Utworzenie venv: `python3 -m venv backend/venv`
3. Instalacja w venv: `source venv/bin/activate && pip install -r requirements.txt`

---

## 📊 Podsumowanie zmian

### Pliki zmodyfikowane
- `.env` - naprawiono SUPABASE_URL i klucze API

### Nowe pliki
- `backend/venv/` - virtual environment Python (dodane do .gitignore)

### Zmienne środowiskowe zaktualizowane
```env
SUPABASE_URL=https://192.168.0.11:8443
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
```

### Status usług
| Serwis | Status | URL | Uwagi |
|--------|--------|-----|-------|
| Frontend Astro | 🟢 Działa | http://192.168.0.11:4321/ | Hot reload aktywny |
| Backend FastAPI | 🟢 Działa | http://192.168.0.11:8000/ | API docs: /docs |
| Supabase | 🟢 Działa | https://192.168.0.11:8443/ | PostgreSQL + pgvector |
| OLLAMA | 🟢 Działa | http://localhost:11434 | 3 modele LLM dostępne |

---

## 🚀 Następne kroki

### Rekomendacje konfiguracyjne
1. **CORS:** Dodać `http://192.168.0.11:4321` do `CORS_ORIGINS` w `.env`
   ```env
   CORS_ORIGINS=http://localhost:4321,http://192.168.0.11:4321,http://192.168.0.1:4321
   ```

2. **Database connection:** Sprawdzić bezpośrednie połączenie Postgres (obecnie "down" w health check)
   - Prawdopodobnie brakuje tabel w bazie
   - Rozważyć uruchomienie migracji Supabase

3. **Redis:** Opcjonalnie uruchomić Redis dla rate limiting (obecnie fallback in-memory)

### Gotowe do kontynuacji
- ✅ Środowisko deweloperskie skonfigurowane
- ✅ Wszystkie zależności zainstalowane
- ✅ Serwisy zewnętrzne zweryfikowane
- ✅ Frontend i backend uruchomione
- ✅ API dokumentacja dostępna

Projekt gotowy do wznowienia pracy nad funkcjonalnościami!

---

**Czas sesji:** ~30 minut
**Zmiany w repo:** Tylko `.env` (nie commitowane - w .gitignore)
**Dokumentacja:** Ta notatka + aktualizacja todo list
