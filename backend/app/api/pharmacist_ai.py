from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.api.manager_ai import (
    ai_status as manager_ai_status,
    expiry_report as manager_expiry_report,
    internal_chat as manager_internal_chat,
    medicine_summary as manager_medicine_summary,
)
from app.core.database import get_db
from app.models.auth import User
from app.schemas.ai import (
    AIStatusResponse,
    AITextResponse,
    ExpiryReportRequest,
    InternalChatRequest,
    MedicineSummaryRequest,
)

router = APIRouter(prefix="/api/v1/pharmacist/ai", tags=["pharmacist-ai"])
PharmacistUser = Annotated[User, Depends(require_roles("PHARMACIST"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/status", response_model=AIStatusResponse)
async def pharmacist_ai_status(user: PharmacistUser) -> AIStatusResponse:
    return await manager_ai_status(user)


@router.post("/medicine-summary", response_model=AITextResponse)
async def pharmacist_medicine_summary(
    payload: MedicineSummaryRequest,
    user: PharmacistUser,
    session: DbSession,
) -> AITextResponse:
    return await manager_medicine_summary(payload, user, session)


@router.post("/expiry-report", response_model=AITextResponse)
async def pharmacist_expiry_report(
    payload: ExpiryReportRequest,
    user: PharmacistUser,
    session: DbSession,
) -> AITextResponse:
    return await manager_expiry_report(payload, user, session)


@router.post("/internal-chat", response_model=AITextResponse)
async def pharmacist_internal_chat(
    payload: InternalChatRequest,
    user: PharmacistUser,
) -> AITextResponse:
    return await manager_internal_chat(payload, user)
