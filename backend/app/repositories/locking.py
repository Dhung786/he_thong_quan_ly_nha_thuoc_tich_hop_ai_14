from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.models.base import Base


def ordered_unique_ids(ids: Iterable[int]) -> tuple[int, ...]:
    return tuple(sorted(set(ids)))


async def lock_rows_by_id[ModelT: Base](
    session: AsyncSession,
    *,
    model: type[ModelT],
    id_column: InstrumentedAttribute[int],
    ids: Iterable[int],
) -> list[ModelT]:
    """Lock rows in deterministic ascending ID order.

    This helper is domain-neutral. Inventory services must still perform all
    business validation after the lock and inside the same transaction.
    """

    ordered_ids = ordered_unique_ids(ids)
    if not ordered_ids:
        return []

    result = await session.execute(
        select(model)
        .where(id_column.in_(ordered_ids))
        .order_by(id_column.asc())
        .with_for_update()
    )
    return list(result.scalars().all())
