import asyncio
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.auth import ROLE_NAMES, Role, User
from app.models.catalog import Medicine, MedicineGroup, Unit
from app.models.operational import Invoice, InvoiceItem, MedicineBatch, Supplier
from app.models.system_metadata import SystemMetadata


async def _seed_user(
    session: AsyncSession,
    *,
    role: Role,
    username: str | None,
    password: str | None,
) -> None:
    if not username or not password:
        return

    user_result = await session.execute(select(User).where(User.username == username))
    user: User | None = user_result.scalar_one_or_none()
    if user is None:
        session.add(
            User(
                username=username,
                password_hash=hash_password(password),
                role_id=role.id,
                is_active=True,
            )
        )
        return

    if user.role_id != role.id:
        raise RuntimeError(
            f"Configured seed username '{username}' already has another role"
        )


async def _group(session: AsyncSession, name: str) -> MedicineGroup:
    result = await session.execute(select(MedicineGroup).where(MedicineGroup.name == name))
    item = result.scalar_one_or_none()
    if item is None:
        item = MedicineGroup(name=name)
        session.add(item)
        await session.flush()
    return item


async def _unit(session: AsyncSession, name: str) -> Unit:
    result = await session.execute(select(Unit).where(Unit.name == name))
    item = result.scalar_one_or_none()
    if item is None:
        item = Unit(name=name)
        session.add(item)
        await session.flush()
    return item


async def _medicine(
    session: AsyncSession,
    *,
    code: str,
    name: str,
    group: MedicineGroup,
    unit: Unit,
) -> Medicine:
    result = await session.execute(select(Medicine).where(Medicine.code == code))
    item = result.scalar_one_or_none()
    if item is None:
        item = Medicine(code=code, name=name, group_id=group.id, unit_id=unit.id)
        session.add(item)
        await session.flush()
    return item


async def _supplier(
    session: AsyncSession,
    *,
    name: str,
    phone: str,
    address: str,
) -> Supplier:
    result = await session.execute(select(Supplier).where(Supplier.name == name))
    item = result.scalar_one_or_none()
    if item is None:
        item = Supplier(
            name=name,
            phone=phone,
            address=address,
            notes="[DEMO] Dữ liệu minh họa cho đồ án quản lý nhà thuốc.",
        )
        session.add(item)
        await session.flush()
    return item


async def _batch(
    session: AsyncSession,
    *,
    code: str,
    medicine: Medicine,
    supplier: Supplier,
    quantity: int,
    received_date: date,
    expiry_date: date,
    purchase_price: Decimal,
    selling_price: Decimal,
) -> MedicineBatch:
    result = await session.execute(select(MedicineBatch).where(MedicineBatch.code == code))
    item = result.scalar_one_or_none()
    if item is None:
        item = MedicineBatch(
            code=code,
            medicine_id=medicine.id,
            supplier_id=supplier.id,
            quantity_received=quantity,
            quantity_remaining=quantity,
            received_date=received_date,
            expiry_date=expiry_date,
            purchase_price=purchase_price,
            selling_price=selling_price,
        )
        session.add(item)
        await session.flush()
    return item


async def _demo_invoice(
    session: AsyncSession,
    *,
    code: str,
    manager: User,
    batches: list[MedicineBatch],
    quantities: list[int],
    status: str,
    created_days_ago: int,
) -> None:
    existing = await session.execute(select(Invoice.id).where(Invoice.code == code))
    if existing.scalar_one_or_none() is not None:
        return

    if len(batches) != len(quantities):
        raise RuntimeError("Demo invoice batch/quantity length mismatch")

    if status == "FINALIZED":
        for batch, quantity in zip(batches, quantities, strict=True):
            if batch.quantity_remaining < quantity:
                return

    created_at = datetime.now(UTC) - timedelta(days=created_days_ago)
    total = sum(
        (
            batch.selling_price * quantity
            for batch, quantity in zip(batches, quantities, strict=True)
        ),
        Decimal("0"),
    )
    invoice = Invoice(
        code=code,
        status=status,
        total_amount=total,
        created_by_user_id=manager.id,
        finalized_at=created_at + timedelta(minutes=8) if status == "FINALIZED" else None,
        created_at=created_at,
        updated_at=created_at,
    )
    session.add(invoice)
    await session.flush()

    for batch, quantity in zip(batches, quantities, strict=True):
        line_total = batch.selling_price * quantity
        session.add(
            InvoiceItem(
                invoice_id=invoice.id,
                medicine_id=batch.medicine_id,
                batch_id=batch.id,
                quantity=quantity,
                unit_price=batch.selling_price,
                line_total=line_total,
            )
        )
        if status == "FINALIZED":
            batch.quantity_remaining -= quantity


async def _seed_demo_data(session: AsyncSession, roles: dict[str, Role]) -> None:
    if settings.app_env.strip().lower() == "production":
        return

    group_names = [
        "Giảm đau - Hạ sốt",
        "Kháng sinh",
        "Vitamin & Khoáng chất",
        "Tiêu hóa",
        "Dị ứng",
        "Hô hấp",
        "Tim mạch",
        "Da liễu - Sát khuẩn",
    ]
    unit_names = ["Viên", "Hộp", "Chai", "Tuýp", "Gói", "Lọ"]
    groups = {name: await _group(session, name) for name in group_names}
    units = {name: await _unit(session, name) for name in unit_names}

    medicine_specs = [
        ("DEMO-PARA500", "Paracetamol 500mg", "Giảm đau - Hạ sốt", "Viên", 850, 1500),
        ("DEMO-IBU400", "Ibuprofen 400mg", "Giảm đau - Hạ sốt", "Viên", 1200, 2200),
        ("DEMO-AMOX500", "Amoxicillin 500mg", "Kháng sinh", "Viên", 1800, 3200),
        ("DEMO-CEFA500", "Cephalexin 500mg", "Kháng sinh", "Viên", 2100, 3600),
        ("DEMO-AZI250", "Azithromycin 250mg", "Kháng sinh", "Viên", 4800, 7200),
        ("DEMO-VITC500", "Vitamin C 500mg", "Vitamin & Khoáng chất", "Viên", 900, 1700),
        ("DEMO-VITB1", "Vitamin B1 100mg", "Vitamin & Khoáng chất", "Viên", 700, 1300),
        ("DEMO-ORS", "Oresol bù nước điện giải", "Tiêu hóa", "Gói", 2500, 4500),
        ("DEMO-OME20", "Omeprazole 20mg", "Tiêu hóa", "Viên", 1600, 2800),
        ("DEMO-SMECTA", "Diosmectite 3g", "Tiêu hóa", "Gói", 4200, 6500),
        ("DEMO-LORA10", "Loratadine 10mg", "Dị ứng", "Viên", 1100, 2000),
        ("DEMO-CETI10", "Cetirizine 10mg", "Dị ứng", "Viên", 1000, 1900),
        ("DEMO-SALBU2", "Salbutamol 2mg", "Hô hấp", "Viên", 1300, 2400),
        ("DEMO-ACC200", "Acetylcysteine 200mg", "Hô hấp", "Gói", 3500, 5600),
        ("DEMO-AMLO5", "Amlodipine 5mg", "Tim mạch", "Viên", 950, 1800),
        ("DEMO-LOSA50", "Losartan 50mg", "Tim mạch", "Viên", 1700, 2900),
        ("DEMO-POVI10", "Povidone Iodine 10%", "Da liễu - Sát khuẩn", "Chai", 12000, 18000),
        ("DEMO-CLOTRI", "Clotrimazole cream 1%", "Da liễu - Sát khuẩn", "Tuýp", 14500, 22000),
        ("DEMO-NACL", "Natri Clorid 0.9% 10ml", "Da liễu - Sát khuẩn", "Lọ", 1800, 3500),
        ("DEMO-DAUGIO", "Dầu gió thảo dược", "Da liễu - Sát khuẩn", "Chai", 15000, 24000),
        ("DEMO-PROBIO", "Men vi sinh", "Tiêu hóa", "Gói", 3800, 6200),
        ("DEMO-CAD3", "Calcium + Vitamin D3", "Vitamin & Khoáng chất", "Viên", 2100, 3500),
        ("DEMO-ZINC10", "Kẽm 10mg", "Vitamin & Khoáng chất", "Viên", 1300, 2300),
        ("DEMO-SIROHO", "Siro ho thảo dược 100ml", "Hô hấp", "Chai", 26000, 39000),
    ]

    medicines: dict[str, Medicine] = {}
    prices: dict[str, tuple[Decimal, Decimal]] = {}
    for code, name, group_name, unit_name, purchase_price, selling_price in medicine_specs:
        medicines[code] = await _medicine(
            session,
            code=code,
            name=f"{name} [DEMO]",
            group=groups[group_name],
            unit=units[unit_name],
        )
        prices[code] = (Decimal(purchase_price), Decimal(selling_price))

    supplier_specs = [
        ("Dược An Khang [DEMO]", "0901001001", "Hà Nội"),
        ("Dược Minh Tâm [DEMO]", "0901001002", "Thái Nguyên"),
        ("Dược Phúc Long [DEMO]", "0901001003", "Bắc Ninh"),
        ("Dược Việt Á [DEMO]", "0901001004", "Hải Phòng"),
        ("Dược Thành Công [DEMO]", "0901001005", "Đà Nẵng"),
        ("Dược Hồng Phát [DEMO]", "0901001006", "TP. Hồ Chí Minh"),
        ("Dược Gia Minh [DEMO]", "0901001007", "Hưng Yên"),
        ("Dược Đại Việt [DEMO]", "0901001008", "Nam Định"),
        ("Dược Tân Việt [DEMO]", "0901001009", "Phú Thọ"),
        ("Dược Sao Mai [DEMO]", "0901001010", "Vĩnh Phúc"),
    ]
    suppliers = [
        await _supplier(session, name=name, phone=phone, address=address)
        for name, phone, address in supplier_specs
    ]

    today = date.today()
    expiry_cycle = [-25, 5, 12, 25, 45, 75, 120, 180, 240, 365, 540, 720]
    batch_map: dict[str, MedicineBatch] = {}
    medicine_list = list(medicines.items())
    for index, (medicine_code, medicine) in enumerate(medicine_list, start=1):
        purchase_price, selling_price = prices[medicine_code]
        expiry_days = expiry_cycle[(index - 1) % len(expiry_cycle)]
        code = f"DEMO-LOT-{index:03d}A"
        batch_map[code] = await _batch(
            session,
            code=code,
            medicine=medicine,
            supplier=suppliers[(index - 1) % len(suppliers)],
            quantity=70 + index * 7,
            received_date=today - timedelta(days=210 + index * 2),
            expiry_date=today + timedelta(days=expiry_days),
            purchase_price=purchase_price,
            selling_price=selling_price,
        )

        if index <= 12:
            code_b = f"DEMO-LOT-{index:03d}B"
            batch_map[code_b] = await _batch(
                session,
                code=code_b,
                medicine=medicine,
                supplier=suppliers[index % len(suppliers)],
                quantity=110 + index * 5,
                received_date=today - timedelta(days=90 + index),
                expiry_date=today + timedelta(days=150 + index * 18),
                purchase_price=purchase_price + Decimal("100"),
                selling_price=selling_price + Decimal("200"),
            )

    manager_username = settings.seed_manager_username
    if not manager_username:
        return
    manager_result = await session.execute(select(User).where(User.username == manager_username))
    manager = manager_result.scalar_one_or_none()
    if manager is None or manager.role_id != roles["MANAGER"].id:
        return

    sale_batches = [
        batch
        for batch in batch_map.values()
        if batch.expiry_date >= today + timedelta(days=30)
    ]
    if len(sale_batches) >= 8:
        invoice_statuses = [
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "FINALIZED",
            "DRAFT",
            "DRAFT",
            "DRAFT",
            "CANCELLED",
            "CANCELLED",
            "CANCELLED",
        ]
        for index, invoice_status in enumerate(invoice_statuses, start=1):
            first = sale_batches[(index * 2) % len(sale_batches)]
            second = sale_batches[(index * 2 + 3) % len(sale_batches)]
            await _demo_invoice(
                session,
                code=f"DEMO-HD-{index:03d}",
                manager=manager,
                batches=[first, second],
                quantities=[2 + index % 4, 1 + index % 3],
                status=invoice_status,
                created_days_ago=19 - index,
            )

    metadata_result = await session.execute(
        select(SystemMetadata).where(SystemMetadata.key == "demo_dataset_version")
    )
    demo_metadata = metadata_result.scalar_one_or_none()
    if demo_metadata is None:
        session.add(SystemMetadata(key="demo_dataset_version", value="manager-rich-v1"))
    else:
        demo_metadata.value = "manager-rich-v1"


async def seed() -> None:
    async with SessionLocal() as session:
        roles: dict[str, Role] = {}
        for role_name in ROLE_NAMES:
            role_result = await session.execute(select(Role).where(Role.name == role_name))
            role: Role | None = role_result.scalar_one_or_none()
            if role is None:
                role = Role(name=role_name)
                session.add(role)
                await session.flush()
            roles[role_name] = role

        await _seed_user(
            session,
            role=roles["MANAGER"],
            username=settings.seed_manager_username,
            password=settings.seed_manager_password,
        )
        await _seed_user(
            session,
            role=roles["PHARMACIST"],
            username=settings.seed_pharmacist_username,
            password=settings.seed_pharmacist_password,
        )
        await _seed_user(
            session,
            role=roles["CUSTOMER"],
            username=settings.seed_customer_username,
            password=settings.seed_customer_password,
        )
        await session.flush()

        await _seed_demo_data(session, roles)

        metadata_result = await session.execute(
            select(SystemMetadata).where(SystemMetadata.key == "foundation_version")
        )
        metadata: SystemMetadata | None = metadata_result.scalar_one_or_none()
        if metadata is None:
            session.add(SystemMetadata(key="foundation_version", value="pharmacy-srs-v1"))
        else:
            metadata.value = "pharmacy-srs-v1"
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
