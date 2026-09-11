from __future__ import annotations

from contextvars import ContextVar, Token
from datetime import UTC, datetime
import json
import logging
import sys
from typing import Any


APP_LOGGER_NAME = "warehouse_ai"
_correlation_id: ContextVar[str | None] = ContextVar("correlation_id", default=None)

_ALLOWED_EXTRA_FIELDS = (
    "event",
    "correlation_id",
    "method",
    "path",
    "status_code",
    "duration_ms",
    "error_type",
    "error_code",
    "component",
    "provider_status",
)


class JsonFormatter(logging.Formatter):
    """Emit a small, explicit JSON schema instead of arbitrary LogRecord extras."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        contextual_correlation_id = _correlation_id.get()
        for field in _ALLOWED_EXTRA_FIELDS:
            value = getattr(record, field, None)
            if field == "correlation_id" and value is None:
                value = contextual_correlation_id
            if value is not None:
                payload[field] = value

        return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def configure_logging() -> logging.Logger:
    """Configure the application logger exactly once with JSON stdout output."""

    logger = logging.getLogger(APP_LOGGER_NAME)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not any(getattr(handler, "_warehouse_ai_json", False) for handler in logger.handlers):
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        handler._warehouse_ai_json = True  # type: ignore[attr-defined]
        logger.addHandler(handler)

    return logger


def get_logger(component: str) -> logging.Logger:
    return logging.getLogger(f"{APP_LOGGER_NAME}.{component}")


def bind_correlation_id(value: str) -> Token[str | None]:
    return _correlation_id.set(value)


def reset_correlation_id(token: Token[str | None]) -> None:
    _correlation_id.reset(token)
