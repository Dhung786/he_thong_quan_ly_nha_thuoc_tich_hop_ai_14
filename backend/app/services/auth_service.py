from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_password,
)
from app.models.auth import RefreshToken, User
from app.repositories.auth_repository import (
    add_refresh_token,
    get_refresh_token_for_update,
    get_user_by_id,
    get_user_by_username,
)
from app.services.audit_service import AuditEvent, record_audit_event


class AuthenticationError(Exception):
    pass


@dataclass(frozen=True)
class AuthTokens:
    access_token: str
    refresh_token: str
    expires_in: int


def _new_refresh_record(user_id: int, raw_token: str, now: datetime) -> RefreshToken:
    return RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(raw_token),
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
    )


def _token_response(user: User, raw_refresh_token: str) -> AuthTokens:
    return AuthTokens(
        access_token=create_access_token(subject=str(user.id), role=user.role.name),
        refresh_token=raw_refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


def _record_auth_event(
    session: AsyncSession,
    *,
    user_id: int,
    event_type: str,
    correlation_id: str | None,
) -> None:
    record_audit_event(
        session,
        AuditEvent(
            event_type=event_type,
            entity_type="user",
            entity_id=str(user_id),
            actor_user_id=user_id,
            correlation_id=correlation_id,
        ),
    )


async def login(
    session: AsyncSession,
    username: str,
    password: str,
    correlation_id: str | None,
) -> AuthTokens:
    user = await get_user_by_username(session, username)
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid credentials")

    now = datetime.now(UTC)
    raw_refresh_token = generate_refresh_token()
    add_refresh_token(session, _new_refresh_record(user.id, raw_refresh_token, now))
    _record_auth_event(
        session,
        user_id=user.id,
        event_type="auth.login.success",
        correlation_id=correlation_id,
    )
    await session.commit()
    return _token_response(user, raw_refresh_token)


async def rotate_refresh_token(
    session: AsyncSession,
    raw_refresh_token: str,
    correlation_id: str | None,
) -> AuthTokens:
    token_hash = hash_refresh_token(raw_refresh_token)
    token_record = await get_refresh_token_for_update(session, token_hash)
    now = datetime.now(UTC)
    if (
        token_record is None
        or token_record.revoked_at is not None
        or token_record.expires_at <= now
    ):
        raise AuthenticationError("Invalid refresh token")

    user = await get_user_by_id(session, token_record.user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("Invalid refresh token")

    token_record.revoked_at = now
    replacement = generate_refresh_token()
    add_refresh_token(session, _new_refresh_record(user.id, replacement, now))
    _record_auth_event(
        session,
        user_id=user.id,
        event_type="auth.refresh.rotated",
        correlation_id=correlation_id,
    )
    await session.commit()
    return _token_response(user, replacement)


async def logout(
    session: AsyncSession,
    raw_refresh_token: str,
    correlation_id: str | None,
) -> None:
    token_record = await get_refresh_token_for_update(
        session, hash_refresh_token(raw_refresh_token)
    )
    if token_record is None or token_record.revoked_at is not None:
        return

    token_record.revoked_at = datetime.now(UTC)
    _record_auth_event(
        session,
        user_id=token_record.user_id,
        event_type="auth.logout",
        correlation_id=correlation_id,
    )
    await session.commit()
