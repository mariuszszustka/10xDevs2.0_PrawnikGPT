# Database Schema – PrawnikGPT (Supabase/PostgreSQL + pgvector)

**Wersja:** 1.0 (MVP)  
**Data ostatniej aktualizacji:** 2025-01-18  
**Stack:** PostgreSQL 15+ + pgvector extension na Supabase

---

## Przegląd architektury

Schemat bazy danych został zaprojektowany dla MVP aplikacji PrawnikGPT, skupiając się na prostocie, wydajności i skalowalności. Struktura wspiera:

- **Autentykację użytkowników** (Supabase Auth)
- **Dwupoziomowy system odpowiedzi** (fast/accurate)
- **RAG z wyszukiwaniem semantycznym** (pgvector)
- **Historię zapytań i oceny**
- **20,000 aktów prawnych z ISAP** (statyczny dataset)
- **Row-Level Security** (RLS) dla izolacji danych

**Filozofia projektowa:** Denormalizacja tam, gdzie upraszcza MVP (np. obie odpowiedzi w jednej tabeli), normalizacja dla integralności danych referencyjnych (akty prawne).

---

## 1. Extensions (Rozszerzenia PostgreSQL)

```sql
-- pgvector extension dla similarity search (wyszukiwanie semantyczne)
CREATE EXTENSION IF NOT EXISTS vector;

-- unaccent extension dla lepszego wyszukiwania tekstowego (opcjonalne)
-- Usuwa polskie znaki diakrytyczne: "ł" → "l", "ą" → "a"
CREATE EXTENSION IF NOT EXISTS unaccent;
```

**Uwagi:**

- `vector` extension jest wymagany dla kolumn typu `VECTOR` i operatorów podobieństwa (`<=>`)
- `unaccent` jest opcjonalny, ale zalecany dla lepszej tolerancji błędów ortograficznych
- Supabase ma oba extensions zainstalowane domyślnie

---

## 2. ENUM Types (Typy wyliczeniowe)

Typy ENUM zapewniają integralność danych na poziomie bazy i wydajność (przechowywane jako liczby).

```sql
-- Typ odpowiedzi: szybka (7B-13B model) lub dokładna (120B model)
CREATE TYPE response_type_enum AS ENUM ('fast', 'accurate');

-- Typ oceny użytkownika: kciuk w górę lub w dół
CREATE TYPE rating_value_enum AS ENUM ('up', 'down');

-- Typ relacji między aktami prawnymi (z ISAP API)
CREATE TYPE relation_type_enum AS ENUM (
  'modifies',      -- Akt A modyfikuje akt B
  'repeals',       -- Akt A uchyla akt B
  'implements',    -- Akt A wykonuje/implementuje akt B
  'based_on',      -- Akt A jest oparty na akcie B
  'amends'         -- Akt A zmienia akt B
);

-- Status aktu prawnego w polskim systemie prawnym
CREATE TYPE legal_act_status_enum AS ENUM (
  'obowiązująca',      -- Akt jest aktualnie obowiązujący
  'uchylona',          -- Akt został uchylony
  'nieobowiązująca'    -- Akt nie jest jeszcze/już nie jest obowiązujący
);
```

**Uwagi:**

- Wartości ENUM są case-sensitive
- Dodawanie nowych wartości do ENUM w PostgreSQL jest możliwe, ale nie ma operacji DROP dla wartości
- W przyszłości, jeśli ISAP API zwróci nowe typy relacji, można je dodać: `ALTER TYPE relation_type_enum ADD VALUE 'new_type';`

---

## 3. Tabele (Tables)

### 3.1. auth.users

**Typ:** System table (Supabase Auth)  
**Zarządzana przez:** Supabase Auth Service  
**RLS:** Wbudowany przez Supabase

Ta tabela jest zarządzana automatycznie przez Supabase Auth. **Nie trzeba jej tworzyć ręcznie.**

**Kluczowe kolumny:**

- `id`: UUID PRIMARY KEY (używany jako `user_id` w innych tabelach)
- `email`: VARCHAR(255) NOT NULL UNIQUE
- `encrypted_password`: VARCHAR NOT NULL (hash bcrypt)
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- `confirmed_at`: TIMESTAMPTZ (null w MVP - bez weryfikacji email)
- `last_sign_in_at`: TIMESTAMPTZ

**Integracja z aplikacją:**

- FastAPI używa `auth.uid()` do pobrania ID zalogowanego użytkownika
- JWT token z Supabase Auth zawiera `user_id` w payload
- RLS policies używają `auth.uid()` do weryfikacji własności danych

---

### 3.2. query_history (Historia zapytań użytkowników)

**Typ:** User data table  
**RLS:** Enabled (user_id = auth.uid())  
**Denormalizacja:** Obie odpowiedzi (fast + accurate) w jednej tabeli dla uproszczenia MVP

Przechowuje pytania użytkowników wraz z odpowiedziami (szybką i dokładną) w jednej tabeli.

```sql
CREATE TABLE query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Zapytanie użytkownika (walidacja długości zgodna z PRD: 10-1000 znaków)
  query_text TEXT NOT NULL CHECK (length(query_text) BETWEEN 10 AND 1000),

  -- Szybka odpowiedź (zawsze generowana, NOT NULL)
  fast_response_content TEXT NOT NULL CHECK (length(fast_response_content) > 0),

  -- Dokładna odpowiedź (opcjonalna, generowana na żądanie użytkownika)
  accurate_response_content TEXT CHECK (length(accurate_response_content) > 0),

  -- Źródła odpowiedzi: array of {act_title, article, link}
  -- Format: [{"act_title": "...", "article": "Art. 5", "link": "/acts/..."}]
  sources JSONB NOT NULL DEFAULT '[]',

  -- Metadane modeli użytych do generowania odpowiedzi
  fast_model_name VARCHAR(100) NOT NULL,           -- np. 'mistral:7b'
  accurate_model_name VARCHAR(100),                -- np. 'gpt-oss:120b' (nullable)

  -- Czas generowania odpowiedzi (w milisekundach)
  fast_generation_time_ms INTEGER NOT NULL CHECK (fast_generation_time_ms > 0),
  accurate_generation_time_ms INTEGER CHECK (accurate_generation_time_ms > 0),

  -- Timestamp utworzenia
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Example `sources` JSON:**

```json
[
  {
    "act_title": "Ustawa o prawach konsumenta",
    "article": "Art. 5 ust. 1",
    "link": "/acts/dz-u/2023/1234#art-5",
    "chunk_id": "uuid-chunk-1"
  },
  {
    "act_title": "Kodeks cywilny",
    "article": "Art. 384",
    "link": "/acts/dz-u/1964/16#art-384",
    "chunk_id": "uuid-chunk-2"
  }
]
```

**Indexes:**

```sql
-- Szybki dostęp do historii użytkownika (SELECT WHERE user_id = ...)
CREATE INDEX idx_query_history_user_id ON query_history(user_id);

-- Sortowanie chronologiczne (ORDER BY created_at DESC)
CREATE INDEX idx_query_history_created_at ON query_history(created_at DESC);
```

**RLS Policies:**

```sql
-- Użytkownicy mogą odczytywać tylko swoje zapytania
CREATE POLICY query_history_select_own
  ON query_history FOR SELECT
  USING (user_id = auth.uid());

-- Użytkownicy mogą wstawiać tylko z własnym user_id
CREATE POLICY query_history_insert_own
  ON query_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Użytkownicy mogą usuwać tylko swoje zapytania (US-007)
CREATE POLICY query_history_delete_own
  ON query_history FOR DELETE
  USING (user_id = auth.uid());
```

**Projektowe decyzje:**

1. **Denormalizacja:** Obie odpowiedzi w jednej tabeli zamiast osobnej tabeli `responses` - upraszcza queries i jest wystarczające dla MVP
2. **Walidacja długości:** `query_text` ograniczony do 1000 znaków zgodnie z US-003 i wymaganiami UX
3. **JSONB sources:** Elastyczny format dla przechowywania źródeł bez osobnej tabeli (wystarczające dla MVP)
4. **ON DELETE CASCADE:** Automatyczne usuwanie historii przy usunięciu użytkownika (RODO compliance)

---

### 3.3. ratings (Oceny odpowiedzi)

**Typ:** User data table  
**RLS:** Enabled (user_id = auth.uid())  
**Relacje:** One-to-Many z query_history

Przechowuje oceny użytkowników dla odpowiedzi (thumbs up/down). Powiązane z `query_history` przez `query_history_id` i `response_type`.

```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Klucze obce
  query_history_id UUID NOT NULL REFERENCES query_history(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Typ odpowiedzi (fast/accurate) - określa którą odpowiedź użytkownik ocenia
  response_type response_type_enum NOT NULL,

  -- Wartość oceny (up/down)
  rating_value rating_value_enum NOT NULL,

  -- Opcjonalny komentarz (przygotowane na przyszłość, poza zakresem MVP)
  comment TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Trigger:** Auto-update `updated_at` on UPDATE

```sql
CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Indexes:**

```sql
-- Szybki dostęp do ocen dla konkretnego zapytania
CREATE INDEX idx_ratings_query_history_id ON ratings(query_history_id);

-- Szybki dostęp do ocen użytkownika
CREATE INDEX idx_ratings_user_id ON ratings(user_id);

-- Filtrowanie i analityka po typie odpowiedzi
CREATE INDEX idx_ratings_response_type ON ratings(response_type);
```

**RLS Policies:**

```sql
-- Użytkownicy mogą odczytywać tylko swoje oceny
CREATE POLICY ratings_select_own
  ON ratings FOR SELECT
  USING (user_id = auth.uid());

-- Użytkownicy mogą wstawiać tylko z własnym user_id
CREATE POLICY ratings_insert_own
  ON ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Użytkownicy mogą aktualizować tylko swoje oceny (zmiana up/down)
CREATE POLICY ratings_update_own
  ON ratings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Użytkownicy mogą usuwać tylko swoje oceny
CREATE POLICY ratings_delete_own
  ON ratings FOR DELETE
  USING (user_id = auth.uid());
```

**Projektowe decyzje:**

1. **Brak UNIQUE constraint:** Użytkownik może zmienić ocenę (logika UPSERT w aplikacji)
2. **ON DELETE CASCADE:** Automatyczne usuwanie ocen przy usunięciu zapytania (US-007)
3. **response_type:** Każda odpowiedź (fast/accurate) może mieć osobną ocenę
4. **updated_at:** Śledzenie zmian ocen dla analityki

---

### 3.4. legal_acts (Akty prawne - metadane)

**Typ:** Reference data table (read-only w MVP)  
**RLS:** Disabled (public read access)  
**Źródło danych:** ISAP API (`https://api.sejm.gov.pl/eli`)

Przechowuje metadane aktów prawnych z ISAP. Tabela jest wypełniana przez jednorazowy proces ingecji (20k najnowszych ustaw).

```sql
CREATE TABLE legal_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unikalny identyfikator aktu w ISAP (triplet: publisher/year/position)
  publisher VARCHAR(50) NOT NULL,        -- np. 'dz-u', 'mp', 'wdu'
  year INTEGER NOT NULL CHECK (year BETWEEN 1918 AND 2100),
  position INTEGER NOT NULL CHECK (position > 0),

  -- Metadane aktu
  title TEXT NOT NULL,                   -- Tytuł aktu (pełna nazwa)
  typ_aktu VARCHAR(255) NOT NULL,        -- 'ustawa', 'rozporządzenie', 'obwieszczenie', etc.
  status legal_act_status_enum NOT NULL, -- 'obowiązująca', 'uchylona', 'nieobowiązująca'
  organ_wydajacy TEXT,                   -- Organ wydający (Sejm, Prezydent, Minister, etc.)

  -- Daty
  published_date DATE NOT NULL,          -- Data publikacji w dzienniku urzędowym
  effective_date DATE,                   -- Data wejścia w życie (nullable)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unikalny constraint dla identyfikacji aktu
  CONSTRAINT unique_legal_act UNIQUE(publisher, year, position)
);
```

**Trigger:** Auto-update `updated_at` on UPDATE

```sql
CREATE TRIGGER update_legal_acts_updated_at
  BEFORE UPDATE ON legal_acts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Indexes:**

```sql
-- Unikalny indeks dla identyfikacji aktu (używany przy INSERT ... ON CONFLICT)
CREATE UNIQUE INDEX idx_legal_acts_publisher_year_position
  ON legal_acts(publisher, year, position);

-- Sortowanie po dacie publikacji (dla przyszłych filtrowan)
CREATE INDEX idx_legal_acts_published_date
  ON legal_acts(published_date DESC);

-- Full-text search na tytule (dla przyszłych wyszukiwarek)
CREATE INDEX idx_legal_acts_title_fts
  ON legal_acts USING GIN (to_tsvector('polish', title));
```

**RLS Policy:**

- **Brak RLS** - akty prawne są publiczne i dostępne dla wszystkich użytkowników (read-only)
- Zapis zarządzany przez admin service role key (backend)

**Projektowe decyzje:**

1. **Unikalny identyfikator:** (publisher, year, position) zamiast UUID jako business key
2. **TEXT dla title:** Tytuły aktów mogą być długie (>255 znaków)
3. **DATE zamiast TIMESTAMPTZ:** Daty publikacji nie zawierają godziny
4. **Status ENUM:** Integralność danych zapewniona przez typ wyliczeniowy

---

### 3.5. legal_act_chunks (Fragmenty aktów z embeddingami)

**Typ:** Reference data table (read-only w MVP)  
**RLS:** Disabled (public read access)  
**Relacja:** Many-to-One z legal_acts

Przechowuje fragmenty tekstowe aktów prawnych wraz z wektorowymi reprezentacjami (embeddings) dla wyszukiwania semantycznego RAG.

```sql
CREATE TABLE legal_act_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Klucz obcy do aktu prawnego
  legal_act_id UUID NOT NULL REFERENCES legal_acts(id) ON DELETE RESTRICT,

  -- Kolejność fragmentu w akcie (0-indexed)
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),

  -- Treść fragmentu (500-5000 znaków, per artykuł/paragraf)
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 50 AND 5000),

  -- Embedding wektorowy (1024-dimensional vector)
  -- Wsparcie dla: nomic-embed-text (768-dim) i mxbai-embed-large (1024-dim)
  embedding VECTOR(1024) NOT NULL,

  -- Nazwa modelu użytego do wygenerowania embeddingu
  embedding_model_name VARCHAR(100) NOT NULL,  -- np. 'nomic-embed-text'

  -- Metadane fragmentu (lokalizacja w akcie)
  -- Format: {"type": "article", "number": "10a", "paragraph": "1"}
  metadata JSONB,

  -- Kolumna tsvector dla full-text search (automatycznie aktualizowana)
  content_tsvector tsvector,

  -- Timestamp utworzenia
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unikalny constraint dla fragmentu w akcie
  CONSTRAINT unique_chunk_in_act UNIQUE(legal_act_id, chunk_index)
);
```

**Trigger:** Auto-update `content_tsvector` on INSERT/UPDATE

```sql
CREATE OR REPLACE FUNCTION update_legal_act_chunks_tsvector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsvector := to_tsvector('polish', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_act_chunks_tsvector_trigger
  BEFORE INSERT OR UPDATE ON legal_act_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_act_chunks_tsvector();
```

**Example `metadata` JSON:**

```json
{
  "type": "article",
  "number": "10a",
  "paragraph": "1",
  "section": "Rozdział II"
}
```

**Indexes:**

```sql
-- B-tree index dla JOIN z legal_acts
CREATE INDEX idx_legal_act_chunks_legal_act_id
  ON legal_act_chunks(legal_act_id);

-- IVFFlat index dla similarity search (CRITICAL dla RAG performance)
CREATE INDEX idx_legal_act_chunks_embedding_ivfflat
  ON legal_act_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
-- Tune based on data size: lists = sqrt(total_rows)
-- For 500k chunks: lists = 707 (~sqrt(500000))
-- Start with 100 for MVP, tune after data ingestion

-- GIN index dla full-text search (hybrydowe zapytania)
CREATE INDEX idx_legal_act_chunks_content_fts
  ON legal_act_chunks
  USING GIN (content_tsvector);
```

**RLS Policy:**

- **Brak RLS** - fragmenty aktów są publiczne (read-only)

**Projektowe decyzje:**

1. **VECTOR(1024):** Elastyczność dla różnych modeli embeddingów bez zmiany schematu
2. **ON DELETE RESTRICT:** Zapobiega przypadkowemu usunięciu aktu z powiązanymi fragmentami
3. **content_tsvector:** Automatyczne generowanie przez trigger dla FTS
4. **IVFFlat vs HNSW:** IVFFlat dla MVP (szybsza budowa, niższa pamięć), HNSW w przyszłości dla lepszej accuracy
5. **vector_cosine_ops:** Cosine similarity dla znormalizowanych embeddingów (standard w RAG)
6. **embedding_model_name:** Umożliwia re-indeksację przy zmianie modelu w przyszłości

**Similarity search example:**

```sql
-- Find top 10 most similar chunks to query embedding
SELECT id, content, metadata,
       (embedding <=> $1::vector) AS distance
FROM legal_act_chunks
WHERE legal_act_id IN (SELECT id FROM legal_acts WHERE status = 'obowiązująca')
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

---

### 3.6. legal_act_relations (Powiązania między aktami)

**Typ:** Reference data table (read-only w MVP)  
**RLS:** Disabled (public read access)  
**Relacja:** Many-to-Many między legal_acts (kierunkowa)

Przechowuje relacje między aktami prawnymi (modyfikuje, uchyla, implementuje, etc.) z ISAP API.

```sql
CREATE TABLE legal_act_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Klucze obce (relacja kierunkowa: source -> target)
  source_act_id UUID NOT NULL REFERENCES legal_acts(id) ON DELETE RESTRICT,
  target_act_id UUID NOT NULL REFERENCES legal_acts(id) ON DELETE RESTRICT,

  -- Typ relacji (z ISAP API)
  relation_type relation_type_enum NOT NULL,

  -- Opcjonalny opis relacji (z ISAP API)
  description TEXT,

  -- Timestamp utworzenia
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CHECK (source_act_id != target_act_id),  -- Akt nie może odnosić się do samego siebie
  CONSTRAINT unique_relation UNIQUE(source_act_id, target_act_id, relation_type)
);
```

**Indexes:**

```sql
-- Szybkie wyszukiwanie relacji od źródła (source -> targets)
CREATE INDEX idx_legal_act_relations_source
  ON legal_act_relations(source_act_id);

-- Szybkie wyszukiwanie relacji do celu (target <- sources)
CREATE INDEX idx_legal_act_relations_target
  ON legal_act_relations(target_act_id);

-- Filtrowanie po typie relacji
CREATE INDEX idx_legal_act_relations_type
  ON legal_act_relations(relation_type);
```

**RLS Policy:**

- **Brak RLS** - relacje są publiczne (read-only)

**Projektowe decyzje:**

1. **Kierunkowa relacja:** Przechowywanie jednej krotki na relację (source → target) zamiast dwukierunkowej
2. **ON DELETE RESTRICT:** Zapobiega przypadkowemu usunięciu aktu z powiązanymi relacjami
3. **Unique constraint:** Zapobiega duplikatom relacji (ten sam typ relacji między tymi samymi aktami)
4. **CHECK constraint:** Akt nie może mieć relacji sam do siebie

**Graph traversal example (max depth 2):**

```sql
WITH RECURSIVE act_tree AS (
  -- Base case: starting act
  SELECT source_act_id, target_act_id, relation_type, 1 AS depth
  FROM legal_act_relations
  WHERE source_act_id = $1

  UNION

  -- Recursive case: related acts (max depth 2)
  SELECT lar.source_act_id, lar.target_act_id, lar.relation_type, at.depth + 1
  FROM legal_act_relations lar
  JOIN act_tree at ON lar.source_act_id = at.target_act_id
  WHERE at.depth < 2
)
SELECT DISTINCT la.id, la.title, at.relation_type, at.depth
FROM act_tree at
JOIN legal_acts la ON la.id = at.target_act_id;
```

---

## 4. Relacje (Relationships)

```
auth.users (1) ──< (M) query_history
                        ↓
                   (1) ──< (M) ratings

auth.users (1) ──< (M) ratings

legal_acts (1) ──< (M) legal_act_chunks

legal_acts (1) ──< (M) legal_act_relations (source_act_id)
legal_acts (1) ──< (M) legal_act_relations (target_act_id)
```

**Cardinality:**

- `auth.users` → `query_history`: One-to-Many (ON DELETE CASCADE)
- `query_history` → `ratings`: One-to-Many (ON DELETE CASCADE)
- `auth.users` → `ratings`: One-to-Many (ON DELETE CASCADE)
- `legal_acts` → `legal_act_chunks`: One-to-Many (ON DELETE RESTRICT)
- `legal_acts` → `legal_act_relations`: One-to-Many (ON DELETE RESTRICT) - jako source i target

**ON DELETE semantics:**

- **CASCADE:** Dla danych użytkownika (RODO compliance) - automatyczne usuwanie historii i ocen
- **RESTRICT:** Dla danych referencyjnych (akty prawne) - zapobiega przypadkowemu usunięciu

---

## 5. Triggers (Wyzwalacze)

### 5.1. Auto-update `updated_at` column

Reusable function dla automatycznego aktualizowania kolumny `updated_at` przy każdej operacji UPDATE.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Apply to tables:**

```sql
CREATE TRIGGER update_legal_acts_updated_at
  BEFORE UPDATE ON legal_acts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5.2. Auto-update `content_tsvector` for FTS

Automatyczne generowanie kolumny `content_tsvector` dla full-text search w `legal_act_chunks`.

```sql
CREATE OR REPLACE FUNCTION update_legal_act_chunks_tsvector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsvector := to_tsvector('polish', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_act_chunks_tsvector_trigger
  BEFORE INSERT OR UPDATE ON legal_act_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_act_chunks_tsvector();
```

**Uwagi:**

- Konfiguracja 'polish' zapewnia stemming dla polskich słów (np. "konsument" → "konsument", "konsumenta" → "konsument")
- PostgreSQL w Supabase ma zainstalowany słownik języka polskiego domyślnie

---

## 6. Row-Level Security (RLS) Policies

RLS zapewnia ścisłą izolację danych między użytkownikami na poziomie bazy danych.

### 6.1. Enable RLS on tables

```sql
-- Włącz RLS dla tabel użytkowników
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Tabele aktów prawnych są publiczne (brak RLS)
-- legal_acts, legal_act_chunks, legal_act_relations
```

### 6.2. Policies for `query_history`

```sql
-- SELECT: Użytkownicy mogą odczytywać tylko swoje zapytania
CREATE POLICY query_history_select_own
  ON query_history
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Użytkownicy mogą wstawiać tylko z własnym user_id
CREATE POLICY query_history_insert_own
  ON query_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- DELETE: Użytkownicy mogą usuwać tylko swoje zapytania (US-007)
CREATE POLICY query_history_delete_own
  ON query_history
  FOR DELETE
  USING (user_id = auth.uid());
```

### 6.3. Policies for `ratings`

```sql
-- SELECT: Użytkownicy mogą odczytywać tylko swoje oceny
CREATE POLICY ratings_select_own
  ON ratings
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Użytkownicy mogą wstawiać tylko z własnym user_id
CREATE POLICY ratings_insert_own
  ON ratings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Użytkownicy mogą aktualizować tylko swoje oceny
CREATE POLICY ratings_update_own
  ON ratings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Użytkownicy mogą usuwać tylko swoje oceny
CREATE POLICY ratings_delete_own
  ON ratings
  FOR DELETE
  USING (user_id = auth.uid());
```

**Uwagi:**

- `auth.uid()` zwraca UUID zalogowanego użytkownika z JWT token (Supabase Auth)
- Jeśli użytkownik nie jest zalogowany, `auth.uid()` zwraca NULL i wszystkie policies zwracają FALSE
- Backend używa `service_role` key do operacji administracyjnych (omija RLS)

---

## 7. Indexes (Indeksy)

Indeksy zoptymalizowane dla wydajności queries w MVP.

### Performance-critical indexes

```sql
-- ==========================================
-- QUERY HISTORY INDEXES
-- ==========================================

-- Szybki dostęp do historii użytkownika (WHERE user_id = ...)
CREATE INDEX idx_query_history_user_id ON query_history(user_id);

-- Sortowanie chronologiczne (ORDER BY created_at DESC)
CREATE INDEX idx_query_history_created_at ON query_history(created_at DESC);

-- ==========================================
-- RATINGS INDEXES
-- ==========================================

-- JOIN z query_history (WHERE query_history_id = ...)
CREATE INDEX idx_ratings_query_history_id ON ratings(query_history_id);

-- Filtrowanie po użytkowniku (WHERE user_id = ...)
CREATE INDEX idx_ratings_user_id ON ratings(user_id);

-- Analityka i filtrowanie po typie odpowiedzi (WHERE response_type = ...)
CREATE INDEX idx_ratings_response_type ON ratings(response_type);

-- ==========================================
-- LEGAL ACTS INDEXES
-- ==========================================

-- Unikalny indeks dla identyfikacji aktu (INSERT ... ON CONFLICT)
CREATE UNIQUE INDEX idx_legal_acts_publisher_year_position
  ON legal_acts(publisher, year, position);

-- Sortowanie po dacie publikacji (ORDER BY published_date DESC)
CREATE INDEX idx_legal_acts_published_date
  ON legal_acts(published_date DESC);

-- Full-text search na tytule (WHERE to_tsvector('polish', title) @@ ...)
CREATE INDEX idx_legal_acts_title_fts
  ON legal_acts USING GIN (to_tsvector('polish', title));

-- ==========================================
-- LEGAL ACT CHUNKS INDEXES (CRITICAL dla RAG)
-- ==========================================

-- B-tree index dla JOIN z legal_acts
CREATE INDEX idx_legal_act_chunks_legal_act_id
  ON legal_act_chunks(legal_act_id);

-- IVFFlat index dla similarity search (ORDER BY embedding <=> ...)
-- **UWAGA:** To jest najbardziej krytyczny indeks dla wydajności RAG
CREATE INDEX idx_legal_act_chunks_embedding_ivfflat
  ON legal_act_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
-- Parametr 'lists' powinien być dostrojony po ingecji danych:
-- Formuła: lists = sqrt(total_rows)
-- Dla 500k chunks: lists = 707 (~sqrt(500000))
-- Dla 100k chunks: lists = 316 (~sqrt(100000))
-- Rozpocznij z lists=100 dla MVP, dostrojenie po załadowaniu danych

-- GIN index dla full-text search (WHERE content_tsvector @@ ...)
CREATE INDEX idx_legal_act_chunks_content_fts
  ON legal_act_chunks
  USING GIN (content_tsvector);

-- ==========================================
-- LEGAL ACT RELATIONS INDEXES
-- ==========================================

-- Wyszukiwanie relacji od źródła (WHERE source_act_id = ...)
CREATE INDEX idx_legal_act_relations_source
  ON legal_act_relations(source_act_id);

-- Wyszukiwanie relacji do celu (WHERE target_act_id = ...)
CREATE INDEX idx_legal_act_relations_target
  ON legal_act_relations(target_act_id);

-- Filtrowanie po typie relacji (WHERE relation_type = ...)
CREATE INDEX idx_legal_act_relations_type
  ON legal_act_relations(relation_type);
```

**Uwagi dotyczące pgvector indexes:**

- **IVFFlat:** Szybsza budowa, niższa pamięć, dobra dla MVP (approximate nearest neighbor)
- **HNSW:** Lepsza accuracy, wyższa pamięć, rozważyć w przyszłości przy większej bazie danych
- **vector_cosine_ops:** Cosine similarity (standard dla RAG z znormalizowanymi embeddingami)
- **Parametr lists:** Kompromis między accuracy a szybkością, dostrajany po załadowaniu danych

---

## 8. Sample Queries (Przykładowe zapytania)

### 8.1. Get user's query history with responses and ratings

```sql
SELECT
  qh.id AS query_id,
  qh.query_text,
  qh.fast_response_content,
  qh.accurate_response_content,
  qh.sources,
  qh.fast_model_name,
  qh.accurate_model_name,
  qh.fast_generation_time_ms,
  qh.accurate_generation_time_ms,
  qh.created_at AS query_created_at,

  -- Oceny dla szybkiej odpowiedzi
  r_fast.rating_value AS fast_rating,

  -- Oceny dla dokładnej odpowiedzi
  r_accurate.rating_value AS accurate_rating
FROM query_history qh

-- LEFT JOIN dla oceny szybkiej odpowiedzi
LEFT JOIN ratings r_fast
  ON r_fast.query_history_id = qh.id
  AND r_fast.response_type = 'fast'
  AND r_fast.user_id = qh.user_id

-- LEFT JOIN dla oceny dokładnej odpowiedzi
LEFT JOIN ratings r_accurate
  ON r_accurate.query_history_id = qh.id
  AND r_accurate.response_type = 'accurate'
  AND r_accurate.user_id = qh.user_id

WHERE qh.user_id = $1  -- Parametr: user_id z auth.uid()
ORDER BY qh.created_at DESC
LIMIT 20;
```

### 8.2. Similarity search for legal act chunks (semantic search)

```sql
-- Find top 10 most similar chunks to query embedding
SELECT
  lac.id,
  lac.content,
  lac.metadata,
  la.title AS act_title,
  la.publisher,
  la.year,
  la.position,
  la.status,

  -- Cosine distance (lower is better, 0 = identical, 2 = opposite)
  (lac.embedding <=> $1::vector) AS distance

FROM legal_act_chunks lac
JOIN legal_acts la ON la.id = lac.legal_act_id

-- Filtruj tylko obowiązujące akty
WHERE la.status = 'obowiązująca'

-- Sortuj po podobieństwie (cosine distance)
ORDER BY lac.embedding <=> $1::vector

-- Ogranicz wyniki do top 10
LIMIT 10;
```

**Uwagi:**

- `$1::vector` - parametr query embedding (vector[1024])
- Operator `<=>` - cosine distance (pgvector)
- Index `idx_legal_act_chunks_embedding_ivfflat` jest używany automatycznie

### 8.3. Hybrid search (semantic + full-text)

Kombinacja wyszukiwania semantycznego (pgvector) z full-text search (tsvector) dla lepszych wyników.

```sql
-- Combine semantic similarity with keyword search
SELECT
  lac.id,
  lac.content,
  la.title AS act_title,

  -- Semantic similarity score (lower is better)
  (lac.embedding <=> $1::vector) AS semantic_distance,

  -- Full-text search rank (higher is better)
  ts_rank(lac.content_tsvector, plainto_tsquery('polish', $2)) AS fts_rank

FROM legal_act_chunks lac
JOIN legal_acts la ON la.id = lac.legal_act_id

WHERE
  la.status = 'obowiązująca'
  -- Filtr FTS (tylko chunks zawierające słowa kluczowe)
  AND lac.content_tsvector @@ plainto_tsquery('polish', $2)

-- Sortuj najpierw po semantic similarity, potem po FTS rank
ORDER BY
  (lac.embedding <=> $1::vector) ASC,
  ts_rank(lac.content_tsvector, plainto_tsquery('polish', $2)) DESC

LIMIT 10;
```

**Parametry:**

- `$1::vector` - query embedding (vector[1024])
- `$2` - słowa kluczowe do FTS (string, np. 'konsument prawa')

### 8.4. Get related acts (breadth-first, max depth 2)

Graf relacji między aktami (używa recursive CTE dla traversal).

```sql
WITH RECURSIVE act_tree AS (
  -- Base case: starting act (depth 1)
  SELECT
    source_act_id,
    target_act_id,
    relation_type,
    1 AS depth
  FROM legal_act_relations
  WHERE source_act_id = $1  -- Parametr: starting act UUID

  UNION

  -- Recursive case: related acts (depth 2)
  SELECT
    lar.source_act_id,
    lar.target_act_id,
    lar.relation_type,
    at.depth + 1
  FROM legal_act_relations lar
  JOIN act_tree at ON lar.source_act_id = at.target_act_id
  WHERE at.depth < 2  -- Ogranicz do max depth 2
)

-- Pobierz metadane powiązanych aktów
SELECT DISTINCT
  la.id,
  la.title,
  la.publisher,
  la.year,
  la.position,
  la.status,
  at.relation_type,
  at.depth
FROM act_tree at
JOIN legal_acts la ON la.id = at.target_act_id
ORDER BY at.depth, la.title;
```

---

## 9. Migration Strategy (Strategia migracji)

### Migration file naming convention

`YYYYMMDDHHmmss_description.sql`

**Example:**

- `20250118100000_create_extensions.sql`
- `20250118100100_create_enums.sql`
- `20250118100200_create_query_history_table.sql`
- `20250118100300_create_ratings_table.sql`
- `20250118100400_create_legal_acts_tables.sql`
- `20250118100500_create_indexes.sql`
- `20250118100600_create_triggers.sql`
- `20250118100700_create_rls_policies.sql`

### Migration order (dependency order)

1. **Enable extensions** (vector, unaccent)
2. **Create ENUM types** (response_type, rating_value, relation_type, legal_act_status)
3. **Create tables** (w kolejności zależności):
   - `legal_acts` (bez zależności)
   - `legal_act_chunks` (zależy od legal_acts)
   - `legal_act_relations` (zależy od legal_acts)
   - `query_history` (zależy od auth.users - istnieje w Supabase)
   - `ratings` (zależy od query_history i auth.users)
4. **Create indexes** (po utworzeniu tabel)
5. **Create triggers** (funkcje i triggery)
6. **Enable RLS and create policies** (na końcu)

### Best practices

- **Idempotencja:** Użyj `IF NOT EXISTS` dla CREATE, `IF EXISTS` dla DROP
- **Transakcje:** Każda migracja w osobnej transakcji (automatyczne w Supabase migrations)
- **Rollback plan:** Dla każdej migracji przygotuj rollback script (down migration)
- **Testing:** Testuj migracje na lokalnym Supabase przed deploymentem na produkcję
- **Backup:** Zawsze wykonaj backup przed uruchomieniem migracji na produkcji

---

## 10. Data Volume Estimates (Oszacowanie wolumenu danych)

### MVP (20k legal acts)

| Table               | Rows                 | Size per row                    | Total size   |
| ------------------- | -------------------- | ------------------------------- | ------------ |
| legal_acts          | 20,000               | ~2 KB                           | ~40 MB       |
| legal_act_chunks    | 500,000              | ~5 KB (with embedding 1024-dim) | ~2.5 GB      |
| legal_act_relations | 100,000              | ~0.5 KB                         | ~50 MB       |
| query_history       | 10,000 (first month) | ~3 KB                           | ~30 MB       |
| ratings             | 5,000                | ~0.5 KB                         | ~2.5 MB      |
| **Total data**      |                      |                                 | **~2.62 GB** |

### Index sizes (estimates)

| Index                  | Size estimate                      |
| ---------------------- | ---------------------------------- |
| pgvector IVFFlat index | ~1.5x embedding storage = ~3.75 GB |
| FTS GIN indexes        | ~0.1x content storage = ~50 MB     |
| B-tree indexes         | ~100 MB                            |
| **Total indexes**      | **~3.9 GB**                        |

### Total storage needed

**MVP total:** ~6.5 GB (dane + indeksy)

**Supabase plan recommendations:**

- Free tier: 500 MB ❌ (niewystarczające)
- Pro tier: 8 GB ✅ (wystarczające dla MVP)
- Team tier: 100 GB (dla przyszłego skalowania)

### Scaling considerations (post-MVP)

| Scenario                  | Legal acts | Chunks | Storage needed |
| ------------------------- | ---------- | ------ | -------------- |
| MVP                       | 20k        | 500k   | ~6.5 GB        |
| Full ISAP (basic)         | 100k       | 2.5M   | ~30 GB         |
| Full ISAP (comprehensive) | 500k       | 12.5M  | ~150 GB        |

**Recommendations:**

- Start with Pro tier ($25/mo) dla MVP
- Monitor storage usage z Supabase dashboard
- Rozważ archiwizację starych queries (>6 miesięcy) jeśli storage stanie się problemem
- Dla full ISAP potrzebny Team tier lub self-hosted Supabase

---

## 11. Backup and Maintenance (Backup i konserwacja)

### Backup strategy

**Automatyczne backupy (Supabase):**

- Daily backups (included w Pro tier)
- 7-day retention (Pro tier)
- 30-day retention (Team tier)

**Manualne backupy:**

```bash
# Full database dump (przed migracjami)
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Schema only dump
pg_dump -h db.xxx.supabase.co -U postgres -d postgres --schema-only > schema.sql

# Data only dump
pg_dump -h db.xxx.supabase.co -U postgres -d postgres --data-only > data.sql
```

**Restore:**

```bash
psql -h db.xxx.supabase.co -U postgres -d postgres < backup_20250118.sql
```

### Maintenance tasks

**Weekly:**

- `VACUUM ANALYZE` (automatyczne w Supabase)
- Monitor slow queries z `pg_stat_statements`
- Check storage usage (Supabase dashboard)

**Monthly:**

- Rebuild pgvector index jeśli dane zmieniają się znacząco:
  ```sql
  REINDEX INDEX idx_legal_act_chunks_embedding_ivfflat;
  ```
- Review i archiwizuj stare queries (>6 miesięcy) jeśli storage jest problemem
- Analyze query performance metrics (Supabase dashboard)

**Ad-hoc:**

- Po dużych zmianach w danych (re-ingecja aktów):
  ```sql
  VACUUM ANALYZE legal_acts;
  VACUUM ANALYZE legal_act_chunks;
  REINDEX INDEX idx_legal_act_chunks_embedding_ivfflat;
  ```

---

## 12. Dodatkowe uwagi (Additional Notes)

### 12.1. pgvector performance tuning

**IVFFlat index parameters:**

- **lists:** Liczba clusterów dla IVFFlat index
  - Formuła: `lists = sqrt(total_rows)`
  - Dla 500k chunks: `lists = 707`
  - Dla 100k chunks: `lists = 316`
  - Start z `lists = 100` dla MVP, dostrojenie po ingecji danych
- **probes:** Liczba clusterów do przeszukania podczas query (runtime parameter)
  - Default: 1 (najszybszy, niższa accuracy)
  - Recommended: `probes = lists / 10` (dobry kompromis)
  - Set w zapytaniu: `SET ivfflat.probes = 10;`

**IVFFlat vs HNSW:**

- **IVFFlat:** Szybsza budowa (~10 min dla 500k), niższa pamięć (~3.75 GB), ~95% recall@10
- **HNSW:** Wolniejsza budowa (~1h dla 500k), wyższa pamięć (~6 GB), ~99% recall@10
- **Recommendation:** Rozpocznij z IVFFlat dla MVP, przejdź na HNSW w przyszłości jeśli accuracy jest problemem

**Cosine similarity operators:**

- `<=>` - cosine distance (used in ORDER BY, lower is better)
- `<#>` - negative inner product (alternative)
- `<->` - L2 distance (not recommended dla znormalizowanych embeddingów)

### 12.2. Embedding dimension

**VECTOR(1024) - elastyczność dla różnych modeli:**

- **nomic-embed-text:** 768 dimensions
  - Pad with zeros: `[...embedding, 0, 0, ..., 0]` (256 zeros)
  - Or use first 768 dims: `embedding[:768]`
- **mxbai-embed-large:** 1024 dimensions (full support)
- **all-MiniLM-L6-v2:** 384 dimensions (pad with 640 zeros)

**Trade-offs:**

- Większy wymiar = lepsza accuracy, ale większe storage i wolniejsze queries
- 1024-dim optimal dla MVP (flexibilność bez znaczącego performance hit)
- Przechowuj `embedding_model_name` dla przyszłej re-indeksacji

### 12.3. Polish language support

**Full-text search configuration:**

- `to_tsvector('polish', ...)` - stemming dla polskich słów
- Przykład: "konsumenta" → "konsument", "prawach" → "prawo"
- PostgreSQL w Supabase ma słownik polski zainstalowany domyślnie

**Unaccent extension (opcjonalne):**

```sql
CREATE EXTENSION unaccent;

-- Wyszukiwanie bez znaków diakrytycznych
SELECT * FROM legal_acts
WHERE unaccent(title) ILIKE unaccent('%prawo%');
```

### 12.4. Idempotency and data import

**Unique identifier dla aktów:**

- `(publisher, year, position)` - business key z ISAP
- `UNIQUE` constraint zapobiega duplikatom

**Idempotent import strategy:**

```sql
-- 1. Insert legal acts (idempotent dzięki ON CONFLICT)
INSERT INTO legal_acts (publisher, year, position, title, ...)
VALUES ('dz-u', 2023, 1234, 'Ustawa o...', ...)
ON CONFLICT (publisher, year, position) DO NOTHING;

-- 2. Get legal_act_id dla kolejnych operacji
SELECT id FROM legal_acts
WHERE publisher = 'dz-u' AND year = 2023 AND position = 1234;

-- 3. Delete existing chunks dla tego aktu (jeśli re-import)
DELETE FROM legal_act_chunks WHERE legal_act_id = $1;

-- 4. Insert new chunks
INSERT INTO legal_act_chunks (legal_act_id, chunk_index, content, embedding, ...)
VALUES ($1, 0, '...', '[0.1, 0.2, ...]'::vector, ...);

-- 5. Insert relations (idempotent dzięki ON CONFLICT)
INSERT INTO legal_act_relations (source_act_id, target_act_id, relation_type)
VALUES ($1, $2, 'modifies')
ON CONFLICT (source_act_id, target_act_id, relation_type) DO NOTHING;
```

**Best practices:**

- Użyj transaction dla całego procesu importu jednego aktu
- Log errors i continue z następnym aktem (resilience)
- Track progress w osobnej tabeli (opcjonalnie)

### 12.5. Security considerations

**ON DELETE strategies:**

- **CASCADE:** Dla danych użytkownika (query_history, ratings)
  - Automatyczne usuwanie historii przy usunięciu użytkownika (RODO compliance)
  - Automatyczne usuwanie ocen przy usunięciu zapytania (US-007)
- **RESTRICT:** Dla danych referencyjnych (legal_acts, chunks, relations)
  - Zapobiega przypadkowemu usunięciu aktu z powiązanymi fragmentami
  - Usuwanie zarządzane przez aplikację jako proces wieloetapowy

**RLS policies:**

- Ścisła izolacja danych między użytkownikami (`user_id = auth.uid()`)
- Backend używa `service_role` key do operacji administracyjnych (omija RLS)
- Wszystkie user-facing tables używają UUID primary keys (no information leakage)

**Rate limiting (aplikacja):**

- 10 queries/minute per user (backend FastAPI)
- 30 queries/minute per IP (backend FastAPI)
- Protection against abuse i DoS attacks

### 12.6. Future considerations

**Możliwe rozszerzenia (poza zakresem MVP):**

1. **llm_requests_log table:** Szczegółowe logowanie zapytań LLM
   - Kolumny: `prompt`, `generation_params`, `token_usage`, `response_time`, `errors`
   - Przydatne dla analityki i debugowania

2. **user_profiles table:** Rozszerzenie profilu użytkownika
   - Kolumny: `is_onboarded`, `onboarding_completed_at`, `ui_locale`, `consent_version`
   - Przydatne dla zaawansowanego onboardingu (poza MVP)

3. **Partycjonowanie po dacie:** Dla query_history przy dużych wolumenach

   ```sql
   CREATE TABLE query_history (
     ...
   ) PARTITION BY RANGE (created_at);

   CREATE TABLE query_history_2025_01 PARTITION OF query_history
     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
   ```

4. **legal_act_versions table:** Tracking zmian w aktach prawnych
   - Kolumny: `legal_act_id`, `version_number`, `valid_from`, `valid_to`, `content_hash`
   - Przydatne gdy dataset nie jest statyczny (auto-update)

5. **Caching layer:** Redis dla buforowania kontekstu RAG (5 minut)
   - Key: `rag_context:{query_hash}`
   - Value: JSON z chunks i metadanymi
   - Obecnie buforowanie w pamięci aplikacji (FastAPI)

---

## 13. Podsumowanie i checklist implementacyjny

### ✅ Checklist dla implementacji schematu

**Phase 1: Setup (przed migracjami)**

- [ ] Setup lokalnego Supabase (`supabase start`)
- [ ] Verify PostgreSQL version (15+)
- [ ] Verify pgvector extension availability
- [ ] Configure Supabase Auth (email/password, no verification)

**Phase 2: Migrations**

- [ ] Migrate 1: Enable extensions (vector, unaccent)
- [ ] Migrate 2: Create ENUM types
- [ ] Migrate 3: Create legal_acts table
- [ ] Migrate 4: Create legal_act_chunks table
- [ ] Migrate 5: Create legal_act_relations table
- [ ] Migrate 6: Create query_history table
- [ ] Migrate 7: Create ratings table
- [ ] Migrate 8: Create all indexes (B-tree, IVFFlat, GIN)
- [ ] Migrate 9: Create triggers (updated_at, tsvector)
- [ ] Migrate 10: Enable RLS and create policies

**Phase 3: Data ingestion**

- [ ] Develop ingestion script (Crawl4AI + ISAP API)
- [ ] Test ingestion on 100 acts (sanity check)
- [ ] Run full ingestion (20k acts)
- [ ] Verify data integrity (counts, nulls, duplicates)
- [ ] Tune IVFFlat index parameter (lists = sqrt(total_rows))
- [ ] Rebuild indexes jeśli potrzeba

**Phase 4: Testing**

- [ ] Test semantic search (similarity queries)
- [ ] Test FTS (full-text search)
- [ ] Test hybrid search (semantic + FTS)
- [ ] Test RLS policies (user isolation)
- [ ] Test cascade deletes (query_history, ratings)
- [ ] Load testing (100 concurrent users)
- [ ] Monitor query performance (pg_stat_statements)

**Phase 5: Documentation**

- [ ] Document migration procedures
- [ ] Document backup/restore procedures
- [ ] Document maintenance tasks
- [ ] Create ERD diagram (visual representation)
- [ ] Update README.md z database setup instructions

---

**Koniec dokumentu** • Database Schema v1.0 MVP • PrawnikGPT • 2025-01-18
