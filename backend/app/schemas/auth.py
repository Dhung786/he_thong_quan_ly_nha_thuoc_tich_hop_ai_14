from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(
        min_length=1,
        max_length=100,
        examples=["admin"],
    )
    password: str = Field(
        min_length=1,
        max_length=256,
        json_schema_extra={"writeOnly": True},
    )


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(
        min_length=32,
        max_length=2048,
        json_schema_extra={"writeOnly": True},
    )


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class CurrentUserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
