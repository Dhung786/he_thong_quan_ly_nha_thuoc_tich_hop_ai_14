from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_round_trip() -> None:
    password = "ExamplePassword-123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_round_trip() -> None:
    token = create_access_token(subject="user-1", role="ADMIN")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-1"
    assert payload["role"] == "ADMIN"
