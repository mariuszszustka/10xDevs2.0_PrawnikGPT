"""
PrawnikGPT Backend - Health Check Tests

Unit and integration tests for the health check endpoint.
Tests cover:
- Individual service checks (database, OLLAMA, auth)
- Aggregated health check logic
- HTTP endpoint responses
- Edge cases and error handling
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
from httpx import Response, TimeoutException, ConnectError

from backend.models.health import HealthResponse, ServiceHealthStatus
from backend.services.health_check import (
    check_database,
    check_ollama,
    check_supabase_auth,
    perform_health_check
)


# =========================================================================
# FIXTURES
# =========================================================================

@pytest.fixture
def mock_settings():
    """Mock settings for tests"""
    with patch('backend.services.health_check.settings') as mock:
        mock.ollama_host = "http://localhost:11434"
        mock.supabase_jwt_secret = "a" * 64  # 64 chars - valid secret
        yield mock


@pytest.fixture
def mock_settings_short_jwt():
    """Mock settings with short JWT secret"""
    with patch('backend.services.health_check.settings') as mock:
        mock.ollama_host = "http://localhost:11434"
        mock.supabase_jwt_secret = "short"  # Too short
        yield mock


@pytest.fixture
def mock_settings_no_jwt():
    """Mock settings without JWT secret"""
    with patch('backend.services.health_check.settings') as mock:
        mock.ollama_host = "http://localhost:11434"
        mock.supabase_jwt_secret = ""  # Empty
        yield mock


# =========================================================================
# DATABASE CHECK TESTS
# =========================================================================

class TestDatabaseCheck:
    """Tests for database health check"""

    @pytest.mark.asyncio
    async def test_database_healthy(self):
        """Test database check returns 'ok' when database is healthy"""
        with patch(
            'backend.services.health_check.check_database_health',
            new_callable=AsyncMock,
            return_value=True
        ):
            result = await check_database()
            assert result == "ok"

    @pytest.mark.asyncio
    async def test_database_unhealthy(self):
        """Test database check returns 'down' when database is unhealthy"""
        with patch(
            'backend.services.health_check.check_database_health',
            new_callable=AsyncMock,
            return_value=False
        ):
            result = await check_database()
            assert result == "down"

    @pytest.mark.asyncio
    async def test_database_timeout(self):
        """Test database check returns 'down' on timeout"""
        async def slow_check():
            import asyncio
            await asyncio.sleep(10)  # Will trigger timeout
            return True

        with patch(
            'backend.services.health_check.check_database_health',
            new_callable=AsyncMock,
            side_effect=slow_check
        ):
            result = await check_database()
            assert result == "down"

    @pytest.mark.asyncio
    async def test_database_exception(self):
        """Test database check returns 'down' on exception"""
        with patch(
            'backend.services.health_check.check_database_health',
            new_callable=AsyncMock,
            side_effect=Exception("Connection refused")
        ):
            result = await check_database()
            assert result == "down"


# =========================================================================
# OLLAMA CHECK TESTS
# =========================================================================

class TestOllamaCheck:
    """Tests for OLLAMA health check"""

    @pytest.mark.asyncio
    async def test_ollama_healthy(self, mock_settings):
        """Test OLLAMA check returns 'ok' when service is healthy"""
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get = AsyncMock(return_value=mock_response)
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_instance

            result = await check_ollama()
            assert result == "ok"

    @pytest.mark.asyncio
    async def test_ollama_error_status(self, mock_settings):
        """Test OLLAMA check returns 'down' on error status code"""
        mock_response = MagicMock()
        mock_response.status_code = 500

        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get = AsyncMock(return_value=mock_response)
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_instance

            result = await check_ollama()
            assert result == "down"

    @pytest.mark.asyncio
    async def test_ollama_timeout(self, mock_settings):
        """Test OLLAMA check returns 'down' on timeout"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get = AsyncMock(side_effect=TimeoutException("Timeout"))
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_instance

            result = await check_ollama()
            assert result == "down"

    @pytest.mark.asyncio
    async def test_ollama_connection_refused(self, mock_settings):
        """Test OLLAMA check returns 'down' on connection refused"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get = AsyncMock(side_effect=ConnectError("Connection refused"))
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_instance

            result = await check_ollama()
            assert result == "down"


# =========================================================================
# SUPABASE AUTH CHECK TESTS
# =========================================================================

class TestSupabaseAuthCheck:
    """Tests for Supabase Auth health check"""

    @pytest.mark.asyncio
    async def test_auth_healthy(self, mock_settings):
        """Test auth check returns 'ok' when JWT secret is properly configured"""
        result = await check_supabase_auth()
        assert result == "ok"

    @pytest.mark.asyncio
    async def test_auth_short_secret(self, mock_settings_short_jwt):
        """Test auth check returns 'degraded' when JWT secret is too short"""
        result = await check_supabase_auth()
        assert result == "degraded"

    @pytest.mark.asyncio
    async def test_auth_no_secret(self, mock_settings_no_jwt):
        """Test auth check returns 'down' when JWT secret is missing"""
        result = await check_supabase_auth()
        assert result == "down"


# =========================================================================
# AGGREGATED HEALTH CHECK TESTS
# =========================================================================

class TestPerformHealthCheck:
    """Tests for aggregated health check logic"""

    @pytest.mark.asyncio
    async def test_all_services_ok(self):
        """Test overall status is 'ok' when all services are healthy"""
        with patch('backend.services.health_check.check_database', new_callable=AsyncMock, return_value="ok"), \
             patch('backend.services.health_check.check_ollama', new_callable=AsyncMock, return_value="ok"), \
             patch('backend.services.health_check.check_supabase_auth', new_callable=AsyncMock, return_value="ok"):

            overall, services = await perform_health_check()

            assert overall == "ok"
            assert services["database"] == "ok"
            assert services["ollama"] == "ok"
            assert services["supabase_auth"] == "ok"

    @pytest.mark.asyncio
    async def test_one_service_down(self):
        """Test overall status is 'degraded' when one service is down"""
        with patch('backend.services.health_check.check_database', new_callable=AsyncMock, return_value="ok"), \
             patch('backend.services.health_check.check_ollama', new_callable=AsyncMock, return_value="down"), \
             patch('backend.services.health_check.check_supabase_auth', new_callable=AsyncMock, return_value="ok"):

            overall, services = await perform_health_check()

            assert overall == "degraded"
            assert services["database"] == "ok"
            assert services["ollama"] == "down"
            assert services["supabase_auth"] == "ok"

    @pytest.mark.asyncio
    async def test_all_services_down(self):
        """Test overall status is 'down' when all services are down"""
        with patch('backend.services.health_check.check_database', new_callable=AsyncMock, return_value="down"), \
             patch('backend.services.health_check.check_ollama', new_callable=AsyncMock, return_value="down"), \
             patch('backend.services.health_check.check_supabase_auth', new_callable=AsyncMock, return_value="down"):

            overall, services = await perform_health_check()

            assert overall == "down"
            assert services["database"] == "down"
            assert services["ollama"] == "down"
            assert services["supabase_auth"] == "down"

    @pytest.mark.asyncio
    async def test_mixed_status_degraded(self):
        """Test overall status is 'degraded' with mixed statuses"""
        with patch('backend.services.health_check.check_database', new_callable=AsyncMock, return_value="ok"), \
             patch('backend.services.health_check.check_ollama', new_callable=AsyncMock, return_value="degraded"), \
             patch('backend.services.health_check.check_supabase_auth', new_callable=AsyncMock, return_value="ok"):

            overall, services = await perform_health_check()

            assert overall == "degraded"

    @pytest.mark.asyncio
    async def test_exception_handling(self):
        """Test health check returns 'down' on unexpected exception"""
        with patch('backend.services.health_check.check_database', new_callable=AsyncMock, side_effect=Exception("Unexpected")), \
             patch('backend.services.health_check.check_ollama', new_callable=AsyncMock, return_value="ok"), \
             patch('backend.services.health_check.check_supabase_auth', new_callable=AsyncMock, return_value="ok"):

            overall, services = await perform_health_check()

            # When gather fails, all services should be marked as down
            assert overall == "down"


# =========================================================================
# PYDANTIC MODEL TESTS
# =========================================================================

class TestHealthModels:
    """Tests for Pydantic health models"""

    def test_service_health_status_valid(self):
        """Test ServiceHealthStatus with valid values"""
        status = ServiceHealthStatus(
            database="ok",
            ollama="degraded",
            supabase_auth="down"
        )
        assert status.database == "ok"
        assert status.ollama == "degraded"
        assert status.supabase_auth == "down"

    def test_service_health_status_invalid(self):
        """Test ServiceHealthStatus rejects invalid values"""
        with pytest.raises(ValueError):
            ServiceHealthStatus(
                database="invalid",
                ollama="ok",
                supabase_auth="ok"
            )

    def test_health_response_valid(self):
        """Test HealthResponse with valid values"""
        response = HealthResponse(
            status="ok",
            version="1.0.0",
            timestamp=datetime.utcnow(),
            services=ServiceHealthStatus(
                database="ok",
                ollama="ok",
                supabase_auth="ok"
            )
        )
        assert response.status == "ok"
        assert response.version == "1.0.0"
        assert response.services.database == "ok"

    def test_health_response_json_serialization(self):
        """Test HealthResponse JSON serialization"""
        response = HealthResponse(
            status="degraded",
            version="1.0.0",
            timestamp=datetime(2025, 11, 19, 10, 30, 0),
            services=ServiceHealthStatus(
                database="ok",
                ollama="down",
                supabase_auth="ok"
            )
        )
        json_data = response.model_dump(mode='json')
        
        assert json_data["status"] == "degraded"
        assert json_data["version"] == "1.0.0"
        assert json_data["services"]["ollama"] == "down"
        assert "timestamp" in json_data


# =========================================================================
# INTEGRATION TESTS (require running services)
# =========================================================================

class TestHealthEndpointIntegration:
    """
    Integration tests for health endpoint.
    These tests require running FastAPI test client.
    """

    @pytest.fixture
    def test_client(self):
        """Create test client for FastAPI app"""
        from fastapi.testclient import TestClient
        from backend.main import app
        return TestClient(app)

    def test_health_endpoint_returns_json(self, test_client):
        """Test health endpoint returns valid JSON"""
        response = test_client.get("/health")
        
        # Should return either 200 or 503
        assert response.status_code in [200, 503]
        
        # Should return valid JSON
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "timestamp" in data
        assert "services" in data

    def test_health_endpoint_structure(self, test_client):
        """Test health endpoint response structure matches schema"""
        response = test_client.get("/health")
        data = response.json()
        
        # Validate structure
        assert data["status"] in ["ok", "degraded", "down"]
        assert isinstance(data["version"], str)
        assert isinstance(data["timestamp"], str)
        
        services = data["services"]
        assert services["database"] in ["ok", "degraded", "down"]
        assert services["ollama"] in ["ok", "degraded", "down"]
        assert services["supabase_auth"] in ["ok", "degraded", "down"]

    def test_health_endpoint_content_type(self, test_client):
        """Test health endpoint returns JSON content type"""
        response = test_client.get("/health")
        assert "application/json" in response.headers["content-type"]

