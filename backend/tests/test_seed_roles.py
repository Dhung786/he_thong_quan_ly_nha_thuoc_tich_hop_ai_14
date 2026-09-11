from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app import seed as seed_module
from app.core.database import SessionLocal
from app.core.security import verify_password
from app.models.auth import Role, User


@pytest.mark.asyncio
async def test_seed_creates_idempotent_demo_users_for_all_roles(monkeypatch) -> None:
    suffix = uuid4().hex[:10]
    credentials = (
        ("ADMIN", f"seed-admin-{suffix}", "SeedAdmin123!"),
        ("WAREHOUSE_KEEPER", f"seed-keeper-{suffix}", "SeedKeeper123!"),
        ("ACCOUNTANT", f"seed-accountant-{suffix}", "SeedAccountant123!"),
    )

    monkeypatch.setattr(seed_module.settings, "seed_admin_username", credentials[0][1])
    monkeypatch.setattr(seed_module.settings, "seed_admin_password", credentials[0][2])
    monkeypatch.setattr(
        seed_module.settings,
        "seed_warehouse_keeper_username",
        credentials[1][1],
    )
    monkeypatch.setattr(
        seed_module.settings,
        "seed_warehouse_keeper_password",
        credentials[1][2],
    )
    monkeypatch.setattr(seed_module.settings, "seed_accountant_username", credentials[2][1])
    monkeypatch.setattr(seed_module.settings, "seed_accountant_password", credentials[2][2])

    await seed_module.seed()
    await seed_module.seed()

    async with SessionLocal() as session:
        for role_name, username, password in credentials:
            result = await session.execute(
                select(User, Role)
                .join(Role, User.role_id == Role.id)
                .where(User.username == username)
            )
            user, role = result.one()
            assert role.name == role_name
            assert user.is_active is True
            assert user.password_hash != password
            assert verify_password(password, user.password_hash)

            count_result = await session.execute(
                select(func.count(User.id)).where(User.username == username)
            )
            assert count_result.scalar_one() == 1
