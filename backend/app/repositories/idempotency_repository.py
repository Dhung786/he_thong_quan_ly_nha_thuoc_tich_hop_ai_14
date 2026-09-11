from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.idempotency import IdempotencyRecord


async def try_create_idempotency_record(
    session: AsyncSession,
    *,
    scope: str,
    idempotency_key: str,
    request_hash: str,
) -> IdempotencyRecord | None:
    result = await session.execute(
        insert(IdempotencyRecord)
        .values(
            scope=scope,
            idempotency_key=idempotency_key,
            request_hash=request_hash,
            status="IN_PROGRESS",
        )
        .on_conflict_do_nothing(
            index_elements=["scope", "idempotency_key"]
        )
        .returning(IdempotencyRecord.id)
    )
    record_id = result.scalar_one_or_none()
    if record_id is None:
        return None
    return await session.get(IdempotencyRecord, record_id)


async def get_idempotency_record_for_update(
    session: AsyncSession,
    *,
    scope: str,
    idempotency_key: str,
) -> IdempotencyRecord | None:
    result = await session.execute(
        select(IdempotencyRecord)
        .where(
            IdempotencyRecord.scope == scope,
            IdempotencyRecord.idempotency_key == idempotency_key,
        )
        .with_for_update()
    )
    return result.scalar_one_or_none()
