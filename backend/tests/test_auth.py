"""
Rekha — Authentication & Security Unit Tests
"""

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_password_hashing_and_verification():
    raw = "RekhaClassroom#2026"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_access_and_refresh_tokens():
    user_id = "65f000000000000000000001"
    access = create_access_token({"sub": user_id})
    refresh = create_refresh_token({"sub": user_id})

    access_payload = decode_token(access)
    refresh_payload = decode_token(refresh)

    assert access_payload["sub"] == user_id
    assert access_payload["type"] == "access"
    assert refresh_payload["sub"] == user_id
    assert refresh_payload["type"] == "refresh"

