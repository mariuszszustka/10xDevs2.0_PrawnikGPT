-- =========================================================================
-- Migration: Create list_user_queries RPC function
-- Purpose: Efficiently list user queries with pagination and ratings
-- Used by: GET /api/v1/queries endpoint
-- =========================================================================

CREATE OR REPLACE FUNCTION list_user_queries(
    p_user_id uuid,
    p_page int,
    p_per_page int,
    p_order text
)
RETURNS TABLE (
    -- query_history fields
    id uuid,
    user_id uuid,
    query_text text,
    created_at timestamptz,
    fast_response_content text,
    fast_model_name text,
    fast_generation_time_ms int,
    accurate_response_content text,
    accurate_model_name text,
    accurate_generation_time_ms int,
    sources jsonb,
    -- ratings
    fast_rating text,
    accurate_rating text,
    -- pagination
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    p_offset int;
BEGIN
    -- Calculate offset
    p_offset := (p_page - 1) * p_per_page;

    RETURN QUERY
    WITH queries_with_ratings AS (
        SELECT
            qh.id,
            qh.user_id,
            qh.query_text,
            qh.created_at,
            qh.fast_response_content,
            qh.fast_model_name,
            qh.fast_generation_time_ms,
            qh.accurate_response_content,
            qh.accurate_model_name,
            qh.accurate_generation_time_ms,
            qh.sources,
            -- Aggregate ratings for each response type
            MAX(CASE WHEN r.response_type = 'fast' THEN r.rating_value ELSE NULL END) AS fast_rating,
            MAX(CASE WHEN r.response_type = 'accurate' THEN r.rating_value ELSE NULL END) AS accurate_rating,
            -- Window function for total count
            COUNT(*) OVER() as total_count
        FROM
            query_history qh
        LEFT JOIN
            ratings r ON qh.id = r.query_history_id
        WHERE
            qh.user_id = p_user_id
        GROUP BY
            qh.id
        ORDER BY
            CASE WHEN p_order = 'desc' THEN qh.created_at END DESC,
            CASE WHEN p_order = 'asc' THEN qh.created_at END ASC
        LIMIT
            p_per_page
        OFFSET
            p_offset
    )
    SELECT * FROM queries_with_ratings;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION list_user_queries(uuid, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION list_user_queries(uuid, int, int, text) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION list_user_queries(uuid, int, int, text) IS
'Lists user queries with pagination and joined ratings.
Args: p_user_id, p_page, p_per_page, p_order (desc/asc)';
