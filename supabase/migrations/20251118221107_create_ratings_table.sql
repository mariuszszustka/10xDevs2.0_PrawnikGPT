-- =====================================================
-- migration: create ratings table
-- description: stores user ratings (thumbs up/down) for query responses
-- tables affected: ratings
-- dependencies: query_history, auth.users, response_type_enum, rating_value_enum
-- author: prawnikgpt
-- date: 2025-11-18
-- notes: tracks user feedback for both fast and accurate responses separately
-- =====================================================

-- ratings: stores user feedback on responses (thumbs up/down)
-- design: one rating per (user, query, response_type) combination
-- purpose: collect feedback for model quality improvement and user satisfaction metrics
-- users can change ratings: upsert logic handled in application layer
create table ratings (
  -- primary key: uuid for distributed systems
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key: reference to query_history
  -- on delete cascade: when query is deleted, ratings are deleted too
  -- rationale: ratings without queries are meaningless, automatic cleanup
  query_history_id uuid not null references query_history(id) on delete cascade,
  
  -- foreign key: reference to auth.users
  -- on delete cascade: ensures gdpr/rodo compliance (user deletion removes all ratings)
  -- rationale: user's right to erasure requires automatic cleanup
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- response type: fast or accurate
  -- determines which response this rating applies to
  -- allows: separate ratings for fast and accurate responses of same query
  -- example: user rates fast response 'down' but accurate response 'up'
  response_type response_type_enum not null,
  
  -- rating value: up (positive) or down (negative)
  -- simple binary feedback: thumbs up = helpful, thumbs down = unhelpful
  -- future: could extend to 1-5 stars if needed
  rating_value rating_value_enum not null,
  
  -- optional comment: detailed feedback
  -- nullable: most users won't leave comments
  -- prepared for future expansion: collect detailed feedback
  -- not used in mvp ui: but database is ready
  comment text,
  
  -- timestamps: audit trail and tracking rating changes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger: auto-update updated_at column on row modification
-- reuses the function created in earlier migration (legal_acts table)
-- important: tracks when user changed their rating (up→down or vice versa)
create trigger update_ratings_updated_at
  before update on ratings
  for each row
  execute function update_updated_at_column();

-- enable row level security (rls)
-- critical: prevents users from seeing/modifying other users' ratings
alter table ratings enable row level security;

-- rls policy: users can select only their own ratings
-- applies to: authenticated users only
-- rationale: privacy - users should not see other users' ratings
-- using clause: filters rows visible to user (user_id = auth.uid())
create policy ratings_select_own
  on ratings
  for select
  to authenticated
  using (user_id = auth.uid());

-- rls policy: users can insert ratings with their own user_id
-- applies to: authenticated users only
-- rationale: prevent users from creating ratings on behalf of other users
-- with check clause: validates new rows before insert (user_id = auth.uid())
create policy ratings_insert_own
  on ratings
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- rls policy: users can update only their own ratings
-- applies to: authenticated users only
-- rationale: allows users to change their ratings (e.g., up → down)
-- using clause: checks existing row ownership before update
-- with check clause: ensures user_id doesn't change during update
create policy ratings_update_own
  on ratings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- rls policy: users can delete only their own ratings
-- applies to: authenticated users only
-- rationale: allows users to remove their ratings
-- using clause: filters rows that can be deleted (user_id = auth.uid())
create policy ratings_delete_own
  on ratings
  for delete
  to authenticated
  using (user_id = auth.uid());

-- performance indexes

-- idx_ratings_query_history_id: b-tree index for finding ratings for specific query
-- common query: find all ratings for a query (display in ui)
-- used in: where query_history_id = $1
create index idx_ratings_query_history_id 
  on ratings(query_history_id);

-- idx_ratings_user_id: b-tree index for finding all ratings by user
-- use case: user analytics, find all ratings by specific user
-- used in: where user_id = auth.uid()
-- critical for: rls policies performance
create index idx_ratings_user_id 
  on ratings(user_id);

-- idx_ratings_response_type: b-tree index for filtering by response type
-- use case: analytics - compare fast vs accurate response ratings
-- used in: where response_type = 'fast' or 'accurate'
create index idx_ratings_response_type 
  on ratings(response_type);

-- table and column comments for documentation
comment on table ratings is 'user ratings (thumbs up/down) for query responses';
comment on column ratings.query_history_id is 'reference to query (on delete cascade for automatic cleanup)';
comment on column ratings.user_id is 'reference to user (on delete cascade for gdpr compliance)';
comment on column ratings.response_type is 'indicates whether rating applies to fast or accurate response';
comment on column ratings.rating_value is 'thumbs up (positive) or down (negative)';
comment on column ratings.comment is 'optional feedback comment (prepared for future expansion, not used in mvp ui)';
comment on column ratings.created_at is 'timestamp when rating was first created';
comment on column ratings.updated_at is 'timestamp when rating was last modified (tracks rating changes)';

-- design notes:
-- 1. no unique constraint: user can change rating multiple times (tracked by updated_at)
-- 2. application layer: should implement upsert logic (check existing + update or insert)
-- 3. separate ratings: fast and accurate responses can have different ratings
-- 4. future expansion: comment field ready for detailed feedback collection

-- application upsert logic example (pseudocode):
-- existing_rating = find_rating(query_history_id, user_id, response_type)
-- if existing_rating:
--   update(existing_rating.id, new_rating_value)
-- else:
--   insert(query_history_id, user_id, response_type, rating_value)

-- analytics queries examples:
-- 1. overall satisfaction: select rating_value, count(*) from ratings group by rating_value
-- 2. fast vs accurate: select response_type, rating_value, count(*) from ratings group by response_type, rating_value
-- 3. user engagement: select user_id, count(*) from ratings group by user_id order by count desc
-- 4. rating changes: select * from ratings where created_at != updated_at (users who changed their mind)

