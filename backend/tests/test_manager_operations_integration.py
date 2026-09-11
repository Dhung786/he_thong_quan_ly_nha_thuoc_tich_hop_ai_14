from datetime import date, timedelta
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.auth import Role, User


async def create_manager() -> tuple[str, str]:
    suffix = uuid4().hex[:10]
    username = f"manager-ops-{suffix}"
    password = "ManagerOpsPassword-123!"
    async with SessionLocal() as session:
        role = (await session.execute(select(Role).where(Role.name == "MANAGER"))).scalar_one()
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
async def test_manager_operational_flow() -> None:
    username, password = await create_manager()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await login(client, username, password)
        headers = {"Authorization": f"Bearer {token}"}
        suffix = uuid4().hex[:8]

        group = (
            await client.post(
                "/api/v1/catalog/groups",
                json={"name": f"Nhóm ops {suffix}"},
                headers=headers,
            )
        ).json()
        unit = (
            await client.post(
                "/api/v1/catalog/units",
                json={"name": f"Hộp ops {suffix}"},
                headers=headers,
            )
        ).json()
        medicine_code = f"OPS-{suffix}"
        medicine_response = await client.post(
            "/api/v1/catalog/medicines",
            json={
                "code": medicine_code,
                "name": f"Thuốc ops {suffix}",
                "group_id": group["id"],
                "unit_id": unit["id"],
            },
            headers=headers,
        )
        assert medicine_response.status_code == 201
        medicine = medicine_response.json()

        supplier_response = await client.post(
            "/api/v1/suppliers",
            json={"name": f"Nhà cung cấp {suffix}", "phone": "0123456789"},
            headers=headers,
        )
        assert supplier_response.status_code == 201
        supplier = supplier_response.json()

        batch_response = await client.post(
            "/api/v1/batches",
            json={
                "code": f"LOT-{suffix}",
                "medicine_id": medicine["id"],
                "supplier_id": supplier["id"],
                "quantity_received": 10,
                "received_date": str(date.today()),
                "expiry_date": str(date.today() + timedelta(days=180)),
                "purchase_price": "10000",
                "selling_price": "15000",
            },
            headers=headers,
        )
        assert batch_response.status_code == 201
        batch = batch_response.json()
        assert batch["quantity_remaining"] == 10

        inventory_response = await client.get(
            "/api/v1/inventory",
            params={"threshold": 10, "medicine_id": medicine["id"]},
            headers=headers,
        )
        assert inventory_response.status_code == 200
        assert inventory_response.json()[0]["quantity_remaining"] == 10

        advanced_lookup = await client.get(
            "/api/v1/lookup/medicines/advanced",
            params={"q": medicine_code},
            headers=headers,
        )
        assert advanced_lookup.status_code == 200
        assert advanced_lookup.json()[0]["available_quantity"] == 10
        assert advanced_lookup.json()[0]["min_selling_price"] == "15000.00"

        invoice_response = await client.post(
            "/api/v1/invoices",
            json={
                "code": f"INV-{suffix}",
                "items": [{"batch_id": batch["id"], "quantity": 2}],
            },
            headers=headers,
        )
        assert invoice_response.status_code == 201
        invoice = invoice_response.json()
        assert invoice["status"] == "DRAFT"
        assert invoice["total_amount"] == "30000.00"

        finalized_response = await client.post(
            f"/api/v1/invoices/{invoice['id']}/finalize",
            headers=headers,
        )
        assert finalized_response.status_code == 200
        assert finalized_response.json()["status"] == "FINALIZED"

        inventory_after = await client.get(
            "/api/v1/inventory",
            params={"medicine_id": medicine["id"]},
            headers=headers,
        )
        assert inventory_after.json()[0]["quantity_remaining"] == 8

        report = await client.get("/api/v1/reports/summary", headers=headers)
        assert report.status_code == 200
        assert int(report.json()["finalized_invoice_count"]) >= 1
        assert float(report.json()["revenue"]) >= 30000

        account_response = await client.post(
            "/api/v1/admin/users",
            json={
                "username": f"ops-pharmacist-{suffix}",
                "password": "PharmacistPassword-123!",
                "role": "PHARMACIST",
            },
            headers=headers,
        )
        assert account_response.status_code == 201
        assert account_response.json()["role"] == "PHARMACIST"
