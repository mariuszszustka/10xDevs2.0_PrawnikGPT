-- =====================================================
-- migration: create legal_act_relations table
-- description: stores directed relationships between legal acts (modifies, repeals, implements, etc.)
-- tables affected: legal_act_relations
-- dependencies: legal_acts, relation_type_enum
-- author: prawnikgpt
-- date: 2025-11-18
-- notes: graph structure for legal act relationships, supports recursive traversal up to depth 2
-- =====================================================

-- legal_act_relations: stores directed relationships between legal acts
-- design: one row per unique relationship (source → target with type)
-- data source: isap api references endpoint
-- purpose: show related acts in ui (breadth-first graph traversal, max depth 2)
-- graph properties: directed, acyclic (enforced by application logic), no self-loops (enforced by constraint)
create table legal_act_relations (
  -- primary key: uuid for distributed systems
  id uuid primary key default gen_random_uuid(),
  
  -- source act: the act that establishes the relationship
  -- on delete restrict: prevents accidental deletion of act with existing relations
  -- rationale: relationships are important metadata, protect integrity
  source_act_id uuid not null references legal_acts(id) on delete restrict,
  
  -- target act: the act being referenced
  -- on delete restrict: prevents accidental deletion of referenced act
  -- rationale: relationships would become orphaned, protect integrity
  target_act_id uuid not null references legal_acts(id) on delete restrict,
  
  -- relation type: nature of the relationship
  -- modifies: source act modifies target act
  -- repeals: source act repeals (cancels) target act
  -- implements: source act implements target act (e.g., regulation implements law)
  -- based_on: source act is based on target act
  -- amends: source act amends (changes) target act
  relation_type relation_type_enum not null,
  
  -- description: optional human-readable description of the relationship
  -- nullable: most relations don't need additional context
  -- example: "Art. 5 ust. 2 modifies Art. 10 of target act"
  -- use case: detailed explanation for complex relationships
  description text,
  
  -- timestamp: audit trail
  created_at timestamptz not null default now(),
  
  -- check constraint: act cannot reference itself
  -- prevents circular references at row level (e.g., act A modifies act A)
  -- rationale: self-references are semantically invalid in legal context
  check (source_act_id != target_act_id),
  
  -- unique constraint: no duplicate relations
  -- one unique tuple per (source, target, type)
  -- allows: same acts can have multiple relation types (e.g., modifies + implements)
  -- prevents: duplicate entries for same relationship
  constraint unique_relation unique(source_act_id, target_act_id, relation_type)
);

-- enable row level security (rls)
-- best practice: always enable rls, even for public tables
alter table legal_act_relations enable row level security;

-- rls policy: allow anonymous users to select all relations
-- applies to: anon role (unauthenticated users)
-- rationale: relations are public information (derived from public legal acts)
create policy legal_act_relations_select_all_anon
  on legal_act_relations
  for select
  to anon
  using (true);

-- rls policy: allow authenticated users to select all relations
-- applies to: authenticated role (logged in users)
-- rationale: separate policy for granular control
create policy legal_act_relations_select_all_authenticated
  on legal_act_relations
  for select
  to authenticated
  using (true);

-- performance indexes

-- idx_legal_act_relations_source: b-tree index for forward traversal
-- most common query: "what acts does this act reference?"
-- used in: where source_act_id = $1
create index idx_legal_act_relations_source 
  on legal_act_relations(source_act_id);

-- idx_legal_act_relations_target: b-tree index for reverse traversal
-- reverse query: "what acts reference this act?"
-- used in: where target_act_id = $1
create index idx_legal_act_relations_target 
  on legal_act_relations(target_act_id);

-- idx_legal_act_relations_type: b-tree index for filtering by relation type
-- use case: queries like "find all acts that repeal other acts"
-- used in: where relation_type = 'repeals'
create index idx_legal_act_relations_type 
  on legal_act_relations(relation_type);

-- idx_legal_act_relations_source_type: composite index for filtered traversal
-- optimizes queries like "find all acts modified by this act"
-- used in: where source_act_id = $1 and relation_type = 'modifies'
-- composite: (source_act_id, relation_type) for efficient filtering
create index idx_legal_act_relations_source_type 
  on legal_act_relations(source_act_id, relation_type);

-- table and column comments for documentation
comment on table legal_act_relations is 'directed relationships between legal acts (modifies, repeals, implements, based_on, amends)';
comment on column legal_act_relations.source_act_id is 'act that establishes the relationship (subject)';
comment on column legal_act_relations.target_act_id is 'act being referenced (object)';
comment on column legal_act_relations.relation_type is 'type of relationship: modifies, repeals, implements, based_on, amends';
comment on column legal_act_relations.description is 'optional description (e.g., specific article references)';

-- graph traversal notes:
-- 1. breadth-first search: use recursive cte (with recursive)
-- 2. max depth in mvp: 2 levels (direct relations + relations of relations)
-- 3. prevent infinite loops: track visited nodes in recursive query (important!)
-- 4. performance: indexes on source_act_id and target_act_id ensure fast traversal
-- 5. direction: graph is directed, reverse queries need target_act_id index

-- example recursive query (breadth-first traversal, max depth 2):
-- with recursive act_tree as (
--   -- base case: direct relations from starting act (depth 1)
--   select 
--     source_act_id,
--     target_act_id,
--     relation_type,
--     1 as depth
--   from legal_act_relations
--   where source_act_id = $1  -- parameter: starting act uuid
--   
--   union
--   
--   -- recursive case: relations of related acts (depth 2)
--   select 
--     lar.source_act_id,
--     lar.target_act_id,
--     lar.relation_type,
--     at.depth + 1
--   from legal_act_relations lar
--   join act_tree at on lar.source_act_id = at.target_act_id
--   where at.depth < 2  -- limit to max depth 2
-- )
-- -- fetch metadata for all related acts
-- select distinct
--   la.id,
--   la.title,
--   la.publisher,
--   la.year,
--   la.position,
--   la.status,
--   at.relation_type,
--   at.depth
-- from act_tree at
-- join legal_acts la on la.id = at.target_act_id
-- order by at.depth, la.title;

-- note: no insert/update/delete policies for regular users
-- data import is managed by backend service with service_role key
-- this ensures data integrity and prevents unauthorized modifications
-- graph structure is sensitive to incorrect data, protect it

