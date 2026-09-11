from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.errors import ApplicationConflict
from app.core.security import hash_password
from app.models.auth import AuditLog, ROLE_DISPLAY_NAMES, RefreshToken, Role, User
from app.schemas.admin import (
    AdminAuditLogResponse,
    AdminPasswordReset,
    AdminSummaryResponse,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserRoleUpdate,
    AdminUserStatusUpdate,
)
from app.services.audit_service import AuditEvent, record_audit_event

router = APIRouter(prefix="/api/v1/admin", tags=["Quản trị hệ thống - yêu cầu bổ sung"])
ManagerUser = Annotated[User, Depends(require_roles("MANAGER"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]


def _correlation_id(request: Request) -> str | None:
    value = getattr(request.state, "correlation_id", None)
    return value if isinstance(value, str) else None


def _user_response(user: User) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id,
        username=user.username,
        role=user.role.name,
        role_label=ROLE_DISPLAY_NAMES.get(user.role.name, user.role.name),
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def _get_user(session: AsyncSession, user_id: int) -> User:
    result = await session.execute(
        select(User).options(joinedload(User.role)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _get_role(session: AsyncSession, role_name: str) -> Role:
    result = await session.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")
    return role


async def _revoke_refresh_tokens(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )


@router.get("/summary", response_model=AdminSummaryResponse)
async def admin_summary(_: ManagerUser, session: DbSession) -> AdminSummaryResponse:
    total_users = int((await session.execute(select(func.count()).select_from(User))).scalar_one())
    active_users = int(
        (
            await session.execute(
                select(func.count()).select_from(User).where(User.is_active.is_(True))
            )
        ).scalar_one()
    )
    role_counts_result = await session.execute(
        select(Role.name, func.count(User.id))
        .outerjoin(User, User.role_id == Role.id)
        .group_by(Role.name)
    )
    role_counts = {name: int(count) for name, count in role_counts_result.all()}
    audit_events = int((await session.execute(select(func.count()).select_from(AuditLog))).scalar_one())
    return AdminSummaryResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=total_users - active_users,
        managers=role_counts.get("MANAGER", 0),
        pharmacists=role_counts.get("PHARMACIST", 0),
        cashiers=role_counts.get("CASHIER", 0),
        audit_events=audit_events,
    )


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(_: ManagerUser, session: DbSession) -> list[AdminUserResponse]:
    result = await session.execute(
        select(User).options(joinedload(User.role)).order_by(User.id)
    )
    return [_user_response(user) for user in result.scalars().all()]


@router.post("/users", response_model=AdminUserResponse, status_code=201)
async def create_user(
    payload: AdminUserCreate,
    request: Request,
    actor: ManagerUser,
    session: DbSession,
) -> AdminUserResponse:
    existing = await session.execute(select(User.id).where(User.username == payload.username))
    if existing.scalar_one_or_none() is not None:
        raise ApplicationConflict("Username already exists", code="username_exists")

    role = await _get_role(session, payload.role)
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role_id=role.id,
        is_active=True,
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ApplicationConflict("Username already exists", code="username_exists") from exc

    record_audit_event(
        session,
        AuditEvent(
            event_type="admin.user.created",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=actor.id,
            correlation_id=_correlation_id(request),
            new_state=f"{user.username}:{role.name}:active",
        ),
    )
    await session.commit()
    return _user_response(await _get_user(session, user.id))


@router.put("/users/{user_id}/role", response_model=AdminUserResponse)
async def update_user_role(
    user_id: int,
    payload: AdminUserRoleUpdate,
    request: Request,
    actor: ManagerUser,
    session: DbSession,
) -> AdminUserResponse:
    user = await _get_user(session, user_id)
    if user.id == actor.id and payload.role != "MANAGER":
        raise ApplicationConflict(
            "You cannot remove your own manager role",
            code="self_role_change_blocked",
        )
    role = await _get_role(session, payload.role)
    previous = user.role.name
    user.role_id = role.id
    await _revoke_refresh_tokens(session, user.id)
    record_audit_event(
        session,
        AuditEvent(
            event_type="admin.user.role_changed",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=actor.id,
            correlation_id=_correlation_id(request),
            previous_state=previous,
            new_state=role.name,
        ),
    )
    await session.commit()
    return _user_response(await _get_user(session, user.id))


@router.put("/users/{user_id}/status", response_model=AdminUserResponse)
async def update_user_status(
    user_id: int,
    payload: AdminUserStatusUpdate,
    request: Request,
    actor: ManagerUser,
    session: DbSession,
) -> AdminUserResponse:
    user = await _get_user(session, user_id)
    if user.id == actor.id and not payload.is_active:
        raise ApplicationConflict(
            "You cannot lock your own account",
            code="self_lock_blocked",
        )
    previous = "active" if user.is_active else "locked"
    user.is_active = payload.is_active
    if not payload.is_active:
        await _revoke_refresh_tokens(session, user.id)
    record_audit_event(
        session,
        AuditEvent(
            event_type="admin.user.status_changed",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=actor.id,
            correlation_id=_correlation_id(request),
            previous_state=previous,
            new_state="active" if payload.is_active else "locked",
        ),
    )
    await session.commit()
    return _user_response(await _get_user(session, user.id))


@router.put("/users/{user_id}/password", status_code=204)
async def reset_user_password(
    user_id: int,
    payload: AdminPasswordReset,
    request: Request,
    actor: ManagerUser,
    session: DbSession,
) -> None:
    user = await _get_user(session, user_id)
    user.password_hash = hash_password(payload.password)
    await _revoke_refresh_tokens(session, user.id)
    record_audit_event(
        session,
        AuditEvent(
            event_type="admin.user.password_reset",
            entity_type="user",
            entity_id=str(user.id),
            actor_user_id=actor.id,
            correlation_id=_correlation_id(request),
        ),
    )
    await session.commit()


@router.get("/audit-logs", response_model=list[AdminAuditLogResponse])
async def list_audit_logs(
    _: ManagerUser,
    session: DbSession,
    event_type: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=100, ge=1, le=200),
) -> list[AdminAuditLogResponse]:
    actor = User.__table__.alias("audit_actor")
    statement = (
        select(AuditLog, actor.c.username)
        .outerjoin(actor, actor.c.id == AuditLog.actor_user_id)
        .order_by(AuditLog.id.desc())
        .limit(limit)
    )
    if event_type:
        statement = statement.where(AuditLog.event_type == event_type)
    result = await session.execute(statement)
    return [
        AdminAuditLogResponse(
            id=log.id,
            actor_user_id=log.actor_user_id,
            actor_username=actor_username,
            event_type=log.event_type,
            correlation_id=log.correlation_id,
            details=log.details,
            created_at=log.created_at,
        )
        for log, actor_username in result.all()
    ]
