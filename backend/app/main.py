from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.auth import router as auth_router
from app.api.cashier import router as cashier_router
from app.api.catalog import router as catalog_router
from app.api.manager_ai import router as manager_ai_router
from app.api.manager_operations import router as manager_operations_router
from app.api.medicine_lookup import router as medicine_lookup_router
from app.core.config import settings
from app.core.database import engine
from app.core.errors import ApplicationConflict
from app.core.logging import configure_logging, get_logger
from app.core.middleware import CorrelationIdMiddleware
from app.schemas.common import HealthResponse, ServiceStatusResponse
from app.services.ai_provider import provider_is_configured

configure_logging()
application_logger = get_logger("application")

app = FastAPI(
    title=settings.app_name,
    version="0.6.0",
    description=(
        "API for the Group 14 pharmacy management system with AI integration. "
        "Supports manager, pharmacist and cashier operational workflows."
    ),
)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(medicine_lookup_router)
app.include_router(manager_operations_router)
app.include_router(manager_ai_router)
app.include_router(cashier_router)


def _correlation_id(request: Request) -> str:
    value = getattr(request.state, "correlation_id", "unavailable")
    return value if isinstance(value, str) else "unavailable"


def _http_error_public_values(status_code: int) -> tuple[str, str]:
    values = {
        401: ("unauthorized", "Invalid or expired authentication"),
        403: ("forbidden", "Insufficient permissions"),
        404: ("not_found", "Resource not found"),
        405: ("method_not_allowed", "Method not allowed"),
        502: ("bad_gateway", "AI provider request failed"),
        503: ("service_unavailable", "Requested service is not configured or unavailable"),
    }
    return values.get(status_code, ("http_error", "Request failed"))


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    correlation_id = _correlation_id(request)
    safe_errors = [
        {
            "location": [str(part) for part in error.get("loc", ())],
            "type": str(error.get("type", "validation_error")),
        }
        for error in exc.errors()
    ]

    application_logger.warning(
        "Request validation failed",
        extra={
            "event": "request_validation_failed",
            "correlation_id": correlation_id,
            "path": request.url.path,
            "error_type": type(exc).__name__,
        },
    )

    return JSONResponse(
        status_code=422,
        headers={"X-Correlation-ID": correlation_id},
        content={
            "error": "validation_error",
            "message": "Request validation failed",
            "correlation_id": correlation_id,
            "details": safe_errors,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    correlation_id = _correlation_id(request)
    error_code, public_message = _http_error_public_values(exc.status_code)
    headers = dict(exc.headers or {})
    headers["X-Correlation-ID"] = correlation_id

    application_logger.warning(
        "HTTP request rejected",
        extra={
            "event": "http_request_rejected",
            "correlation_id": correlation_id,
            "path": request.url.path,
            "status_code": exc.status_code,
            "error_code": error_code,
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content={
            "error": error_code,
            "message": public_message,
            "correlation_id": correlation_id,
        },
    )


@app.exception_handler(ApplicationConflict)
async def application_conflict_handler(
    request: Request,
    exc: ApplicationConflict,
) -> JSONResponse:
    correlation_id = _correlation_id(request)
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
    correlation_id = _correlation_id(request)
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


@app.get("/api/v1/status", response_model=ServiceStatusResponse)
async def status() -> ServiceStatusResponse:
    return ServiceStatusResponse(service="backend", status="ok")


@app.get(
    "/health",
    response_model=HealthResponse,
    responses={
        503: {"model": HealthResponse, "description": "Core dependency is unavailable"},
    },
)
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
            "ai": "configured" if provider_is_configured() else "not_configured",
        },
    )
