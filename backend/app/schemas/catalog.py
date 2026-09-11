from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NamedCatalogCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value


class NamedCatalogUpdate(NamedCatalogCreate):
    pass


class MedicineGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    updated_at: datetime


class UnitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be blank")
        return value


class UnitUpdate(UnitCreate):
    pass


class UnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    updated_at: datetime


class MedicineCreate(BaseModel):
    code: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    group_id: int = Field(gt=0)
    unit_id: int = Field(gt=0)

    @field_validator("code", "name")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("value must not be blank")
        return value


class MedicineUpdate(MedicineCreate):
    pass


class MedicineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    group_id: int
    unit_id: int
    group_name: str
    unit_name: str
    created_at: datetime
    updated_at: datetime
