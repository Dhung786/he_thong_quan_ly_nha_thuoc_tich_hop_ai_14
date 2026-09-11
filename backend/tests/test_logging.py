import json
import logging

from fastapi.testclient import TestClient

from app.core.logging import JsonFormatter, bind_correlation_id, reset_correlation_id
from app.main import app


client = TestClient(app)


def test_json_formatter_uses_whitelist_and_context_correlation_id() -> None:
    correlation_id = "123e4567-e89b-12d3-a456-426614174000"
    token = bind_correlation_id(correlation_id)
    try:
        record = logging.getLogger("warehouse_ai.test").makeRecord(
            "warehouse_ai.test",
            logging.INFO,
            __file__,
            1,
            "safe message",
            (),
            None,
            extra={
                "event": "test_event",
                "password": "DO-NOT-LOG",
                "authorization": "Bearer DO-NOT-LOG",
            },
        )
        rendered = JsonFormatter().format(record)
    finally:
        reset_correlation_id(token)

    payload = json.loads(rendered)
    assert payload["event"] == "test_event"
    assert payload["correlation_id"] == correlation_id
    assert "password" not in payload
    assert "authorization" not in payload
    assert "DO-NOT-LOG" not in rendered


def test_request_log_contains_correlation_without_sensitive_headers(capfd) -> None:
    correlation_id = "123e4567-e89b-12d3-a456-426614174000"
    secret = "Bearer REQUEST-SECRET-MUST-NOT-LOG"

    response = client.get(
        "/api/v1/status",
        headers={
            "X-Correlation-ID": correlation_id,
            "Authorization": secret,
        },
    )
    assert response.status_code == 200
    assert response.headers["X-Correlation-ID"] == correlation_id

    stdout = capfd.readouterr().out
    structured_lines = []
    for line in stdout.splitlines():
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        if payload.get("event") == "http_request_completed":
            structured_lines.append(payload)

    assert structured_lines
    request_log = structured_lines[-1]
    assert request_log["correlation_id"] == correlation_id
    assert request_log["method"] == "GET"
    assert request_log["path"] == "/api/v1/status"
    assert request_log["status_code"] == 200
    assert isinstance(request_log["duration_ms"], int | float)
    assert "REQUEST-SECRET-MUST-NOT-LOG" not in stdout
