from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError

from app.core.database import SessionLocal
from app.models.auth import Role, User
from app.repositories.locking import lock_rows_by_id, ordered_unique_ids


def test_ordered_unique_ids_sorts_and_deduplicates() -> None:
    assert ordered_unique_ids([7, 3, 7, 2, 3]) == (2, 3, 7)


async def _create_test_user(prefix: str) -> int:
    async with SessionLocal() as session:
        role_result = await session.execute(select(Role).where(Role.name == "ADMIN"))
        role = role_result.scalar_one()
        user = User(
            username=f"{prefix}-{uuid4().hex[:8]}",
            password_hash="test-only",
            role_id=role.id,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        return user.id


@pytest.mark.asyncio
async def test_lock_rows_by_id_returns_rows_in_ascending_order() -> None:
    first_id = await _create_test_user("lock-test-a")
    second_id = await _create_test_user("lock-test-b")
    requested_ids = [
        max(first_id, second_id),
        min(first_id, second_id),
        max(first_id, second_id),
    ]

    async with SessionLocal() as session:
        rows = await lock_rows_by_id(
            session,
            model=User,
            id_column=User.id,
            ids=requested_ids,
        )
        assert [row.id for row in rows] == sorted({first_id, second_id})
        await session.rollback()


@pytest.mark.asyncio
async def test_for_update_blocks_a_competing_transaction() -> None:
    user_id = await _create_test_user("lock-contention")

    async with SessionLocal() as holder:
        held_rows = await lock_rows_by_id(
            holder,
            model=User,
            id_column=User.id,
            ids=[user_id],
        )
        assert [row.id for row in held_rows] == [user_id]

        async with SessionLocal() as contender:
            await contender.execute(text("SET LOCAL lock_timeout = '150ms'"))
            with pytest.raises(DBAPIError):
                await lock_rows_by_id(
                    contender,
                    model=User,
                    id_column=User.id,
                    ids=[user_id],
                )
            await contender.rollback()

        await holder.rollback()

    async with SessionLocal() as after_release:
        rows = await lock_rows_by_id(
            after_release,
            model=User,
            id_column=User.id,
            ids=[user_id],
        )
        assert [row.id for row in rows] == [user_id]
        await after_release.rollback()
