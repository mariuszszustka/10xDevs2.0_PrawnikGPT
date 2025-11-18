# 🔧 Instrukcja konfiguracji PrawnikGPT ze zdalną Supabase

## Krok 1: Uzyskaj klucze API z Supabase Dashboard

1. **Otwórz panel Supabase w przeglądarce:**
   ```
   http://192.168.0.11:8444
   ```

2. **Zaloguj się** używając swoich danych admina

3. **Utwórz nowy projekt** (jeśli nie istnieje):
   - Kliknij "New Project"
   - Nazwa projektu: `prawnikgpt`
   - Database Password: **Zapisz hasło - będzie potrzebne!**
   - Region: wybierz najbliższy (lub zostaw domyślny)

4. **Pobierz klucze API:**
   - Po utworzeniu projektu, przejdź do: **Settings** → **API**
   - Znajdziesz tam:
     - **Project URL** (np. `http://192.168.0.11:8444`)
     - **anon/public key** - skopiuj
     - **service_role key** - skopiuj (WAŻNE: ten klucz omija RLS!)

5. **Pobierz JWT Secret:**
   - W tym samym miejscu (**Settings** → **API**)
   - Znajdź **JWT Secret** - skopiuj

6. **Pobierz Connection String (dla migracji):**
   - Przejdź do: **Settings** → **Database**
   - Znajdź **Connection string** → **URI**
   - Powinien wyglądać tak:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@192.168.0.11:5432/postgres
     ```
   - Podmień `[YOUR-PASSWORD]` na hasło ustawione w kroku 3

---

## Krok 2: Utwórz plik .env

Po uzyskaniu kluczy, uruchom w PowerShell:

```powershell
# Skopiuj szablon
Copy-Item .env.example .env

# Edytuj plik (użyj notatnika lub VS Code)
notepad .env
```

Wypełnij plik `.env` następującymi danymi:

```bash
# ============================================
# PrawnikGPT - Environment Variables
# ============================================

# Supabase (zdalna instancja na 192.168.0.11)
SUPABASE_URL=http://192.168.0.11:8444
SUPABASE_ANON_KEY=<WKLEJ_ANON_KEY_Z_DASHBOARDU>
SUPABASE_SERVICE_KEY=<WKLEJ_SERVICE_ROLE_KEY_Z_DASHBOARDU>
SUPABASE_JWT_SECRET=<WKLEJ_JWT_SECRET_Z_DASHBOARDU>

# PostgreSQL Connection (dla migracji)
DATABASE_URL=postgresql://postgres:<HASLO_DO_BAZY>@192.168.0.11:5432/postgres

# OLLAMA (gdzie jest uruchomiony OLLAMA?)
# Opcja A: Lokalnie na Windows
OLLAMA_HOST=http://localhost:11434
# Opcja B: Na serwerze 192.168.0.11
# OLLAMA_HOST=http://192.168.0.11:11434

# Backend FastAPI (lokalnie na Windows)
API_BASE_URL=http://localhost:8000

# Frontend Astro (publiczne zmienne)
PUBLIC_API_BASE_URL=http://localhost:8000
PUBLIC_SUPABASE_URL=http://192.168.0.11:8444
PUBLIC_SUPABASE_ANON_KEY=<WKLEJ_ANON_KEY_Z_DASHBOARDU>

# Redis (opcjonalnie)
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=INFO
DEBUG=true
```

---

## Krok 3: Zastosuj migracje na zdalnej bazie

Po wypełnieniu `.env`, uruchom:

```powershell
# Zastosuj wszystkie migracje na zdalnej bazie
supabase db push --db-url $env:DATABASE_URL
```

Lub ręcznie każdą migrację:

```powershell
# Ustaw zmienną środowiskową
$env:PGPASSWORD="<HASLO_DO_BAZY>"

# Zastosuj migracje po kolei
Get-ChildItem supabase\migrations\*.sql | Sort-Object Name | ForEach-Object {
    Write-Host "Applying migration: $($_.Name)" -ForegroundColor Cyan
    psql -h 192.168.0.11 -p 5432 -U postgres -d postgres -f $_.FullName
}
```

---

## Krok 4: Weryfikacja

Sprawdź, czy migracje zostały zastosowane:

```powershell
# Połącz się z bazą i sprawdź tabele
psql -h 192.168.0.11 -p 5432 -U postgres -d postgres -c "\dt"
```

Powinieneś zobaczyć tabele:
- `query_history`
- `ratings`
- `legal_acts`
- `legal_act_chunks`
- `legal_act_relations`

---

## Krok 5: Backend .env

Utwórz również plik `.env` dla backendu:

```powershell
# W folderze backend/
cd backend
Copy-Item .env.example .env -ErrorAction SilentlyContinue
notepad .env
```

Wypełnij `backend/.env`:

```bash
SUPABASE_URL=http://192.168.0.11:8444
SUPABASE_SERVICE_KEY=<WKLEJ_SERVICE_ROLE_KEY>
SUPABASE_JWT_SECRET=<WKLEJ_JWT_SECRET>

OLLAMA_HOST=http://localhost:11434

REDIS_URL=redis://localhost:6379/0

LOG_LEVEL=INFO
DEBUG=true
```

---

## ✅ Gotowe!

Teraz możesz uruchomić aplikację:

```powershell
# Terminal 1: Frontend (Astro)
npm run dev

# Terminal 2: Backend (FastAPI)
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

---

## 🔒 Bezpieczeństwo

Plik `.env` jest już dodany do `.gitignore` - **nigdy nie commituj kluczy API!**

Sprawdź:
```powershell
git status
# .env nie powinien być widoczny jako zmiana
```

