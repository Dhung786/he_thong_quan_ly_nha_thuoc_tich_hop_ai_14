from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.errors import ApplicationConflict
from app.models.auth import User
from app.models.catalog import Medicine, MedicineGroup, Unit
from app.schemas.catalog import (
    MedicineCreate,
    MedicineGroupResponse,
    MedicineResponse,
    MedicineUpdate,
    NamedCatalogCreate,
    NamedCatalogUpdate,
    UnitCreate,
    UnitResponse,
    UnitUpdate,
)
from app.services.audit_service import AuditEvent, record_audit_event

router = APIRouter(prefix="/api/v1/catalog", tags=["UC002 - Quản lý danh mục thuốc"])
ManagerUser = Annotated[User, Depends(require_roles("MANAGER"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]


def _correlation_id(request: Request) -> str | None:
    value = getattr(request.state, "correlation_id", None)
    return value if isinstance(value, str) else None


def _medicine_response(medicine: Medicine) -> MedicineResponse:
    return MedicineResponse(
        id=medicine.id,
        code=medicine.code,
        name=medicine.name,
        group_id=medicine.group_id,
        unit_id=medicine.unit_id,
        group_name=medicine.group.name,
        unit_name=medicine.unit.name,
        created_at=medicine.created_at,
        updated_at=medicine.updated_at,
    )


async def _get_group(session: AsyncSession, group_id: int) -> MedicineGroup:
    group = await session.get(MedicineGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Medicine group not found")
    return group


async def _get_unit(session: AsyncSession, unit_id: int) -> Unit:
    unit = await session.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit


async def _get_medicine(session: AsyncSession, medicine_id: int) -> Medicine:
    result = await session.execute(
        select(Medicine)
        .options(selectinload(Medicine.group), selectinload(Medicine.unit))
        .where(Medicine.id == medicine_id)
    )
    medicine = result.scalar_one_or_none()
    if medicine is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


@router.get("/groups", response_model=list[MedicineGroupResponse])
async def list_groups(_: ManagerUser, session: DbSession) -> list[MedicineGroup]:
    result = await session.execute(select(MedicineGroup).order_by(MedicineGroup.id))
    return list(result.scalars().all())


@router.post("/groups", response_model=MedicineGroupResponse, status_code=201)
async def create_group(
    payload: NamedCatalogCreate,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> MedicineGroup:
    group = MedicineGroup(name=payload.name)
    session.add(group)
    await session.flush()
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.medicine_group.created",
            entity_type="medicine_group",
            entity_id=str(group.id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            new_state=group.name,
        ),
    )
    await session.commit()
    await session.refresh(group)
    return group


@router.put("/groups/{group_id}", response_model=MedicineGroupResponse)
async def update_group(
    group_id: int,
    payload: NamedCatalogUpdate,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> MedicineGroup:
    group = await _get_group(session, group_id)
    previous = group.name
    group.name = payload.name
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.medicine_group.updated",
            entity_type="medicine_group",
            entity_id=str(group.id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            previous_state=previous,
            new_state=group.name,
        ),
    )
    await session.commit()
    await session.refresh(group)
    return group


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(
    group_id: int,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> Response:
    group = await _get_group(session, group_id)
    group_name = group.name
    await session.delete(group)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ApplicationConflict(
            "Medicine group is currently in use",
            code="medicine_group_in_use",
        ) from exc
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.medicine_group.deleted",
            entity_type="medicine_group",
            entity_id=str(group_id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            previous_state=group_name,
        ),
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/units", response_model=list[UnitResponse])
async def list_units(_: ManagerUser, session: DbSession) -> list[Unit]:
    result = await session.execute(select(Unit).order_by(Unit.id))
    return list(result.scalars().all())


@router.post("/units", response_model=UnitResponse, status_code=201)
async def create_unit(
    payload: UnitCreate,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> Unit:
    unit = Unit(name=payload.name)
    session.add(unit)
    await session.flush()
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.unit.created",
            entity_type="unit",
            entity_id=str(unit.id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            new_state=unit.name,
        ),
    )
    await session.commit()
    await session.refresh(unit)
    return unit


@router.put("/units/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: int,
    payload: UnitUpdate,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> Unit:
    unit = await _get_unit(session, unit_id)
    previous = unit.name
    unit.name = payload.name
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.unit.updated",
            entity_type="unit",
            entity_id=str(unit.id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            previous_state=previous,
            new_state=unit.name,
        ),
    )
    await session.commit()
    await session.refresh(unit)
    return unit


@router.delete("/units/{unit_id}", status_code=204)
async def delete_unit(
    unit_id: int,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> Response:
    unit = await _get_unit(session, unit_id)
    unit_name = unit.name
    await session.delete(unit)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ApplicationConflict("Unit is currently in use", code="unit_in_use") from exc
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.unit.deleted",
            entity_type="unit",
            entity_id=str(unit_id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            previous_state=unit_name,
        ),
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/medicines", response_model=list[MedicineResponse])
async def list_medicines(
    _: ManagerUser,
    session: DbSession,
    q: Annotated[str | None, Query(max_length=255)] = None,
    group_id: Annotated[int | None, Query(gt=0)] = None,
    unit_id: Annotated[int | None, Query(gt=0)] = None,
) -> list[MedicineResponse]:
    statement = (
        select(Medicine)
        .options(selectinload(Medicine.group), selectinload(Medicine.unit))
        .order_by(Medicine.id)
    )
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        statement = statement.where(
            or_(Medicine.code.ilike(pattern), Medicine.name.ilike(pattern))
        )
    if group_id is not None:
        statement = statement.where(Medicine.group_id == group_id)
    if unit_id is not None:
        statement = statement.where(Medicine.unit_id == unit_id)

    result = await session.execute(statement)
    return [_medicine_response(item) for item in result.scalars().all()]


@router.get("/medicines/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(
    medicine_id: int,
    _: ManagerUser,
    session: DbSession,
) -> MedicineResponse:
    return _medicine_response(await _get_medicine(session, medicine_id))


@router.post("/medicines", response_model=MedicineResponse, status_code=201)
async def create_medicine(
    payload: MedicineCreate,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> MedicineResponse:
    group = await _get_group(session, payload.group_id)
    unit = await _get_unit(session, payload.unit_id)
    duplicate = await session.execute(select(Medicine.id).where(Medicine.code == payload.code))
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Medicine code already exists", code="medicine_code_exists")

    medicine = Medicine(
        code=payload.code,
        name=payload.name,
        group_id=group.id,
        unit_id=unit.id,
    )
    session.add(medicine)
    await session.flush()
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.medicine.created",
            entity_type="medicine",
            entity_id=str(medicine.id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            new_state=f"{medicine.code}:{medicine.name}",
        ),
    )
    await session.commit()
    return _medicine_response(await _get_medicine(session, medicine.id))


@router.put("/medicines/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: int,
    payload: MedicineUpdate,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> MedicineResponse:
    medicine = await _get_medicine(session, medicine_id)
    await _get_group(session, payload.group_id)
    await _get_unit(session, payload.unit_id)
    duplicate = await session.execute(
        select(Medicine.id).where(Medicine.code == payload.code, Medicine.id != medicine_id)
    )
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Medicine code already exists", code="medicine_code_exists")

    previous = f"{medicine.code}:{medicine.name}"
    medicine.code = payload.code
    medicine.name = payload.name
    medicine.group_id = payload.group_id
    medicine.unit_id = payload.unit_id
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.medicine.updated",
            entity_type="medicine",
            entity_id=str(medicine.id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            previous_state=previous,
            new_state=f"{medicine.code}:{medicine.name}",
        ),
    )
    await session.commit()
    return _medicine_response(await _get_medicine(session, medicine.id))


@router.delete("/medicines/{medicine_id}", status_code=204)
async def delete_medicine(
    medicine_id: int,
    request: Request,
    user: ManagerUser,
    session: DbSession,
) -> Response:
    medicine = await _get_medicine(session, medicine_id)
    previous = f"{medicine.code}:{medicine.name}"
    await session.delete(medicine)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ApplicationConflict(
            "Medicine is referenced by another record",
            code="medicine_in_use",
        ) from exc
    record_audit_event(
        session,
        AuditEvent(
            event_type="catalog.medicine.deleted",
            entity_type="medicine",
            entity_id=str(medicine_id),
            actor_user_id=user.id,
            correlation_id=_correlation_id(request),
            previous_state=previous,
        ),
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
