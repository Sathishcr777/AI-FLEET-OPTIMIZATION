import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models import Base


@pytest.fixture
def client():
    return TestClient(app)


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "FleetIQ" in data["platform"]
    assert data["docs_url"] == "/api/v1/docs"


def test_openapi_schema(client):
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == settings.PROJECT_NAME
    assert "/api/v1/health" in schema["paths"]


def test_models_metadata():
    expected_tables = {
        "drivers",
        "vehicles",
        "trips",
        "telemetry",
        "driver_events",
        "maintenance_records",
        "predictions",
        "anomalies",
        "alerts",
        "routes",
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables == actual_tables


def test_health_endpoint_with_mocked_db():
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar.return_value = 1
    mock_db.execute.return_value = mock_result

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["project"] == settings.PROJECT_NAME
        assert "database" in data["services"]
        assert data["services"]["database"]["status"] == "healthy"
    finally:
        app.dependency_overrides.clear()
