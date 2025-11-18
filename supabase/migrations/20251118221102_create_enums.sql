-- =====================================================
-- migration: create enum types
-- description: creates all enum types used across the database schema
-- tables affected: query_history, ratings, legal_acts, legal_act_relations (future tables)
-- author: prawnikgpt
-- date: 2025-11-18
-- notes: enums ensure data integrity at database level and improve performance
-- =====================================================

-- response_type_enum: distinguishes between fast and accurate responses
-- used in: query_history (denormalized design), ratings
-- fast: quick response (<15s target) from smaller model (7b-13b params)
-- accurate: detailed response (<240s timeout) from larger model (120b params)
create type response_type_enum as enum ('fast', 'accurate');

-- rating_value_enum: stores user feedback on responses (thumbs up/down)
-- used in: ratings table
-- up: positive feedback (helpful response)
-- down: negative feedback (unhelpful response)
create type rating_value_enum as enum ('up', 'down');

-- relation_type_enum: defines relationships between legal acts (from isap api)
-- used in: legal_act_relations table
-- modifies: source act modifies target act
-- repeals: source act repeals (cancels) target act
-- implements: source act implements target act (e.g., regulation implements law)
-- based_on: source act is based on target act
-- amends: source act amends (changes) target act
create type relation_type_enum as enum (
  'modifies',
  'repeals',
  'implements',
  'based_on',
  'amends'
);

-- legal_act_status_enum: current status of a legal act in polish legal system
-- used in: legal_acts table
-- obowiązująca: act is currently in force (active)
-- uchylona: act has been repealed (no longer valid)
-- nieobowiązująca: act is not in force (not yet active or expired)
create type legal_act_status_enum as enum (
  'obowiązująca',
  'uchylona',
  'nieobowiązująca'
);

-- note: postgres enums are immutable after creation
-- to add new values in future: alter type enum_name add value 'new_value';
-- to remove values: requires recreating the enum (drop cascade + recreate affected tables)
-- enums are case-sensitive: 'fast' != 'Fast'
-- enums are stored as integers internally (efficient storage and indexing)

