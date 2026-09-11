from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    error: str
    message: str
    correlation_id: str


class ValidationIssue(BaseModel):
    location: list[str]
    type: str


class ValidationErrorResponse(ErrorResponse):
    details: list[ValidationIssue]


class HealthResponse(BaseModel):
    core: str
    database: str
    migration: str
    ai: str


class ServiceStatusResponse(BaseModel):
    service: str = Field(examples=["backend"])
    status: str = Field(examples=["ok"])
