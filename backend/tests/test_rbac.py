import pytest
from fastapi import HTTPException, status

from app.api.deps import enforce_roles, require_roles
from app.models.auth import Role, User


def make_user(role_name: str) -> User:
    role = Role(id=1, name=role_name)
    user = User(
        id=1,
        username="rbac-test",
        password_hash="unused-in-rbac-test",
        role_id=1,
        is_active=True,
    )
    user.role = role
    return user


def test_enforce_roles_allows_matching_role() -> None:
    user = make_user("MANAGER")
    assert enforce_roles(user, {"MANAGER"}) is user


def test_enforce_roles_returns_403_for_authenticated_wrong_role() -> None:
    user = make_user("CUSTOMER")
    with pytest.raises(HTTPException) as exc_info:
        enforce_roles(user, {"MANAGER"})

    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "Insufficient permissions"


def test_role_guard_rejects_unknown_or_empty_configuration() -> None:
    with pytest.raises(ValueError):
        require_roles()
    with pytest.raises(ValueError):
        require_roles("NOT_A_REAL_ROLE")
