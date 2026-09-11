import pytest

from app.core.errors import ApplicationConflict
from app.services.state_guard import require_allowed_state


def test_state_guard_allows_authorized_state() -> None:
    require_allowed_state("DRAFT", allowed_states={"DRAFT"})


def test_state_guard_rejects_disallowed_state() -> None:
    with pytest.raises(ApplicationConflict) as exc_info:
        require_allowed_state("CONFIRMED", allowed_states={"DRAFT"})

    assert exc_info.value.code == "state_conflict"
    assert exc_info.value.public_message == "Operation is not allowed in the current state"
