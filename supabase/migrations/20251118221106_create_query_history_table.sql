-- =====================================================
-- migration: create query_history table
-- description: stores user queries with fast and accurate responses (denormalized design)
-- tables affected: query_history
-- dependencies: auth.users (supabase managed), response_type_enum
-- author: prawnikgpt
-- date: 2025-11-18
-- notes: denormalized design (both responses in one table) for mvp simplicity
-- =====================================================

-- query_history: stores all user queries and their responses
-- design decision: denormalized (fast + accurate in one table) for mvp simplicity
-- rationale: avoids complex joins, sufficient for mvp scale (<100k queries)
-- accurate_response_content is nullable: only filled when user requests detailed answer
-- future: if scaling issues, normalize into separate responses table
create table query_history (
  -- primary key: uuid for distributed systems and no information leakage
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key: reference to auth.users (supabase managed table)
  -- on delete cascade: ensures gdpr/rodo compliance (user deletion removes all queries)
  -- rationale: user's right to erasure requires automatic cleanup
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- user's question
  -- check constraint: 10-1000 characters per prd requirements (us-003)
  -- 10 chars minimum: prevents nonsensical queries ("???", "test")
  -- 1000 chars maximum: prevents abuse, ensures reasonable context window for llm
  query_text text not null check (length(query_text) between 10 and 1000),
  
  -- fast response: always generated first (7b-13b model)
  -- target: <15 seconds response time (95th percentile)
  -- not null: every query gets fast response immediately
  -- check constraint: must have content (empty response = error)
  fast_response_content text not null check (length(fast_response_content) > 0),
  
  -- accurate response: generated on user request (120b model)
  -- target: <240 seconds response time (timeout)
  -- nullable: only filled when user clicks "detailed answer" button
  -- check constraint: if present, must have content
  accurate_response_content text check (length(accurate_response_content) > 0),
  
  -- sources: array of legal act references used in response
  -- jsonb format: [{"act_title": "...", "article": "Art. 5", "link": "/acts/...", "chunk_id": "..."}]
  -- default empty array: avoids null checks in application code
  -- not null: always has value (empty array if no sources found)
  sources jsonb not null default '[]',
  
  -- model metadata: reproducibility and debugging
  -- fast_model_name: model used for fast response (e.g., 'mistral:7b')
  -- not null: always know which model generated response
  fast_model_name varchar(100) not null,
  
  -- accurate_model_name: model used for accurate response (e.g., 'gpt-oss:120b')
  -- nullable: only set when accurate response is generated
  accurate_model_name varchar(100),
  
  -- generation time metrics (in milliseconds)
  -- used for: performance monitoring, user expectations, alerting
  -- fast_generation_time_ms: must be positive (check constraint)
  -- target: <15000ms (15 seconds) for 95th percentile
  fast_generation_time_ms integer not null check (fast_generation_time_ms > 0),
  
  -- accurate_generation_time_ms: nullable (only when accurate response generated)
  -- target: <240000ms (240 seconds) before timeout
  accurate_generation_time_ms integer check (accurate_generation_time_ms > 0),
  
  -- timestamp: audit trail and chronological ordering
  -- timestamptz: timezone-aware for international users
  created_at timestamptz not null default now()
);

-- enable row level security (rls)
-- critical: prevents users from seeing other users' query history
alter table query_history enable row level security;

-- rls policy: users can select only their own queries
-- applies to: authenticated users only
-- rationale: privacy - users should not see other users' query history
-- using clause: filters rows visible to user (user_id = auth.uid())
create policy query_history_select_own
  on query_history
  for select
  to authenticated
  using (user_id = auth.uid());

-- rls policy: users can insert queries with their own user_id
-- applies to: authenticated users only
-- rationale: prevent users from creating queries on behalf of other users
-- with check clause: validates new rows before insert (user_id = auth.uid())
create policy query_history_insert_own
  on query_history
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- rls policy: users can delete only their own queries
-- applies to: authenticated users only
-- rationale: users should be able to manage their query history (us-007)
-- using clause: filters rows that can be deleted (user_id = auth.uid())
create policy query_history_delete_own
  on query_history
  for delete
  to authenticated
  using (user_id = auth.uid());

-- note: no update policy - queries are immutable after creation
-- rationale: audit trail, no business case for editing queries
-- if user wants to modify: delete old query and create new one

-- performance indexes

-- idx_query_history_user_id: b-tree index for user-specific queries
-- most common query: find all queries for specific user
-- used in: where user_id = auth.uid() order by created_at desc
-- critical for: rls policies performance
create index idx_query_history_user_id 
  on query_history(user_id);

-- idx_query_history_created_at: b-tree index for chronological sorting
-- descending order: most recent queries first (common ui pattern)
-- used in: order by created_at desc limit 20
-- combined with user_id filter: efficient pagination
create index idx_query_history_created_at 
  on query_history(created_at desc);

-- table and column comments for documentation
comment on table query_history is 'user queries with fast and accurate responses (denormalized for mvp simplicity)';
comment on column query_history.query_text is 'user question (10-1000 characters, validated by check constraint)';
comment on column query_history.fast_response_content is 'fast response from 7b-13b model (always generated, target <15s)';
comment on column query_history.accurate_response_content is 'accurate response from 120b model (optional, target <240s)';
comment on column query_history.sources is 'jsonb array of legal act references: [{"act_title": "...", "article": "Art. 5", "link": "...", "chunk_id": "..."}]';
comment on column query_history.fast_model_name is 'model name for fast response (e.g., mistral:7b)';
comment on column query_history.accurate_model_name is 'model name for accurate response (e.g., gpt-oss:120b, nullable)';
comment on column query_history.fast_generation_time_ms is 'time taken to generate fast response in milliseconds';
comment on column query_history.accurate_generation_time_ms is 'time taken to generate accurate response in milliseconds (nullable)';

-- example sources jsonb structure:
-- [
--   {
--     "act_title": "Ustawa o prawach konsumenta",
--     "article": "Art. 5 ust. 1",
--     "link": "/acts/dz-u/2023/1234#art-5",
--     "chunk_id": "uuid-chunk-1"
--   },
--   {
--     "act_title": "Kodeks cywilny",
--     "article": "Art. 384",
--     "link": "/acts/dz-u/1964/16#art-384",
--     "chunk_id": "uuid-chunk-2"
--   }
-- ]

-- performance notes:
-- 1. composite index: postgres can use (user_id, created_at) together for optimal query
-- 2. rls overhead: minimal with proper indexes on user_id
-- 3. jsonb indexing: not needed for mvp (small sources arrays)
-- 4. future optimization: add gin index on sources if complex jsonb queries needed

