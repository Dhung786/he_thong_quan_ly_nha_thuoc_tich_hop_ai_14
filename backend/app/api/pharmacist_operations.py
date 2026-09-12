from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.errors import ApplicationConflict
from app.models.auth import User
from app.models.catalog import Medicine
from app.models.operational import Invoice, InvoiceItem, MedicineBatch
from app.schemas.manager_operations import (
    InvoiceCreate,
    InvoiceItemResponse,
    InvoiceResponse,
    ReportSummaryResponse,
)
from app.schemas.pharmacist import PharmacistDashboardResponse, PharmacistProfileResponse

router = APIRouter(prefix="/api/v1/pharmacist", tags=["pharmacist-operations"])
PharmacistUser = Annotated[User, Depends(require_roles("PHARMACIST"))]
DbSession = Annotated[AsyncSession, Depends(get_db)]


def _invoice_response(invoice: Invoice) -> InvoiceResponse:
    return InvoiceResponse(
        id=invoice.id,
        code=invoice.code,
        status=invoice.status,
        total_amount=invoice.total_amount,
        created_by_user_id=invoice.created_by_user_id,
        finalized_at=invoice.finalized_at,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        items=[
            InvoiceItemResponse(
                id=item.id,
                medicine_id=item.medicine_id,
                medicine_name=item.medicine.name,
                batch_id=item.batch_id,
                batch_code=item.batch.code,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item in invoice.items
        ],
    )


async def _load_own_invoice(
    session: AsyncSession,
    *,
    invoice_id: int,
    user_id: int,
) -> Invoice:
    result = await session.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items).selectinload(InvoiceItem.batch),
            selectinload(Invoice.items).selectinload(InvoiceItem.medicine),
        )
        .where(
            Invoice.id == invoice_id,
            Invoice.created_by_user_id == user_id,
        )
    )
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.get("/dashboard", response_model=PharmacistDashboardResponse)
async def dashboard(
    user: PharmacistUser,
    session: DbSession,
    low_stock_threshold: Annotated[int, Query(ge=0, le=100000)] = 20,
    expiry_within_days: Annotated[int, Query(ge=1, le=3650)] = 90,
) -> PharmacistDashboardResponse:
    today = date.today()
    cutoff = today + timedelta(days=expiry_within_days)

    medicine_count = int(
        (await session.execute(select(func.count(Medicine.id)))).scalar_one()
    )
    inventory_units = int(
        (
            await session.execute(
                select(func.coalesce(func.sum(MedicineBatch.quantity_remaining), 0)).where(
                    MedicineBatch.quantity_remaining > 0
                )
            )
        ).scalar_one()
    )
    low_stock_lots = int(
        (
            await session.execute(
                select(func.count(MedicineBatch.id)).where(
                    MedicineBatch.quantity_remaining > 0,
                    MedicineBatch.quantity_remaining <= low_stock_threshold,
                )
            )
        ).scalar_one()
    )
    expiring_lots = int(
        (
            await session.execute(
                select(func.count(MedicineBatch.id)).where(
                    MedicineBatch.quantity_remaining > 0,
                    MedicineBatch.expiry_date >= today,
                    MedicineBatch.expiry_date <= cutoff,
                )
            )
        ).scalar_one()
    )
    expired_lots = int(
        (
            await session.execute(
                select(func.count(MedicineBatch.id)).where(
                    MedicineBatch.quantity_remaining > 0,
                    MedicineBatch.expiry_date < today,
                )
            )
        ).scalar_one()
    )
    invoice_stats = (
        await session.execute(
            select(
                func.count(Invoice.id),
                func.coalesce(func.sum(Invoice.total_amount), Decimal("0")),
            ).where(
                Invoice.created_by_user_id == user.id,
                Invoice.status == "FINALIZED",
            )
        )
    ).one()

    return PharmacistDashboardResponse(
        medicine_count=medicine_count,
        inventory_units=inventory_units,
        low_stock_lots=low_stock_lots,
        expiring_lots=expiring_lots,
        expired_lots=expired_lots,
        finalized_invoice_count=int(invoice_stats[0]),
        revenue=Decimal(invoice_stats[1]),
    )


@router.get("/profile", response_model=PharmacistProfileResponse)
async def profile(user: PharmacistUser) -> PharmacistProfileResponse:
    return PharmacistProfileResponse(
        id=user.id,
        username=user.username,
        role=user.role.name,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_own_invoices(
    user: PharmacistUser,
    session: DbSession,
    invoice_status: Annotated[str | None, Query(alias="status")] = None,
) -> list[InvoiceResponse]:
    statement = (
        select(Invoice)
        .options(
            selectinload(Invoice.items).selectinload(InvoiceItem.batch),
            selectinload(Invoice.items).selectinload(InvoiceItem.medicine),
        )
        .where(Invoice.created_by_user_id == user.id)
        .order_by(Invoice.id.desc())
    )
    if invoice_status is not None:
        statement = statement.where(Invoice.status == invoice_status.upper())
    result = await session.execute(statement)
    return [_invoice_response(invoice) for invoice in result.scalars().unique().all()]


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    payload: InvoiceCreate,
    user: PharmacistUser,
    session: DbSession,
) -> InvoiceResponse:
    duplicate = await session.execute(select(Invoice.id).where(Invoice.code == payload.code))
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict(
            "Invoice code already exists",
            code="invoice_code_exists",
        )

    requested: dict[int, int] = {}
    for item in payload.items:
        requested[item.batch_id] = requested.get(item.batch_id, 0) + item.quantity

    batches_result = await session.execute(
        select(MedicineBatch)
        .options(selectinload(MedicineBatch.medicine))
        .where(MedicineBatch.id.in_(requested))
    )
    batches = {batch.id: batch for batch in batches_result.scalars().all()}
    if len(batches) != len(requested):
        raise HTTPException(
            status_code=404,
            detail="One or more medicine batches were not found",
        )

    today = date.today()
    for batch_id, quantity in requested.items():
        batch = batches[batch_id]
        if batch.expiry_date < today:
            raise ApplicationConflict(
                "Expired medicine batch cannot be sold",
                code="expired_batch_sale",
            )
        if batch.quantity_remaining < quantity:
            raise ApplicationConflict(
                "Insufficient stock for selected batch",
                code="insufficient_batch_stock",
            )

    invoice = Invoice(
        code=payload.code,
        created_by_user_id=user.id,
        status="DRAFT",
    )
    session.add(invoice)
    await session.flush()

    total = Decimal("0")
    for item in payload.items:
        batch = batches[item.batch_id]
        line_total = batch.selling_price * item.quantity
        total += line_total
        session.add(
            InvoiceItem(
                invoice_id=invoice.id,
                medicine_id=batch.medicine_id,
                batch_id=batch.id,
                quantity=item.quantity,
                unit_price=batch.selling_price,
                line_total=line_total,
            )
        )
    invoice.total_amount = total
    await session.commit()
    return _invoice_response(
        await _load_own_invoice(session, invoice_id=invoice.id, user_id=user.id)
    )


@router.post("/invoices/{invoice_id}/finalize", response_model=InvoiceResponse)
async def finalize_invoice(
    invoice_id: int,
    user: PharmacistUser,
    session: DbSession,
) -> InvoiceResponse:
    invoice = await _load_own_invoice(
        session,
        invoice_id=invoice_id,
        user_id=user.id,
    )
    if invoice.status != "DRAFT":
        raise ApplicationConflict(
            "Only draft invoices can be finalized",
            code="invoice_not_draft",
        )

    requested: dict[int, int] = {}
    for item in invoice.items:
        requested[item.batch_id] = requested.get(item.batch_id, 0) + item.quantity

    locked_result = await session.execute(
        select(MedicineBatch)
        .where(MedicineBatch.id.in_(requested))
        .order_by(MedicineBatch.id)
        .with_for_update()
    )
    batches = {batch.id: batch for batch in locked_result.scalars().all()}
    if len(batches) != len(requested):
        raise HTTPException(status_code=404, detail="Medicine batch not found")

    today = date.today()
    for batch_id, quantity in requested.items():
        batch = batches[batch_id]
        if batch.expiry_date < today:
            raise ApplicationConflict(
                "Expired medicine batch cannot be sold",
                code="expired_batch_sale",
            )
        if batch.quantity_remaining < quantity:
            raise ApplicationConflict(
                "Insufficient stock for selected batch",
                code="insufficient_batch_stock",
            )

    for batch_id, quantity in requested.items():
        batches[batch_id].quantity_remaining -= quantity
    invoice.status = "FINALIZED"
    invoice.finalized_at = datetime.now(UTC)
    await session.commit()
    return _invoice_response(
        await _load_own_invoice(session, invoice_id=invoice.id, user_id=user.id)
    )


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(
    invoice_id: int,
    user: PharmacistUser,
    session: DbSession,
) -> InvoiceResponse:
    invoice = await _load_own_invoice(
        session,
        invoice_id=invoice_id,
        user_id=user.id,
    )
    if invoice.status != "DRAFT":
        raise ApplicationConflict(
            "Only draft invoices can be cancelled",
            code="invoice_not_draft",
        )
    invoice.status = "CANCELLED"
    await session.commit()
    return _invoice_response(
        await _load_own_invoice(session, invoice_id=invoice.id, user_id=user.id)
    )


@router.get("/reports/summary", response_model=ReportSummaryResponse)
async def report_summary(
    user: PharmacistUser,
    session: DbSession,
    expiry_within_days: Annotated[int, Query(ge=1, le=3650)] = 90,
) -> ReportSummaryResponse:
    today = date.today()
    cutoff = today + timedelta(days=expiry_within_days)

    invoice_stats = (
        await session.execute(
            select(
                func.count(Invoice.id),
                func.coalesce(func.sum(Invoice.total_amount), Decimal("0")),
            ).where(
                Invoice.created_by_user_id == user.id,
                Invoice.status == "FINALIZED",
            )
        )
    ).one()
    inventory_units = int(
        (
            await session.execute(
                select(func.coalesce(func.sum(MedicineBatch.quantity_remaining), 0)).where(
                    MedicineBatch.quantity_remaining > 0
                )
            )
        ).scalar_one()
    )
    expired_lots = int(
        (
            await session.execute(
                select(func.count(MedicineBatch.id)).where(
                    MedicineBatch.quantity_remaining > 0,
                    MedicineBatch.expiry_date < today,
                )
            )
        ).scalar_one()
    )
    expiring_lots = int(
        (
            await session.execute(
                select(func.count(MedicineBatch.id)).where(
                    MedicineBatch.quantity_remaining > 0,
                    MedicineBatch.expiry_date >= today,
                    MedicineBatch.expiry_date <= cutoff,
                )
            )
        ).scalar_one()
    )

    return ReportSummaryResponse(
        finalized_invoice_count=int(invoice_stats[0]),
        revenue=Decimal(invoice_stats[1]),
        inventory_units=inventory_units,
        expired_lots=expired_lots,
        expiring_lots=expiring_lots,
    )
