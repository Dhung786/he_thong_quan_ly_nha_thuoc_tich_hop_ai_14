from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_password_hash_round_trip() -> None:
    password = "ExamplePassword-123"
    hashed = hash_password(password)
    assert hashed != password
    assert hashed.startswith("$argon2")
    assert verify_password(password, hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_round_trip() -> None:
    token = create_access_token(subject="user-1", role="ADMIN")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-1"
    assert payload["role"] == "ADMIN"
    assert payload["type"] == "access"


def test_refresh_token_is_opaque_and_hashable() -> None:
    token = generate_refresh_token()
    assert len(token) >= 32
    assert hash_refresh_token(token) == hash_refresh_token(token)
    assert hash_refresh_token(token) != token
