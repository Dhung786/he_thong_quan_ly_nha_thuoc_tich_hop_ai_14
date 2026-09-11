from functools import lru_cache
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_JWT_PLACEHOLDERS = frozenset(
    {
        "INSECURE_DEV_ONLY_CHANGE_ME",
        "CHANGE_ME_WITH_A_LONG_RANDOM_VALUE",
    }
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_name: str = "Warehouse AI"
    app_timezone: str = "Asia/Ho_Chi_Minh"
    database_url: str = "postgresql+asyncpg://warehouse:warehouse@localhost:5432/warehouse_ai"
    jwt_secret: str = "INSECURE_DEV_ONLY_CHANGE_ME"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    seed_admin_username: str | None = None
    seed_admin_password: str | None = None
    seed_warehouse_keeper_username: str | None = None
    seed_warehouse_keeper_password: str | None = None
    seed_accountant_username: str | None = None
    seed_accountant_password: str | None = None
    cors_origins: list[str] = ["http://localhost:5173"]
    ai_provider: str = "disabled"

    @model_validator(mode="after")
    def validate_security_and_seed_configuration(self) -> Self:
        if (
            self.app_env.strip().lower() == "production"
            and self.jwt_secret in INSECURE_JWT_PLACEHOLDERS
        ):
            raise ValueError("Production JWT_SECRET must not use a development placeholder")

        seed_pairs = (
            ("ADMIN", self.seed_admin_username, self.seed_admin_password),
            (
                "WAREHOUSE_KEEPER",
                self.seed_warehouse_keeper_username,
                self.seed_warehouse_keeper_password,
            ),
            ("ACCOUNTANT", self.seed_accountant_username, self.seed_accountant_password),
        )
        for role_name, username, password in seed_pairs:
            if bool(username) != bool(password):
                raise ValueError(
                    f"Seed username/password for {role_name} must be provided together"
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
