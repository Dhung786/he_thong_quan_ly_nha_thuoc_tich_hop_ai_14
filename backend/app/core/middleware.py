from time import perf_counter
from uuid import UUID, uuid4

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.logging import bind_correlation_id, get_logger, reset_correlation_id

request_logger = get_logger("request")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get("X-Correlation-ID")
        correlation_id = self._normalize_or_create(incoming)
        request.state.correlation_id = correlation_id
        token = bind_correlation_id(correlation_id)
        started_at = perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = round((perf_counter() - started_at) * 1000, 3)
            request_logger.error(
                "HTTP request failed",
                extra={
                    "event": "http_request_failed",
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                    "error_type": type(exc).__name__,
                },
            )
            raise
        else:
            duration_ms = round((perf_counter() - started_at) * 1000, 3)
            response.headers["X-Correlation-ID"] = correlation_id
            request_logger.info(
                "HTTP request completed",
                extra={
                    "event": "http_request_completed",
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
            return response
        finally:
            reset_correlation_id(token)

    @staticmethod
    def _normalize_or_create(value: str | None) -> str:
        if value:
            try:
                return str(UUID(value))
            except ValueError:
                pass
        return str(uuid4())
