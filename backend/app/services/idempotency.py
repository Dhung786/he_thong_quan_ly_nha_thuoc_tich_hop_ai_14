from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApplicationConflict
from app.core.transactions import transaction_boundary
from app.models.idempotency import IdempotencyRecord
from app.repositories.idempotency_repository import (
    get_idempotency_record_for_update,
    try_create_idempotency_record,
)


class IdempotencyConflict(ApplicationConflict):
    pass


@dataclass(frozen=True, slots=True)
class IdempotencyClaim:
    record: IdempotencyRecord
    is_replay: bool


def hash_payload(payload: bytes) -> str:
    return sha256(payload).hexdigest()


async def claim(
    session: AsyncSession,
    *,
    scope: str,
    key: str,
    request_hash: str,
) -> IdempotencyClaim:
    created = await try_create_idempotency_record(
        session,
        scope=scope,
        idempotency_key=key,
        request_hash=request_hash,
    )
    if created is not None:
        return IdempotencyClaim(record=created, is_replay=False)

    existing = await get_idempotency_record_for_update(
        session,
        scope=scope,
        idempotency_key=key,
    )
    if existing is None:
        raise IdempotencyConflict(
            "Unable to resolve idempotency record",
            code="idempotency_conflict",
        )
    if existing.request_hash != request_hash:
        raise IdempotencyConflict(
            "Idempotency key has different input",
            code="idempotency_conflict",
        )
    if existing.status != "COMPLETED":
        raise IdempotencyConflict(
            "Idempotent operation is already in progress",
            code="idempotency_conflict",
        )
    return IdempotencyClaim(record=existing, is_replay=True)


def complete(record: IdempotencyRecord) -> None:
    record.status = "COMPLETED"
    record.completed_at = datetime.now(UTC)


@asynccontextmanager
async def idempotent_command(
    session: AsyncSession,
    *,
    scope: str,
    key: str,
    request_hash: str,
) -> AsyncIterator[IdempotencyClaim]:
    """Execute one idempotent command in the same transaction as its claim.

    The caller must skip business mutations when `is_replay` is true. A new
    claim is marked COMPLETED only after the caller exits successfully. Any
    exception rolls back both the claim and all command-side database writes.
    """

    async with transaction_boundary(session):
        claimed = await claim(
            session,
            scope=scope,
            key=key,
            request_hash=request_hash,
        )
        yield claimed
        if not claimed.is_replay:
            complete(claimed.record)
