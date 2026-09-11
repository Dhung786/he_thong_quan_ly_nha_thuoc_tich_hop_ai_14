from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession


class TransactionBoundaryError(RuntimeError):
    """Raised when a command tries to start inside an existing transaction."""


@asynccontextmanager
async def transaction_boundary(session: AsyncSession) -> AsyncIterator[None]:
    """Run one application command in a single all-or-nothing transaction.

    Business services should enter this boundary before issuing database reads
    or writes. Nested command transactions are rejected so that a savepoint
    cannot be mistaken for the command's real commit/rollback boundary.
    """

    if session.in_transaction():
        raise TransactionBoundaryError(
            "Application command must start outside an existing transaction"
        )

    async with session.begin():
        yield
