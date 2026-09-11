from collections.abc import Collection

from app.core.errors import ApplicationConflict


def require_allowed_state(
    current_state: str,
    *,
    allowed_states: Collection[str],
) -> None:
    """Reject a command when the current state is outside its allowed set.

    The helper is intentionally domain-neutral. Each business service must
    supply the authoritative allowed states from approved requirements.
    """

    if current_state not in allowed_states:
        raise ApplicationConflict(
            "Operation is not allowed in the current state",
            code="state_conflict",
        )
