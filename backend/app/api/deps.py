from collections.abc import Awaitable, Callable, Collection
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.auth import ROLE_NAMES, User
from app.repositories.auth_repository import get_user_by_id

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
        role_claim = str(payload["role"])
    except (ValueError, TypeError, KeyError):
        raise unauthorized from None

    user = await get_user_by_id(session, user_id)
    if user is None or not user.is_active or user.role.name != role_claim:
        raise unauthorized
    return user


def enforce_roles(user: User, allowed_roles: Collection[str]) -> User:
    allowed = frozenset(allowed_roles)
    if not allowed:
        raise ValueError("At least one allowed role is required")

    unknown_roles = allowed.difference(ROLE_NAMES)
    if unknown_roles:
        raise ValueError(f"Unsupported role guard: {sorted(unknown_roles)}")

    if user.role.name not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return user


def require_roles(*allowed_roles: str) -> Callable[[User], Awaitable[User]]:
    allowed = frozenset(allowed_roles)
    if not allowed:
        raise ValueError("At least one allowed role is required")
    unknown_roles = allowed.difference(ROLE_NAMES)
    if unknown_roles:
        raise ValueError(f"Unsupported role guard: {sorted(unknown_roles)}")

    async def dependency(
        user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        return enforce_roles(user, allowed)

    return dependency
