-- =========================================================================
-- Migration: Create health_check RPC function
-- Purpose: Simple database connectivity check for health endpoint
-- Used by: GET /health endpoint
-- =========================================================================

-- Create health_check function for database connectivity verification
-- This function performs minimal work and returns quickly
CREATE OR REPLACE FUNCTION health_check()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Simple check: if we can execute this function, database is healthy
    -- No actual query needed - function execution proves connectivity
    RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated and anon users
-- Health check must work without authentication
GRANT EXECUTE ON FUNCTION health_check() TO authenticated;
GRANT EXECUTE ON FUNCTION health_check() TO anon;
GRANT EXECUTE ON FUNCTION health_check() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION health_check() IS 
'Health check function for verifying database connectivity. 
Returns TRUE if database is responsive. Used by GET /health endpoint.';

