-- =========================================================================
-- Migration: Enable Full-Text Search for Legal Acts
-- Purpose: Improve performance of searching legal act titles
-- Used by: GET /api/v1/legal-acts?search=...
-- =========================================================================

-- STEP 1: Create GIN index for full-text search on `title`
-- This index allows for fast text search using tsvector
CREATE INDEX IF NOT EXISTS idx_legal_acts_title_fts
ON public.legal_acts
USING GIN (to_tsvector('polish', title));

COMMENT ON INDEX idx_legal_acts_title_fts IS
'Full-text search index for legal act titles.';


-- STEP 2: Create RPC function for searching legal acts
-- This function uses the GIN index for efficient searching
CREATE OR REPLACE FUNCTION search_legal_acts(
    p_search_query text
)
RETURNS SETOF legal_acts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM legal_acts
    WHERE to_tsvector('polish', title) @@ plainto_tsquery('polish', p_search_query)
    ORDER BY ts_rank(to_tsvector('polish', title), plainto_tsquery('polish', p_search_query)) DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_legal_acts(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_legal_acts(text) TO anon;
GRANT EXECUTE ON FUNCTION search_legal_acts(text) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION search_legal_acts(text) IS
'Performs a full-text search on legal act titles using a GIN index.
Args: p_search_query (text to search for)';
