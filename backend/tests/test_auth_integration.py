from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.auth import Role, User


@pytest.mark.asyncio
async def test_login_refresh_rotation_logout_and_me() -> None:
    username = f"auth-test-{uuid4().hex[:10]}"
    password = "AuthTestPassword-123!"

    async with SessionLocal() as session:
        role_result = await session.execute(select(Role).where(Role.name == "ADMIN"))
        role = role_result.scalar_one_or_none()
        assert role is not None
        session.add(
            User(
                username=username,
                password_hash=hash_password(password),
                role_id=role.id,
                is_active=True,
            )
        )
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
        )
        assert login_response.status_code == 200
        login_body = login_response.json()
        access_token = login_body["access_token"]
        refresh_token = login_body["refresh_token"]

        me_response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert me_response.status_code == 200
        assert me_response.json()["username"] == username
        assert me_response.json()["role"] == "ADMIN"

        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_response.status_code == 200
        replacement_refresh = refresh_response.json()["refresh_token"]
        assert replacement_refresh != refresh_token

        replay_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert replay_response.status_code == 401

        logout_response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": replacement_refresh},
        )
        assert logout_response.status_code == 204

        revoked_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": replacement_refresh},
        )
        assert revoked_response.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_wrong_password() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"username": "definitely-missing", "password": "wrong-password"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid or expired authentication"
