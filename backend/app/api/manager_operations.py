from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.errors import ApplicationConflict
from app.core.security import hash_password
from app.models.auth import RefreshToken, Role, User
from app.models.catalog import Medicine
from app.models.operational import Invoice, InvoiceItem, MedicineBatch, Supplier
from app.schemas.manager_operations import (
    AccountActiveUpdate,
    AccountCreate,
    AccountPasswordReset,
    AccountResponse,
    AccountRoleUpdate,
    AdvancedMedicineLookupResponse,
    BatchCreate,
    BatchResponse,
    BatchUpdate,
    ExpiryRow,
    InventoryRow,
    InvoiceCreate,
    InvoiceItemResponse,
    InvoiceResponse,
    ReportSummaryResponse,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)

router = APIRouter(tags=["Manager operational APIs"])
ManagerUser = Annotated[User, Depends(require_roles("MANAGER"))]
ManagerOrPharmacistUser = Annotated[
    User,
    Depends(require_roles("MANAGER", "PHARMACIST")),
]
DbSession = Annotated[AsyncSession, Depends(get_db)]


def _batch_response(batch: MedicineBatch) -> BatchResponse:
    return BatchResponse(
        id=batch.id,
        code=batch.code,
        medicine_id=batch.medicine_id,
        medicine_name=batch.medicine.name,
        supplier_id=batch.supplier_id,
        supplier_name=batch.supplier.name,
        quantity_received=batch.quantity_received,
        quantity_remaining=batch.quantity_remaining,
        received_date=batch.received_date,
        expiry_date=batch.expiry_date,
        purchase_price=batch.purchase_price,
        selling_price=batch.selling_price,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
    )


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


async def _load_batch(session: AsyncSession, batch_id: int, *, for_update: bool = False) -> MedicineBatch:
    statement = (
        select(MedicineBatch)
        .options(selectinload(MedicineBatch.medicine), selectinload(MedicineBatch.supplier))
        .where(MedicineBatch.id == batch_id)
    )
    if for_update:
        statement = statement.with_for_update()
    result = await session.execute(statement)
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=404, detail="Medicine batch not found")
    return batch


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


@router.get("/api/v1/suppliers", response_model=list[SupplierResponse])
async def list_suppliers(_: ManagerOrPharmacistUser, session: DbSession) -> list[Supplier]:
    result = await session.execute(select(Supplier).order_by(Supplier.name))
    return list(result.scalars().all())


@router.post("/api/v1/suppliers", response_model=SupplierResponse, status_code=201)
async def create_supplier(payload: SupplierCreate, _: ManagerUser, session: DbSession) -> Supplier:
    duplicate = await session.execute(select(Supplier.id).where(func.lower(Supplier.name) == payload.name.lower()))
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Supplier name already exists", code="supplier_name_exists")
    supplier = Supplier(**payload.model_dump())
    session.add(supplier)
    await session.commit()
    await session.refresh(supplier)
    return supplier


@router.put("/api/v1/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    _: ManagerUser,
    session: DbSession,
) -> Supplier:
    supplier = await session.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    duplicate = await session.execute(
        select(Supplier.id).where(func.lower(Supplier.name) == payload.name.lower(), Supplier.id != supplier_id)
    )
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Supplier name already exists", code="supplier_name_exists")
    for key, value in payload.model_dump().items():
        setattr(supplier, key, value)
    await session.commit()
    await session.refresh(supplier)
    return supplier


@router.get("/api/v1/batches", response_model=list[BatchResponse])
async def list_batches(
    _: ManagerOrPharmacistUser,
    session: DbSession,
    medicine_id: Annotated[int | None, Query(gt=0)] = None,
    supplier_id: Annotated[int | None, Query(gt=0)] = None,
) -> list[BatchResponse]:
    statement = (
        select(MedicineBatch)
        .options(selectinload(MedicineBatch.medicine), selectinload(MedicineBatch.supplier))
        .order_by(MedicineBatch.expiry_date, MedicineBatch.id)
    )
    if medicine_id is not None:
        statement = statement.where(MedicineBatch.medicine_id == medicine_id)
    if supplier_id is not None:
        statement = statement.where(MedicineBatch.supplier_id == supplier_id)
    result = await session.execute(statement)
    return [_batch_response(batch) for batch in result.scalars().all()]


@router.post("/api/v1/batches", response_model=BatchResponse, status_code=201)
async def create_batch(payload: BatchCreate, _: ManagerUser, session: DbSession) -> BatchResponse:
    if payload.expiry_date < payload.received_date:
        raise HTTPException(status_code=422, detail="expiry_date must not be before received_date")
    if await session.get(Medicine, payload.medicine_id) is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    if await session.get(Supplier, payload.supplier_id) is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    duplicate = await session.execute(select(MedicineBatch.id).where(MedicineBatch.code == payload.code))
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Batch code already exists", code="batch_code_exists")
    batch = MedicineBatch(
        **payload.model_dump(),
        quantity_remaining=payload.quantity_received,
    )
    session.add(batch)
    await session.commit()
    return _batch_response(await _load_batch(session, batch.id))


@router.put("/api/v1/batches/{batch_id}", response_model=BatchResponse)
async def update_batch(
    batch_id: int,
    payload: BatchUpdate,
    _: ManagerUser,
    session: DbSession,
) -> BatchResponse:
    if payload.expiry_date < payload.received_date:
        raise HTTPException(status_code=422, detail="expiry_date must not be before received_date")
    batch = await _load_batch(session, batch_id, for_update=True)
    if await session.get(Medicine, payload.medicine_id) is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    if await session.get(Supplier, payload.supplier_id) is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    duplicate = await session.execute(
        select(MedicineBatch.id).where(MedicineBatch.code == payload.code, MedicineBatch.id != batch_id)
    )
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Batch code already exists", code="batch_code_exists")

    sold_quantity = batch.quantity_received - batch.quantity_remaining
    if payload.quantity_received < sold_quantity:
        raise ApplicationConflict(
            "Quantity received cannot be lower than quantity already sold",
            code="batch_quantity_below_sold",
        )
    batch.code = payload.code
    batch.medicine_id = payload.medicine_id
    batch.supplier_id = payload.supplier_id
    batch.quantity_received = payload.quantity_received
    batch.quantity_remaining = payload.quantity_received - sold_quantity
    batch.received_date = payload.received_date
    batch.expiry_date = payload.expiry_date
    batch.purchase_price = payload.purchase_price
    batch.selling_price = payload.selling_price
    await session.commit()
    return _batch_response(await _load_batch(session, batch.id))


@router.get("/api/v1/inventory", response_model=list[InventoryRow])
async def list_inventory(
    _: ManagerOrPharmacistUser,
    session: DbSession,
    threshold: Annotated[int | None, Query(ge=0)] = None,
    medicine_id: Annotated[int | None, Query(gt=0)] = None,
) -> list[InventoryRow]:
    statement = (
        select(MedicineBatch)
        .options(selectinload(MedicineBatch.medicine))
        .where(MedicineBatch.quantity_remaining > 0)
        .order_by(MedicineBatch.medicine_id, MedicineBatch.expiry_date)
    )
    if threshold is not None:
        statement = statement.where(MedicineBatch.quantity_remaining <= threshold)
    if medicine_id is not None:
        statement = statement.where(MedicineBatch.medicine_id == medicine_id)
    result = await session.execute(statement)
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


@router.get("/api/v1/expiry/expiring", response_model=list[ExpiryRow])
async def list_expiring_batches(
    _: ManagerOrPharmacistUser,
    session: DbSession,
    within_days: Annotated[int, Query(ge=0, le=3650)],
) -> list[ExpiryRow]:
    today = date.today()
    until = today + timedelta(days=within_days)
    result = await session.execute(
        select(MedicineBatch)
        .options(selectinload(MedicineBatch.medicine))
        .where(
            MedicineBatch.quantity_remaining > 0,
            MedicineBatch.expiry_date >= today,
            MedicineBatch.expiry_date <= until,
        )
        .order_by(MedicineBatch.expiry_date)
    )
    rows: list[ExpiryRow] = []
    for batch in result.scalars().all():
        rows.append(
            ExpiryRow(
                batch_id=batch.id,
                batch_code=batch.code,
                medicine_id=batch.medicine_id,
                medicine_code=batch.medicine.code,
                medicine_name=batch.medicine.name,
                quantity_remaining=batch.quantity_remaining,
                expiry_date=batch.expiry_date,
                selling_price=batch.selling_price,
                days_remaining=(batch.expiry_date - today).days,
                status="EXPIRING",
            )
        )
    return rows


@router.get("/api/v1/expiry/expired", response_model=list[ExpiryRow])
async def list_expired_batches(_: ManagerOrPharmacistUser, session: DbSession) -> list[ExpiryRow]:
    today = date.today()
    result = await session.execute(
        select(MedicineBatch)
        .options(selectinload(MedicineBatch.medicine))
        .where(MedicineBatch.quantity_remaining > 0, MedicineBatch.expiry_date < today)
        .order_by(MedicineBatch.expiry_date)
    )
    return [
        ExpiryRow(
            batch_id=batch.id,
            batch_code=batch.code,
            medicine_id=batch.medicine_id,
            medicine_code=batch.medicine.code,
            medicine_name=batch.medicine.name,
            quantity_remaining=batch.quantity_remaining,
            expiry_date=batch.expiry_date,
            selling_price=batch.selling_price,
            days_remaining=(batch.expiry_date - today).days,
            status="EXPIRED",
        )
        for batch in result.scalars().all()
    ]


@router.get("/api/v1/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    _: ManagerUser,
    session: DbSession,
    invoice_status: Annotated[str | None, Query(alias="status")] = None,
) -> list[InvoiceResponse]:
    statement = (
        select(Invoice)
        .options(
            selectinload(Invoice.items).selectinload(InvoiceItem.batch),
            selectinload(Invoice.items).selectinload(InvoiceItem.medicine),
        )
        .order_by(Invoice.id.desc())
    )
    if invoice_status is not None:
        statement = statement.where(Invoice.status == invoice_status.upper())
    result = await session.execute(statement)
    return [_invoice_response(invoice) for invoice in result.scalars().unique().all()]


@router.post("/api/v1/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    payload: InvoiceCreate,
    user: ManagerUser,
    session: DbSession,
) -> InvoiceResponse:
    duplicate = await session.execute(select(Invoice.id).where(Invoice.code == payload.code))
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Invoice code already exists", code="invoice_code_exists")

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
        raise HTTPException(status_code=404, detail="One or more medicine batches were not found")
    for batch_id, quantity in requested.items():
        if batches[batch_id].quantity_remaining < quantity:
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


@router.post("/api/v1/invoices/{invoice_id}/finalize", response_model=InvoiceResponse)
async def finalize_invoice(invoice_id: int, _: ManagerUser, session: DbSession) -> InvoiceResponse:
    invoice = await _load_invoice(session, invoice_id)
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


@router.post("/api/v1/invoices/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(invoice_id: int, _: ManagerUser, session: DbSession) -> InvoiceResponse:
    invoice = await _load_invoice(session, invoice_id)
    if invoice.status != "DRAFT":
        raise ApplicationConflict(
            "Only draft invoices can be cancelled without a stock-return rule",
            code="invoice_cancel_requires_draft",
        )
    invoice.status = "CANCELLED"
    await session.commit()
    return _invoice_response(await _load_invoice(session, invoice.id))


@router.get("/api/v1/reports/summary", response_model=ReportSummaryResponse)
async def report_summary(
    _: ManagerUser,
    session: DbSession,
    from_date: date | None = None,
    to_date: date | None = None,
    expiry_within_days: Annotated[int | None, Query(ge=0, le=3650)] = None,
) -> ReportSummaryResponse:
    invoice_filters = [Invoice.status == "FINALIZED"]
    if from_date is not None:
        invoice_filters.append(Invoice.created_at >= datetime.combine(from_date, time.min, tzinfo=UTC))
    if to_date is not None:
        invoice_filters.append(Invoice.created_at < datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=UTC))
    revenue_result = await session.execute(
        select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.total_amount), 0)).where(*invoice_filters)
    )
    finalized_count, revenue = revenue_result.one()

    inventory_units = await session.scalar(select(func.coalesce(func.sum(MedicineBatch.quantity_remaining), 0)))
    today = date.today()
    expired_lots = await session.scalar(
        select(func.count(MedicineBatch.id)).where(
            MedicineBatch.quantity_remaining > 0,
            MedicineBatch.expiry_date < today,
        )
    )
    expiring_lots: int | None = None
    if expiry_within_days is not None:
        until = today + timedelta(days=expiry_within_days)
        expiring_lots = await session.scalar(
            select(func.count(MedicineBatch.id)).where(
                MedicineBatch.quantity_remaining > 0,
                MedicineBatch.expiry_date >= today,
                MedicineBatch.expiry_date <= until,
            )
        )

    return ReportSummaryResponse(
        finalized_invoice_count=int(finalized_count or 0),
        revenue=Decimal(revenue or 0),
        inventory_units=int(inventory_units or 0),
        expired_lots=int(expired_lots or 0),
        expiring_lots=int(expiring_lots) if expiring_lots is not None else None,
    )


@router.get("/api/v1/lookup/medicines/advanced", response_model=list[AdvancedMedicineLookupResponse])
async def advanced_medicine_lookup(
    _: ManagerOrPharmacistUser,
    session: DbSession,
    q: Annotated[str | None, Query(max_length=255)] = None,
    group_id: Annotated[int | None, Query(gt=0)] = None,
    unit_id: Annotated[int | None, Query(gt=0)] = None,
    supplier_id: Annotated[int | None, Query(gt=0)] = None,
    expiry_before: date | None = None,
) -> list[AdvancedMedicineLookupResponse]:
    batch_filters = [MedicineBatch.medicine_id == Medicine.id]
    if supplier_id is not None:
        batch_filters.append(MedicineBatch.supplier_id == supplier_id)
    if expiry_before is not None:
        batch_filters.append(MedicineBatch.expiry_date <= expiry_before)

    available_quantity = select(func.coalesce(func.sum(MedicineBatch.quantity_remaining), 0)).where(*batch_filters).scalar_subquery()
    min_price = select(func.min(MedicineBatch.selling_price)).where(*batch_filters, MedicineBatch.quantity_remaining > 0).scalar_subquery()
    max_price = select(func.max(MedicineBatch.selling_price)).where(*batch_filters, MedicineBatch.quantity_remaining > 0).scalar_subquery()
    nearest_expiry = select(func.min(MedicineBatch.expiry_date)).where(*batch_filters, MedicineBatch.quantity_remaining > 0).scalar_subquery()

    statement = (
        select(Medicine, available_quantity, min_price, max_price, nearest_expiry)
        .options(selectinload(Medicine.group), selectinload(Medicine.unit))
        .order_by(Medicine.name)
    )
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        statement = statement.where(or_(Medicine.code.ilike(pattern), Medicine.name.ilike(pattern)))
    if group_id is not None:
        statement = statement.where(Medicine.group_id == group_id)
    if unit_id is not None:
        statement = statement.where(Medicine.unit_id == unit_id)
    if supplier_id is not None or expiry_before is not None:
        statement = statement.where(available_quantity > 0)

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


def _account_response(user: User) -> AccountResponse:
    return AccountResponse(
        id=user.id,
        username=user.username,
        role=user.role.name,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def _load_account(session: AsyncSession, user_id: int) -> User:
    result = await session.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="User not found")
    return account


async def _revoke_refresh_tokens(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )


@router.get("/api/v1/admin/users", response_model=list[AccountResponse])
async def list_accounts(_: ManagerUser, session: DbSession) -> list[AccountResponse]:
    result = await session.execute(select(User).options(selectinload(User.role)).order_by(User.id))
    return [_account_response(user) for user in result.scalars().all()]


@router.post("/api/v1/admin/users", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(payload: AccountCreate, _: ManagerUser, session: DbSession) -> AccountResponse:
    duplicate = await session.execute(select(User.id).where(User.username == payload.username))
    if duplicate.scalar_one_or_none() is not None:
        raise ApplicationConflict("Username already exists", code="username_exists")
    role_result = await session.execute(select(Role).where(Role.name == payload.role))
    role = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=422, detail="Unsupported role")
    account = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role_id=role.id,
        is_active=True,
    )
    session.add(account)
    await session.commit()
    return _account_response(await _load_account(session, account.id))


@router.patch("/api/v1/admin/users/{user_id}/role", response_model=AccountResponse)
async def change_account_role(
    user_id: int,
    payload: AccountRoleUpdate,
    manager: ManagerUser,
    session: DbSession,
) -> AccountResponse:
    account = await _load_account(session, user_id)
    if account.id == manager.id and payload.role != "MANAGER":
        raise ApplicationConflict("Manager cannot demote own active session", code="self_demotion_forbidden")
    role_result = await session.execute(select(Role).where(Role.name == payload.role))
    role = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=422, detail="Unsupported role")
    account.role_id = role.id
    await _revoke_refresh_tokens(session, account.id)
    await session.commit()
    return _account_response(await _load_account(session, account.id))


@router.patch("/api/v1/admin/users/{user_id}/active", response_model=AccountResponse)
async def change_account_active(
    user_id: int,
    payload: AccountActiveUpdate,
    manager: ManagerUser,
    session: DbSession,
) -> AccountResponse:
    account = await _load_account(session, user_id)
    if account.id == manager.id and not payload.is_active:
        raise ApplicationConflict("Manager cannot deactivate own active session", code="self_deactivation_forbidden")
    account.is_active = payload.is_active
    if not payload.is_active:
        await _revoke_refresh_tokens(session, account.id)
    await session.commit()
    return _account_response(await _load_account(session, account.id))


@router.post("/api/v1/admin/users/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_account_password(
    user_id: int,
    payload: AccountPasswordReset,
    _: ManagerUser,
    session: DbSession,
) -> None:
    account = await _load_account(session, user_id)
    account.password_hash = hash_password(payload.password)
    await _revoke_refresh_tokens(session, account.id)
    await session.commit()
