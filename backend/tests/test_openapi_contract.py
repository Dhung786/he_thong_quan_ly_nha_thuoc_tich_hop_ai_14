from app.main import app


def test_openapi_marks_sensitive_request_fields_write_only() -> None:
    schema = app.openapi()
    schemas = schema["components"]["schemas"]

    assert schemas["LoginRequest"]["properties"]["password"]["writeOnly"] is True
    assert (
        schemas["RefreshTokenRequest"]["properties"]["refresh_token"]["writeOnly"]
        is True
    )


def test_openapi_documents_auth_errors_and_health() -> None:
    schema = app.openapi()
    paths = schema["paths"]

    login_responses = paths["/api/v1/auth/login"]["post"]["responses"]
    assert "200" in login_responses
    assert "401" in login_responses
    assert "422" in login_responses

    me_responses = paths["/api/v1/auth/me"]["get"]["responses"]
    assert "200" in me_responses
    assert "401" in me_responses

    health_responses = paths["/health"]["get"]["responses"]
    assert "200" in health_responses
    assert "503" in health_responses
