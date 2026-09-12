from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PharmacistDashboardResponse(BaseModel):
    medicine_count: int
    inventory_units: int
    low_stock_lots: int
    expiring_lots: int
    expired_lots: int
    finalized_invoice_count: int
    revenue: Decimal


class PharmacistProfileResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
