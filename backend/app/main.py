from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.core.middleware import CorrelationIdMiddleware

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", "unavailable")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "Unexpected internal error",
            "correlation_id": correlation_id,
        },
    )


@app.get("/api/v1/status")
async def status() -> dict[str, str]:
    return {"service": "backend", "status": "ok"}


@app.get("/health")
async def health() -> JSONResponse:
    database_status = "ok"
    status_code = 200
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception:
        database_status = "unavailable"
        status_code = 503

    return JSONResponse(
        status_code=status_code,
        content={
            "core": "ok",
            "database": database_status,
            "ai": "not_configured" if settings.ai_provider == "disabled" else "configured",
        },
    )
