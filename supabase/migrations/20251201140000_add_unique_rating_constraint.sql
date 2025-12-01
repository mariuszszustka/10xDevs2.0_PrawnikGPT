-- =====================================================
-- migration: add unique constraint on ratings
-- description: ensures one rating per (query, user, response_type) combination
-- tables affected: ratings
-- dependencies: ratings table (20251118221107)
-- author: prawnikgpt
-- date: 2025-12-01
-- notes: enables upsert logic - prevents duplicate ratings
-- =====================================================

-- unique index: ensures one rating per (query, user, response_type)
-- purpose: database-level enforcement of business rule
-- rationale: user can only have one rating per response type per query
-- enables: efficient upsert operations (ON CONFLICT)
create unique index if not exists idx_ratings_unique
  on ratings(query_history_id, user_id, response_type);

comment on index idx_ratings_unique is 'ensures one rating per (query_history_id, user_id, response_type) combination';

-- note: existing upsert logic in application layer will still work
-- this constraint adds database-level protection against duplicates
-- if duplicates exist before this migration, it will fail
-- in that case, clean up duplicates first with:
-- DELETE FROM ratings a USING ratings b
-- WHERE a.id < b.id
--   AND a.query_history_id = b.query_history_id
--   AND a.user_id = b.user_id
--   AND a.response_type = b.response_type;

