from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

AdminAssignableRole = Literal["MANAGER", "PHARMACIST", "CASHIER"]


class AdminUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=256, json_schema_extra={"writeOnly": True})
    role: AdminAssignableRole

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("username must not be blank")
        return value


class AdminUserRoleUpdate(BaseModel):
    role: AdminAssignableRole


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class AdminPasswordReset(BaseModel):
    password: str = Field(min_length=8, max_length=256, json_schema_extra={"writeOnly": True})


class AdminUserResponse(BaseModel):
    id: int
    username: str
    role: str
    role_label: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminAuditLogResponse(BaseModel):
    id: int
    actor_user_id: int | None
    actor_username: str | None
    event_type: str
    correlation_id: str | None
    details: dict[str, Any]
    created_at: datetime


class AdminSummaryResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    managers: int
    pharmacists: int
    cashiers: int
    audit_events: int
