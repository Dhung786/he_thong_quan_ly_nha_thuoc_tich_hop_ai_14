from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.auth import Role, User


async def create_user_with_role(role_name: str) -> tuple[int, str, str]:
    suffix = uuid4().hex[:10]
    username = f"admin-test-{role_name.lower()}-{suffix}"
    password = "AdminTestPassword-123!"
    async with SessionLocal() as session:
        role_result = await session.execute(select(Role).where(Role.name == role_name))
        role = role_result.scalar_one()
        user = User(
            username=username,
            password_hash=hash_password(password),
            role_id=role.id,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user.id, username, password


async def login(client: AsyncClient, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return str(response.json()["access_token"])


@pytest.mark.asyncio
async def test_manager_can_administer_accounts_and_view_audit() -> None:
    manager_id, manager_username, manager_password = await create_user_with_role("MANAGER")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await login(client, manager_username, manager_password)
        headers = {"Authorization": f"Bearer {token}"}

        summary = await client.get("/api/v1/admin/summary", headers=headers)
        assert summary.status_code == 200
        assert summary.json()["total_users"] >= 1

        new_username = f"pharmacist-{uuid4().hex[:10]}"
        create_response = await client.post(
            "/api/v1/admin/users",
            headers=headers,
            json={
                "username": new_username,
                "password": "InitialPassword-123!",
                "role": "PHARMACIST",
            },
        )
        assert create_response.status_code == 201
        created = create_response.json()
        assert created["username"] == new_username
        assert created["role"] == "PHARMACIST"
        user_id = created["id"]

        lock_response = await client.put(
            f"/api/v1/admin/users/{user_id}/status",
            headers=headers,
            json={"is_active": False},
        )
        assert lock_response.status_code == 200
        assert lock_response.json()["is_active"] is False

        locked_login = await client.post(
            "/api/v1/auth/login",
            json={"username": new_username, "password": "InitialPassword-123!"},
        )
        assert locked_login.status_code == 401

        unlock_response = await client.put(
            f"/api/v1/admin/users/{user_id}/status",
            headers=headers,
            json={"is_active": True},
        )
        assert unlock_response.status_code == 200

        role_response = await client.put(
            f"/api/v1/admin/users/{user_id}/role",
            headers=headers,
            json={"role": "CASHIER"},
        )
        assert role_response.status_code == 200
        assert role_response.json()["role"] == "CASHIER"

        reset_response = await client.put(
            f"/api/v1/admin/users/{user_id}/password",
            headers=headers,
            json={"password": "ChangedPassword-123!"},
        )
        assert reset_response.status_code == 204

        relogin = await client.post(
            "/api/v1/auth/login",
            json={"username": new_username, "password": "ChangedPassword-123!"},
        )
        assert relogin.status_code == 200

        logs = await client.get("/api/v1/admin/audit-logs", headers=headers)
        assert logs.status_code == 200
        event_types = {item["event_type"] for item in logs.json()}
        assert "admin.user.created" in event_types
        assert "admin.user.status_changed" in event_types
        assert "admin.user.role_changed" in event_types
        assert "admin.user.password_reset" in event_types

        self_lock = await client.put(
            f"/api/v1/admin/users/{manager_id}/status",
            headers=headers,
            json={"is_active": False},
        )
        assert self_lock.status_code == 409
        assert self_lock.json()["error"] == "self_lock_blocked"


@pytest.mark.asyncio
@pytest.mark.parametrize("role_name", ["PHARMACIST", "CASHIER"])
async def test_admin_endpoints_are_manager_only(role_name: str) -> None:
    _, username, password = await create_user_with_role(role_name)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await login(client, username, password)
        response = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 403
    assert response.json()["error"] == "forbidden"
