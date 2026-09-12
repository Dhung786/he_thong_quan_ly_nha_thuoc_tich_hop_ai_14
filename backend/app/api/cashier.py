from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.errors import ApplicationConflict
from app.models.auth import User
from app.models.catalog import Medicine
from app.models.operational import Invoice, InvoiceItem, MedicineBatch
from app.schemas.manager_operations import (
    AdvancedMedicineLookupResponse,
    InvoiceCreate,
    InvoiceItemResponse,
    InvoiceResponse,
    InventoryRow,
)

router = APIRouter(prefix="/api/v1/cashier", tags=["cashier"])
CashierUser = Annotated[User, Depends(require_roles("CASHIER"))]
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


async def _load_invoice(session: AsyncSession, invoice_id: int) -> Invoice:
    result = await session.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items).selectinload(InvoiceItem.batch),
            selectinload(Invoice.items).selectinload(InvoiceItem.medicine),
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.get("/medicines", response_model=list[AdvancedMedicineLookupResponse])
async def lookup_medicines(
    _: CashierUser,
    session: DbSession,
    q: str | None = None,
) -> list[AdvancedMedicineLookupResponse]:
    today = date.today()
    valid_batch = [
        MedicineBatch.medicine_id == Medicine.id,
        MedicineBatch.quantity_remaining > 0,
        MedicineBatch.expiry_date >= today,
    ]
    available_quantity = select(func.coalesce(func.sum(MedicineBatch.quantity_remaining), 0)).where(*valid_batch).scalar_subquery()
    min_price = select(func.min(MedicineBatch.selling_price)).where(*valid_batch).scalar_subquery()
    max_price = select(func.max(MedicineBatch.selling_price)).where(*valid_batch).scalar_subquery()
    nearest_expiry = select(func.min(MedicineBatch.expiry_date)).where(*valid_batch).scalar_subquery()

    statement = (
        select(Medicine, available_quantity, min_price, max_price, nearest_expiry)
        .options(selectinload(Medicine.group), selectinload(Medicine.unit))
        .order_by(Medicine.name)
    )
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        statement = statement.where(or_(Medicine.code.ilike(pattern), Medicine.name.ilike(pattern)))

    result = await session.execute(statement)
    return [
        AdvancedMedicineLookupResponse(
            medicine_id=medicine.id,
            code=medicine.code,
            name=medicine.name,
            group_name=medicine.group.name,
            unit_name=medicine.unit.name,
            available_quantity=int(quantity or 0),
            min_selling_price=min_value,
            max_selling_price=max_value,
            nearest_expiry=expiry_value,
        )
        for medicine, quantity, min_value, max_value, expiry_value in result.all()
    ]


@router.get("/inventory", response_model=list[InventoryRow])
async def saleable_inventory(_: CashierUser, session: DbSession) -> list[InventoryRow]:
    today = date.today()
    result = await session.execute(
        select(MedicineBatch)
        .options(selectinload(MedicineBatch.medicine))
        .where(MedicineBatch.quantity_remaining > 0, MedicineBatch.expiry_date >= today)
        .order_by(MedicineBatch.medicine_id, MedicineBatch.expiry_date, MedicineBatch.id)
    )
    return [
        InventoryRow(
            batch_id=batch.id,
            batch_code=batch.code,
            medicine_id=batch.medicine_id,
            medicine_code=batch.medicine.code,
            medicine_name=batch.medicine.name,
            quantity_remaining=batch.quantity_remaining,
            expiry_date=batch.expiry_date,
            selling_price=batch.selling_price,
        )
        for batch in result.scalars().all()
    ]


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_own_invoices(user: CashierUser, session: DbSession) -> list[InvoiceResponse]:
    result = await session.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items).selectinload(InvoiceItem.batch),
            selectinload(Invoice.items).selectinload(InvoiceItem.medicine),
        )
        .where(Invoice.created_by_user_id == user.id)
        .order_by(Invoice.id.desc())
    )
    return [_invoice_response(invoice) for invoice in result.scalars().unique().all()]


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(payload: InvoiceCreate, user: CashierUser, session: DbSession) -> InvoiceResponse:
    duplicate = await session.execute(select(Invoice.id).where(Invoice.code == payload.code))
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Invoice code already exists", code="invoice_code_exists")

    requested: dict[int, int] = {}
    for item in payload.items:
        requested[item.batch_id] = requested.get(item.batch_id, 0) + item.quantity

    today = date.today()
    batch_result = await session.execute(
        select(MedicineBatch)
        .options(selectinload(MedicineBatch.medicine))
        .where(MedicineBatch.id.in_(requested))
    )
    batches = {batch.id: batch for batch in batch_result.scalars().all()}
    if len(batches) != len(requested):
        raise HTTPException(status_code=404, detail="One or more medicine batches were not found")
    for batch_id, quantity in requested.items():
        batch = batches[batch_id]
        if batch.expiry_date < today:
            raise ApplicationConflict("Expired batch cannot be sold", code="expired_batch")
        if batch.quantity_remaining < quantity:
            raise ApplicationConflict("Insufficient stock for selected batch", code="insufficient_batch_stock")

    invoice = Invoice(code=payload.code, created_by_user_id=user.id, status="DRAFT")
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
    return _invoice_response(await _load_invoice(session, invoice.id))


@router.post("/invoices/{invoice_id}/finalize", response_model=InvoiceResponse)
async def finalize_invoice(invoice_id: int, user: CashierUser, session: DbSession) -> InvoiceResponse:
    invoice = await _load_invoice(session, invoice_id)
    if invoice.created_by_user_id != user.id:
        raise HTTPException(status_code=403, detail="Cashier can only finalize own invoice")
    if invoice.status != "DRAFT":
        raise ApplicationConflict("Only draft invoices can be finalized", code="invoice_not_draft")

    requested: dict[int, int] = {}
    for item in invoice.items:
        requested[item.batch_id] = requested.get(item.batch_id, 0) + item.quantity

    locked_result = await session.execute(
        select(MedicineBatch)
        .where(MedicineBatch.id.in_(requested))
        .order_by(MedicineBatch.id)
        .with_for_update()
    )
    locked = {batch.id: batch for batch in locked_result.scalars().all()}
    today = date.today()
    for batch_id, quantity in requested.items():
        batch = locked.get(batch_id)
        if batch is None:
            raise HTTPException(status_code=404, detail="Medicine batch not found")
        if batch.expiry_date < today:
            raise ApplicationConflict("Expired batch cannot be sold", code="expired_batch")
        if batch.quantity_remaining < quantity:
            raise ApplicationConflict("Insufficient stock for selected batch", code="insufficient_batch_stock")
    for batch_id, quantity in requested.items():
        locked[batch_id].quantity_remaining -= quantity

    invoice.status = "FINALIZED"
    invoice.finalized_at = datetime.now(UTC)
    await session.commit()
    return _invoice_response(await _load_invoice(session, invoice.id))


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(invoice_id: int, user: CashierUser, session: DbSession) -> InvoiceResponse:
    invoice = await _load_invoice(session, invoice_id)
    if invoice.created_by_user_id != user.id:
        raise HTTPException(status_code=403, detail="Cashier can only cancel own invoice")
    if invoice.status != "DRAFT":
        raise ApplicationConflict("Only draft invoices can be cancelled", code="invoice_not_draft")
    invoice.status = "CANCELLED"
    await session.commit()
    return _invoice_response(await _load_invoice(session, invoice.id))
