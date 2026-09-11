import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_not_found_returns_safe_error_with_correlation_id() -> None:
    correlation_id = "22222222-2222-4222-8222-222222222222"
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/definitely-not-a-real-route",
            headers={"X-Correlation-ID": correlation_id},
        )

    assert response.status_code == 404
    assert response.headers["X-Correlation-ID"] == correlation_id
    assert response.json() == {
        "error": "not_found",
        "message": "Resource not found",
        "correlation_id": correlation_id,
    }
