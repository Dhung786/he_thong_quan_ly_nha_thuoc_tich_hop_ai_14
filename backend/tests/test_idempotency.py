import asyncio
from uuid import uuid4

import pytest

from app.core.database import SessionLocal
from app.services.idempotency import (
    IdempotencyConflict,
    claim,
    complete,
    hash_payload,
)


@pytest.mark.asyncio
async def test_completed_idempotency_key_is_detected_as_replay() -> None:
    scope = f"test.operation.{uuid4()}"
    key = str(uuid4())
    request_hash = hash_payload(b'{"value":1}')

    async with SessionLocal() as session:
        first = await claim(
            session,
            scope=scope,
            key=key,
            request_hash=request_hash,
        )
        assert first.is_replay is False
        complete(first.record)
        await session.commit()

    async with SessionLocal() as session:
        second = await claim(
            session,
            scope=scope,
            key=key,
            request_hash=request_hash,
        )
        assert second.is_replay is True
        assert second.record.status == "COMPLETED"
        await session.rollback()


@pytest.mark.asyncio
async def test_same_idempotency_key_rejects_different_input() -> None:
    scope = f"test.operation.{uuid4()}"
    key = str(uuid4())

    async with SessionLocal() as session:
        first = await claim(
            session,
            scope=scope,
            key=key,
            request_hash=hash_payload(b'{"value":1}'),
        )
        complete(first.record)
        await session.commit()

    async with SessionLocal() as session:
        with pytest.raises(IdempotencyConflict):
            await claim(
                session,
                scope=scope,
                key=key,
                request_hash=hash_payload(b'{"value":2}'),
            )
        await session.rollback()


@pytest.mark.asyncio
async def test_same_key_is_isolated_by_scope() -> None:
    key = str(uuid4())
    request_hash = hash_payload(b"same-input")

    async with SessionLocal() as session:
        first = await claim(
            session,
            scope=f"scope-a-{uuid4()}",
            key=key,
            request_hash=request_hash,
        )
        second = await claim(
            session,
            scope=f"scope-b-{uuid4()}",
            key=key,
            request_hash=request_hash,
        )
        assert first.record.id != second.record.id
        await session.rollback()


@pytest.mark.asyncio
async def test_concurrent_same_key_has_one_initial_claim_and_one_replay() -> None:
    scope = f"test.concurrent.{uuid4()}"
    key = str(uuid4())
    request_hash = hash_payload(b"same-concurrent-input")

    async def worker() -> bool:
        async with SessionLocal() as session:
            claimed = await claim(
                session,
                scope=scope,
                key=key,
                request_hash=request_hash,
            )
            if not claimed.is_replay:
                complete(claimed.record)
                await session.commit()
            else:
                await session.rollback()
            return claimed.is_replay

    results = await asyncio.gather(worker(), worker())
    assert sorted(results) == [False, True]
