import asyncio
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.transactions import transaction_boundary
from app.models.idempotency import IdempotencyRecord
from app.services.idempotency import (
    IdempotencyConflict,
    claim,
    complete,
    hash_payload,
    idempotent_command,
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


@pytest.mark.asyncio
async def test_failed_command_rolls_back_idempotency_claim_for_retry() -> None:
    scope = f"test.rollback.{uuid4()}"
    key = str(uuid4())
    request_hash = hash_payload(b"retryable-input")

    async with SessionLocal() as session:
        with pytest.raises(RuntimeError, match="fail after claim"):
            async with transaction_boundary(session):
                first = await claim(
                    session,
                    scope=scope,
                    key=key,
                    request_hash=request_hash,
                )
                assert first.is_replay is False
                raise RuntimeError("fail after claim")

    async with SessionLocal() as session:
        result = await session.execute(
            select(IdempotencyRecord).where(
                IdempotencyRecord.scope == scope,
                IdempotencyRecord.idempotency_key == key,
            )
        )
        assert result.scalar_one_or_none() is None

    async with SessionLocal() as session:
        async with transaction_boundary(session):
            retry = await claim(
                session,
                scope=scope,
                key=key,
                request_hash=request_hash,
            )
            assert retry.is_replay is False
            complete(retry.record)


@pytest.mark.asyncio
async def test_idempotent_command_completes_and_replays_automatically() -> None:
    scope = f"test.context.{uuid4()}"
    key = str(uuid4())
    request_hash = hash_payload(b"context-input")

    async with SessionLocal() as session:
        async with idempotent_command(
            session,
            scope=scope,
            key=key,
            request_hash=request_hash,
        ) as first:
            assert first.is_replay is False
            assert first.record.status == "IN_PROGRESS"

    async with SessionLocal() as session:
        async with idempotent_command(
            session,
            scope=scope,
            key=key,
            request_hash=request_hash,
        ) as replay:
            assert replay.is_replay is True
            assert replay.record.status == "COMPLETED"


@pytest.mark.asyncio
async def test_idempotent_command_rolls_back_claim_when_caller_fails() -> None:
    scope = f"test.context-failure.{uuid4()}"
    key = str(uuid4())
    request_hash = hash_payload(b"context-failure-input")

    async with SessionLocal() as session:
        with pytest.raises(RuntimeError, match="caller failure"):
            async with idempotent_command(
                session,
                scope=scope,
                key=key,
                request_hash=request_hash,
            ) as first:
                assert first.is_replay is False
                raise RuntimeError("caller failure")

    async with SessionLocal() as session:
        result = await session.execute(
            select(IdempotencyRecord).where(
                IdempotencyRecord.scope == scope,
                IdempotencyRecord.idempotency_key == key,
            )
        )
        assert result.scalar_one_or_none() is None
