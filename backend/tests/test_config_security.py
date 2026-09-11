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
