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
    app_name: str = "Pharmacy AI - Group 14"
    app_timezone: str = "Asia/Ho_Chi_Minh"
    database_url: str = "postgresql+asyncpg://warehouse:warehouse@localhost:5432/warehouse_ai"
    jwt_secret: str = "INSECURE_DEV_ONLY_CHANGE_ME"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    seed_manager_username: str | None = None
    seed_manager_password: str | None = None
    seed_pharmacist_username: str | None = None
    seed_pharmacist_password: str | None = None
    seed_customer_username: str | None = None
    seed_customer_password: str | None = None
    cors_origins: list[str] = ["http://localhost:5173"]

    ai_provider: str = "demo"
    ai_api_key: str | None = None
    ai_base_url: str | None = None
    ai_model: str | None = None
    ai_timeout_seconds: float = 30.0
    ai_max_tokens: int = 700

    @model_validator(mode="after")
    def validate_security_and_seed_configuration(self) -> Self:
        environment = self.app_env.strip().lower()
        if environment == "production" and self.jwt_secret in INSECURE_JWT_PLACEHOLDERS:
            raise ValueError("Production JWT_SECRET must not use a development placeholder")

        seed_pairs = (
            ("MANAGER", self.seed_manager_username, self.seed_manager_password),
            ("PHARMACIST", self.seed_pharmacist_username, self.seed_pharmacist_password),
            ("CUSTOMER", self.seed_customer_username, self.seed_customer_password),
        )
        for role_name, username, password in seed_pairs:
            if bool(username) != bool(password):
                raise ValueError(
                    f"Seed username/password for {role_name} must be provided together"
                )

        provider = self.ai_provider.strip().lower()
        if provider not in {"disabled", "demo", "openai_compatible"}:
            raise ValueError(
                "AI_PROVIDER must be disabled, demo or openai_compatible"
            )
        if environment == "production" and provider == "demo":
            raise ValueError("Production cannot use the demo AI provider")
        if provider == "openai_compatible" and environment == "production":
            if not (self.ai_api_key and self.ai_base_url and self.ai_model):
                raise ValueError(
                    "Production AI provider requires AI_API_KEY, AI_BASE_URL and AI_MODEL"
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
