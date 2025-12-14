# Weryfikacja bazy danych dla testów E2E

**Data:** 2025-01-11  
**Cel:** Przygotowanie bazy danych do testów end-to-end

## 📊 Status bazy danych

### ✅ Struktura bazy danych

Baza danych zawiera następujące elementy:

#### 1. Rozszerzenia PostgreSQL
- ✅ `vector` - dla embeddings (pgvector)
- ✅ `unaccent` - dla polskiego wyszukiwania

#### 2. Typy ENUM
- ✅ `response_type_enum` - (fast, accurate)
- ✅ `rating_value_enum` - (up, down)
- ✅ `relation_type_enum` - (modifies, repeals, implements, based_on, amends)
- ✅ `legal_act_status_enum` - (obowiązująca, uchylona, nieobowiązująca)

#### 3. Tabele (5)
- ✅ `legal_acts` - Akty prawne (metadata)
- ✅ `legal_act_chunks` - Fragmenty aktów z embeddings (dla RAG)
- ✅ `legal_act_relations` - Relacje między aktami
- ✅ `query_history` - Historia zapytań użytkowników
- ✅ `ratings` - Oceny odpowiedzi

#### 4. Funkcje RPC
- ✅ `health_check()` - Health check endpoint
- ✅ `semantic_search_chunks()` - Wyszukiwanie semantyczne
- ✅ `fetch_related_acts()` - Pobieranie powiązanych aktów
- ✅ `list_user_queries()` - Listowanie zapytań użytkownika

#### 5. Row Level Security (RLS)
- ✅ Wszystkie tabele mają włączone RLS
- ✅ Polityki RLS skonfigurowane poprawnie

## 🔍 Jak zweryfikować bazę danych

### Metoda 1: Skrypt SQL (ZALECANE)

Uruchom skrypt weryfikacyjny w Supabase Dashboard:

1. Otwórz Supabase Dashboard (SQL Editor)
2. Otwórz plik: `supabase/verify-database.sql`
3. Skopiuj zawartość i wykonaj (Run)

Skrypt sprawdzi:
- ✅ Rozszerzenia PostgreSQL
- ✅ Typy ENUM
- ✅ Tabele i ich strukturę
- ✅ Indeksy
- ✅ Funkcje RPC
- ✅ Row Level Security
- ✅ Polityki RLS
- ✅ Liczbę rekordów w tabelach
- ✅ Użytkowników testowych

### Metoda 2: Przez psql

```bash
# Połącz się z bazą danych
psql -h localhost -p 54322 -U postgres -d postgres

# Uruchom skrypt weryfikacyjny
\i supabase/verify-database.sql
```

### Metoda 3: Przez Supabase CLI

```bash
# Sprawdź status migracji
supabase db diff

# Sprawdź tabele
supabase db inspect
```

## 📋 Wymagania dla testów E2E

### 1. Struktura bazy danych

✅ **Wszystkie tabele muszą istnieć:**
- `legal_acts`
- `legal_act_chunks`
- `legal_act_relations`
- `query_history`
- `ratings`

### 2. Dane testowe

⚠️ **Wymagane dane dla testów E2E:**

#### a) Akty prawne (`legal_acts`)
- **Minimum:** 10-20 aktów prawnych dla testów
- **Zalecane:** 100+ aktów dla pełnych testów
- **Status:** Powinny być akty ze statusem `obowiązująca`

#### b) Fragmenty aktów (`legal_act_chunks`)
- **Minimum:** 50-100 fragmentów z embeddings
- **Zalecane:** 500+ fragmentów dla pełnych testów
- **Wymagane:** Każdy fragment musi mieć embedding (vector)

#### c) Użytkownicy testowi (`auth.users`)
- **Wymagane:** Co najmniej 1 użytkownik testowy
- **Zalecane:** 2-3 użytkowników dla różnych scenariuszy
- **Przykładowe emaile:**
  - `test@example.com`
  - `e2e-test@example.com`
  - `user@test.com`

### 3. Użytkownicy testowi

#### Utworzenie użytkowników testowych

**Metoda 1: Przez Supabase Dashboard**
1. Otwórz Supabase Dashboard → Authentication → Users
2. Kliknij "Add user"
3. Wprowadź email i hasło
4. Kliknij "Create user"

**Metoda 2: Przez API (signup)**
```bash
curl -X POST http://localhost:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

**Metoda 3: Przez SQL (tylko dla lokalnego Supabase)**
```sql
-- UWAGA: Tylko dla lokalnego Supabase!
-- W produkcji użyj Supabase Auth API

INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    crypt('Test123!@#', gen_salt('bf')),
    now(),
    now(),
    now()
);
```

## 🧪 Przygotowanie danych testowych

### Opcja 1: Użyj istniejących danych

Jeśli baza zawiera już dane z produkcji lub developmentu:
- ✅ Możesz użyć ich do testów E2E
- ⚠️ Upewnij się, że są odpowiednie akty prawne

### Opcja 2: Utwórz dane testowe ręcznie

**Przykładowe dane dla `legal_acts`:**
```sql
INSERT INTO legal_acts (
    publisher, year, position, title, typ_aktu, status, 
    organ_wydajacy, published_date, effective_date
) VALUES 
(
    'dz-u', 2023, 1234, 
    'Ustawa o prawach konsumenta', 
    'ustawa', 
    'obowiązująca',
    'sejm',
    '2023-01-15',
    '2023-02-01'
),
(
    'dz-u', 1964, 16,
    'Kodeks cywilny',
    'ustawa',
    'obowiązująca',
    'sejm',
    '1964-04-23',
    '1964-04-23'
);
```

**Przykładowe dane dla `legal_act_chunks`:**
```sql
-- UWAGA: Wymaga embeddings! Użyj backend API do generowania embeddings
-- Przykład przez backend:
-- POST /api/legal-acts/ingest
```

### Opcja 3: Użyj skryptu seed (jeśli istnieje)

Sprawdź czy istnieje plik `supabase/seed.sql`:
```bash
ls -la supabase/seed.sql
```

Jeśli nie istnieje, możesz go utworzyć na podstawie przykładów powyżej.

## ✅ Checklist przed uruchomieniem testów E2E

- [ ] ✅ Wszystkie migracje zastosowane
- [ ] ✅ Wszystkie tabele istnieją
- [ ] ✅ Rozszerzenia PostgreSQL włączone (vector, unaccent)
- [ ] ✅ Funkcje RPC utworzone
- [ ] ✅ RLS włączone i skonfigurowane
- [ ] ✅ Tabela `legal_acts` zawiera dane (minimum 10-20 rekordów)
- [ ] ✅ Tabela `legal_act_chunks` zawiera dane z embeddings (minimum 50-100 rekordów)
- [ ] ✅ Użytkownicy testowi utworzeni (minimum 1 użytkownik)
- [ ] ✅ Backend działa i połączony z bazą danych
- [ ] ✅ Frontend działa i połączony z backendem

## 🚀 Uruchomienie testów E2E

Po weryfikacji bazy danych:

```bash
# 1. Uruchom backend (jeśli nie działa)
cd backend
python -m uvicorn main:app --reload --port 8000

# 2. W innym terminalu: uruchom frontend (jeśli nie działa)
npm run dev

# 3. W trzecim terminalu: uruchom testy E2E
npm run test:e2e
```

## 📝 Uwagi

1. **Dane testowe:** Testy E2E mogą modyfikować dane w bazie (tworzenie zapytań, ocen). Rozważ użycie osobnej bazy testowej lub automatyczne czyszczenie danych po testach.

2. **Użytkownicy testowi:** Upewnij się, że hasła użytkowników testowych są znane i zapisane w konfiguracji testów (np. w zmiennych środowiskowych).

3. **RLS:** Row Level Security jest włączone, więc testy muszą używać prawidłowych tokenów autoryzacyjnych.

4. **Embeddings:** Fragmenty aktów (`legal_act_chunks`) muszą mieć embeddings wygenerowane przez model embedding (np. nomic-embed-text). Bez embeddings RAG nie będzie działać.

## 🔗 Powiązane dokumenty

- `supabase/verify-database.sql` - Skrypt weryfikacyjny
- `e2e/README.md` - Dokumentacja testów E2E
- `docs/INTEGRATION_TESTS.md` - Dokumentacja testów integracyjnych
- `backend/supabase_status.md` - Status połączenia z Supabase
