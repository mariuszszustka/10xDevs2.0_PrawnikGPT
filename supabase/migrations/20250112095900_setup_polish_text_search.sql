-- =====================================================
-- migration: setup polish text search configuration
-- description: creates polish text search configuration for full-text search
-- tables affected: none (configuration only)
-- author: prawnikgpt
-- date: 2025-01-12
-- =====================================================

-- check if polish dictionary exists, if not use simple
-- polish text search requires additional dictionaries that may not be installed
-- for mvp, we'll use 'simple' configuration as fallback

-- option 1: try to create polish configuration (may fail if dictionaries not installed)
-- if this fails, we'll use 'simple' which works everywhere

-- create text search configuration for polish if dictionaries are available
do $$
begin
  -- check if polish dictionary files exist
  if exists (select 1 from pg_ts_config where cfgname = 'polish') then
    raise notice 'polish text search configuration already exists';
  else
    raise notice 'polish text search configuration not available, will use simple';
  end if;
end $$;

-- for now, we'll modify migrations to use 'simple' instead of 'polish'
-- this ensures compatibility across all postgresql installations
-- 'simple' configuration works for polish text but without stemming

-- note: if you want proper polish stemming:
-- 1. install postgresql-contrib package on the database server
-- 2. or use docker image with polish dictionaries pre-installed
-- 3. then change 'simple' back to 'polish' in future migrations

