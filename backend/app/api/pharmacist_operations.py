from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import manager_operations
from app.api.deps import require_roles
from app.core.database import get_db
from app.models.auth import User
from app.schemas.manager_operations import (
    InvoiceCreate,
    InvoiceResponse,
    ReportSummaryResponse,
)

router = APIRouter(prefix="/api/v1/pharmacist", tags=["Pharmacist operational APIs"])
PharmacistUser = Annotated[User, Depends(require_roles("PHARMACIST"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_pharmacist_invoices(
    user: PharmacistUser,
    session: DbSession,
    invoice_status: Annotated[str | None, Query(alias="status")] = None,
) -> list[InvoiceResponse]:
    return await manager_operations.list_invoices(user, session, invoice_status)


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
async def create_pharmacist_invoice(
    payload: InvoiceCreate,
    user: PharmacistUser,
    session: DbSession,
) -> InvoiceResponse:
    return await manager_operations.create_invoice(payload, user, session)


@router.post("/invoices/{invoice_id}/finalize", response_model=InvoiceResponse)
async def finalize_pharmacist_invoice(
    invoice_id: int,
    user: PharmacistUser,
    session: DbSession,
) -> InvoiceResponse:
    return await manager_operations.finalize_invoice(invoice_id, user, session)


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_pharmacist_invoice(
    invoice_id: int,
    user: PharmacistUser,
    session: DbSession,
) -> InvoiceResponse:
    return await manager_operations.cancel_invoice(invoice_id, user, session)


@router.get("/reports/summary", response_model=ReportSummaryResponse)
async def pharmacist_report_summary(
    user: PharmacistUser,
    session: DbSession,
    from_date: date | None = None,
    to_date: date | None = None,
    expiry_within_days: Annotated[int | None, Query(ge=0, le=3650)] = None,
) -> ReportSummaryResponse:
    return await manager_operations.report_summary(
        user,
        session,
        from_date,
        to_date,
        expiry_within_days,
    )
