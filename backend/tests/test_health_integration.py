from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_database_and_migration_available() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["core"] == "ok"
    assert body["database"] == "ok"
    assert body["migration"] == "0006_manager_operational_apis"
    assert body["ai"] in {"not_configured", "configured"}
