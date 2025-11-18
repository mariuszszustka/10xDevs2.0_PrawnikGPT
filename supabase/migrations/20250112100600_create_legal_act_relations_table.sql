-- =====================================================
-- migration: create legal_act_relations table
-- description: stores relationships between legal acts (modifies, repeals, etc.)
-- tables affected: legal_act_relations
-- dependencies: legal_acts, relation_type_enum
-- author: prawnikgpt
-- date: 2025-01-12
-- =====================================================

-- legal_act_relations: stores directed relationships between legal acts
-- design: one row per unique relationship (source -> target)
-- data source: isap api references endpoint
-- use case: show related acts in ui (breadth-first graph, max depth 2)
create table legal_act_relations (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- source act (the act that establishes the relationship)
  -- on delete restrict: prevents accidental deletion of act with existing relations
  source_act_id uuid not null references legal_acts(id) on delete restrict,
  
  -- target act (the act being referenced)
  -- on delete restrict: prevents accidental deletion of referenced act
  target_act_id uuid not null references legal_acts(id) on delete restrict,
  
  -- type of relationship
  -- modifies: source act modifies target act
  -- repeals: source act repeals (cancels) target act
  -- implements: source act implements target act (e.g., regulation implements law)
  -- based_on: source act is based on target act
  -- amends: source act amends (changes) target act
  relation_type relation_type_enum not null,
  
  -- optional description of the relationship
  -- nullable: most relations don't need additional context
  -- example: "Art. 5 ust. 2 modifies Art. 10 of target act"
  description text,
  
  -- timestamp
  created_at timestamptz not null default now(),
  
  -- check constraint: act cannot reference itself
  -- prevents circular references at row level
  constraint legal_act_relations_no_self_reference check (source_act_id != target_act_id),
  
  -- unique constraint: no duplicate relations
  -- one unique tuple per (source, target, type)
  -- allows same acts to have multiple relation types (e.g., modifies + implements)
  constraint legal_act_relations_unique_relation unique(source_act_id, target_act_id, relation_type)
);

-- enable row level security (even though data is public)
-- best practice: always enable rls, then create permissive policies
alter table legal_act_relations enable row level security;

-- rls policy: allow anonymous users to select all relations
-- relations are public information (derived from public legal acts)
create policy legal_act_relations_select_all_anon
  on legal_act_relations
  for select
  to anon
  using (true);

-- rls policy: allow authenticated users to select all relations
-- separate policy for authenticated users (granular control)
create policy legal_act_relations_select_all_authenticated
  on legal_act_relations
  for select
  to authenticated
  using (true);

-- performance indexes
-- idx_legal_act_relations_source: speeds up finding all relations from source act
-- most common query: "what acts does this act reference?"
create index idx_legal_act_relations_source on legal_act_relations(source_act_id);

-- idx_legal_act_relations_target: speeds up finding all relations to target act
-- reverse query: "what acts reference this act?"
create index idx_legal_act_relations_target on legal_act_relations(target_act_id);

-- idx_legal_act_relations_type: speeds up filtering by relation type
-- allows queries like "find all acts that repeal other acts"
create index idx_legal_act_relations_type on legal_act_relations(relation_type);

-- composite index: speeds up finding specific relation type from source
-- optimizes queries like "find all acts modified by this act"
create index idx_legal_act_relations_source_type 
  on legal_act_relations(source_act_id, relation_type);

-- add table comments for documentation
comment on table legal_act_relations is 'directed relationships between legal acts (modifies, repeals, implements, etc.)';
comment on column legal_act_relations.source_act_id is 'act that establishes the relationship';
comment on column legal_act_relations.target_act_id is 'act being referenced';
comment on column legal_act_relations.relation_type is 'type of relationship: modifies, repeals, implements, based_on, amends';
comment on column legal_act_relations.description is 'optional description of relationship (e.g., specific article references)';

-- graph traversal notes:
-- 1. breadth-first search: use recursive cte (with recursive)
-- 2. max depth in mvp: 2 levels (direct relations + relations of relations)
-- 3. prevent infinite loops: track visited nodes in recursive query
-- 4. performance: indexes on source_act_id and target_act_id ensure fast traversal

-- example recursive query (breadth-first, max depth 2):
-- with recursive act_tree as (
--   select source_act_id, target_act_id, relation_type, 1 as depth
--   from legal_act_relations
--   where source_act_id = 'starting-act-uuid'
--   union
--   select lar.source_act_id, lar.target_act_id, lar.relation_type, at.depth + 1
--   from legal_act_relations lar
--   join act_tree at on lar.source_act_id = at.target_act_id
--   where at.depth < 2
-- )
-- select * from act_tree;

-- note: no insert/update/delete policies for regular users
-- data import handled by backend service with service role key
-- this ensures data integrity and prevents unauthorized modifications

