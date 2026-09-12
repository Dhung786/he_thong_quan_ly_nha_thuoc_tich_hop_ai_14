from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import manager_ai
from app.api.deps import require_roles
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
    return await manager_ai.ai_status(user)


@router.post("/medicine-summary", response_model=AITextResponse)
async def pharmacist_medicine_summary(
    payload: MedicineSummaryRequest,
    user: PharmacistUser,
    session: DbSession,
) -> AITextResponse:
    return await manager_ai.medicine_summary(payload, user, session)


@router.post("/expiry-report", response_model=AITextResponse)
async def pharmacist_expiry_report(
    payload: ExpiryReportRequest,
    user: PharmacistUser,
    session: DbSession,
) -> AITextResponse:
    return await manager_ai.expiry_report(payload, user, session)


@router.post("/internal-chat", response_model=AITextResponse)
async def pharmacist_internal_chat(
    payload: InternalChatRequest,
    user: PharmacistUser,
) -> AITextResponse:
    return await manager_ai.internal_chat(payload, user)
