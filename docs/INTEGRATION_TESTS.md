# Testy Integracyjne - PrawnikGPT

Ten dokument opisuje jak uruchomić migracje bazy danych i testy integracyjne z prawdziwą bazą Supabase.

## 📋 Wymagania

1. **Supabase** - lokalny lub zdalny
   - Lokalny: `supabase start` (port 54321)
   - Zdalny: URL i klucze w `.env`

2. **Zmienne środowiskowe** w `backend/.env`:
   ```bash
   SUPABASE_URL=http://localhost:54321  # lub URL zdalnego Supabase
   SUPABASE_SERVICE_KEY=your-service-key-here
   SUPABASE_JWT_SECRET=your-jwt-secret-here
   ```

3. **Supabase CLI** (opcjonalnie, dla migracji):
   ```bash
   # Linux
   curl -fsSL https://supabase.com/install.sh | sh
   
   # Lub pobierz z: https://github.com/supabase/cli/releases
   ```

## 🚀 Uruchamianie Migracji

### Metoda 1: Docker (Zalecane dla Supabase w kontenerze) 🐳

Jeśli masz Supabase w kontenerze Docker (jak Ty), użyj tego skryptu:

```bash
cd /home/mariusz/prawnik_v01
./scripts/apply-migrations-docker.sh
```

Ten skrypt:
- Automatycznie znajdzie kontener `supabase-db`
- Skopiuje migracje do kontenera
- Zastosuje je przez `psql` w kontenerze
- Pokaże podsumowanie

### Metoda 2: Supabase CLI (jeśli masz zainstalowane)

```bash
# Lokalny Supabase
cd /home/mariusz/prawnik_v01
supabase db push

# Zdalny Supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Metoda 3: Ręcznie przez docker exec

```bash
# Znajdź kontener
docker ps | grep supabase-db

# Skopiuj migrację do kontenera i wykonaj
docker cp supabase/migrations/20251118221101_enable_extensions.sql supabase-db:/tmp/
docker exec supabase-db psql -U postgres -d postgres -f /tmp/20251118221101_enable_extensions.sql
```

### Metoda 4: Ręcznie przez psql (jeśli masz psql zainstalowane)

```bash
# Ustaw zmienne środowiskowe
export PGPASSWORD=your-password

# Zastosuj każdą migrację po kolei
for migration in supabase/migrations/*.sql; do
    echo "Applying: $migration"
    psql -h localhost -p 54322 -U postgres -d postgres -f "$migration"
done
```

### Metoda 4: Supabase Dashboard (SQL Editor)

1. Otwórz Supabase Dashboard: `http://localhost:54323` (lokalny) lub URL zdalnego
2. Przejdź do **SQL Editor** → **New query**
3. Otwórz każdy plik z `supabase/migrations/` (sortując alfabetycznie)
4. Skopiuj zawartość i wykonaj (Run)
5. Powtórz dla wszystkich plików

## ✅ Weryfikacja Migracji

### Sprawdź tabele

```bash
# Przez psql
psql -h localhost -p 54322 -U postgres -d postgres -c "\dt"

# Przez Supabase CLI
supabase db diff
```

### Oczekiwane tabele:

- ✅ `query_history` - Historia zapytań użytkowników
- ✅ `ratings` - Oceny odpowiedzi
- ✅ `legal_acts` - Akty prawne
- ✅ `legal_act_chunks` - Fragmenty aktów z embeddings
- ✅ `legal_act_relations` - Relacje między aktami

### Sprawdź funkcje RPC

```bash
# Przez psql
psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
"
```

### Oczekiwane funkcje:

- ✅ `health_check()` - Health check dla endpointu `/health`
- ✅ `semantic_search_chunks()` - Wyszukiwanie semantyczne
- ✅ `fetch_related_acts()` - Pobieranie powiązanych aktów

## 🧪 Testy Integracyjne

### Uruchamianie Testów

```bash
cd backend

# Wszystkie testy integracyjne
pytest tests/integration/ -v -m integration

# Konkretny plik testowy
pytest tests/integration/test_database_integration.py -v

# Z dodatkowymi informacjami
pytest tests/integration/ -v -m integration -s
```

### Co testują testy integracyjne?

1. **Połączenie z bazą danych**
   - Test połączenia z Supabase
   - Test funkcji `health_check()`

2. **Operacje CRUD na query_history**
   - Tworzenie zapytań
   - Odczyt zapytań
   - Aktualizacja zapytań
   - Usuwanie zapytań
   - Listowanie zapytań użytkownika

3. **Operacje na ratings**
   - Tworzenie ocen
   - Test unikalnego constraint (jeden rating na użytkownika/zapytanie/typ)

4. **Repository pattern**
   - Test `QueryRepository` z prawdziwą bazą danych

5. **Funkcje RPC**
   - Weryfikacja istnienia funkcji `semantic_search_chunks`
   - Weryfikacja istnienia funkcji `fetch_related_acts`

6. **Struktura tabel**
   - Weryfikacja kolumn w `query_history`
   - Weryfikacja kolumn w `ratings`

### Oczekiwane wyniki

```
tests/integration/test_database_integration.py::test_database_connection PASSED
tests/integration/test_database_integration.py::test_health_check_rpc PASSED
tests/integration/test_database_integration.py::test_create_query PASSED
tests/integration/test_database_integration.py::test_read_query PASSED
...
```

## 🔧 Troubleshooting

### Problem: "Supabase CLI not found"

**Rozwiązanie:**
```bash
# Linux
curl -fsSL https://supabase.com/install.sh | sh

# Lub zainstaluj ręcznie z GitHub Releases
```

### Problem: "Could not connect to Supabase"

**Rozwiązanie:**
1. Sprawdź, czy Supabase działa:
   ```bash
   curl http://localhost:54321/health
   ```

2. Sprawdź zmienne środowiskowe:
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_KEY
   ```

3. Dla lokalnego Supabase:
   ```bash
   supabase start
   ```

### Problem: "Migration failed: relation already exists"

**Rozwiązanie:**
To normalne - migracje używają `CREATE IF NOT EXISTS`. Jeśli chcesz wyczyścić bazę:
```bash
supabase db reset  # UWAGA: Usuwa wszystkie dane!
```

### Problem: "Unique constraint violation" w testach

**Rozwiązanie:**
Testy automatycznie czyszczą dane po sobie. Jeśli widzisz ten błąd, sprawdź czy:
1. Poprzednie testy nie zostały przerwane
2. Cleanup fixture działa poprawnie

### Problem: "RPC function not found"

**Rozwiązanie:**
Upewnij się, że migracje z funkcjami RPC zostały zastosowane:
- `20251201120000_create_health_check_function.sql`
- `20251201130000_create_semantic_search_function.sql`
- `20251201130100_create_fetch_related_acts_function.sql`

## 📝 Uwagi

- **Testy integracyjne wymagają prawdziwej bazy danych** - nie używają mocków
- **Testy automatycznie czyszczą dane** po sobie (fixture `cleanup_test_data`)
- **Każdy test używa unikalnego user_id** (`test-user-{uuid}`) aby uniknąć konfliktów
- **Testy są oznaczone markerem `@pytest.mark.integration`** - możesz je pominąć:
  ```bash
  pytest -v -m "not integration"  # Tylko testy jednostkowe
  ```

## 🔗 Zobacz też

- [README.md](README.md) - Ogólne informacje o projekcie
- [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) - Instrukcje konfiguracji
- [.ai/notatki/note_01.12.2025.md](.ai/notatki/note_01.12.2025.md) - Status implementacji

