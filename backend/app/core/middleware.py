from uuid import UUID, uuid4

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get("X-Correlation-ID")
        correlation_id = self._normalize_or_create(incoming)
        request.state.correlation_id = correlation_id
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response

    @staticmethod
    def _normalize_or_create(value: str | None) -> str:
        if value:
            try:
                return str(UUID(value))
            except ValueError:
                pass
        return str(uuid4())
