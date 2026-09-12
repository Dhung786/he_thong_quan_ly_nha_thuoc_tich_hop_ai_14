from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.api.pharmacist_ai import router as pharmacist_ai_router
from app.api.pharmacist_operations import router as pharmacist_operations_router
from app.core.database import get_db
from app.models.auth import User
from app.models.catalog import Medicine
from app.schemas.catalog import MedicineResponse

router = APIRouter(prefix="/api/v1/lookup", tags=["UC007 - Tra cứu thuốc"])
LookupUser = Annotated[User, Depends(require_roles("MANAGER", "PHARMACIST"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]


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


@router.get("/medicines", response_model=list[MedicineResponse])
async def lookup_medicines(
    _: LookupUser,
    session: DbSession,
    q: Annotated[str | None, Query(max_length=255)] = None,
) -> list[MedicineResponse]:
    statement = (
        select(Medicine)
        .options(selectinload(Medicine.group), selectinload(Medicine.unit))
        .order_by(Medicine.name, Medicine.code)
    )
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        statement = statement.where(
            or_(Medicine.code.ilike(pattern), Medicine.name.ilike(pattern))
        )

    result = await session.execute(statement)
    return [_medicine_response(item) for item in result.scalars().all()]


router.include_router(pharmacist_operations_router)
router.include_router(pharmacist_ai_router)
