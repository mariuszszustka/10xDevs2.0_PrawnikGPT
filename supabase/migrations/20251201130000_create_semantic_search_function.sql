-- =====================================================
-- migration: create semantic_search_chunks rpc function
-- description: pgvector-based semantic similarity search for rag pipeline
-- tables affected: legal_act_chunks, legal_acts
-- dependencies: vector extension, legal_act_chunks table
-- author: prawnikgpt
-- date: 2025-12-01
-- notes: critical function for rag - uses cosine distance with ivfflat index
-- performance: <200ms for 500k vectors with lists=100
-- =====================================================

-- semantic_search_chunks: finds most similar chunks to query embedding
-- input: query_embedding (vector), match_count (int), similarity_threshold (float)
-- output: table with chunks, metadata, and distance scores
-- algorithm: cosine distance using pgvector <=> operator
-- usage: called from backend rag_pipeline.py via supabase rpc

create or replace function semantic_search_chunks(
    query_embedding vector(1024),   -- query vector (1024-dim for nomic/mxbai models)
    match_count int default 10,      -- number of results to return
    similarity_threshold float default 0.5  -- max cosine distance (lower = more similar)
)
returns table (
    id uuid,
    legal_act_id uuid,
    chunk_index integer,
    content text,
    metadata jsonb,
    distance float,
    -- legal act info (joined)
    act_title text,
    act_publisher varchar(50),
    act_year integer,
    act_position integer,
    act_status text
)
language plpgsql
security definer  -- run with function owner's privileges (bypass rls for performance)
set search_path = public
as $$
begin
    -- validate input parameters
    if query_embedding is null then
        raise exception 'query_embedding cannot be null';
    end if;
    
    if match_count < 1 or match_count > 100 then
        raise exception 'match_count must be between 1 and 100';
    end if;
    
    if similarity_threshold < 0 or similarity_threshold > 2 then
        raise exception 'similarity_threshold must be between 0 and 2 (cosine distance range)';
    end if;

    -- perform semantic search using pgvector cosine distance
    -- query strategy:
    -- 1. calculate cosine distance for all chunks (uses ivfflat index)
    -- 2. filter by similarity threshold
    -- 3. join with legal_acts for metadata
    -- 4. order by distance (ascending - lower is better)
    -- 5. limit to match_count results
    
    return query
    select
        lac.id,
        lac.legal_act_id,
        lac.chunk_index,
        lac.content,
        lac.metadata,
        (lac.embedding <=> query_embedding)::float as distance,
        -- legal act metadata
        la.title as act_title,
        la.publisher as act_publisher,
        la.year as act_year,
        la.position as act_position,
        la.status::text as act_status
    from legal_act_chunks lac
    inner join legal_acts la on la.id = lac.legal_act_id
    where 
        -- filter by similarity threshold (cosine distance < threshold)
        (lac.embedding <=> query_embedding) < similarity_threshold
        -- only search in active legal acts (optional - can be removed)
        -- and la.status = 'obowiązująca'
    order by 
        lac.embedding <=> query_embedding asc  -- order by distance (lower = more similar)
    limit match_count;
end;
$$;

-- grant execute permissions
-- anon: allow unauthenticated access (public legal data)
-- authenticated: allow logged-in users
-- service_role: allow backend service calls
grant execute on function semantic_search_chunks(vector(1024), int, float) to anon;
grant execute on function semantic_search_chunks(vector(1024), int, float) to authenticated;
grant execute on function semantic_search_chunks(vector(1024), int, float) to service_role;

-- function documentation
comment on function semantic_search_chunks(vector(1024), int, float) is 
'Semantic similarity search for legal act chunks using pgvector.
Returns top K most similar chunks to the query embedding.

Parameters:
- query_embedding: 1024-dimensional query vector
- match_count: number of results (1-100, default 10)
- similarity_threshold: max cosine distance (0-2, default 0.5)

Returns:
- chunk data (id, content, metadata, chunk_index)
- distance score (lower = more similar)
- legal act metadata (title, publisher, year, position, status)

Performance:
- Uses IVFFlat index for approximate nearest neighbor search
- Target: <200ms for 500k vectors

Example usage from backend:
  response = supabase.rpc(
      "semantic_search_chunks",
      {"query_embedding": [0.1, 0.2, ...], "match_count": 10}
  ).execute()
';

-- =====================================================
-- example queries for testing and debugging
-- =====================================================

-- test query (replace with actual embedding):
-- select * from semantic_search_chunks(
--     (select embedding from legal_act_chunks limit 1),  -- use existing embedding
--     10,   -- top 10 results
--     0.5   -- max distance 0.5
-- );

-- performance check:
-- explain analyze
-- select * from semantic_search_chunks(
--     (select embedding from legal_act_chunks limit 1),
--     10,
--     0.5
-- );

-- note: after bulk data import, run:
-- vacuum analyze legal_act_chunks;
-- to update statistics for query planner

