-- =====================================================
-- migration: create legal_act_chunks table
-- description: stores text chunks of legal acts with vector embeddings for semantic search (rag pipeline)
-- tables affected: legal_act_chunks
-- dependencies: legal_acts, vector extension
-- author: prawnikgpt
-- date: 2025-11-18
-- notes: critical table for rag performance - vector index creation may take several minutes
-- =====================================================

-- legal_act_chunks: stores text fragments with vector embeddings for semantic similarity search
-- design: one chunk per article/paragraph (50-5000 characters per chunk)
-- purpose: enables rag (retrieval-augmented generation) pipeline for answering legal questions
-- critical for: semantic search performance using pgvector extension
create table legal_act_chunks (
  -- primary key: uuid for distributed systems
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key: reference to parent legal act
  -- on delete restrict: prevents accidental deletion of act with existing chunks
  -- rationale: chunks are expensive to generate (embedding api calls), protect data integrity
  legal_act_id uuid not null references legal_acts(id) on delete restrict,
  
  -- chunk metadata
  -- chunk_index: sequential position within act (0-based)
  -- allows ordering and reassembly of original document
  -- check constraint: must be non-negative
  chunk_index integer not null check (chunk_index >= 0),
  
  -- content: actual text content of the chunk
  -- check constraint: 50-5000 characters (min for context, max for embedding quality)
  -- 50 chars minimum: too short = no useful context for rag
  -- 5000 chars maximum: too long = embedding quality degrades
  content text not null check (char_length(content) between 50 and 5000),
  
  -- embedding: vector representation for semantic similarity search
  -- vector(1024): supports both nomic-embed-text (768-dim, padded) and mxbai-embed-large (1024-dim)
  -- flexibility: allows switching embedding models without schema change
  -- not null: every chunk must have embedding for rag to work
  embedding vector(1024) not null,
  
  -- embedding_model_name: tracks which model generated this embedding
  -- important for: debugging, re-indexing, model comparison
  -- example values: 'nomic-embed-text', 'mxbai-embed-large', 'all-MiniLM-L6-v2'
  embedding_model_name varchar(100) not null,
  
  -- metadata: flexible jsonb structure for chunk-specific information
  -- format example: {"type": "article", "number": "10a", "paragraph": "1", "section": "Rozdział II"}
  -- nullable: some chunks (preamble) may not have structured metadata
  -- jsonb advantages: indexed queries, flexible schema, efficient storage
  metadata jsonb,
  
  -- content_tsvector: full-text search vector for hybrid search (semantic + keyword)
  -- automatically updated by trigger (see below)
  -- used for: combining vector similarity with keyword matching
  -- null until trigger populates it
  content_tsvector tsvector,
  
  -- timestamp: audit trail
  created_at timestamptz not null default now(),
  
  -- unique constraint: one chunk per (legal_act_id, chunk_index)
  -- prevents duplicate chunks in same act at same position
  constraint unique_chunk_in_act unique(legal_act_id, chunk_index)
);

-- trigger function: auto-update content_tsvector on insert/update
-- uses simple text search configuration (works on all postgresql installations)
-- note: for proper polish stemming, change 'simple' to 'polish' after installing polish dictionaries
create or replace function update_legal_act_chunks_tsvector()
returns trigger as $$
begin
  -- generate tsvector from content using simple text search configuration
  -- to_tsvector: parses text, removes stop words
  new.content_tsvector := to_tsvector('simple', new.content);
  return new;
end;
$$ language plpgsql;

-- trigger: apply tsvector update function on every insert/update
-- before trigger: executes before row is written to disk
-- ensures content_tsvector is always in sync with content
create trigger update_legal_act_chunks_tsvector_trigger
  before insert or update on legal_act_chunks
  for each row
  execute function update_legal_act_chunks_tsvector();

-- enable row level security (rls)
-- best practice: always enable rls, even for public tables
alter table legal_act_chunks enable row level security;

-- rls policy: allow anonymous users to select all chunks
-- applies to: anon role (unauthenticated users)
-- rationale: chunks are public information (derived from public legal acts)
create policy legal_act_chunks_select_all_anon
  on legal_act_chunks
  for select
  to anon
  using (true);

-- rls policy: allow authenticated users to select all chunks
-- applies to: authenticated role (logged in users)
-- rationale: separate policy for granular control
create policy legal_act_chunks_select_all_authenticated
  on legal_act_chunks
  for select
  to authenticated
  using (true);

-- performance indexes

-- idx_legal_act_chunks_legal_act_id: b-tree index for join with legal_acts
-- most common query: find all chunks for specific act
-- used in: join legal_acts on legal_acts.id = legal_act_chunks.legal_act_id
create index idx_legal_act_chunks_legal_act_id 
  on legal_act_chunks(legal_act_id);

-- idx_legal_act_chunks_embedding_ivfflat: vector similarity search index (CRITICAL for RAG)
-- ivfflat: inverted file with flat compression algorithm
-- lists=100: number of clusters for approximate nearest neighbor search
-- tuning: lists = sqrt(total_rows) is recommended formula
-- - for 100k chunks: lists = 316
-- - for 500k chunks: lists = 707
-- - start with 100 for mvp, adjust after data ingestion
-- vector_cosine_ops: cosine similarity operator (standard for normalized embeddings)
-- performance: enables <200ms similarity search on 500k vectors
-- note: index creation may take 5-15 minutes on large datasets
create index idx_legal_act_chunks_embedding_ivfflat
  on legal_act_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- idx_legal_act_chunks_content_fts: full-text search index for hybrid search
-- gin index: efficient for full-text search on tsvector columns
-- used in: hybrid search (semantic + keyword matching for better results)
-- example query: where content_tsvector @@ plainto_tsquery('polish', 'konsument prawo')
create index idx_legal_act_chunks_content_fts
  on legal_act_chunks
  using gin (content_tsvector);

-- table and column comments for documentation
comment on table legal_act_chunks is 'text chunks of legal acts with vector embeddings for semantic search (rag pipeline)';
comment on column legal_act_chunks.legal_act_id is 'reference to parent legal act (on delete restrict to protect expensive embeddings)';
comment on column legal_act_chunks.chunk_index is 'sequential position within act (0-based, for ordering and reassembly)';
comment on column legal_act_chunks.content is 'text content (50-5000 characters for optimal embedding quality)';
comment on column legal_act_chunks.embedding is '1024-dimensional vector (supports nomic-embed-text padded or mxbai-embed-large)';
comment on column legal_act_chunks.embedding_model_name is 'model used for embedding generation (e.g., nomic-embed-text, mxbai-embed-large)';
comment on column legal_act_chunks.metadata is 'flexible jsonb structure: {"type": "article", "number": "10a", "paragraph": "1"}';
comment on column legal_act_chunks.content_tsvector is 'full-text search vector (auto-generated from content, polish stemming)';

-- rag performance notes:
-- 1. semantic search: use embedding <=> $query_embedding operator with order by + limit
-- 2. hybrid search: combine vector similarity + keyword fts for best results
-- 3. reranking: fetch top 50 by similarity, rerank top 10 by keyword relevance
-- 4. index tuning: run 'vacuum analyze legal_act_chunks' after bulk inserts
-- 5. lists parameter: adjust based on final dataset size using sqrt(total_rows) formula

-- example semantic search query (top 10 most similar chunks):
-- select id, content, metadata,
--        (embedding <=> $1::vector) as distance
-- from legal_act_chunks
-- where legal_act_id in (select id from legal_acts where status = 'obowiązująca')
-- order by embedding <=> $1::vector
-- limit 10;
-- 
-- where $1 is the query embedding vector(1024)

-- example hybrid search query (semantic + keyword):
-- select id, content, 
--        (embedding <=> $1::vector) as semantic_distance,
--        ts_rank(content_tsvector, plainto_tsquery('polish', $2)) as keyword_rank
-- from legal_act_chunks
-- where content_tsvector @@ plainto_tsquery('polish', $2)
-- order by (embedding <=> $1::vector) asc,
--          ts_rank(content_tsvector, plainto_tsquery('polish', $2)) desc
-- limit 10;

-- note: no insert/update/delete policies for regular users
-- data import is managed by backend service with service_role key
-- this ensures data integrity and prevents unauthorized modifications
-- embeddings are expensive to generate (ollama api calls), protect them

