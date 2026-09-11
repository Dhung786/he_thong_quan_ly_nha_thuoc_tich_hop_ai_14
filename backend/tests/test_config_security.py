import pytest
from pydantic import ValidationError

from app.core.config import Settings

SEED_ENV_VARS = (
    "SEED_MANAGER_USERNAME",
    "SEED_MANAGER_PASSWORD",
    "SEED_PHARMACIST_USERNAME",
    "SEED_PHARMACIST_PASSWORD",
    "SEED_CUSTOMER_USERNAME",
    "SEED_CUSTOMER_PASSWORD",
)


def clear_seed_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in SEED_ENV_VARS:
        monkeypatch.delenv(name, raising=False)


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
        {"seed_manager_username": "manager-only"},
        {"seed_manager_password": "password-only"},
        {"seed_pharmacist_username": "pharmacist-only"},
        {"seed_pharmacist_password": "password-only"},
        {"seed_customer_username": "customer-only"},
        {"seed_customer_password": "password-only"},
    ],
)
def test_seed_credentials_must_be_configured_in_pairs(
    kwargs: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_seed_environment(monkeypatch)
    with pytest.raises(ValidationError):
        Settings(**kwargs)


def test_all_three_seed_role_pairs_are_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    clear_seed_environment(monkeypatch)
    settings = Settings(
        seed_manager_username="manager",
        seed_manager_password="manager-password",
        seed_pharmacist_username="pharmacist",
        seed_pharmacist_password="pharmacist-password",
        seed_customer_username="customer",
        seed_customer_password="customer-password",
    )

    assert settings.seed_manager_username == "manager"
    assert settings.seed_pharmacist_username == "pharmacist"
    assert settings.seed_customer_username == "customer"
