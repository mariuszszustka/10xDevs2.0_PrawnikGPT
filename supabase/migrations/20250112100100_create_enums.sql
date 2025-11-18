-- =====================================================
-- migration: create enum types
-- description: creates all enum types used across the database schema
-- tables affected: query_history, ratings, legal_acts, legal_act_relations
-- author: prawnikgpt
-- date: 2025-01-12
-- =====================================================

-- response_type_enum: distinguishes between fast (7b-13b model) and accurate (120b model) responses
-- used in query_history and ratings tables
-- fast: quick response (<15s) from smaller model
-- accurate: detailed response (<240s) from larger model
create type response_type_enum as enum ('fast', 'accurate');

-- rating_value_enum: stores user feedback on responses (thumbs up/down)
-- used in ratings table
-- up: positive feedback
-- down: negative feedback
create type rating_value_enum as enum ('up', 'down');

-- relation_type_enum: defines relationships between legal acts
-- used in legal_act_relations table
-- modifies: one act modifies another
-- repeals: one act repeals (cancels) another
-- implements: one act implements another (e.g., regulation implements law)
-- based_on: one act is based on another
-- amends: one act amends (changes) another
create type relation_type_enum as enum (
  'modifies',
  'repeals',
  'implements',
  'based_on',
  'amends'
);

-- legal_act_status_enum: current status of a legal act
-- used in legal_acts table
-- obowiązująca: act is currently in force
-- uchylona: act has been repealed
-- nieobowiązująca: act is not in force
create type legal_act_status_enum as enum (
  'obowiązująca',
  'uchylona',
  'nieobowiązująca'
);

-- note: enums are immutable after creation
-- to add new values in future, use: alter type enum_name add value 'new_value';
-- to remove values, recreate the enum (requires drop/recreate affected tables)

