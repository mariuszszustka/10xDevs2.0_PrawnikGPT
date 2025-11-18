-- =====================================================
-- migration: create query_history table
-- description: stores user queries with fast and accurate responses
-- tables affected: query_history
-- dependencies: auth.users (supabase managed), response_type_enum
-- author: prawnikgpt
-- date: 2025-01-12
-- =====================================================

-- query_history: stores all user queries and their responses
-- design decision: denormalized (fast + accurate in one table) for mvp simplicity
-- accurate_response_content is nullable (only filled when user requests detailed answer)
create table query_history (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key to auth.users (supabase managed)
  -- on delete cascade ensures gdpr/rodo compliance (user deletion removes all queries)
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- user's question (10-1000 characters per prd requirements)
  query_text text not null check (length(query_text) > 0 and length(query_text) <= 1000),
  
  -- fast response (always generated, 7b-13b model)
  fast_response_content text not null check (length(fast_response_content) > 0),
  
  -- accurate response (optional, 120b model, generated on user request)
  accurate_response_content text,
  
  -- sources: array of legal act references used in response
  -- format: [{"act_title": "...", "article": "...", "link": "..."}]
  -- default empty array to avoid null checks in application
  sources jsonb not null default '[]',
  
  -- model names for reproducibility and debugging
  fast_model_name varchar(100) not null,
  accurate_model_name varchar(100),
  
  -- generation time metrics (in milliseconds)
  -- fast_generation_time_ms: must be positive (check constraint)
  -- accurate_generation_time_ms: nullable (only when accurate response generated)
  fast_generation_time_ms integer not null check (fast_generation_time_ms > 0),
  accurate_generation_time_ms integer check (accurate_generation_time_ms > 0),
  
  -- timestamp (using timestamptz for timezone awareness)
  created_at timestamptz not null default now()
);

-- enable row level security
-- this is required for all tables storing user data
alter table query_history enable row level security;

-- rls policy: users can select only their own queries
-- this prevents users from seeing other users' query history
create policy query_history_select_own
  on query_history
  for select
  to authenticated
  using (user_id = auth.uid());

-- rls policy: users can insert queries with their own user_id
-- with check ensures user cannot insert queries on behalf of other users
create policy query_history_insert_own
  on query_history
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- rls policy: users can delete only their own queries
-- allows users to manage their query history (gdpr right to erasure)
create policy query_history_delete_own
  on query_history
  for delete
  to authenticated
  using (user_id = auth.uid());

-- note: no update policy - queries are immutable after creation
-- if user wants to modify, they should delete and create new query

-- performance indexes
-- idx_query_history_user_id: speeds up user history retrieval
create index idx_query_history_user_id on query_history(user_id);

-- idx_query_history_created_at: speeds up chronological sorting (desc for recent first)
create index idx_query_history_created_at on query_history(created_at desc);

-- add table comment for documentation
comment on table query_history is 'stores user queries with fast and accurate responses (denormalized for mvp)';
comment on column query_history.sources is 'jsonb array of legal act references: [{"act_title": "...", "article": "...", "link": "..."}]';
comment on column query_history.fast_generation_time_ms is 'time taken to generate fast response in milliseconds';
comment on column query_history.accurate_generation_time_ms is 'time taken to generate accurate response in milliseconds (nullable)';

