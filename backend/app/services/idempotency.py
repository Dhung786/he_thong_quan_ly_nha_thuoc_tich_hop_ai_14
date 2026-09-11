from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.idempotency import IdempotencyRecord
from app.repositories.idempotency_repository import (
    get_idempotency_record_for_update,
    try_create_idempotency_record,
)


class IdempotencyConflict(Exception):
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
        raise IdempotencyConflict("Unable to resolve idempotency record")
    if existing.request_hash != request_hash:
        raise IdempotencyConflict("Idempotency key has different input")
    if existing.status != "COMPLETED":
        raise IdempotencyConflict("Idempotent operation is already in progress")
    return IdempotencyClaim(record=existing, is_replay=True)


def complete(record: IdempotencyRecord) -> None:
    record.status = "COMPLETED"
    record.completed_at = datetime.now(UTC)
