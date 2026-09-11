from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.auth import User
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    RefreshTokenRequest,
    TokenPairResponse,
)
from app.schemas.common import ErrorResponse, ValidationErrorResponse
from app.services.auth_service import AuthenticationError, login, logout, rotate_refresh_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _correlation_id(request: Request) -> str | None:
    value = getattr(request.state, "correlation_id", None)
    return value if isinstance(value, str) else None


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post(
    "/login",
    response_model=TokenPairResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        422: {"model": ValidationErrorResponse, "description": "Request validation failed"},
    },
)
async def login_endpoint(
    payload: LoginRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPairResponse:
    try:
        tokens = await login(
            session,
            username=payload.username,
            password=payload.password,
            correlation_id=_correlation_id(request),
        )
    except AuthenticationError:
        raise _unauthorized() from None
    return TokenPairResponse(**tokens.__dict__)


@router.post(
    "/refresh",
    response_model=TokenPairResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid refresh token"},
        422: {"model": ValidationErrorResponse, "description": "Request validation failed"},
    },
)
async def refresh_endpoint(
    payload: RefreshTokenRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPairResponse:
    try:
        tokens = await rotate_refresh_token(
            session,
            raw_refresh_token=payload.refresh_token,
            correlation_id=_correlation_id(request),
        )
    except AuthenticationError:
        raise _unauthorized() from None
    return TokenPairResponse(**tokens.__dict__)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        422: {"model": ValidationErrorResponse, "description": "Request validation failed"},
    },
)
async def logout_endpoint(
    payload: RefreshTokenRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    await logout(
        session,
        raw_refresh_token=payload.refresh_token,
        correlation_id=_correlation_id(request),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required"},
    },
)
async def me_endpoint(user: Annotated[User, Depends(get_current_user)]) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=user.id,
        username=user.username,
        role=user.role.name,
        is_active=user.is_active,
    )
