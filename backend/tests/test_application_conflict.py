import json

import pytest
from starlette.requests import Request

from app.core.errors import ApplicationConflict
from app.main import application_conflict_handler


@pytest.mark.asyncio
async def test_application_conflict_maps_to_safe_409_response() -> None:
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/test",
            "headers": [],
        }
    )
    request.state.correlation_id = "test-correlation-id"

    response = await application_conflict_handler(
        request,
        ApplicationConflict(
            "Request conflicts with current state",
            code="state_conflict",
        ),
    )

    assert response.status_code == 409
    assert json.loads(response.body) == {
        "error": "state_conflict",
        "message": "Request conflicts with current state",
        "correlation_id": "test-correlation-id",
    }
