from uuid import uuid4

import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.auth import Role, User
from app.repositories.locking import lock_rows_by_id, ordered_unique_ids


def test_ordered_unique_ids_sorts_and_deduplicates() -> None:
    assert ordered_unique_ids([7, 3, 7, 2, 3]) == (2, 3, 7)


@pytest.mark.asyncio
async def test_lock_rows_by_id_returns_rows_in_ascending_order() -> None:
    async with SessionLocal() as session:
        role_result = await session.execute(select(Role).where(Role.name == "ADMIN"))
        role = role_result.scalar_one()
        first = User(
            username=f"lock-test-a-{uuid4().hex[:8]}",
            password_hash="test-only",
            role_id=role.id,
            is_active=True,
        )
        second = User(
            username=f"lock-test-b-{uuid4().hex[:8]}",
            password_hash="test-only",
            role_id=role.id,
            is_active=True,
        )
        session.add_all([first, second])
        await session.commit()
        first_id = first.id
        second_id = second.id

    requested_ids = [max(first_id, second_id), min(first_id, second_id), max(first_id, second_id)]

    async with SessionLocal() as session:
        rows = await lock_rows_by_id(
            session,
            model=User,
            id_column=User.id,
            ids=requested_ids,
        )
        assert [row.id for row in rows] == sorted({first_id, second_id})
        await session.rollback()
