# Database Schema – PrawnikGPT (Supabase/PostgreSQL + pgvector)

## 1. Tabele (Tables)

### 1.1. auth.users

**Note:** Ta tabela jest zarządzana automatycznie przez Supabase Auth. Nie trzeba jej tworzyć ręcznie.

- `id`: UUID PRIMARY KEY
- `email`: VARCHAR(255) NOT NULL UNIQUE
- `encrypted_password`: VARCHAR NOT NULL
- `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- `confirmed_at`: TIMESTAMPTZ
- `last_sign_in_at`: TIMESTAMPTZ

---

### 1.2. queries (Zapytania użytkowników)

Przechowuje pytania zadane przez użytkowników.

```sql
CREATE TABLE queries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 10 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_queries_user_id` on `user_id` (dla szybkiego dostępu do historii użytkownika)
- `idx_queries_created_at` on `created_at DESC` (dla sortowania chronologicznego)

**RLS Policy:**
- Users can SELECT, INSERT, DELETE only their own queries (`user_id = auth.uid()`)

---

### 1.3. responses (Odpowiedzi LLM)

Przechowuje odpowiedzi wygenerowane przez modele językowe (fast i detailed).

```sql
CREATE TABLE responses (
  id BIGSERIAL PRIMARY KEY,
  query_id BIGINT NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  response_type VARCHAR(20) NOT NULL CHECK (response_type IN ('fast', 'detailed')),
  content TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]', -- Array of {act_title, article, link}
  model_name VARCHAR(100) NOT NULL,
  generation_time_ms INTEGER NOT NULL CHECK (generation_time_ms > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(query_id, response_type) -- Tylko jedna fast i jedna detailed response per query
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
- `idx_responses_query_id` on `query_id` (dla szybkiego JOIN z queries)
- `idx_responses_model_name` on `model_name` (dla analityki jakości modeli)

**RLS Policy:**
- Users can SELECT only responses for their own queries (via JOIN with queries)
- No direct INSERT/UPDATE/DELETE (handled by backend)

---

### 1.4. ratings (Oceny odpowiedzi)

Przechowuje oceny użytkowników dla odpowiedzi (thumbs up/down).

```sql
CREATE TABLE ratings (
  id BIGSERIAL PRIMARY KEY,
  response_id BIGINT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating VARCHAR(10) NOT NULL CHECK (rating IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(response_id, user_id) -- User może ocenić daną odpowiedź tylko raz
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
- `idx_ratings_response_id` on `response_id`
- `idx_ratings_user_id` on `user_id`

**RLS Policy:**
- Users can SELECT, INSERT, UPDATE, DELETE only their own ratings (`user_id = auth.uid()`)

---

### 1.5. legal_acts (Akty prawne - metadane)

Przechowuje metadane aktów prawnych z ISAP.

```sql
CREATE TABLE legal_acts (
  id BIGSERIAL PRIMARY KEY,
  publisher VARCHAR(50) NOT NULL, -- np. 'dz-u', 'mp', 'wdu'
  year INTEGER NOT NULL CHECK (year BETWEEN 1918 AND 2100),
  position INTEGER NOT NULL CHECK (position > 0),
  title TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'ustawa', 'rozporządzenie', 'obwieszczenie', etc.
  status VARCHAR(50) NOT NULL, -- 'obowiązująca', 'uchylona', 'nieobowiązująca'
  issuing_body TEXT, -- Organ wydający (Sejm, Prezydent, Minister, etc.)
  published_date DATE NOT NULL,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(publisher, year, position) -- Unikalna identyfikacja aktu
);
```

**Trigger:** Auto-update `updated_at` on UPDATE

**Indexes:**
- `idx_legal_acts_publisher_year_position` on `(publisher, year, position)` UNIQUE
- `idx_legal_acts_title` GIN index for full-text search: `CREATE INDEX idx_legal_acts_title_fts ON legal_acts USING GIN (to_tsvector('polish', title));`
- `idx_legal_acts_published_date` on `published_date DESC` (dla sortowania po dacie)

**RLS Policy:**
- Public read access (no RLS) - akty prawne są publiczne

---

### 1.6. legal_act_chunks (Fragmenty aktów z embeddingami)

Przechowuje fragmenty tekstowe aktów prawnych wraz z wektorowymi reprezentacjami (embeddings) dla wyszukiwania semantycznego.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE legal_act_chunks (
  id BIGSERIAL PRIMARY KEY,
  legal_act_id BIGINT NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0), -- Kolejność fragmentu w akcie
  article_number VARCHAR(50), -- np. 'Art. 5 ust. 1' (opcjonalne)
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 50 AND 5000),
  embedding VECTOR(768) NOT NULL, -- 768-dimensional vector dla nomic-embed-text
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(legal_act_id, chunk_index)
);
```

**Indexes:**
- `idx_legal_act_chunks_legal_act_id` on `legal_act_id`
- `idx_legal_act_chunks_embedding` IVFFlat or HNSW index for similarity search:
  ```sql
  CREATE INDEX idx_legal_act_chunks_embedding_ivfflat
    ON legal_act_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

  -- Alternative (better performance, higher memory):
  -- CREATE INDEX idx_legal_act_chunks_embedding_hnsw
  --   ON legal_act_chunks
  --   USING hnsw (embedding vector_cosine_ops)
  --   WITH (m = 16, ef_construction = 64);
  ```

**RLS Policy:**
- Public read access (no RLS) - fragmenty aktów są publiczne

**Notes:**
- `embedding` dimension: 768 dla nomic-embed-text, 1024 dla mxbai-embed-large (dostosować według modelu)
- Similarity search query: `ORDER BY embedding <=> query_embedding LIMIT 10`
- Chunk size: 500-1500 znaków (per artykuł/paragraf)

---

### 1.7. legal_act_relations (Powiązania między aktami)

Przechowuje relacje między aktami prawnymi (modyfikuje, uchyla, implementuje, etc.).

```sql
CREATE TABLE legal_act_relations (
  id BIGSERIAL PRIMARY KEY,
  source_act_id BIGINT NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,
  target_act_id BIGINT NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL, -- 'modifies', 'repeals', 'implements', 'based_on', 'amends'
  description TEXT, -- Opcjonalny opis relacji
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_act_id != target_act_id) -- Akt nie może odnosić się do samego siebie
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

---

## 2. Relacje (Relationships)

```
auth.users (1) ──< (M) queries
queries (1) ──< (M) responses
responses (1) ──< (M) ratings
auth.users (1) ──< (M) ratings

legal_acts (1) ──< (M) legal_act_chunks
legal_acts (1) ──< (M) legal_act_relations (source_act_id)
legal_acts (1) ──< (M) legal_act_relations (target_act_id)
```

---

## 3. Triggers (Wyzwalacze)

### 3.1. Auto-update `updated_at` column

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

---

## 4. Row-Level Security (RLS) Policies

### 4.1. Enable RLS on tables

```sql
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Legal acts tables are public (no RLS)
```

### 4.2. Policies for `queries`

```sql
-- Users can select only their own queries
CREATE POLICY queries_select_own
  ON queries
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert only with their own user_id
CREATE POLICY queries_insert_own
  ON queries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete only their own queries
CREATE POLICY queries_delete_own
  ON queries
  FOR DELETE
  USING (user_id = auth.uid());
```

### 4.3. Policies for `responses`

```sql
-- Users can select responses only for their own queries
CREATE POLICY responses_select_own
  ON responses
  FOR SELECT
  USING (
    query_id IN (
      SELECT id FROM queries WHERE user_id = auth.uid()
    )
  );

-- No direct INSERT/UPDATE/DELETE for users (handled by backend service role)
```

### 4.4. Policies for `ratings`

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

## 5. Indexes (Indeksy)

### Performance-critical indexes

```sql
-- Queries
CREATE INDEX idx_queries_user_id ON queries(user_id);
CREATE INDEX idx_queries_created_at ON queries(created_at DESC);

-- Responses
CREATE INDEX idx_responses_query_id ON responses(query_id);
CREATE INDEX idx_responses_model_name ON responses(model_name);

-- Ratings
CREATE INDEX idx_ratings_response_id ON ratings(response_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);

-- Legal acts
CREATE INDEX idx_legal_acts_publisher_year_position ON legal_acts(publisher, year, position);
CREATE INDEX idx_legal_acts_published_date ON legal_acts(published_date DESC);
CREATE INDEX idx_legal_acts_title_fts ON legal_acts USING GIN (to_tsvector('polish', title));

-- Legal act chunks (CRITICAL for RAG performance)
CREATE INDEX idx_legal_act_chunks_legal_act_id ON legal_act_chunks(legal_act_id);
CREATE INDEX idx_legal_act_chunks_embedding_ivfflat
  ON legal_act_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Legal act relations
CREATE INDEX idx_legal_act_relations_source ON legal_act_relations(source_act_id);
CREATE INDEX idx_legal_act_relations_target ON legal_act_relations(target_act_id);
CREATE INDEX idx_legal_act_relations_type ON legal_act_relations(relation_type);
```

---

## 6. Sample Queries (Przykładowe zapytania)

### Get user's query history with responses and ratings
```sql
SELECT
  q.id AS query_id,
  q.question,
  q.created_at AS query_created_at,
  r.id AS response_id,
  r.response_type,
  r.content AS response_content,
  r.sources,
  r.model_name,
  r.generation_time_ms,
  rat.rating AS user_rating
FROM queries q
LEFT JOIN responses r ON r.query_id = q.id
LEFT JOIN ratings rat ON rat.response_id = r.id AND rat.user_id = q.user_id
WHERE q.user_id = 'user-uuid-here'
ORDER BY q.created_at DESC
LIMIT 20;
```

### Similarity search for legal act chunks
```sql
-- Find top 10 most similar chunks to query embedding
SELECT
  lac.id,
  lac.content,
  lac.article_number,
  la.title AS act_title,
  la.publisher,
  la.year,
  la.position,
  (lac.embedding <=> '[0.1, 0.2, ..., 0.768]'::vector) AS distance
FROM legal_act_chunks lac
JOIN legal_acts la ON la.id = lac.legal_act_id
WHERE la.status = 'obowiązująca'
ORDER BY lac.embedding <=> '[0.1, 0.2, ..., 0.768]'::vector
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
  WHERE source_act_id = 123

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

## 7. Migration Strategy (Strategia migracji)

### Migration file naming convention
`YYYYMMDDHHmmss_description.sql`

Example:
- `20250115100000_create_queries_table.sql`
- `20250115100100_create_responses_table.sql`
- `20250115100200_create_ratings_table.sql`
- `20250115100300_create_legal_acts_tables.sql`
- `20250115100400_create_rls_policies.sql`

### Migration order
1. Enable pgvector extension
2. Create tables (in dependency order)
3. Create indexes
4. Create triggers
5. Enable RLS and create policies

---

## 8. Data Volume Estimates (Oszacowanie wolumenu danych)

### MVP (20k legal acts)

| Table | Rows | Size per row | Total size |
|-------|------|--------------|------------|
| legal_acts | 20,000 | ~2 KB | ~40 MB |
| legal_act_chunks | 500,000 | ~4 KB (with embedding) | ~2 GB |
| legal_act_relations | 100,000 | ~0.5 KB | ~50 MB |
| queries | 10,000 (first month) | ~0.5 KB | ~5 MB |
| responses | 15,000 (1.5x queries) | ~2 KB | ~30 MB |
| ratings | 5,000 | ~0.3 KB | ~1.5 MB |
| **Total** | | | **~2.13 GB** |

### Scaling considerations
- pgvector index size: ~1.5x embedding storage (~3 GB for 500k chunks)
- Total storage needed: ~5-6 GB for MVP
- Supabase free tier: 500 MB (need paid plan)
- Recommended plan: Pro ($25/mo) = 8 GB database

---

## 9. Backup and Maintenance (Backup i konserwacja)

### Backup strategy
- Supabase automatic daily backups (included)
- Manual backup before major migrations: `pg_dump`
- Keep migrations in git for reproducibility

### Maintenance tasks
- VACUUM ANALYZE weekly (automatic in Supabase)
- Rebuild pgvector index monthly (if data changes)
- Monitor slow queries with pg_stat_statements
- Archive old queries/responses (>6 months) if storage becomes issue

---

## 10. Dodatkowe uwagi (Additional Notes)

### pgvector performance tuning
- Use `ivfflat` for fast approximate search (good for MVP)
- Consider `hnsw` for better accuracy if memory allows
- Tune `lists` parameter based on data size: `lists = sqrt(total_rows)`
- For 500k chunks: `lists = 100-200` is optimal

### Embedding dimension
- nomic-embed-text: 768 dimensions (smaller, faster)
- mxbai-embed-large: 1024 dimensions (better accuracy)
- Trade-off: accuracy vs. storage/performance

### Polish language support
- Use `to_tsvector('polish', ...)` for full-text search
- Ensure PostgreSQL has Polish dictionary installed
- Consider unaccent extension for better search: `CREATE EXTENSION unaccent;`
