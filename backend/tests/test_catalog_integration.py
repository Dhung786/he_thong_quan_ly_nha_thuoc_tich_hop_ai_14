from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.auth import Role, User


async def create_user_with_role(role_name: str) -> tuple[str, str]:
    suffix = uuid4().hex[:10]
    username = f"catalog-{role_name.lower()}-{suffix}"
    password = "CatalogTestPassword-123!"
    async with SessionLocal() as session:
        role_result = await session.execute(select(Role).where(Role.name == role_name))
        role = role_result.scalar_one()
        session.add(
            User(
                username=username,
                password_hash=hash_password(password),
                role_id=role.id,
                is_active=True,
            )
        )
        await session.commit()
    return username, password


async def login(client: AsyncClient, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return str(response.json()["access_token"])


@pytest.mark.asyncio
async def test_manager_can_manage_uc002_catalog() -> None:
    username, password = await create_user_with_role("MANAGER")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await login(client, username, password)
        headers = {"Authorization": f"Bearer {token}"}

        group_response = await client.post(
            "/api/v1/catalog/groups",
            json={"name": "Nhóm kiểm thử"},
            headers=headers,
        )
        assert group_response.status_code == 201
        group_id = group_response.json()["id"]

        unit_response = await client.post(
            "/api/v1/catalog/units",
            json={"name": "Đơn vị kiểm thử"},
            headers=headers,
        )
        assert unit_response.status_code == 201
        unit_id = unit_response.json()["id"]

        medicine_code = f"MED-{uuid4().hex[:10]}"
        medicine_response = await client.post(
            "/api/v1/catalog/medicines",
            json={
                "code": medicine_code,
                "name": "Thuốc kiểm thử",
                "group_id": group_id,
                "unit_id": unit_id,
            },
            headers=headers,
        )
        assert medicine_response.status_code == 201
        medicine = medicine_response.json()
        medicine_id = medicine["id"]
        assert medicine["code"] == medicine_code
        assert medicine["group_name"] == "Nhóm kiểm thử"
        assert medicine["unit_name"] == "Đơn vị kiểm thử"

        search_response = await client.get(
            "/api/v1/catalog/medicines",
            params={"q": medicine_code},
            headers=headers,
        )
        assert search_response.status_code == 200
        assert [item["id"] for item in search_response.json()] == [medicine_id]

        update_response = await client.put(
            f"/api/v1/catalog/medicines/{medicine_id}",
            json={
                "code": medicine_code,
                "name": "Thuốc kiểm thử đã sửa",
                "group_id": group_id,
                "unit_id": unit_id,
            },
            headers=headers,
        )
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Thuốc kiểm thử đã sửa"

        group_delete_while_used = await client.delete(
            f"/api/v1/catalog/groups/{group_id}", headers=headers
        )
        assert group_delete_while_used.status_code == 409
        assert group_delete_while_used.json()["error"] == "medicine_group_in_use"

        medicine_delete = await client.delete(
            f"/api/v1/catalog/medicines/{medicine_id}", headers=headers
        )
        assert medicine_delete.status_code == 204

        assert (
            await client.delete(f"/api/v1/catalog/groups/{group_id}", headers=headers)
        ).status_code == 204
        assert (
            await client.delete(f"/api/v1/catalog/units/{unit_id}", headers=headers)
        ).status_code == 204


@pytest.mark.asyncio
async def test_duplicate_medicine_code_is_rejected() -> None:
    username, password = await create_user_with_role("MANAGER")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await login(client, username, password)
        headers = {"Authorization": f"Bearer {token}"}
        group = (
            await client.post(
                "/api/v1/catalog/groups", json={"name": "Nhóm trùng mã"}, headers=headers
            )
        ).json()
        unit = (
            await client.post(
                "/api/v1/catalog/units", json={"name": "Đơn vị trùng mã"}, headers=headers
            )
        ).json()
        code = f"DUP-{uuid4().hex[:10]}"
        payload = {
            "code": code,
            "name": "Thuốc thứ nhất",
            "group_id": group["id"],
            "unit_id": unit["id"],
        }
        first = await client.post("/api/v1/catalog/medicines", json=payload, headers=headers)
        assert first.status_code == 201

        payload["name"] = "Thuốc thứ hai"
        duplicate = await client.post(
            "/api/v1/catalog/medicines", json=payload, headers=headers
        )
        assert duplicate.status_code == 409
        assert duplicate.json()["error"] == "medicine_code_exists"


@pytest.mark.asyncio
@pytest.mark.parametrize("role_name", ["PHARMACIST", "CUSTOMER"])
async def test_uc002_write_access_is_manager_only(role_name: str) -> None:
    username, password = await create_user_with_role(role_name)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await login(client, username, password)
        response = await client.get(
            "/api/v1/catalog/groups",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
    assert response.json()["error"] == "forbidden"
