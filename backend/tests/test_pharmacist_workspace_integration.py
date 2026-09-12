from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.auth import Role, User
from app.models.catalog import Medicine, MedicineGroup, Unit
from app.models.operational import MedicineBatch, Supplier


async def _create_user(role_name: str, prefix: str) -> tuple[str, str]:
    suffix = uuid4().hex[:10]
    username = f"{prefix}-{suffix}"
    password = "WorkspacePassword-123!"
    async with SessionLocal() as session:
        role = (
            await session.execute(select(Role).where(Role.name == role_name))
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


async def _create_batch() -> MedicineBatch:
    suffix = uuid4().hex[:8]
    async with SessionLocal() as session:
        group = MedicineGroup(name=f"Nhóm dược sĩ {suffix}")
        unit = Unit(name=f"Đơn vị {suffix}")
        session.add_all([group, unit])
        await session.flush()
        medicine = Medicine(
            code=f"PH-{suffix}",
            name=f"Thuốc dược sĩ {suffix}",
            group_id=group.id,
            unit_id=unit.id,
        )
        supplier = Supplier(
            name=f"NCC dược sĩ {suffix}",
            phone="0123456789",
        )
        session.add_all([medicine, supplier])
        await session.flush()
        batch = MedicineBatch(
            code=f"PH-LOT-{suffix}",
            medicine_id=medicine.id,
            supplier_id=supplier.id,
            quantity_received=25,
            quantity_remaining=25,
            received_date=date.today(),
            expiry_date=date.today() + timedelta(days=180),
            purchase_price=Decimal("10000"),
            selling_price=Decimal("15000"),
        )
        session.add(batch)
        await session.commit()
        await session.refresh(batch)
        return batch


async def _login(client: AsyncClient, username: str, password: str) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return str(response.json()["access_token"])


@pytest.mark.asyncio
async def test_pharmacist_live_workspace_and_ai() -> None:
    pharmacist_username, pharmacist_password = await _create_user(
        "PHARMACIST",
        "pharmacist-live",
    )
    customer_username, customer_password = await _create_user(
        "CUSTOMER",
        "customer-live",
    )
    batch = await _create_batch()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pharmacist_token = await _login(
            client,
            pharmacist_username,
            pharmacist_password,
        )
        headers = {"Authorization": f"Bearer {pharmacist_token}"}

        dashboard = await client.get("/api/v1/pharmacist/dashboard", headers=headers)
        assert dashboard.status_code == 200
        assert dashboard.json()["medicine_count"] >= 1
        assert dashboard.json()["inventory_units"] >= 25

        profile = await client.get("/api/v1/pharmacist/profile", headers=headers)
        assert profile.status_code == 200
        assert profile.json()["role"] == "PHARMACIST"

        inventory = await client.get("/api/v1/inventory", headers=headers)
        assert inventory.status_code == 200
        assert any(row["batch_id"] == batch.id for row in inventory.json())

        invoice = await client.post(
            "/api/v1/pharmacist/invoices",
            json={
                "code": f"PH-INV-{uuid4().hex[:8]}",
                "items": [{"batch_id": batch.id, "quantity": 3}],
            },
            headers=headers,
        )
        assert invoice.status_code == 201
        assert invoice.json()["status"] == "DRAFT"
        assert invoice.json()["total_amount"] == "45000.00"

        invoice_id = int(invoice.json()["id"])
        finalized = await client.post(
            f"/api/v1/pharmacist/invoices/{invoice_id}/finalize",
            headers=headers,
        )
        assert finalized.status_code == 200
        assert finalized.json()["status"] == "FINALIZED"

        inventory_after = await client.get("/api/v1/inventory", headers=headers)
        row_after = next(
            row for row in inventory_after.json() if row["batch_id"] == batch.id
        )
        assert row_after["quantity_remaining"] == 22

        report = await client.get(
            "/api/v1/pharmacist/reports/summary",
            headers=headers,
        )
        assert report.status_code == 200
        assert report.json()["finalized_invoice_count"] >= 1
        assert Decimal(report.json()["revenue"]) >= Decimal("45000")

        ai_status = await client.get("/api/v1/pharmacist/ai/status", headers=headers)
        assert ai_status.status_code == 200
        assert ai_status.json()["configured"] is True
        assert ai_status.json()["scope_guard"] == "enabled"

        medicine_summary = await client.post(
            "/api/v1/pharmacist/ai/medicine-summary",
            json={"medicine_id": batch.medicine_id},
            headers=headers,
        )
        assert medicine_summary.status_code == 200
        assert medicine_summary.json()["scope_guard"] == "passed"
        assert medicine_summary.json()["answer"]

        internal_chat = await client.post(
            "/api/v1/pharmacist/ai/internal-chat",
            json={"message": "Quy trình bán thuốc và hóa đơn như thế nào?"},
            headers=headers,
        )
        assert internal_chat.status_code == 200
        assert internal_chat.json()["scope_guard"] == "passed"

        unsafe_chat = await client.post(
            "/api/v1/pharmacist/ai/internal-chat",
            json={"message": "Tôi bị đau đầu, nên uống thuốc gì?"},
            headers=headers,
        )
        assert unsafe_chat.status_code == 200
        assert unsafe_chat.json()["scope_guard"] == "blocked_input"

        customer_token = await _login(client, customer_username, customer_password)
        denied = await client.get(
            "/api/v1/pharmacist/dashboard",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert denied.status_code == 403
