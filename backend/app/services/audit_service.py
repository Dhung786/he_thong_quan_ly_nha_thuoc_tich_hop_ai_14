from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import AuditLog


@dataclass(frozen=True, slots=True)
class AuditEvent:
    """Domain-neutral audit payload for security and future inventory events.

    Stock delta is intentionally represented as text until the approved Phase 1
    baseline defines the inventory quantity type/precision.
    """

    event_type: str
    entity_type: str
    entity_id: str
    actor_user_id: int | None
    correlation_id: str | None
    previous_state: str | None = None
    new_state: str | None = None
    reason: str | None = None
    stock_delta: str | None = None


def record_audit_event(session: AsyncSession, event: AuditEvent) -> AuditLog:
    details: dict[str, str | None] = {
        "entity_type": event.entity_type,
        "entity_id": event.entity_id,
        "previous_state": event.previous_state,
        "new_state": event.new_state,
        "reason": event.reason,
        "stock_delta": event.stock_delta,
    }
    audit_log = AuditLog(
        actor_user_id=event.actor_user_id,
        event_type=event.event_type,
        correlation_id=event.correlation_id,
        details=details,
    )
    session.add(audit_log)
    return audit_log
