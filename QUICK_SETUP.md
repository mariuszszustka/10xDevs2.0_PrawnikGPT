# 🚀 Szybka instalacja PrawnikGPT - Migracje ręczne

## Problem
Nie można połączyć się z PostgreSQL zdalnie (firewall/konfiguracja).

## Rozwiązanie: Zastosuj migracje przez Supabase Dashboard

### Krok 1: Otwórz Supabase Dashboard

Otwórz w przeglądarce (na serwerze 192.168.0.11 lub przez tunel SSH):
```
http://192.168.0.11:8443
```

Lub jeśli port 8443 też nie działa, spróbuj:
- `http://192.168.0.11:54323` (Supabase Studio)
- `http://localhost:54323` (jeśli jesteś na serwerze)

### Krok 2: Zaloguj się

Użyj swoich danych admina.

### Krok 3: Przejdź do SQL Editor

1. W lewym menu kliknij **SQL Editor**
2. Kliknij **New query**

### Krok 4: Zastosuj migracje po kolei

Otwórz każdy plik z folderu `supabase/migrations/` i wykonaj (KOLEJNOŚĆ WAŻNA!):

⚠️ **UWAGA:** Jeśli otrzymasz błąd `text search configuration "polish" does not exist`, to normalne - migracje używają teraz `simple` zamiast `polish` (działa na wszystkich instalacjach PostgreSQL).

---

#### 1️⃣ Migracja: Enable Extensions

**Plik:** `20250112100000_enable_extensions.sql`

```sql
create extension if not exists vector;
create extension if not exists unaccent;
```

**Kliknij:** `Run` (Ctrl+Enter)

✅ Powinno pokazać: `Success`

---

#### 2️⃣ Migracja: Create ENUM Types

**Plik:** `20250112100100_create_enums.sql`

Skopiuj całą zawartość pliku (lub użyj poniżej):

```sql
create type response_type_enum as enum ('fast', 'accurate');
create type rating_value_enum as enum ('up', 'down');
create type relation_type_enum as enum (
  'modifies',
  'repeals',
  'implements',
  'based_on',
  'amends'
);
create type legal_act_status_enum as enum (
  'obowiązująca',
  'uchylona',
  'nieobowiązująca'
);
```

**Kliknij:** `Run`

---

#### 3️⃣ Migracja: Create Query History Table

**Plik:** `20250112100200_create_query_history_table.sql`

Skopiuj całą zawartość pliku i wykonaj.

---

#### 4️⃣ Migracja: Create Ratings Table

**Plik:** `20250112100300_create_ratings_table.sql`

Skopiuj całą zawartość pliku i wykonaj.

---

#### 5️⃣ Migracja: Create Legal Acts Table

**Plik:** `20250112100400_create_legal_acts_table.sql`

Skopiuj całą zawartość pliku i wykonaj.

---

#### 6️⃣ Migracja: Create Legal Act Chunks Table

**Plik:** `20250112100500_create_legal_act_chunks_table.sql`

Skopiuj całą zawartość pliku i wykonaj.

**⚠️ UWAGA:** Ta migracja może trwać dłużej (tworzenie indeksu IVFFlat).

---

#### 7️⃣ Migracja: Create Legal Act Relations Table

**Plik:** `20250112100600_create_legal_act_relations_table.sql`

Skopiuj całą zawartość pliku i wykonaj.

---

### Krok 5: Weryfikacja

Wykonaj w SQL Editor:

```sql
-- Sprawdź utworzone tabele
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Powinieneś zobaczyć:
- ✅ `legal_act_chunks`
- ✅ `legal_act_relations`
- ✅ `legal_acts`
- ✅ `query_history`
- ✅ `ratings`

---

### Krok 6: Sprawdź rozszerzenia

```sql
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('vector', 'unaccent');
```

Powinieneś zobaczyć:
- ✅ `vector` (wersja np. 0.7.0)
- ✅ `unaccent` (wersja np. 1.1)

---

## ✅ Gotowe!

Teraz możesz uruchomić aplikację lokalnie:

```powershell
# Terminal 1: Frontend
npm install
npm run dev

# Terminal 2: Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

---

## 🔧 Alternatywa: SSH Tunnel

Jeśli chcesz używać CLI/psql, utwórz tunel SSH:

```powershell
# Na Windows (jeśli masz SSH)
ssh -L 5432:localhost:5432 user@192.168.0.11 -N

# Następnie w nowym terminalu:
supabase db push --db-url "postgresql://postgres:postgres@localhost:5432/postgres"
```

---

## 📝 Pliki .env

Pliki `.env` i `backend/.env` są już utworzone z domyślnymi kluczami:

- `SUPABASE_URL=http://192.168.0.11:8443`
- `DATABASE_URL=postgresql://postgres:postgres@192.168.0.11:5432/postgres`

Jeśli używasz innych haseł/kluczy, edytuj te pliki:

```powershell
notepad .env
notepad backend\.env
```

---

## ❓ Problemy?

### Port 8443 nie działa?

Spróbuj:
```
http://192.168.0.11:54323
```

### Nie masz dostępu do Dashboard?

Zaloguj się na serwer przez SSH i wykonaj migracje tam:

```bash
ssh user@192.168.0.11
cd /path/to/supabase
docker exec -i supabase-db psql -U postgres -d postgres < migration.sql
```

### Supabase Kong blokuje?

Sprawdź konfigurację Kong w `docker-compose.yml` - czy API Gateway wystawia prawidłowe porty.

---

## 🇵🇱 Opcjonalnie: Włącz polskie wyszukiwanie pełnotekstowe

Domyślnie migracje używają `simple` text search (działa wszędzie, ale bez polskiego stemmingu).

Jeśli chcesz lepsze wyszukiwanie polskie (np. "konsument" znajdzie "konsumenta"):

### Na serwerze z Supabase:

```bash
# Zaloguj się przez SSH
ssh user@192.168.0.11

# Zainstaluj polskie słowniki w kontenerze PostgreSQL
docker exec -it supabase-db bash

# W kontenerze:
apt-get update
apt-get install -y postgresql-contrib-15

# Wyjdź z kontenera (Ctrl+D)

# Zrestartuj kontener
docker restart supabase-db
```

### Następnie w SQL Editor:

```sql
-- Sprawdź, czy polski jest dostępny
SELECT cfgname FROM pg_ts_config WHERE cfgname = 'polish';

-- Jeśli nie ma, utwórz konfigurację:
CREATE TEXT SEARCH CONFIGURATION polish (COPY = simple);
```

### Zmień migracje:

W plikach `20250112100400_create_legal_acts_table.sql` i `20250112100500_create_legal_act_chunks_table.sql`:

Znajdź: `to_tsvector('simple', ...)`  
Zamień na: `to_tsvector('polish', ...)`

Następnie przebuduj indeksy:

```sql
REINDEX INDEX idx_legal_acts_title_fts;
REINDEX INDEX idx_legal_act_chunks_content_fts;
```

**Dla MVP:** `simple` jest wystarczające! 🚀

