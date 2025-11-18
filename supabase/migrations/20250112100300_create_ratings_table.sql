-- =====================================================
-- migration: create ratings table
-- description: stores user ratings (thumbs up/down) for query responses
-- tables affected: ratings
-- dependencies: query_history, auth.users, response_type_enum, rating_value_enum
-- author: prawnikgpt
-- date: 2025-01-12
-- =====================================================

-- helper function: auto-update updated_at timestamp
-- this function is reusable across multiple tables
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ratings: stores user feedback on responses
-- design: one rating per (query_history_id, response_type) pair
-- users can change ratings (upsert logic handled in application)
create table ratings (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key to query_history
  -- on delete cascade: when query is deleted, ratings are deleted too
  query_history_id uuid not null references query_history(id) on delete cascade,
  
  -- foreign key to auth.users
  -- on delete cascade: ensures gdpr/rodo compliance
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- response type: fast or accurate
  -- determines which response this rating applies to
  response_type response_type_enum not null,
  
  -- rating value: up (positive) or down (negative)
  rating_value rating_value_enum not null,
  
  -- optional comment for future expansion
  -- currently not used in mvp, but prepared for feedback collection
  comment text,
  
  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger: auto-update updated_at on row modification
create trigger update_ratings_updated_at
  before update on ratings
  for each row
  execute function update_updated_at_column();

-- enable row level security
-- required for all tables storing user data
alter table ratings enable row level security;

-- rls policy: users can select only their own ratings
-- prevents users from seeing other users' ratings
create policy ratings_select_own
  on ratings
  for select
  to authenticated
  using (user_id = auth.uid());

-- rls policy: users can insert ratings with their own user_id
-- with check ensures user cannot insert ratings on behalf of other users
create policy ratings_insert_own
  on ratings
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- rls policy: users can update only their own ratings
-- allows users to change their ratings (e.g., from up to down)
-- using clause: checks existing row ownership
-- with check clause: ensures user_id doesn't change during update
create policy ratings_update_own
  on ratings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- rls policy: users can delete only their own ratings
-- allows users to remove their ratings
create policy ratings_delete_own
  on ratings
  for delete
  to authenticated
  using (user_id = auth.uid());

-- performance indexes
-- idx_ratings_query_history_id: speeds up finding ratings for a query
create index idx_ratings_query_history_id on ratings(query_history_id);

-- idx_ratings_user_id: speeds up finding all ratings by user
create index idx_ratings_user_id on ratings(user_id);

-- idx_ratings_response_type: speeds up filtering by response type
create index idx_ratings_response_type on ratings(response_type);

-- add table comments for documentation
comment on table ratings is 'stores user ratings (thumbs up/down) for query responses';
comment on column ratings.comment is 'optional feedback comment (prepared for future expansion, not used in mvp)';
comment on column ratings.response_type is 'indicates whether rating applies to fast or accurate response';

-- note: no unique constraint on (query_history_id, response_type)
-- users can change ratings - upsert logic handled in application layer
-- application should check for existing rating and update if found

