-- =====================================================
-- migration: create legal_act_chunks table
-- description: stores text chunks of legal acts with embeddings for semantic search
-- tables affected: legal_act_chunks
-- dependencies: legal_acts, vector extension
-- author: prawnikgpt
-- date: 2025-01-12
-- =====================================================

-- legal_act_chunks: stores text fragments with vector embeddings
-- design: one chunk per article/paragraph (500-1500 characters)
-- critical table for rag pipeline performance
create table legal_act_chunks (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- reference to parent legal act
  -- on delete cascade: when act deleted, all chunks are also deleted
  legal_act_id uuid not null references legal_acts(id) on delete cascade,
  
  -- chunk metadata
  -- chunk_index: sequential number within act (0-based)
  -- allows ordering and reassembly of original document
  chunk_index integer not null,
  
  -- chunk type: identifies the structural element
  -- possible values: 'article', 'paragraph', 'chapter', 'section', 'preamble'
  -- helps with context-aware retrieval
  chunk_type varchar(50) not null default 'article',
  
  -- article/section reference from original document
  -- nullable: some chunks (preamble) don't have article numbers
  -- example: "Art. 5", "§ 10", "Rozdział III"
  article_ref varchar(100),
  
  -- actual text content of the chunk
  -- not null: empty chunks serve no purpose in rag
  -- check constraint: minimum 50 characters (too short = no context)
  content text not null check (char_length(content) >= 50),
  
  -- vector embedding for semantic similarity search
  -- 768 dimensions: matches nomic-embed-text model output
  -- not null: every chunk must have embedding for rag to work
  embedding vector(768) not null,
  
  -- full-text search vector (polish language)
  -- computed column updated via trigger
  -- allows hybrid search: semantic (embedding) + keyword (fts)
  content_fts tsvector generated always as (to_tsvector('simple', content)) stored,
  
  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- check constraint: chunk_index must be non-negative
  constraint legal_act_chunks_chunk_index_non_negative check (chunk_index >= 0)
);

-- enable row level security (data is public but rls is best practice)
alter table legal_act_chunks enable row level security;

-- rls policy: allow anonymous users to select all chunks
-- chunks are public information (derived from public legal acts)
create policy legal_act_chunks_select_all_anon
  on legal_act_chunks
  for select
  to anon
  using (true);

-- rls policy: allow authenticated users to select all chunks
-- separate policy for authenticated users (granular control)
create policy legal_act_chunks_select_all_authenticated
  on legal_act_chunks
  for select
  to authenticated
  using (true);

-- performance indexes
-- idx_legal_act_chunks_legal_act_id: speeds up finding all chunks for an act
-- most common query in rag pipeline after similarity search
create index idx_legal_act_chunks_legal_act_id 
  on legal_act_chunks(legal_act_id);

-- idx_legal_act_chunks_legal_act_chunk_index: speeds up ordered retrieval
-- allows efficient reassembly of full document text
create index idx_legal_act_chunks_legal_act_chunk_index 
  on legal_act_chunks(legal_act_id, chunk_index);

-- idx_legal_act_chunks_content_fts: full-text search index
-- enables fast keyword search using gin index
-- language: simple (not polish) to work on all postgres installations
-- note: can be changed to 'polish' if polish stemming dictionary is installed
create index idx_legal_act_chunks_content_fts 
  on legal_act_chunks 
  using gin (content_fts);

-- idx_legal_act_chunks_embedding_ivfflat: vector similarity search index
-- critical for rag performance (semantic search)
-- ivfflat: inverted file with flat compression
-- lists=100: optimal for ~10k-100k vectors (adjust based on dataset size)
-- vector_cosine_ops: cosine similarity (most common for embeddings)
-- note: this index creation may take several minutes on large datasets
create index idx_legal_act_chunks_embedding_ivfflat 
  on legal_act_chunks 
  using ivfflat (embedding vector_cosine_ops) 
  with (lists = 100);

-- alternative index: hnsw (hierarchical navigable small world)
-- uncomment if you need better accuracy and have more memory
-- hnsw is more accurate but uses more memory than ivfflat
-- m=16: max connections per node (higher = better recall, more memory)
-- ef_construction=64: quality of index construction (higher = slower build, better quality)
-- 
-- create index idx_legal_act_chunks_embedding_hnsw 
--   on legal_act_chunks 
--   using hnsw (embedding vector_cosine_ops) 
--   with (m = 16, ef_construction = 64);

-- trigger: auto-update updated_at column
-- reuses the function created in earlier migration
create trigger update_legal_act_chunks_updated_at
  before update on legal_act_chunks
  for each row
  execute function update_updated_at_column();

-- add table comments for documentation
comment on table legal_act_chunks is 'text chunks of legal acts with vector embeddings for semantic search (rag pipeline)';
comment on column legal_act_chunks.legal_act_id is 'reference to parent legal act';
comment on column legal_act_chunks.chunk_index is 'sequential position within act (0-based, for ordering)';
comment on column legal_act_chunks.chunk_type is 'structural element type: article, paragraph, chapter, section, preamble';
comment on column legal_act_chunks.article_ref is 'article/section reference from original document (e.g., "Art. 5", "§ 10")';
comment on column legal_act_chunks.content is 'actual text content (minimum 50 characters)';
comment on column legal_act_chunks.embedding is '768-dimensional vector from nomic-embed-text model';
comment on column legal_act_chunks.content_fts is 'full-text search vector (auto-generated from content)';

-- rag query performance notes:
-- 1. similarity search: use <=> operator with embedding column
-- 2. hybrid search: combine vector similarity + keyword fts for best results
-- 3. reranking: fetch top 50 by similarity, rerank top 10 by keyword relevance
-- 4. index maintenance: run 'vacuum analyze legal_act_chunks' after bulk inserts

-- example similarity search query (top 10 most similar chunks):
-- select id, legal_act_id, content, embedding <=> $1 as similarity_score
-- from legal_act_chunks
-- order by embedding <=> $1
-- limit 10;
-- 
-- where $1 is the query embedding vector(768)

-- note: no insert/update/delete policies for regular users
-- data import handled by backend service with service role key
-- this ensures data integrity and prevents unauthorized modifications
