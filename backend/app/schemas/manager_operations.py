from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RoleName = Literal["MANAGER", "PHARMACIST", "CUSTOMER"]


class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=500)
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value


class SupplierUpdate(SupplierCreate):
    pass


class SupplierResponse(SupplierCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class BatchCreate(BaseModel):
    code: str = Field(min_length=1, max_length=100)
    medicine_id: int = Field(gt=0)
    supplier_id: int = Field(gt=0)
    quantity_received: int = Field(gt=0)
    received_date: date
    expiry_date: date
    purchase_price: Decimal = Field(ge=0)
    selling_price: Decimal = Field(ge=0)

    @field_validator("code")
    @classmethod
    def strip_code(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("code must not be blank")
        return value


class BatchUpdate(BatchCreate):
    pass


class BatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    medicine_id: int
    medicine_name: str
    supplier_id: int
    supplier_name: str
    quantity_received: int
    quantity_remaining: int
    received_date: date
    expiry_date: date
    purchase_price: Decimal
    selling_price: Decimal
    created_at: datetime
    updated_at: datetime


class InvoiceItemCreate(BaseModel):
    batch_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class InvoiceCreate(BaseModel):
    code: str = Field(min_length=1, max_length=100)
    items: list[InvoiceItemCreate] = Field(min_length=1)

    @field_validator("code")
    @classmethod
    def strip_code(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("code must not be blank")
        return value


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    medicine_id: int
    medicine_name: str
    batch_id: int
    batch_code: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class InvoiceResponse(BaseModel):
    id: int
    code: str
    status: str
    total_amount: Decimal
    created_by_user_id: int
    finalized_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[InvoiceItemResponse]


class InventoryRow(BaseModel):
    batch_id: int
    batch_code: str
    medicine_id: int
    medicine_code: str
    medicine_name: str
    quantity_remaining: int
    expiry_date: date
    selling_price: Decimal


class ExpiryRow(InventoryRow):
    days_remaining: int
    status: str


class ReportSummaryResponse(BaseModel):
    finalized_invoice_count: int
    revenue: Decimal
    inventory_units: int
    expired_lots: int
    expiring_lots: int | None


class AdvancedMedicineLookupResponse(BaseModel):
    medicine_id: int
    code: str
    name: str
    group_name: str
    unit_name: str
    available_quantity: int
    min_selling_price: Decimal | None
    max_selling_price: Decimal | None
    nearest_expiry: date | None


class AccountCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=256)
    role: RoleName


class AccountResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AccountRoleUpdate(BaseModel):
    role: RoleName


class AccountActiveUpdate(BaseModel):
    is_active: bool


class AccountPasswordReset(BaseModel):
    password: str = Field(min_length=8, max_length=256)
