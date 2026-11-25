"""
Rekha — Authentication API
Endpoints: register, login, refresh, logout, /me
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, field_validator
from bson import ObjectId

import app.database as db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    serialize_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Request / Response Schemas ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "teacher"          # teacher | student | tutor | admin
    institution_name: str | None = None

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name cannot be blank.")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        allowed = {"teacher", "student", "tutor", "admin"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(allowed)}")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    """Register a new user account."""
    # Check email uniqueness
    existing = await db.users().find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "full_name": payload.full_name,
        "email": payload.email.lower(),
        "hashed_password": hash_password(payload.password),
        "role": payload.role,
        "institution_id": None,
        "institution_name": payload.institution_name,
        "avatar_url": None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.users().insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    access_token = create_access_token({"sub": str(result.inserted_id)})
    refresh_token = create_refresh_token({"sub": str(result.inserted_id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": serialize_user(user_doc),
    }


@router.post("/login")
async def login(payload: LoginRequest):
    """Login with email and password."""
    user = await db.users().find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact your administrator.",
        )

    access_token = create_access_token({"sub": str(user["_id"])})
    refresh_token = create_refresh_token({"sub": str(user["_id"])})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.post("/refresh")
async def refresh_token(payload: RefreshRequest):
    """Exchange a valid refresh token for a new access token."""
    try:
        token_data = decode_token(payload.refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    if token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required.",
        )

    user_id = token_data.get("sub")
    user = await db.users().find_one({"_id": ObjectId(user_id), "is_active": True})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    access_token = create_access_token({"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return serialize_user(current_user)


@router.put("/me")
async def update_me(
    payload: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update the authenticated user's profile."""
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if payload.full_name is not None:
        updates["full_name"] = payload.full_name.strip()
    if payload.avatar_url is not None:
        updates["avatar_url"] = payload.avatar_url

    await db.users().update_one(
        {"_id": current_user["_id"]},
        {"$set": updates},
    )

    updated = await db.users().find_one({"_id": current_user["_id"]})
    return serialize_user(updated)

