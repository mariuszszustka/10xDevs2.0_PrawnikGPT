-- =====================================================
-- migration: create legal_acts table
-- description: stores metadata for polish legal acts from isap database
-- tables affected: legal_acts
-- dependencies: legal_act_status_enum
-- author: prawnikgpt
-- date: 2025-11-18
-- notes: reference data table (read-only in mvp), populated via backend ingestion
-- =====================================================

-- reusable function: auto-update updated_at column
-- this function is used across multiple tables to maintain updated_at timestamp
-- returns trigger object with updated timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- legal_acts: stores metadata for all legal acts from isap database
-- design: one row per legal act (identified by publisher/year/position triplet)
-- data source: isap api (https://api.sejm.gov.pl/eli)
-- scope: 20,000 most recent legal acts for mvp
create table legal_acts (
  -- primary key: uuid for distributed systems and no information leakage
  id uuid primary key default gen_random_uuid(),
  
  -- unique identifier components (business key from isap)
  -- publisher: 'dz-u' (dziennik ustaw), 'mp' (monitor polski), 'wdu' (wiedeński dziennik ustaw)
  publisher varchar(50) not null,
  
  -- year of publication (1918-2100 range covers all polish legal acts + future)
  year integer not null check (year between 1918 and 2100),
  
  -- position number in publication (must be positive)
  position integer not null check (position > 0),
  
  -- metadata fields
  -- title: full official title of the legal act (can be long, hence text)
  title text not null,
  
  -- type of legal act: 'ustawa', 'rozporządzenie', 'obwieszczenie', 'uchwała', etc.
  typ_aktu varchar(255) not null,
  
  -- current status of the act in polish legal system
  status legal_act_status_enum not null,
  
  -- issuing authority: 'sejm', 'prezydent', 'minister', 'rada ministrów', etc.
  -- nullable: some acts don't have explicit issuing authority in isap data
  organ_wydajacy text,
  
  -- dates
  -- published_date: when act was published in official journal (always known)
  published_date date not null,
  
  -- effective_date: when act came into force (can be different from published_date)
  -- nullable: some acts have delayed effectiveness or no explicit effective date
  effective_date date,
  
  -- timestamps for audit and tracking
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- unique constraint: one act per (publisher, year, position) triplet
  -- this is the official identifier from isap - business key
  constraint unique_legal_act unique(publisher, year, position)
);

-- trigger: auto-update updated_at column on row modification
-- applies the reusable function created above
create trigger update_legal_acts_updated_at
  before update on legal_acts
  for each row
  execute function update_updated_at_column();

-- enable row level security (rls)
-- best practice: always enable rls, even for public tables
alter table legal_acts enable row level security;

-- rls policy: allow anonymous users to select all legal acts
-- applies to: anon role (unauthenticated users)
-- rationale: legal acts are public information, no restrictions needed
create policy legal_acts_select_all_anon
  on legal_acts
  for select
  to anon
  using (true);

-- rls policy: allow authenticated users to select all legal acts
-- applies to: authenticated role (logged in users)
-- rationale: separate policy for granular control (can add filters later if needed)
create policy legal_acts_select_all_authenticated
  on legal_acts
  for select
  to authenticated
  using (true);

-- performance indexes

-- idx_legal_acts_publisher_year_position: unique index for act lookup
-- automatically created by unique constraint, but explicit index for documentation
-- used in: insert ... on conflict (publisher, year, position) do nothing
create unique index idx_legal_acts_publisher_year_position 
  on legal_acts(publisher, year, position);

-- idx_legal_acts_published_date: speeds up sorting and filtering by publication date
-- descending order: most recent acts first (common query pattern)
-- used in: order by published_date desc, where published_date >= '2020-01-01'
create index idx_legal_acts_published_date 
  on legal_acts(published_date desc);

-- idx_legal_acts_title_fts: full-text search index for titles
-- gin index: efficient for full-text search queries
-- uses polish text search configuration for proper stemming
-- example: 'konsumenta' matches 'konsument', 'konsumenci', etc.
-- note: if polish dictionaries not installed, will use simple configuration
create index idx_legal_acts_title_fts 
  on legal_acts using gin (to_tsvector('polish', title));

-- idx_legal_acts_status: speeds up filtering by status
-- useful for finding only active acts: where status = 'obowiązująca'
-- enum type: stored as integers, very efficient for indexing
create index idx_legal_acts_status 
  on legal_acts(status);

-- table and column comments for documentation
comment on table legal_acts is 'metadata for polish legal acts from isap database (20k most recent for mvp)';
comment on column legal_acts.publisher is 'publication source: dz-u (dziennik ustaw), mp (monitor polski), wdu (wiedeński dziennik ustaw)';
comment on column legal_acts.year is 'publication year (1918-2100 range)';
comment on column legal_acts.position is 'position number in publication (positive integer)';
comment on column legal_acts.typ_aktu is 'type of legal act: ustawa, rozporządzenie, obwieszczenie, uchwała, etc.';
comment on column legal_acts.status is 'current status: obowiązująca (active), uchylona (repealed), nieobowiązująca (inactive)';
comment on column legal_acts.organ_wydajacy is 'issuing authority: sejm, prezydent, minister, rada ministrów, etc.';
comment on column legal_acts.published_date is 'date when act was published in official journal';
comment on column legal_acts.effective_date is 'date when act came into force (can differ from published_date)';

-- note: no insert/update/delete policies for regular users
-- data import is managed by backend service with service_role key
-- this ensures data integrity and prevents unauthorized modifications
-- regular users (anon + authenticated) have read-only access

