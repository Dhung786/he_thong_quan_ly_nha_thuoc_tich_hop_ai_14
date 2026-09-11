import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_development_allows_explicit_dev_placeholder() -> None:
    settings = Settings(
        app_env="development",
        jwt_secret="INSECURE_DEV_ONLY_CHANGE_ME",
    )
    assert settings.app_env == "development"


@pytest.mark.parametrize(
    "placeholder",
    [
        "INSECURE_DEV_ONLY_CHANGE_ME",
        "CHANGE_ME_WITH_A_LONG_RANDOM_VALUE",
    ],
)
def test_production_rejects_known_jwt_placeholders(placeholder: str) -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="production", jwt_secret=placeholder)


def test_production_accepts_non_placeholder_value() -> None:
    settings = Settings(
        app_env="production",
        jwt_secret="TEST_ONLY_NON_PLACEHOLDER_JWT_VALUE",
    )
    assert settings.app_env == "production"


@pytest.mark.parametrize(
    "kwargs",
    [
        {"seed_admin_username": "admin-only"},
        {"seed_admin_password": "password-only"},
        {"seed_warehouse_keeper_username": "keeper-only"},
        {"seed_warehouse_keeper_password": "password-only"},
        {"seed_accountant_username": "accountant-only"},
        {"seed_accountant_password": "password-only"},
    ],
)
def test_seed_credentials_must_be_configured_in_pairs(kwargs: dict[str, str]) -> None:
    with pytest.raises(ValidationError):
        Settings(**kwargs)


def test_all_three_seed_role_pairs_are_accepted() -> None:
    settings = Settings(
        seed_admin_username="admin",
        seed_admin_password="admin-password",
        seed_warehouse_keeper_username="keeper",
        seed_warehouse_keeper_password="keeper-password",
        seed_accountant_username="accountant",
        seed_accountant_password="accountant-password",
    )

    assert settings.seed_admin_username == "admin"
    assert settings.seed_warehouse_keeper_username == "keeper"
    assert settings.seed_accountant_username == "accountant"
