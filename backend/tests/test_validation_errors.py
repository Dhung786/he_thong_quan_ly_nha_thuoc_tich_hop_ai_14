import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_validation_error_does_not_echo_sensitive_input() -> None:
    secret_marker = "DO_NOT_ECHO_PASSWORD_MARKER"
    overlong_password = secret_marker + ("x" * 300)
    correlation_id = "11111111-1111-4111-8111-111111111111"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": overlong_password},
            headers={"X-Correlation-ID": correlation_id},
        )

    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "validation_error"
    assert body["message"] == "Request validation failed"
    assert body["correlation_id"] == correlation_id
    assert response.headers["X-Correlation-ID"] == correlation_id
    assert {
        "location": ["body", "password"],
        "type": "string_too_long",
    } in body["details"]

    serialized = json.dumps(body)
    assert secret_marker not in serialized
    assert overlong_password not in serialized
