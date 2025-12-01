-- =====================================================
-- migration: create fetch_related_acts rpc function
-- description: recursive graph traversal for finding related legal acts
-- tables affected: legal_act_relations, legal_acts
-- dependencies: legal_act_relations table, relation_type_enum
-- author: prawnikgpt
-- date: 2025-12-01
-- notes: uses recursive cte for breadth-first traversal up to depth 2
-- performance: optimized by indexes on source_act_id and target_act_id
-- =====================================================

-- fetch_related_acts: finds acts related to given seed acts via graph traversal
-- input: seed_act_ids (uuid array), max_depth (int), relation_types (text array, optional)
-- output: table with related acts, relation metadata, and traversal depth
-- algorithm: breadth-first search using recursive cte
-- usage: called from backend rag_pipeline.py to expand context with related legal acts

create or replace function fetch_related_acts(
    seed_act_ids uuid[],              -- starting act ids for traversal
    max_depth int default 2,           -- max traversal depth (1 or 2)
    relation_types text[] default null -- optional filter: ['modifies', 'repeals', 'implements', 'based_on', 'amends']
)
returns table (
    -- related act info
    act_id uuid,
    title text,
    publisher varchar(50),
    year integer,
    position integer,
    status text,
    published_date date,
    -- relation info
    relation_type text,
    relation_description text,
    source_act_id uuid,
    -- traversal info
    depth integer
)
language plpgsql
security definer  -- run with function owner's privileges
set search_path = public
as $$
begin
    -- validate input parameters
    if seed_act_ids is null or array_length(seed_act_ids, 1) is null then
        raise exception 'seed_act_ids cannot be null or empty';
    end if;
    
    if max_depth < 1 or max_depth > 2 then
        raise exception 'max_depth must be 1 or 2 (mvp limitation)';
    end if;

    -- perform recursive graph traversal using cte
    -- strategy:
    -- 1. base case: direct relations from seed acts (depth 1)
    -- 2. recursive case: relations of related acts (depth 2)
    -- 3. prevent cycles: track visited nodes
    -- 4. join with legal_acts for metadata
    -- 5. deduplicate results (same act can be reached via multiple paths)
    
    return query
    with recursive act_graph as (
        -- base case: direct relations from seed acts (outgoing)
        select 
            lar.target_act_id as related_act_id,
            lar.relation_type::text as rel_type,
            lar.description as rel_description,
            lar.source_act_id as from_act_id,
            1 as traversal_depth,
            array[lar.source_act_id, lar.target_act_id] as visited_path
        from legal_act_relations lar
        where 
            lar.source_act_id = any(seed_act_ids)
            and (relation_types is null or lar.relation_type::text = any(relation_types))
        
        union all
        
        -- base case: direct relations to seed acts (incoming)
        select 
            lar.source_act_id as related_act_id,
            lar.relation_type::text as rel_type,
            lar.description as rel_description,
            lar.target_act_id as from_act_id,
            1 as traversal_depth,
            array[lar.target_act_id, lar.source_act_id] as visited_path
        from legal_act_relations lar
        where 
            lar.target_act_id = any(seed_act_ids)
            and (relation_types is null or lar.relation_type::text = any(relation_types))
        
        union all
        
        -- recursive case: relations of related acts (outgoing, depth 2)
        select 
            lar.target_act_id as related_act_id,
            lar.relation_type::text as rel_type,
            lar.description as rel_description,
            lar.source_act_id as from_act_id,
            ag.traversal_depth + 1 as traversal_depth,
            ag.visited_path || lar.target_act_id as visited_path
        from legal_act_relations lar
        inner join act_graph ag on lar.source_act_id = ag.related_act_id
        where 
            ag.traversal_depth < max_depth
            -- prevent cycles: don't revisit already visited acts
            and not (lar.target_act_id = any(ag.visited_path))
            and (relation_types is null or lar.relation_type::text = any(relation_types))
    ),
    -- deduplicate: keep shortest path to each act
    deduplicated as (
        select distinct on (related_act_id)
            related_act_id,
            rel_type,
            rel_description,
            from_act_id,
            traversal_depth
        from act_graph
        order by related_act_id, traversal_depth asc
    )
    -- join with legal_acts to get full metadata
    select
        la.id as act_id,
        la.title,
        la.publisher,
        la.year,
        la.position,
        la.status::text as status,
        la.published_date,
        d.rel_type as relation_type,
        d.rel_description as relation_description,
        d.from_act_id as source_act_id,
        d.traversal_depth as depth
    from deduplicated d
    inner join legal_acts la on la.id = d.related_act_id
    -- exclude seed acts from results (they're the starting point, not "related")
    where not (d.related_act_id = any(seed_act_ids))
    order by d.traversal_depth asc, la.title asc;
end;
$$;

-- grant execute permissions
grant execute on function fetch_related_acts(uuid[], int, text[]) to anon;
grant execute on function fetch_related_acts(uuid[], int, text[]) to authenticated;
grant execute on function fetch_related_acts(uuid[], int, text[]) to service_role;

-- function documentation
comment on function fetch_related_acts(uuid[], int, text[]) is 
'Recursive graph traversal to find legal acts related to seed acts.
Uses breadth-first search with cycle detection.

Parameters:
- seed_act_ids: array of starting act UUIDs
- max_depth: traversal depth (1 or 2, default 2)
- relation_types: optional filter array [''modifies'', ''repeals'', ''implements'', ''based_on'', ''amends'']

Returns:
- act metadata (id, title, publisher, year, position, status, published_date)
- relation info (type, description, source_act_id)
- depth (how many hops from seed act)

Algorithm:
- BFS using recursive CTE
- Bidirectional: follows both outgoing and incoming relations
- Deduplication: returns shortest path to each act
- Cycle prevention: tracks visited path

Performance:
- Uses indexes on source_act_id and target_act_id
- Limited to depth 2 for performance

Example usage from backend:
  response = supabase.rpc(
      "fetch_related_acts",
      {
          "seed_act_ids": ["uuid1", "uuid2"],
          "max_depth": 2,
          "relation_types": ["modifies", "amends"]
      }
  ).execute()
';

-- =====================================================
-- example queries for testing
-- =====================================================

-- test with existing act ids:
-- select * from fetch_related_acts(
--     (select array_agg(id) from legal_acts limit 3),  -- first 3 acts
--     2,     -- max depth 2
--     null   -- all relation types
-- );

-- test with specific relation types:
-- select * from fetch_related_acts(
--     array['some-uuid-here']::uuid[],
--     2,
--     array['modifies', 'amends']
-- );

