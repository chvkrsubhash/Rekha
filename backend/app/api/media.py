"""
Rekha — Media Upload & Asset Management API
Supports local storage and optional Cloudinary.
"""

import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from bson import ObjectId

from app.config import settings
import app.database as db
from app.core.security import get_current_user

router = APIRouter(prefix="/media", tags=["Media"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if file.content_type not in settings.allowed_upload_types_list:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}",
        )

    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    now = datetime.now(timezone.utc)
    asset_doc = {
        "user_id": current_user["_id"],
        "filename": file.filename,
        "stored_name": filename,
        "content_type": file.content_type,
        "size_bytes": len(content),
        "url": f"/uploads/{filename}",
        "created_at": now,
    }
    res = await db.media_assets().insert_one(asset_doc)
    return {
        "id": str(res.inserted_id),
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(content),
        "url": asset_doc["url"],
    }


@router.get("/")
async def list_media(current_user: dict = Depends(get_current_user)):
    cursor = db.media_assets().find({"user_id": current_user["_id"]}, sort=[("created_at", -1)], limit=50)
    items = []
    async for item in cursor:
        items.append({
            "id": str(item["_id"]),
            "filename": item["filename"],
            "content_type": item["content_type"],
            "url": item["url"],
            "created_at": item["created_at"].isoformat(),
        })
    return items


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(asset_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.media_assets().find_one({"_id": ObjectId(asset_id), "user_id": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Media asset not found.")
    path = os.path.join(UPLOAD_DIR, doc["stored_name"])
    if os.path.exists(path):
        os.remove(path)
    await db.media_assets().delete_one({"_id": doc["_id"]})

