from pydantic import BaseModel, Field


class AIStatusResponse(BaseModel):
    provider: str
    model: str | None
    configured: bool
    scope_guard: str


class MedicineSummaryRequest(BaseModel):
    medicine_id: int = Field(gt=0)


class ExpiryReportRequest(BaseModel):
    warning_days: int = Field(default=30, ge=1, le=365)


class InternalChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=1500)


class AITextResponse(BaseModel):
    answer: str
    provider: str
    model: str | None
    scope_guard: str
    disclaimer: str
