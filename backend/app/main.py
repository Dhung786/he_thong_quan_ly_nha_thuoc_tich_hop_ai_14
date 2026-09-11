from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.auth import router as auth_router
from app.core.config import settings
from app.core.database import engine
from app.core.errors import ApplicationConflict
from app.core.logging import configure_logging, get_logger
from app.core.middleware import CorrelationIdMiddleware

configure_logging()
application_logger = get_logger("application")

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)


@app.exception_handler(ApplicationConflict)
async def application_conflict_handler(
    request: Request,
    exc: ApplicationConflict,
) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", "unavailable")
    application_logger.warning(
        "Application conflict",
        extra={
            "event": "application_conflict",
            "correlation_id": correlation_id,
            "error_code": exc.code,
            "path": request.url.path,
        },
    )
    return JSONResponse(
        status_code=409,
        headers={"X-Correlation-ID": correlation_id},
        content={
            "error": exc.code,
            "message": exc.public_message,
            "correlation_id": correlation_id,
        },
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", "unavailable")
    application_logger.error(
        "Unexpected internal error",
        extra={
            "event": "unexpected_internal_error",
            "correlation_id": correlation_id,
            "path": request.url.path,
            "error_type": type(exc).__name__,
        },
    )
    return JSONResponse(
        status_code=500,
        headers={"X-Correlation-ID": correlation_id},
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
    migration_status = "unavailable"
    status_code = 200

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
            try:
                result = await connection.execute(text("SELECT version_num FROM alembic_version"))
                migration_status = result.scalar_one_or_none() or "missing"
                if migration_status == "missing":
                    status_code = 503
            except Exception as exc:
                status_code = 503
                application_logger.error(
                    "Migration visibility check failed",
                    extra={
                        "event": "migration_health_failed",
                        "component": "migration",
                        "error_type": type(exc).__name__,
                    },
                )
    except Exception as exc:
        database_status = "unavailable"
        status_code = 503
        application_logger.error(
            "Database health check failed",
            extra={
                "event": "database_health_failed",
                "component": "database",
                "error_type": type(exc).__name__,
            },
        )

    return JSONResponse(
        status_code=status_code,
        content={
            "core": "ok",
            "database": database_status,
            "migration": migration_status,
            "ai": "not_configured" if settings.ai_provider == "disabled" else "configured",
        },
    )
