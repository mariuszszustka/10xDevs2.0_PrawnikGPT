# Database Schema – PrawnikGPT (Supabase/PostgreSQL + pgvector)

## 1. Extensions (Rozszerzenia)

```sql
-- pgvector extension dla similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- unaccent extension dla lepszego wyszukiwania (opcjonalne)
CREATE EXTENSION IF NOT EXISTS unaccent;
```

---

## 2. ENUM Types (Typy wyliczeniowe)

```sql
-- Typ odpowiedzi (fast lub accurate)
CREATE TYPE response_type_enum AS ENUM ('fast', 'accurate');

-- Typ oceny (thumbs up/down)
CREATE TYPE rating_value_enum AS ENUM ('up', 'down');

-- Typ relacji między aktami
CREATE TYPE relation_type_enum AS ENUM (
  'modifies',
  'repeals',
  'implements',
  'based_on',
  'amends'
);

-- Status aktu prawnego
CREATE TYPE legal_act_status_enum AS ENUM (
  'obowiązująca',
  'uchylona',
  'nieobowiązująca'
);
```

---

## 3. Tabele (Tables)

### 3.1. auth.users

**Note:** Ta tabela jest zarządzana automatycznie przez Supabase Auth. Nie trzeba jej tworzyć ręcznie.

- `id`: UUID PRIMARY KEY
- `email`: VARCHAR(255) NOT NULL UNIQUE
- `encrypted_password`: VARCHAR NOT NULL
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- `confirmed_at`: TIMESTAMPTZ
- `last_sign_in_at`: TIMESTAMPTZ

---

### 3.2. query_history (Historia zapytań użytkowników)

Przechowuje pytania użytkowników wraz z odpowiedziami (szybką i dokładną) w jednej tabeli (denormalizacja dla MVP).

```sql
CREATE TABLE query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL CHECK (length(query_text) > 0 AND length(query_text) <= 1000),
  fast_response_content TEXT NOT NULL CHECK (length(fast_response_content) > 0),
  accurate_response_content TEXT, -- NULLABLE, wypełniane tylko na żądanie
  sources JSONB NOT NULL DEFAULT '[]', -- Array of {act_title, article, link}
  fast_model_name VARCHAR(100) NOT NULL,
  accurate_model_name VARCHAR(100), -- NULLABLE
  fast_generation_time_ms INTEGER NOT NULL CHECK (fast_generation_time_ms > 0),
  accurate_generation_time_ms INTEGER CHECK (accurate_generation_time_ms > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Example `sources` JSON:**
```json
[
  {
    "act_title": "Ustawa o prawach konsumenta",
    "article": "Art. 5 ust. 1",
    "link": "/acts/dz-u/2023/1234#art-5"
  },
  {
    "act_title": "Kodeks cywilny",
    "article": "Art. 384",
    "link": "/acts/dz-u/1964/16#art-384"
  }
]
```

**Indexes:**
- `idx_query_history_user_id` on `user_id` (dla szybkiego dostępu do historii użytkownika)
- `idx_query_history_created_at` on `created_at DESC` (dla sortowania chronologicznego)

**RLS Policy:**
- Users can SELECT, INSERT, DELETE only their own queries (`user_id = auth.uid()`)

---

### 3.3. ratings (Oceny odpowiedzi)

Przechowuje oceny użytkowników dla odpowiedzi (thumbs up/down). Powiązane z `query_history` przez `query_history_id` i `response_type`.

```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_history_id UUID NOT NULL REFERENCES query_history(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_type response_type_enum NOT NULL,
  rating_value rating_value_enum NOT NULL,
  comment TEXT, -- NULLABLE, przygotowane na przyszłość
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
- `idx_ratings_query_history_id` on `query_history_id`
- `idx_ratings_user_id` on `user_id`
- `idx_ratings_response_type` on `response_type`

**RLS Policy:**
- Users can SELECT, INSERT, UPDATE, DELETE only their own ratings (`user_id = auth.uid()`)

**Notes:**
- Użytkownik może zmienić ocenę (brak UNIQUE constraint) - logika UPSERT obsługiwana w aplikacji
- Ocena jest powiązana z konkretnym typem odpowiedzi (fast/accurate)

---

### 3.4. legal_acts (Akty prawne - metadane)

Przechowuje metadane aktów prawnych z ISAP.

```sql
CREATE TABLE legal_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher VARCHAR(50) NOT NULL, -- np. 'dz-u', 'mp', 'wdu'
  year INTEGER NOT NULL CHECK (year BETWEEN 1918 AND 2100),
  position INTEGER NOT NULL CHECK (position > 0),
  title TEXT NOT NULL,
  typ_aktu VARCHAR(255) NOT NULL, -- 'ustawa', 'rozporządzenie', 'obwieszczenie', etc.
  status legal_act_status_enum NOT NULL,
  organ_wydajacy TEXT, -- Organ wydający (Sejm, Prezydent, Minister, etc.)
  published_date DATE NOT NULL,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(publisher, year, position) -- Unikalna identyfikacja aktu
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
- `idx_legal_acts_publisher_year_position` on `(publisher, year, position)` UNIQUE
- `idx_legal_acts_title_fts` GIN index for full-text search: `CREATE INDEX idx_legal_acts_title_fts ON legal_acts USING GIN (to_tsvector('polish', title));`
- `idx_legal_acts_published_date` on `published_date DESC` (dla sortowania po dacie)

**RLS Policy:**
- Public read access (no RLS) - akty prawne są publiczne

---

### 3.5. legal_act_chunks (Fragmenty aktów z embeddingami)

Przechowuje fragmenty tekstowe aktów prawnych wraz z wektorowymi reprezentacjami (embeddings) dla wyszukiwania semantycznego.

```sql
CREATE TABLE legal_act_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_act_id UUID NOT NULL REFERENCES legal_acts(id) ON DELETE RESTRICT,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0), -- Kolejność fragmentu w akcie
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 50 AND 5000),
  embedding VECTOR(1024) NOT NULL, -- 1024-dimensional vector (elastyczny dla różnych modeli)
  embedding_model_name VARCHAR(100) NOT NULL, -- Nazwa modelu użytego do wygenerowania embeddingu
  metadata JSONB, -- Lokalizacja fragmentu: {"type": "article", "number": "10a"}
  content_tsvector tsvector, -- Dla wyszukiwania pełnotekstowego
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(legal_act_id, chunk_index)
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
  "paragraph": "1"
}
```

**Indexes:**
- `idx_legal_act_chunks_legal_act_id` on `legal_act_id`
- `idx_legal_act_chunks_embedding_ivfflat` IVFFlat index for similarity search:
  ```sql
  CREATE INDEX idx_legal_act_chunks_embedding_ivfflat
    ON legal_act_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100); -- Tune based on total_rows: lists = sqrt(total_rows)
  ```
- `idx_legal_act_chunks_content_fts` GIN index for full-text search:
  ```sql
  CREATE INDEX idx_legal_act_chunks_content_fts
    ON legal_act_chunks
    USING GIN (content_tsvector);
  ```

**RLS Policy:**
- Public read access (no RLS) - fragmenty aktów są publiczne

**Notes:**
- `embedding` dimension: 1024 dla elastyczności (nomic-embed-text: 768, mxbai-embed-large: 1024)
- Similarity search query: `ORDER BY embedding <=> query_embedding LIMIT 10`
- Chunk size: 500-1500 znaków (per artykuł/paragraf)
- `ON DELETE RESTRICT` zapobiega przypadkowemu usunięciu aktu z powiązanymi fragmentami
- Idempotencja importu: skrypt usuwa wszystkie chunks dla danego `legal_act_id` przed ponownym wstawieniem

---

### 3.6. legal_act_relations (Powiązania między aktami)

Przechowuje relacje między aktami prawnymi (modyfikuje, uchyla, implementuje, etc.).

```sql
CREATE TABLE legal_act_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_act_id UUID NOT NULL REFERENCES legal_acts(id) ON DELETE RESTRICT,
  target_act_id UUID NOT NULL REFERENCES legal_acts(id) ON DELETE RESTRICT,
  relation_type relation_type_enum NOT NULL,
  description TEXT, -- Opcjonalny opis relacji
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_act_id != target_act_id), -- Akt nie może odnosić się do samego siebie
  UNIQUE(source_act_id, target_act_id, relation_type) -- Zapobiega duplikatom relacji
);
```

**Indexes:**
- `idx_legal_act_relations_source` on `source_act_id`
- `idx_legal_act_relations_target` on `target_act_id`
- `idx_legal_act_relations_type` on `relation_type`

**RLS Policy:**
- Public read access (no RLS)

**Notes:**
- Relation types pochodzą z ISAP API: `references` endpoint
- Graf relacji można przeglądać breadth-first (max depth 2 w MVP)
- Przechowywanie jednej krotki na relację (nie dwukierunkowe)
- `ON DELETE RESTRICT` zapobiega przypadkowemu usunięciu aktu z powiązanymi relacjami

---

## 4. Relacje (Relationships)

```
auth.users (1) ──< (M) query_history
query_history (1) ──< (M) ratings
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

---

## 5. Triggers (Wyzwalacze)

### 5.1. Auto-update `updated_at` column

Function (reusable):
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Apply to tables:
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

Function:
```sql
CREATE OR REPLACE FUNCTION update_legal_act_chunks_tsvector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsvector := to_tsvector('polish', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Trigger:
```sql
CREATE TRIGGER update_legal_act_chunks_tsvector_trigger
  BEFORE INSERT OR UPDATE ON legal_act_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_act_chunks_tsvector();
```

---

## 6. Row-Level Security (RLS) Policies

### 6.1. Enable RLS on tables

```sql
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Legal acts tables are public (no RLS)
```

### 6.2. Policies for `query_history`

```sql
-- Users can select only their own queries
CREATE POLICY query_history_select_own
  ON query_history
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert only with their own user_id
CREATE POLICY query_history_insert_own
  ON query_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete only their own queries
CREATE POLICY query_history_delete_own
  ON query_history
  FOR DELETE
  USING (user_id = auth.uid());
```

### 6.3. Policies for `ratings`

```sql
-- Users can select only their own ratings
CREATE POLICY ratings_select_own
  ON ratings
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert ratings with their own user_id
CREATE POLICY ratings_insert_own
  ON ratings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update only their own ratings
CREATE POLICY ratings_update_own
  ON ratings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete only their own ratings
CREATE POLICY ratings_delete_own
  ON ratings
  FOR DELETE
  USING (user_id = auth.uid());
```

---

## 7. Indexes (Indeksy)

### Performance-critical indexes

```sql
-- Query history
CREATE INDEX idx_query_history_user_id ON query_history(user_id);
CREATE INDEX idx_query_history_created_at ON query_history(created_at DESC);

-- Ratings
CREATE INDEX idx_ratings_query_history_id ON ratings(query_history_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_response_type ON ratings(response_type);

-- Legal acts
CREATE UNIQUE INDEX idx_legal_acts_publisher_year_position 
  ON legal_acts(publisher, year, position);
CREATE INDEX idx_legal_acts_published_date ON legal_acts(published_date DESC);
CREATE INDEX idx_legal_acts_title_fts 
  ON legal_acts USING GIN (to_tsvector('polish', title));

-- Legal act chunks (CRITICAL for RAG performance)
CREATE INDEX idx_legal_act_chunks_legal_act_id ON legal_act_chunks(legal_act_id);
CREATE INDEX idx_legal_act_chunks_embedding_ivfflat
  ON legal_act_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100); -- Tune: lists = sqrt(total_rows), for 500k chunks: 100-200
CREATE INDEX idx_legal_act_chunks_content_fts
  ON legal_act_chunks
  USING GIN (content_tsvector);

-- Legal act relations
CREATE INDEX idx_legal_act_relations_source ON legal_act_relations(source_act_id);
CREATE INDEX idx_legal_act_relations_target ON legal_act_relations(target_act_id);
CREATE INDEX idx_legal_act_relations_type ON legal_act_relations(relation_type);
```

**Notes:**
- IVFFlat index: `lists` parameter should be tuned based on data size (`sqrt(total_rows)`)
- For 500k chunks: `lists = 100-200` is optimal
- Consider HNSW index for better accuracy if memory allows (higher memory usage)

---

## 8. Sample Queries (Przykładowe zapytania)

### Get user's query history with responses and ratings

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
  r_fast.rating_value AS fast_rating,
  r_accurate.rating_value AS accurate_rating
FROM query_history qh
LEFT JOIN ratings r_fast 
  ON r_fast.query_history_id = qh.id 
  AND r_fast.response_type = 'fast' 
  AND r_fast.user_id = qh.user_id
LEFT JOIN ratings r_accurate 
  ON r_accurate.query_history_id = qh.id 
  AND r_accurate.response_type = 'accurate' 
  AND r_accurate.user_id = qh.user_id
WHERE qh.user_id = 'user-uuid-here'
ORDER BY qh.created_at DESC
LIMIT 20;
```

### Similarity search for legal act chunks (semantic search)

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
  (lac.embedding <=> '[0.1, 0.2, ..., 0.1024]'::vector) AS distance
FROM legal_act_chunks lac
JOIN legal_acts la ON la.id = lac.legal_act_id
WHERE la.status = 'obowiązująca'
ORDER BY lac.embedding <=> '[0.1, 0.2, ..., 0.1024]'::vector
LIMIT 10;
```

### Hybrid search (semantic + full-text)

```sql
-- Combine semantic similarity with keyword search
SELECT
  lac.id,
  lac.content,
  la.title AS act_title,
  -- Semantic similarity score (lower is better)
  (lac.embedding <=> '[0.1, 0.2, ..., 0.1024]'::vector) AS semantic_distance,
  -- Full-text search rank (higher is better)
  ts_rank(lac.content_tsvector, plainto_tsquery('polish', 'konsument prawa')) AS fts_rank
FROM legal_act_chunks lac
JOIN legal_acts la ON la.id = lac.legal_act_id
WHERE 
  la.status = 'obowiązująca'
  AND lac.content_tsvector @@ plainto_tsquery('polish', 'konsument prawa')
ORDER BY 
  (lac.embedding <=> '[0.1, 0.2, ..., 0.1024]'::vector) ASC,
  ts_rank(lac.content_tsvector, plainto_tsquery('polish', 'konsument prawa')) DESC
LIMIT 10;
```

### Get related acts (breadth-first, max depth 2)

```sql
WITH RECURSIVE act_tree AS (
  -- Base case: starting act
  SELECT
    source_act_id,
    target_act_id,
    relation_type,
    1 AS depth
  FROM legal_act_relations
  WHERE source_act_id = 'act-uuid-here'

  UNION

  -- Recursive case: related acts (max depth 2)
  SELECT
    lar.source_act_id,
    lar.target_act_id,
    lar.relation_type,
    at.depth + 1
  FROM legal_act_relations lar
  JOIN act_tree at ON lar.source_act_id = at.target_act_id
  WHERE at.depth < 2
)
SELECT DISTINCT
  la.id,
  la.title,
  la.publisher,
  la.year,
  la.position,
  at.relation_type,
  at.depth
FROM act_tree at
JOIN legal_acts la ON la.id = at.target_act_id;
```

---

## 9. Migration Strategy (Strategia migracji)

### Migration file naming convention
`YYYYMMDDHHmmss_description.sql`

Example:
- `20250115100000_create_enums.sql`
- `20250115100100_create_query_history_table.sql`
- `20250115100200_create_ratings_table.sql`
- `20250115100300_create_legal_acts_tables.sql`
- `20250115100400_create_indexes.sql`
- `20250115100500_create_triggers.sql`
- `20250115100600_create_rls_policies.sql`

### Migration order
1. Enable extensions (vector, unaccent)
2. Create ENUM types
3. Create tables (in dependency order)
4. Create indexes
5. Create triggers
6. Enable RLS and create policies

---

## 10. Data Volume Estimates (Oszacowanie wolumenu danych)

### MVP (20k legal acts)

| Table | Rows | Size per row | Total size |
|-------|------|--------------|------------|
| legal_acts | 20,000 | ~2 KB | ~40 MB |
| legal_act_chunks | 500,000 | ~5 KB (with embedding 1024-dim) | ~2.5 GB |
| legal_act_relations | 100,000 | ~0.5 KB | ~50 MB |
| query_history | 10,000 (first month) | ~3 KB | ~30 MB |
| ratings | 5,000 | ~0.5 KB | ~2.5 MB |
| **Total** | | | **~2.57 GB** |

### Scaling considerations
- pgvector index size: ~1.5x embedding storage (~3.75 GB for 500k chunks with 1024-dim)
- FTS index size: ~0.1x content storage (~50 MB)
- Total storage needed: ~6-7 GB for MVP
- Supabase free tier: 500 MB (need paid plan)
- Recommended plan: Pro ($25/mo) = 8 GB database

---

## 11. Backup and Maintenance (Backup i konserwacja)

### Backup strategy
- Supabase automatic daily backups (included)
- Manual backup before major migrations: `pg_dump`
- Keep migrations in git for reproducibility

### Maintenance tasks
- VACUUM ANALYZE weekly (automatic in Supabase)
- Rebuild pgvector index monthly (if data changes significantly)
- Monitor slow queries with pg_stat_statements
- Archive old queries/responses (>6 months) if storage becomes issue

---

## 12. Dodatkowe uwagi (Additional Notes)

### pgvector performance tuning
- Use `ivfflat` for fast approximate search (good for MVP)
- Consider `hnsw` for better accuracy if memory allows (higher memory usage)
- Tune `lists` parameter based on data size: `lists = sqrt(total_rows)`
- For 500k chunks: `lists = 100-200` is optimal
- Use `vector_cosine_ops` (cosine similarity) for normalized embeddings

### Embedding dimension
- Vector(1024) provides flexibility for different models:
  - nomic-embed-text: 768 dimensions (pad with zeros or use subset)
  - mxbai-embed-large: 1024 dimensions (full support)
- Trade-off: accuracy vs. storage/performance
- Store `embedding_model_name` for future re-indexing

### Polish language support
- Use `to_tsvector('polish', ...)` for full-text search
- Ensure PostgreSQL has Polish dictionary installed
- Consider `unaccent` extension for better search: `CREATE EXTENSION unaccent;`
- FTS configuration 'polish' includes stemming for Polish words

### Idempotency and data import
- Unique identifier for acts: `(publisher, year, position)`
- Use `INSERT ... ON CONFLICT DO NOTHING` for safe re-import
- Import script should delete all chunks for `legal_act_id` before re-inserting
- This ensures idempotency for acts, chunks, and relations

### Security considerations
- `ON DELETE CASCADE` for user data (query_history, ratings) - ensures RODO compliance
- `ON DELETE RESTRICT` for legal acts - prevents accidental deletion with related data
- RLS policies ensure strict data isolation between users
- All user-facing tables use UUID primary keys (no information leakage about record count)

### Future considerations
- Column `comment` in `ratings` prepared for future expansion
- `embedding_model_name` enables re-indexing when changing embedding models
- Consider `llm_requests_log` table for detailed LLM request logging (prompt, parameters, errors)
- Partitioning by date range possible in future (using TIMESTAMPTZ for `created_at`)
