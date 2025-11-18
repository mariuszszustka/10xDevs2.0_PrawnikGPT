-- =====================================================
-- migration: create legal_acts table
-- description: stores metadata for polish legal acts from isap
-- tables affected: legal_acts
-- dependencies: legal_act_status_enum
-- author: prawnikgpt
-- date: 2025-01-12
-- =====================================================

-- legal_acts: stores metadata for all legal acts from isap database
-- design: one row per legal act (identified by publisher/year/position)
-- data source: isap api (http://isap.sejm.gov.pl)
create table legal_acts (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- unique identifier components (from isap)
  -- publisher: 'dz-u' (dziennik ustaw), 'mp' (monitor polski), 'wdu' (wiedeński dziennik ustaw)
  publisher varchar(50) not null,
  
  -- year of publication (1918-2100 range covers all polish legal acts)
  year integer not null check (year between 1918 and 2100),
  
  -- position number in publication (must be positive)
  position integer not null check (position > 0),
  
  -- legal act title (full official title)
  title text not null,
  
  -- type of legal act (ustawa, rozporządzenie, obwieszczenie, etc.)
  typ_aktu varchar(255) not null,
  
  -- current status of the act
  status legal_act_status_enum not null,
  
  -- issuing authority (sejm, prezydent, minister, etc.)
  -- nullable: some acts don't have explicit issuing authority in isap
  organ_wydajacy text,
  
  -- publication date (when act was published)
  published_date date not null,
  
  -- effective date (when act came into force)
  -- nullable: some acts have delayed effectiveness or no explicit date
  effective_date date,
  
  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- unique constraint: one act per (publisher, year, position)
  -- this is the official identifier from isap
  constraint legal_acts_unique_identifier unique(publisher, year, position)
);

-- trigger: auto-update updated_at on row modification
create trigger update_legal_acts_updated_at
  before update on legal_acts
  for each row
  execute function update_updated_at_column();

-- enable row level security (even though data is public)
-- best practice: always enable rls, then create permissive policies
alter table legal_acts enable row level security;

-- rls policy: allow anonymous users to select all legal acts
-- legal acts are public information, no restrictions
create policy legal_acts_select_all_anon
  on legal_acts
  for select
  to anon
  using (true);

-- rls policy: allow authenticated users to select all legal acts
-- separate policy for authenticated users (granular control)
create policy legal_acts_select_all_authenticated
  on legal_acts
  for select
  to authenticated
  using (true);

-- performance indexes
-- idx_legal_acts_publisher_year_position: unique index for act lookup
-- already created by unique constraint, but explicit for documentation
create unique index if not exists idx_legal_acts_publisher_year_position 
  on legal_acts(publisher, year, position);

-- idx_legal_acts_published_date: speeds up sorting by publication date
create index idx_legal_acts_published_date on legal_acts(published_date desc);

-- idx_legal_acts_title_fts: full-text search index for titles
-- uses simple text search configuration (works on all postgresql installations)
-- note: for proper polish stemming, change 'simple' to 'polish' after installing polish dictionaries
create index idx_legal_acts_title_fts 
  on legal_acts using gin (to_tsvector('simple', title));

-- idx_legal_acts_status: speeds up filtering by status
-- useful for finding only active acts (obowiązująca)
create index idx_legal_acts_status on legal_acts(status);

-- add table comments for documentation
comment on table legal_acts is 'metadata for polish legal acts from isap database';
comment on column legal_acts.publisher is 'publication source: dz-u (dziennik ustaw), mp (monitor polski), wdu (wiedeński dziennik ustaw)';
comment on column legal_acts.year is 'publication year (1918-2100)';
comment on column legal_acts.position is 'position number in publication';
comment on column legal_acts.typ_aktu is 'type of legal act: ustawa, rozporządzenie, obwieszczenie, etc.';
comment on column legal_acts.status is 'current status: obowiązująca, uchylona, nieobowiązująca';
comment on column legal_acts.organ_wydajacy is 'issuing authority: sejm, prezydent, minister, etc.';

-- note: no insert/update/delete policies for regular users
-- data import handled by backend service with service role key
-- this ensures data integrity and prevents unauthorized modifications

