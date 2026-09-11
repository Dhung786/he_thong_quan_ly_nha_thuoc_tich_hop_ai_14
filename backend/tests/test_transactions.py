from uuid import uuid4

import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.transactions import TransactionBoundaryError, transaction_boundary
from app.models.idempotency import IdempotencyRecord


def _record(scope: str) -> IdempotencyRecord:
    return IdempotencyRecord(
        scope=scope,
        idempotency_key=str(uuid4()),
        request_hash="0" * 64,
        status="IN_PROGRESS",
    )


@pytest.mark.asyncio
async def test_transaction_boundary_commits_on_success() -> None:
    scope = f"tx-commit-{uuid4()}"

    async with SessionLocal() as session:
        async with transaction_boundary(session):
            session.add(_record(scope))

    async with SessionLocal() as session:
        result = await session.execute(
            select(IdempotencyRecord).where(IdempotencyRecord.scope == scope)
        )
        assert result.scalar_one().scope == scope


@pytest.mark.asyncio
async def test_transaction_boundary_rolls_back_all_on_error() -> None:
    scope = f"tx-rollback-{uuid4()}"

    async with SessionLocal() as session:
        with pytest.raises(RuntimeError, match="force rollback"):
            async with transaction_boundary(session):
                session.add(_record(scope))
                await session.flush()
                raise RuntimeError("force rollback")

    async with SessionLocal() as session:
        result = await session.execute(
            select(IdempotencyRecord).where(IdempotencyRecord.scope == scope)
        )
        assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_transaction_boundary_rejects_nested_transaction() -> None:
    async with SessionLocal() as session:
        async with session.begin():
            with pytest.raises(TransactionBoundaryError):
                async with transaction_boundary(session):
                    pass
