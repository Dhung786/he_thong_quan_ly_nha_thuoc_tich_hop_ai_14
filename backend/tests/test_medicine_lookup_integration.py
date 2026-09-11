from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.auth import Role, User
from app.models.catalog import Medicine, MedicineGroup, Unit


async def _create_user(role_name: str) -> tuple[str, str]:
    suffix = uuid4().hex[:10]
    username = f"lookup-{role_name.lower()}-{suffix}"
    password = "LookupTestPassword-123!"
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


async def _create_medicine() -> tuple[str, str]:
    suffix = uuid4().hex[:10]
    code = f"LOOKUP-{suffix}"
    name = f"Thuốc tra cứu {suffix}"
    async with SessionLocal() as session:
        group = MedicineGroup(name=f"Nhóm tra cứu {suffix}")
        unit = Unit(name=f"ĐVT tra cứu {suffix}")
        session.add_all([group, unit])
        await session.flush()
        session.add(
            Medicine(
                code=code,
                name=name,
                group_id=group.id,
                unit_id=unit.id,
            )
        )
        await session.commit()
    return code, name


async def _login(client: AsyncClient, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return str(response.json()["access_token"])


@pytest.mark.asyncio
async def test_pharmacist_can_search_medicines_read_only() -> None:
    code, name = await _create_medicine()
    username, password = await _create_user("PHARMACIST")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await _login(client, username, password)
        response = await client.get(
            "/api/v1/lookup/medicines",
            params={"q": code},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["code"] == code
    assert items[0]["name"] == name
    assert items[0]["group_name"].startswith("Nhóm tra cứu")
    assert items[0]["unit_name"].startswith("ĐVT tra cứu")


@pytest.mark.asyncio
async def test_customer_cannot_use_pharmacist_lookup() -> None:
    username, password = await _create_user("CUSTOMER")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await _login(client, username, password)
        response = await client.get(
            "/api/v1/lookup/medicines",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
    assert response.json()["error"] == "forbidden"
