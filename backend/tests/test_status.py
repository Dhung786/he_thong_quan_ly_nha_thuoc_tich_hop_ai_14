from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_status_endpoint() -> None:
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    assert response.json() == {"service": "backend", "status": "ok"}
    assert response.headers.get("X-Correlation-ID")
