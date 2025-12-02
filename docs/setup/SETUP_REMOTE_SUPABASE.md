# 🚀 Konfiguracja PrawnikGPT ze zdalnym Supabase (192.168.0.11)

## Twoje środowisko

- **Supabase:** Zdalna instancja w Dockerze na `192.168.0.11`
- **MCP Server:** `http://192.168.0.11:8001/mcp`
- **Supabase Dashboard:** `http://192.168.0.11:8444`
- **PostgreSQL:** `192.168.0.11:5432`

---

## Krok 1: Uzyskaj dane dostępowe z Supabase

### Opcja A: Przez Dashboard (zalecane)

1. **Otwórz Supabase Dashboard:**
   ```
   http://192.168.0.11:8444
   ```

2. **Zaloguj się** jako admin

3. **Pobierz klucze API:**
   - Przejdź do: **Settings** → **API**
   - Skopiuj:
     - **URL** (powinno być: `http://192.168.0.11:8444`)
     - **anon/public key** (klucz publiczny)
     - **service_role key** (klucz administracyjny - WAŻNE!)
     - Przewiń w dół i znajdź **JWT Settings** → **JWT Secret**

4. **Pobierz hasło do bazy:**
   - Przejdź do: **Settings** → **Database**
   - Znajdź **Database Password** lub **Connection String**
   - Hasło jest częścią Connection String: `postgresql://postgres:HASLO@...`

### Opcja B: Przez Docker (jeśli masz dostęp SSH do serwera)

Jeśli masz dostęp SSH do `192.168.0.11`:

```bash
# Połącz się z serwerem
ssh user@192.168.0.11

# Sprawdź kontenery Supabase
docker ps | grep supabase

# Pobierz zmienne środowiskowe z kontenera Supabase Studio
docker exec supabase-studio env | grep -E "ANON_KEY|SERVICE_KEY|JWT_SECRET"

# Lub sprawdź w docker-compose.yml
cat ~/supabase/docker-compose.yml | grep -E "ANON_KEY|SERVICE_ROLE_KEY|JWT_SECRET"
```

### Opcja C: Domyślne klucze (dla lokalnego Supabase)

Jeśli używasz standardowej instalacji Supabase lokalnie, domyślne klucze to:

```bash
# ANON_KEY (publiczny)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# SERVICE_ROLE_KEY (administracyjny)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# JWT_SECRET
super-secret-jwt-token-with-at-least-32-characters-long

# Database Password
postgres
```

**⚠️ UWAGA:** Te klucze są bezpieczne tylko dla developmentu lokalnego! Nigdy nie używaj ich w produkcji.

---

## Krok 2: Utwórz plik .env

```powershell
# Skopiuj szablon
Copy-Item .env.example .env

# Edytuj w notatniku
notepad .env
```

**Wypełnij plik .env:**

```bash
# ============================================
# PrawnikGPT - Zdalna Supabase (192.168.0.11)
# ============================================

# Supabase Configuration
SUPABASE_URL=http://192.168.0.11:8444
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# PostgreSQL Connection (dla migracji)
DATABASE_URL=postgresql://postgres:postgres@192.168.0.11:5432/postgres

# OLLAMA Configuration (gdzie jest uruchomiony?)
# Jeśli na tym samym serwerze co Supabase:
OLLAMA_HOST=http://192.168.0.11:11434
# Jeśli lokalnie na Windows:
# OLLAMA_HOST=http://localhost:11434

# Backend FastAPI (lokalnie na Windows)
API_BASE_URL=http://localhost:8000

# Frontend Astro (publiczne zmienne)
PUBLIC_API_BASE_URL=http://localhost:8000
PUBLIC_SUPABASE_URL=http://192.168.0.11:8444
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Redis (opcjonalnie, jeśli dostępny)
REDIS_URL=redis://192.168.0.11:6379/0

# Logging
LOG_LEVEL=INFO
DEBUG=true
```

**💡 Wskazówka:** Jeśli używasz innych kluczy niż domyślne, zastąp wartości powyżej.

---

## Krok 3: Utwórz plik .env dla backendu

```powershell
cd backend
Copy-Item .env.example .env
notepad .env
```

**Wypełnij backend/.env:**

```bash
# Supabase Configuration
SUPABASE_URL=http://192.168.0.11:8444
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# OLLAMA Configuration
OLLAMA_HOST=http://192.168.0.11:11434

# Redis (opcjonalnie)
REDIS_URL=redis://192.168.0.11:6379/0

# Logging
LOG_LEVEL=INFO
DEBUG=true

# RAG Configuration
EMBEDDING_MODEL=nomic-embed-text
FAST_MODEL=mistral:7b
ACCURATE_MODEL=gpt-oss:120b
MAX_CHUNKS=10
FAST_TIMEOUT=15
ACCURATE_TIMEOUT=240
```

---

## Krok 4: Zastosuj migracje na zdalnej bazie

### Metoda 1: PowerShell Script (zalecane)

```powershell
# Wróć do głównego folderu projektu
cd ..

# Uruchom skrypt migracji
.\scripts\apply-migrations.ps1
```

Skrypt automatycznie:
- Wczyta zmienne z `.env`
- Połączy się z bazą PostgreSQL na `192.168.0.11:5432`
- Zastosuje wszystkie migracje po kolei
- Wyświetli szczegółowe logi

### Metoda 2: Supabase CLI (jeśli działa)

```powershell
supabase db push --db-url "postgresql://postgres:postgres@192.168.0.11:5432/postgres"
```

### Metoda 3: Ręczne zastosowanie przez psql

Jeśli masz zainstalowany PostgreSQL client:

```powershell
# Zainstaluj psql (jeśli nie masz)
scoop install postgresql

# Ustaw hasło
$env:PGPASSWORD="postgres"

# Zastosuj każdą migrację
Get-ChildItem supabase\migrations\*.sql | Sort-Object Name | ForEach-Object {
    Write-Host "Applying: $($_.Name)" -ForegroundColor Cyan
    psql -h 192.168.0.11 -p 5432 -U postgres -d postgres -f $_.FullName
}
```

### Metoda 4: Przez Supabase Dashboard (GUI)

1. Otwórz: `http://192.168.0.11:8444`
2. Przejdź do: **SQL Editor**
3. Otwórz każdy plik z `supabase/migrations/` (sortując alfabetycznie)
4. Skopiuj zawartość i wykonaj (Run)
5. Powtórz dla wszystkich plików

---

## Krok 5: Weryfikacja

```powershell
# Sprawdź połączenie i tabele
.\scripts\verify-supabase.ps1
```

Lub ręcznie przez psql:

```powershell
$env:PGPASSWORD="postgres"
psql -h 192.168.0.11 -p 5432 -U postgres -d postgres -c "\dt"
```

Powinieneś zobaczyć tabele:
- ✅ `query_history`
- ✅ `ratings`
- ✅ `legal_acts`
- ✅ `legal_act_chunks`
- ✅ `legal_act_relations`

---

## Krok 6: Test połączenia z aplikacji

### Test 1: Frontend

```powershell
npm install
npm run dev
```

Otwórz: `http://localhost:4321`

### Test 2: Backend

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Test API: `http://localhost:8000/docs`

---

## 🔍 Troubleshooting

### Problem: "Nie można połączyć się z bazą"

**Rozwiązanie:**

1. Sprawdź, czy Supabase działa:
   ```powershell
   Test-NetConnection -ComputerName 192.168.0.11 -Port 5432
   ```

2. Sprawdź, czy PostgreSQL przyjmuje zdalne połączenia:
   ```bash
   # Na serwerze 192.168.0.11
   docker logs supabase-db | grep "database system is ready"
   ```

3. Sprawdź firewall:
   ```bash
   # Na serwerze 192.168.0.11
   sudo ufw allow 5432/tcp
   sudo ufw allow 8444/tcp
   ```

### Problem: "psql nie jest zainstalowany"

**Rozwiązanie:**

```powershell
scoop install postgresql
```

Lub pobierz z: https://www.postgresql.org/download/windows/

### Problem: "Authentication failed"

**Rozwiązanie:**

1. Sprawdź hasło w `.env` (DATABASE_URL)
2. Spróbuj domyślnego hasła: `postgres`
3. Lub zresetuj hasło w docker-compose.yml na serwerze

### Problem: "Migracje już istnieją"

**Rozwiązanie:**

To normalne - PostgreSQL pomija już wykonane polecenia (CREATE IF NOT EXISTS).
Jeśli chcesz wyczyścić bazę:

```powershell
# UWAGA: To usuwa wszystkie dane!
$env:PGPASSWORD="postgres"
psql -h 192.168.0.11 -p 5432 -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Ponownie zastosuj migracje
.\scripts\apply-migrations.ps1
```

---

## 🎉 Gotowe!

Teraz możesz uruchomić aplikację:

```powershell
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
python -m uvicorn main:app --reload
```

Frontend: http://localhost:4321
Backend API: http://localhost:8000/docs

---

## 📝 Notatki

- **MCP Server** (`192.168.0.11:8001/mcp`) - do zarządzania Supabase (opcjonalnie)
- **Supabase Dashboard** (`192.168.0.11:8444`) - GUI do zarządzania
- **PostgreSQL** (`192.168.0.11:5432`) - bezpośrednie połączenie do bazy
- Wszystkie dane dostępowe są w `.env` (NIE commituj tego pliku!)

