"""
PrawnikGPT Backend - Pytest Configuration and Fixtures

Shared fixtures and configuration for all backend tests.
Provides mock clients, test data, and utility functions.
"""

import pytest
import os
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from typing import Generator, Dict, Any

# Set test environment before importing app modules
os.environ["SUPABASE_URL"] = "http://localhost:54321"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key-for-testing-purposes-only"
os.environ["SUPABASE_JWT_SECRET"] = "a" * 64  # 64 chars for valid JWT secret
os.environ["OLLAMA_HOST"] = "http://localhost:11434"
os.environ["ENVIRONMENT"] = "development"
os.environ["DEBUG"] = "true"


# =========================================================================
# FASTAPI TEST CLIENT FIXTURES
# =========================================================================

@pytest.fixture(scope="module")
def test_app():
    """
    Create FastAPI test application instance.
    
    Scope: module (shared across all tests in module for efficiency)
    
    Returns:
        FastAPI app instance
    """
    from backend.main import app
    return app


@pytest.fixture
def test_client(test_app):
    """
    Create test client for HTTP requests.
    
    Returns:
        TestClient: FastAPI test client
    """
    from fastapi.testclient import TestClient
    return TestClient(test_app)


@pytest.fixture
async def async_client(test_app):
    """
    Create async test client for async HTTP requests.
    
    Returns:
        AsyncClient: httpx async client for testing
    """
    from httpx import AsyncClient, ASGITransport
    
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test"
    ) as client:
        yield client


# =========================================================================
# MOCK SETTINGS FIXTURES
# =========================================================================

@pytest.fixture
def mock_settings():
    """
    Mock application settings with test values.
    
    Returns:
        MagicMock: Mocked settings object
    """
    with patch('backend.config.settings') as mock:
        mock.supabase_url = "http://localhost:54321"
        mock.supabase_service_key = "test-service-key"
        mock.supabase_jwt_secret = "a" * 64
        mock.ollama_host = "http://localhost:11434"
        mock.ollama_fast_model = "mistral:7b"
        mock.ollama_accurate_model = "gpt-oss:120b"
        mock.ollama_embedding_model = "nomic-embed-text"
        mock.ollama_fast_timeout = 15
        mock.ollama_accurate_timeout = 240
        mock.redis_url = None
        mock.app_version = "1.0.0-test"
        mock.environment = "development"
        mock.debug = True
        mock.rate_limit_per_user = 10
        mock.rate_limit_per_ip = 30
        mock.cors_origins_list = ["http://localhost:4321"]
        mock.is_production = False
        mock.is_development = True
        yield mock


@pytest.fixture
def mock_settings_production():
    """
    Mock settings for production environment.
    """
    with patch('backend.config.settings') as mock:
        mock.supabase_url = "https://production.supabase.co"
        mock.supabase_service_key = "production-key"
        mock.supabase_jwt_secret = "b" * 64
        mock.ollama_host = "https://ollama.production.com"
        mock.environment = "production"
        mock.debug = False
        mock.is_production = True
        mock.is_development = False
        yield mock


# =========================================================================
# MOCK DATABASE FIXTURES
# =========================================================================

@pytest.fixture
def mock_supabase_client():
    """
    Mock Supabase client for database tests.
    
    Returns:
        MagicMock: Mocked Supabase client
    """
    mock_client = MagicMock()
    
    # Mock table operations
    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.single.return_value = mock_table
    mock_table.limit.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[], count=0)
    
    mock_client.table.return_value = mock_table
    
    # Mock RPC
    mock_rpc = MagicMock()
    mock_rpc.execute.return_value = MagicMock(data=True)
    mock_client.rpc.return_value = mock_rpc
    
    with patch('backend.db.supabase_client.SupabaseClient.get_client', return_value=mock_client):
        yield mock_client


@pytest.fixture
def mock_database_healthy():
    """Mock database that returns healthy status."""
    with patch('backend.db.supabase_client.check_database_health', new_callable=AsyncMock) as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_database_unhealthy():
    """Mock database that returns unhealthy status."""
    with patch('backend.db.supabase_client.check_database_health', new_callable=AsyncMock) as mock:
        mock.return_value = False
        yield mock


# =========================================================================
# MOCK OLLAMA FIXTURES
# =========================================================================

@pytest.fixture
def mock_ollama_healthy():
    """
    Mock OLLAMA service that returns healthy responses.
    """
    with patch('httpx.AsyncClient') as mock_client:
        mock_instance = AsyncMock()
        
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"version": "0.1.0"}
        
        mock_instance.get = AsyncMock(return_value=mock_response)
        mock_instance.post = AsyncMock(return_value=mock_response)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        
        mock_client.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_ollama_unhealthy():
    """
    Mock OLLAMA service that fails.
    """
    from httpx import ConnectError
    
    with patch('httpx.AsyncClient') as mock_client:
        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(side_effect=ConnectError("Connection refused"))
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        
        mock_client.return_value = mock_instance
        yield mock_instance


# =========================================================================
# AUTHENTICATION FIXTURES
# =========================================================================

@pytest.fixture
def mock_auth_user():
    """
    Mock authenticated user for protected endpoints.
    
    Returns:
        str: User ID
    """
    user_id = "test-user-12345"
    
    with patch('backend.middleware.auth.get_current_user', return_value=user_id):
        yield user_id


@pytest.fixture
def valid_jwt_token():
    """
    Generate a valid JWT token for testing.
    
    Note: This is a test token, not valid for production.
    """
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzNDUiLCJleHAiOjk5OTk5OTk5OTl9.test"


@pytest.fixture
def auth_headers(valid_jwt_token):
    """
    Generate authorization headers for authenticated requests.
    """
    return {"Authorization": f"Bearer {valid_jwt_token}"}


# =========================================================================
# TEST DATA FIXTURES
# =========================================================================

@pytest.fixture
def sample_query_data() -> Dict[str, Any]:
    """Sample query data for testing."""
    return {
        "id": "query-12345",
        "user_id": "test-user-12345",
        "query_text": "Jakie są prawa konsumenta przy zakupie wadliwego produktu?",
        "fast_response_status": "completed",
        "fast_response_content": "Zgodnie z ustawą o prawach konsumenta...",
        "fast_model_name": "mistral:7b",
        "fast_generation_time_ms": 8500,
        "fast_sources": [
            {
                "act_title": "Ustawa o prawach konsumenta",
                "article": "Art. 43",
                "link": "https://isap.sejm.gov.pl/...",
                "chunk_id": "chunk-123"
            }
        ],
        "accurate_response_status": None,
        "accurate_response_content": None,
        "created_at": "2025-11-19T10:30:00Z"
    }


@pytest.fixture
def sample_legal_act_data() -> Dict[str, Any]:
    """Sample legal act data for testing."""
    return {
        "id": "act-12345",
        "title": "Ustawa o prawach konsumenta",
        "act_type": "ustawa",
        "publisher": "Dz.U.",
        "year": 2014,
        "number": 827,
        "status": "obowiązująca",
        "published_date": "2014-06-24",
        "effective_date": "2014-12-25",
        "isap_id": "WDU20140000827",
        "created_at": "2025-11-01T00:00:00Z",
        "updated_at": "2025-11-01T00:00:00Z"
    }


@pytest.fixture
def sample_rating_data() -> Dict[str, Any]:
    """Sample rating data for testing."""
    return {
        "id": "rating-12345",
        "query_history_id": "query-12345",
        "user_id": "test-user-12345",
        "response_type": "fast",
        "rating_value": "up",
        "created_at": "2025-11-19T10:35:00Z",
        "updated_at": "2025-11-19T10:35:00Z"
    }


# =========================================================================
# UTILITY FIXTURES
# =========================================================================

@pytest.fixture
def freeze_time():
    """
    Freeze time for consistent datetime testing.
    
    Usage:
        def test_something(freeze_time):
            with freeze_time("2025-11-19T10:30:00Z"):
                # datetime.now() returns frozen time
    """
    from unittest.mock import patch
    from datetime import datetime
    
    def _freeze(time_string: str):
        frozen_time = datetime.fromisoformat(time_string.replace("Z", "+00:00"))
        return patch('datetime.datetime', wraps=datetime, **{
            'now.return_value': frozen_time,
            'utcnow.return_value': frozen_time
        })
    
    return _freeze


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """
    Reset rate limiter state between tests.
    
    Autouse: applies to all tests automatically.
    """
    from backend.middleware.rate_limit import in_memory_limiter
    
    # Clear all stored requests before each test
    in_memory_limiter.requests.clear()
    
    yield
    
    # Cleanup after test
    in_memory_limiter.requests.clear()


# =========================================================================
# PYTEST CONFIGURATION
# =========================================================================

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on test location."""
    for item in items:
        # Add markers based on test file location
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        else:
            item.add_marker(pytest.mark.unit)

