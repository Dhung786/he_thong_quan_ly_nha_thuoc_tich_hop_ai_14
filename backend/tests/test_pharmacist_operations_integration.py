from datetime import date
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.auth import Role, User


async def create_pharmacist() -> tuple[str, str]:
    suffix = uuid4().hex[:10]
    username = f"pharmacist-ops-{suffix}"
    password = "PharmacistOpsPassword-123!"
    async with SessionLocal() as session:
        role = (
            await session.execute(select(Role).where(Role.name == "PHARMACIST"))
        ).scalar_one()
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
async def test_pharmacist_can_use_operational_and_ai_apis() -> None:
    username, password = await create_pharmacist()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await login(client, username, password)
        headers = {"Authorization": f"Bearer {token}"}

        batches_response = await client.get("/api/v1/batches", headers=headers)
        assert batches_response.status_code == 200
        batches = batches_response.json()
        assert batches

        inventory_response = await client.get("/api/v1/inventory", headers=headers)
        assert inventory_response.status_code == 200

        invoices_response = await client.get(
            "/api/v1/pharmacist/invoices",
            headers=headers,
        )
        assert invoices_response.status_code == 200

        saleable = next(
            batch
            for batch in batches
            if batch["quantity_remaining"] > 0
            and batch["expiry_date"] >= date.today().isoformat()
        )
        invoice_code = f"PH-TEST-{uuid4().hex[:10]}"
        create_response = await client.post(
            "/api/v1/pharmacist/invoices",
            json={
                "code": invoice_code,
                "items": [{"batch_id": saleable["id"], "quantity": 1}],
            },
            headers=headers,
        )
        assert create_response.status_code == 201
        invoice = create_response.json()
        assert invoice["status"] == "DRAFT"

        finalize_response = await client.post(
            f"/api/v1/pharmacist/invoices/{invoice['id']}/finalize",
            headers=headers,
        )
        assert finalize_response.status_code == 200
        assert finalize_response.json()["status"] == "FINALIZED"

        report_response = await client.get(
            "/api/v1/pharmacist/reports/summary",
            params={"expiry_within_days": 90},
            headers=headers,
        )
        assert report_response.status_code == 200
        assert report_response.json()["inventory_units"] >= 0

        ai_status = await client.get("/api/v1/pharmacist/ai/status", headers=headers)
        assert ai_status.status_code == 200
        assert ai_status.json()["scope_guard"] == "enabled"

        if ai_status.json()["configured"]:
            chat_response = await client.post(
                "/api/v1/pharmacist/ai/internal-chat",
                json={"message": "Quy trình kiểm kê tồn kho là gì?"},
                headers=headers,
            )
            assert chat_response.status_code == 200
            assert chat_response.json()["scope_guard"] in {"passed", "blocked_output"}
