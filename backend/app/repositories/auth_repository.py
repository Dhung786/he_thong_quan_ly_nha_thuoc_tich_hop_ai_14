from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.auth import AuditLog, RefreshToken, User


async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
    result = await session.execute(
        select(User).options(joinedload(User.role)).where(User.username == username)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    result = await session.execute(
        select(User).options(joinedload(User.role)).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_refresh_token_for_update(
    session: AsyncSession, token_hash: str
) -> RefreshToken | None:
    result = await session.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .with_for_update()
    )
    return result.scalar_one_or_none()


def add_refresh_token(session: AsyncSession, refresh_token: RefreshToken) -> None:
    session.add(refresh_token)


def add_audit_log(session: AsyncSession, audit_log: AuditLog) -> None:
    session.add(audit_log)
