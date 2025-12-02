"""
PrawnikGPT Backend - Database Integration Tests

These tests use a REAL Supabase database connection (not mocks).
They verify that database operations work correctly with actual data.

Requirements:
- Supabase must be running (local or remote)
- Environment variables must be set (SUPABASE_URL, SUPABASE_SERVICE_KEY)
- Migrations must be applied to the database

Run with:
    pytest backend/tests/integration/test_database_integration.py -v -m integration
"""

import pytest
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

# Add backend directory to path for imports
backend_dir = Path(__file__).parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.db.supabase_client import SupabaseClient
from backend.db.queries import (
    create_query,
    get_query_by_id,
    list_queries,
    delete_query
)
from postgrest.exceptions import APIError


# =========================================================================
# MARKERS AND CONFIGURATION
# =========================================================================

pytestmark = pytest.mark.integration


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture(scope="module")
def real_supabase_client():
    """
    Create a real Supabase client connection.
    
    This fixture connects to the actual database specified in environment variables.
    Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set correctly.
    """
    # Load environment variables from .env file
    from dotenv import load_dotenv
    load_dotenv('.env')
    
    # Verify environment variables are set
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        pytest.skip(
            "Skipping integration tests: SUPABASE_URL or SUPABASE_SERVICE_KEY not set. "
            "Set these environment variables to run integration tests."
        )
    
    # Reset SupabaseClient instance to force re-initialization with new config
    SupabaseClient._instance = None
    
    try:
        client = SupabaseClient.get_client()
        # Test connection by trying a simple query
        # Note: For self-signed certificates, we may need to disable SSL verification
        # This is acceptable for local/development environments
        result = client.table("query_history").select("id").limit(1).execute()
        yield client
    except Exception as e:
        # Print error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"\n⚠️  Connection error details:\n{error_details}\n")
        
        # If connection fails, check if it's SSL certificate issue
        error_msg = str(e).lower()
        if "ssl" in error_msg or "certificate" in error_msg or "verify" in error_msg:
            pytest.skip(
                f"Skipping integration tests: SSL certificate issue. "
                f"Supabase URL: {supabase_url}. "
                f"Error: {e}. "
                f"For self-signed certificates, set SUPABASE_VERIFY_SSL=false in .env"
            )
        else:
            pytest.skip(f"Skipping integration tests: Could not connect to Supabase: {e}")


@pytest.fixture
def test_user_id():
    """Generate a unique test user ID for each test."""
    return f"test-user-{uuid4().hex[:12]}"


@pytest.fixture
def cleanup_test_data(real_supabase_client, test_user_id):
    """
    Cleanup fixture that removes test data after each test.
    
    This ensures tests don't leave orphaned data in the database.
    """
    yield
    
    # Cleanup: Remove test data created during the test
    try:
        # Delete test queries
        real_supabase_client.table("query_history").delete().eq("user_id", test_user_id).execute()
        
        # Delete test ratings
        real_supabase_client.table("ratings").delete().eq("user_id", test_user_id).execute()
    except Exception as e:
        # Log but don't fail test if cleanup fails
        print(f"Warning: Cleanup failed: {e}")


# =========================================================================
# DATABASE CONNECTION TESTS
# =========================================================================

def test_database_connection(real_supabase_client):
    """Test that we can connect to the database."""
    assert real_supabase_client is not None
    
    # Try a simple query
    result = real_supabase_client.table("query_history").select("id").limit(1).execute()
    assert result is not None


def test_health_check_rpc(real_supabase_client):
    """Test that health_check RPC function exists and works."""
    try:
        result = real_supabase_client.rpc("health_check").execute()
        assert result.data is True
    except APIError as e:
        pytest.fail(f"health_check RPC function not found or failed: {e}")


# =========================================================================
# QUERY HISTORY TESTS
# =========================================================================

def test_create_query(real_supabase_client, test_user_id, cleanup_test_data):
    """Test creating a new query in the database."""
    query_text = "Test query for integration test"
    
    # Insert query
    result = real_supabase_client.table("query_history").insert({
        "user_id": test_user_id,
        "query_text": query_text,
        "fast_response_status": "pending"
    }).execute()
    
    assert result.data is not None
    assert len(result.data) == 1
    
    query_id = result.data[0]["id"]
    assert query_id is not None
    
    # Verify query was created
    verify_result = real_supabase_client.table("query_history").select("*").eq("id", query_id).single().execute()
    assert verify_result.data["query_text"] == query_text
    assert verify_result.data["user_id"] == test_user_id


def test_read_query(real_supabase_client, test_user_id, cleanup_test_data):
    """Test reading a query from the database."""
    # Create a test query first
    insert_result = real_supabase_client.table("query_history").insert({
        "user_id": test_user_id,
        "query_text": "Test read query",
        "fast_response_status": "completed",
        "fast_response_content": "Test response content"
    }).execute()
    
    query_id = insert_result.data[0]["id"]
    
    # Read the query
    result = real_supabase_client.table("query_history").select("*").eq("id", query_id).single().execute()
    
    assert result.data is not None
    assert result.data["id"] == query_id
    assert result.data["query_text"] == "Test read query"
    assert result.data["fast_response_content"] == "Test response content"


def test_update_query(real_supabase_client, test_user_id, cleanup_test_data):
    """Test updating a query in the database."""
    # Create a test query
    insert_result = real_supabase_client.table("query_history").insert({
        "user_id": test_user_id,
        "query_text": "Original query",
        "fast_response_status": "pending"
    }).execute()
    
    query_id = insert_result.data[0]["id"]
    
    # Update the query
    update_result = real_supabase_client.table("query_history").update({
        "fast_response_status": "completed",
        "fast_response_content": "Updated response"
    }).eq("id", query_id).execute()
    
    assert update_result.data is not None
    assert len(update_result.data) == 1
    assert update_result.data[0]["fast_response_status"] == "completed"
    assert update_result.data[0]["fast_response_content"] == "Updated response"


def test_delete_query(real_supabase_client, test_user_id, cleanup_test_data):
    """Test deleting a query from the database."""
    # Create a test query
    insert_result = real_supabase_client.table("query_history").insert({
        "user_id": test_user_id,
        "query_text": "Query to delete",
        "fast_response_status": "completed"
    }).execute()
    
    query_id = insert_result.data[0]["id"]
    
    # Delete the query
    delete_result = real_supabase_client.table("query_history").delete().eq("id", query_id).execute()
    
    assert delete_result.data is not None
    
    # Verify query was deleted
    try:
        verify_result = real_supabase_client.table("query_history").select("*").eq("id", query_id).single().execute()
        pytest.fail("Query should have been deleted")
    except APIError:
        # Expected: query not found
        pass


def test_list_queries_by_user(real_supabase_client, test_user_id, cleanup_test_data):
    """Test listing queries for a specific user."""
    # Create multiple test queries
    for i in range(3):
        real_supabase_client.table("query_history").insert({
            "user_id": test_user_id,
            "query_text": f"Test query {i}",
            "fast_response_status": "completed"
        }).execute()
    
    # List queries for this user
    result = real_supabase_client.table("query_history").select("*").eq("user_id", test_user_id).order("created_at", desc=True).execute()
    
    assert result.data is not None
    assert len(result.data) == 3
    
    # Verify all queries belong to the test user
    for query in result.data:
        assert query["user_id"] == test_user_id


# =========================================================================
# RATINGS TESTS
# =========================================================================

def test_create_rating(real_supabase_client, test_user_id, cleanup_test_data):
    """Test creating a rating for a query."""
    # Create a test query first
    query_result = real_supabase_client.table("query_history").insert({
        "user_id": test_user_id,
        "query_text": "Test query for rating",
        "fast_response_status": "completed"
    }).execute()
    
    query_id = query_result.data[0]["id"]
    
    # Create a rating
    rating_result = real_supabase_client.table("ratings").insert({
        "query_history_id": query_id,
        "user_id": test_user_id,
        "response_type": "fast",
        "rating_value": "up"
    }).execute()
    
    assert rating_result.data is not None
    assert len(rating_result.data) == 1
    assert rating_result.data[0]["rating_value"] == "up"
    assert rating_result.data[0]["response_type"] == "fast"


def test_unique_rating_constraint(real_supabase_client, test_user_id, cleanup_test_data):
    """Test that unique rating constraint works (one rating per user per query per response type)."""
    # Create a test query
    query_result = real_supabase_client.table("query_history").insert({
        "user_id": test_user_id,
        "query_text": "Test query",
        "fast_response_status": "completed"
    }).execute()
    
    query_id = query_result.data[0]["id"]
    
    # Create first rating
    real_supabase_client.table("ratings").insert({
        "query_history_id": query_id,
        "user_id": test_user_id,
        "response_type": "fast",
        "rating_value": "up"
    }).execute()
    
    # Try to create duplicate rating (should fail)
    with pytest.raises(APIError) as exc_info:
        real_supabase_client.table("ratings").insert({
            "query_history_id": query_id,
            "user_id": test_user_id,
            "response_type": "fast",
            "rating_value": "down"
        }).execute()
    
    # Verify it's a constraint violation
    assert exc_info.value.code in ["23505", "P0001"]  # Unique violation or constraint error


# =========================================================================
# REPOSITORY TESTS (using query functions)
# =========================================================================

@pytest.mark.asyncio
async def test_query_repository_create(real_supabase_client, test_user_id, cleanup_test_data):
    """Test create_query function with real database."""
    query_text = "Repository test query"
    
    query_id = await create_query(test_user_id, query_text)
    
    assert query_id is not None
    
    # Verify query exists
    result = real_supabase_client.table("query_history").select("*").eq("id", query_id).single().execute()
    assert result.data["query_text"] == query_text


@pytest.mark.asyncio
async def test_query_repository_get_by_id(real_supabase_client, test_user_id, cleanup_test_data):
    """Test get_query_by_id function with real database."""
    # Create a test query
    query_text = "Get by ID test"
    query_id = await create_query(test_user_id, query_text)
    
    # Update query with response content
    real_supabase_client.table("query_history").update({
        "fast_response_status": "completed",
        "fast_response_content": "Test content"
    }).eq("id", query_id).execute()
    
    # Get query by ID
    query = await get_query_by_id(query_id, test_user_id)
    
    assert query is not None
    assert query["id"] == query_id
    assert query["query_text"] == query_text
    assert query["fast_response_content"] == "Test content"


@pytest.mark.asyncio
async def test_query_repository_list_queries(real_supabase_client, test_user_id, cleanup_test_data):
    """Test list_queries function with real database."""
    # Create multiple queries
    for i in range(5):
        await create_query(test_user_id, f"List query {i}")
    
    # List queries
    queries = await list_queries(test_user_id, page=1, per_page=10)
    
    assert queries is not None
    assert len(queries) == 5
    
    # Verify all queries belong to test user
    for query in queries:
        assert query["user_id"] == test_user_id


# =========================================================================
# SEMANTIC SEARCH TESTS (if data exists)
# =========================================================================

def test_semantic_search_function_exists(real_supabase_client):
    """Test that semantic_search_chunks RPC function exists."""
    # This test only verifies the function exists, not that it works
    # (requires actual embeddings in the database)
    try:
        # Try to call with dummy data (will fail but function should exist)
        test_embedding = [0.0] * 768  # Dummy embedding vector
        result = real_supabase_client.rpc(
            "semantic_search_chunks",
            {
                "query_embedding": test_embedding,
                "match_count": 5,
                "similarity_threshold": 0.5
            }
        ).execute()
        
        # If we get here, function exists (even if it returns empty results)
        assert True
    except APIError as e:
        if "function" in str(e).lower() or "does not exist" in str(e).lower():
            pytest.fail(f"semantic_search_chunks RPC function not found: {e}")
        # Other errors (like no data) are acceptable for this test
        pass


def test_fetch_related_acts_function_exists(real_supabase_client):
    """Test that fetch_related_acts RPC function exists."""
    try:
        # Try to call with dummy data
        result = real_supabase_client.rpc(
            "fetch_related_acts",
            {
                "seed_act_ids": [],
                "max_depth": 1,
                "relation_types": ["amends", "replaces"]
            }
        ).execute()
        
        # If we get here, function exists
        assert True
    except APIError as e:
        if "function" in str(e).lower() or "does not exist" in str(e).lower():
            pytest.fail(f"fetch_related_acts RPC function not found: {e}")
        # Other errors are acceptable
        pass


# =========================================================================
# TABLE STRUCTURE TESTS
# =========================================================================

def test_query_history_table_structure(real_supabase_client):
    """Test that query_history table has expected columns."""
    # Try to insert and read back a query with all expected fields
    test_data = {
        "user_id": f"test-structure-{uuid4().hex[:8]}",
        "query_text": "Structure test",
        "fast_response_status": "completed",
        "fast_response_content": "Test content",
        "fast_model_name": "mistral:7b",
        "fast_generation_time_ms": 5000,
        "fast_sources": [{"act_title": "Test Act", "article": "Art. 1"}]
    }
    
    result = real_supabase_client.table("query_history").insert(test_data).execute()
    
    assert result.data is not None
    query_id = result.data[0]["id"]
    
    # Cleanup
    real_supabase_client.table("query_history").delete().eq("id", query_id).execute()


def test_ratings_table_structure(real_supabase_client, test_user_id, cleanup_test_data):
    """Test that ratings table has expected columns."""
    # Create a test query
    query_result = real_supabase_client.table("query_history").insert({
        "user_id": test_user_id,
        "query_text": "Rating structure test",
        "fast_response_status": "completed"
    }).execute()
    
    query_id = query_result.data[0]["id"]
    
    # Create rating with all expected fields
    rating_data = {
        "query_history_id": query_id,
        "user_id": test_user_id,
        "response_type": "fast",
        "rating_value": "up"
    }
    
    result = real_supabase_client.table("ratings").insert(rating_data).execute()
    
    assert result.data is not None
    assert result.data[0]["rating_value"] == "up"
    assert result.data[0]["response_type"] == "fast"

