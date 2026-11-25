"""
Rekha — Whiteboards API
Full CRUD for whiteboards, pages, and canvas objects.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from bson import ObjectId
from typing import Any

import app.database as db
from app.core.security import get_current_user, get_current_teacher

router = APIRouter(prefix="/whiteboards", tags=["Whiteboards"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def now_utc():
    return datetime.now(timezone.utc)


def serialize_object(obj: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialization."""
    result = {}
    for k, v in obj.items():
        if k == "_id":
            result["id"] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


async def assert_whiteboard_owner(whiteboard_id: str, user_id: ObjectId) -> dict:
    """Load a whiteboard and verify the requesting user owns it."""
    wb = await db.whiteboards().find_one({"_id": ObjectId(whiteboard_id), "is_deleted": {"$ne": True}})
    if not wb:
        raise HTTPException(status_code=404, detail="Whiteboard not found.")
    if wb["teacher_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return wb


# ─── Request Schemas ─────────────────────────────────────────────────────────

class WhiteboardCreate(BaseModel):
    title: str = "Untitled Whiteboard"
    subject: str | None = None
    lesson_id: str | None = None


class WhiteboardUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None


class PageCreate(BaseModel):
    name: str | None = None
    background: str = "white"
    insert_after_page_id: str | None = None


class PageUpdate(BaseModel):
    name: str | None = None
    background: str | None = None
    order: int | None = None


class CanvasObjectCreate(BaseModel):
    object_id: str | None = None          # client-generated UUID if provided
    type: str                              # stroke | shape | text | image | equation | sticky | graph
    x: float = 0
    y: float = 0
    width: float = 100
    height: float = 100
    rotation: float = 0
    z_index: int = 0
    content: dict[str, Any] = {}
    style: dict[str, Any] = {}


class CanvasObjectUpdate(BaseModel):
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    rotation: float | None = None
    z_index: int | None = None
    content: dict[str, Any] | None = None
    style: dict[str, Any] | None = None
    is_locked: bool | None = None


# ─── Whiteboard Endpoints ─────────────────────────────────────────────────────

@router.get("/")
async def list_whiteboards(current_user: dict = Depends(get_current_user)):
    """List the current user's whiteboards."""
    cursor = db.whiteboards().find(
        {"teacher_id": current_user["_id"], "is_deleted": {"$ne": True}},
        sort=[("updated_at", -1)],
        limit=100,
    )
    return [serialize_object(wb) async for wb in cursor]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_whiteboard(
    payload: WhiteboardCreate,
    current_user: dict = Depends(get_current_teacher),
):
    """Create a new whiteboard with one blank page."""
    now = now_utc()
    page_id = str(uuid.uuid4())

    wb_doc = {
        "title": payload.title,
        "subject": payload.subject,
        "lesson_id": ObjectId(payload.lesson_id) if payload.lesson_id else None,
        "teacher_id": current_user["_id"],
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.whiteboards().insert_one(wb_doc)
    wb_id = result.inserted_id

    # Create the first blank page
    page_doc = {
        "whiteboard_id": wb_id,
        "page_id": page_id,
        "name": "Page 1",
        "order": 0,
        "background": "white",
        "created_at": now,
        "updated_at": now,
    }
    await db.whiteboard_pages().insert_one(page_doc)

    wb_doc["_id"] = wb_id
    wb_doc["pages"] = [serialize_object(page_doc)]
    return serialize_object(wb_doc)


@router.get("/{whiteboard_id}")
async def get_whiteboard(
    whiteboard_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a whiteboard with all its pages and canvas objects."""
    wb = await db.whiteboards().find_one(
        {"_id": ObjectId(whiteboard_id), "is_deleted": {"$ne": True}}
    )
    if not wb:
        raise HTTPException(status_code=404, detail="Whiteboard not found.")

    # Permission: teacher who owns it, or student in a shared classroom
    # (simplified for Phase 1 — full permission check in Phase 3)
    if wb["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Fetch all pages
    pages_cursor = db.whiteboard_pages().find(
        {"whiteboard_id": wb["_id"]},
        sort=[("order", 1)],
    )
    pages = []
    async for page in pages_cursor:
        page_id = page["page_id"]
        # Fetch objects for this page
        objects_cursor = db.canvas_objects().find(
            {"whiteboard_id": wb["_id"], "page_id": page_id},
            sort=[("z_index", 1)],
        )
        objects = [serialize_object(obj) async for obj in objects_cursor]
        page_data = serialize_object(page)
        page_data["objects"] = objects
        pages.append(page_data)

    result = serialize_object(wb)
    result["pages"] = pages
    return result


@router.put("/{whiteboard_id}")
async def update_whiteboard(
    whiteboard_id: str,
    payload: WhiteboardUpdate,
    current_user: dict = Depends(get_current_teacher),
):
    """Update whiteboard metadata."""
    await assert_whiteboard_owner(whiteboard_id, current_user["_id"])

    updates: dict = {"updated_at": now_utc()}
    if payload.title is not None:
        updates["title"] = payload.title
    if payload.subject is not None:
        updates["subject"] = payload.subject

    await db.whiteboards().update_one(
        {"_id": ObjectId(whiteboard_id)},
        {"$set": updates},
    )
    return {"success": True}


@router.delete("/{whiteboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_whiteboard(
    whiteboard_id: str,
    current_user: dict = Depends(get_current_teacher),
):
    """Soft-delete a whiteboard."""
    await assert_whiteboard_owner(whiteboard_id, current_user["_id"])
    await db.whiteboards().update_one(
        {"_id": ObjectId(whiteboard_id)},
        {"$set": {"is_deleted": True, "updated_at": now_utc()}},
    )


@router.post("/{whiteboard_id}/duplicate")
async def duplicate_whiteboard(
    whiteboard_id: str,
    current_user: dict = Depends(get_current_teacher),
):
    """Duplicate an entire whiteboard with all pages and objects."""
    wb = await assert_whiteboard_owner(whiteboard_id, current_user["_id"])
    now = now_utc()
    old_id = wb["_id"]

    # Create new whiteboard
    new_wb = {**wb, "title": f"{wb['title']} (Copy)", "created_at": now, "updated_at": now}
    del new_wb["_id"]
    new_wb_result = await db.whiteboards().insert_one(new_wb)
    new_wb_id = new_wb_result.inserted_id

    # Duplicate pages
    pages_cursor = db.whiteboard_pages().find({"whiteboard_id": old_id})
    async for page in pages_cursor:
        old_page_id = page["page_id"]
        new_page_id = str(uuid.uuid4())

        new_page = {**page, "whiteboard_id": new_wb_id, "page_id": new_page_id, "created_at": now, "updated_at": now}
        del new_page["_id"]
        await db.whiteboard_pages().insert_one(new_page)

        # Duplicate objects for this page
        objects_cursor = db.canvas_objects().find({"whiteboard_id": old_id, "page_id": old_page_id})
        async for obj in objects_cursor:
            new_obj = {**obj, "whiteboard_id": new_wb_id, "page_id": new_page_id, "object_id": str(uuid.uuid4()), "created_at": now, "updated_at": now}
            del new_obj["_id"]
            await db.canvas_objects().insert_one(new_obj)

    return {"id": str(new_wb_id), "message": "Whiteboard duplicated successfully."}


# ─── Page Endpoints ───────────────────────────────────────────────────────────

@router.get("/{whiteboard_id}/pages")
async def list_pages(whiteboard_id: str, current_user: dict = Depends(get_current_user)):
    """List pages of a whiteboard."""
    await assert_whiteboard_owner(whiteboard_id, current_user["_id"])
    cursor = db.whiteboard_pages().find(
        {"whiteboard_id": ObjectId(whiteboard_id)},
        sort=[("order", 1)],
    )
    return [serialize_object(p) async for p in cursor]


@router.post("/{whiteboard_id}/pages", status_code=status.HTTP_201_CREATED)
async def add_page(
    whiteboard_id: str,
    payload: PageCreate,
    current_user: dict = Depends(get_current_teacher),
):
    """Add a new page to a whiteboard."""
    wb = await assert_whiteboard_owner(whiteboard_id, current_user["_id"])
    now = now_utc()

    # Determine order: append at end by default
    last = await db.whiteboard_pages().find_one(
        {"whiteboard_id": wb["_id"]},
        sort=[("order", -1)],
    )
    new_order = (last["order"] + 1) if last else 0

    page_count = await db.whiteboard_pages().count_documents({"whiteboard_id": wb["_id"]})

    page_doc = {
        "whiteboard_id": wb["_id"],
        "page_id": str(uuid.uuid4()),
        "name": payload.name or f"Page {page_count + 1}",
        "order": new_order,
        "background": payload.background,
        "created_at": now,
        "updated_at": now,
    }
    await db.whiteboard_pages().insert_one(page_doc)
    return serialize_object(page_doc)


@router.put("/{whiteboard_id}/pages/{page_id}")
async def update_page(
    whiteboard_id: str,
    page_id: str,
    payload: PageUpdate,
    current_user: dict = Depends(get_current_teacher),
):
    """Update a page's name or background."""
    await assert_whiteboard_owner(whiteboard_id, current_user["_id"])
    updates: dict = {"updated_at": now_utc()}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.background is not None:
        updates["background"] = payload.background
    if payload.order is not None:
        updates["order"] = payload.order

    await db.whiteboard_pages().update_one(
        {"whiteboard_id": ObjectId(whiteboard_id), "page_id": page_id},
        {"$set": updates},
    )
    return {"success": True}


@router.delete("/{whiteboard_id}/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    whiteboard_id: str,
    page_id: str,
    current_user: dict = Depends(get_current_teacher),
):
    """Delete a whiteboard page and all its objects."""
    wb = await assert_whiteboard_owner(whiteboard_id, current_user["_id"])

    # Prevent deleting the last page
    count = await db.whiteboard_pages().count_documents({"whiteboard_id": wb["_id"]})
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last page of a whiteboard.")

    await db.whiteboard_pages().delete_one({"whiteboard_id": wb["_id"], "page_id": page_id})
    await db.canvas_objects().delete_many({"whiteboard_id": wb["_id"], "page_id": page_id})


# ─── Canvas Object Endpoints ──────────────────────────────────────────────────

@router.post("/{whiteboard_id}/pages/{page_id}/objects", status_code=status.HTTP_201_CREATED)
async def add_canvas_object(
    whiteboard_id: str,
    page_id: str,
    payload: CanvasObjectCreate,
    current_user: dict = Depends(get_current_user),
):
    """Add a canvas object to a page."""
    wb = await db.whiteboards().find_one({"_id": ObjectId(whiteboard_id), "is_deleted": {"$ne": True}})
    if not wb:
        raise HTTPException(status_code=404, detail="Whiteboard not found.")

    now = now_utc()
    obj_doc = {
        "object_id": payload.object_id or str(uuid.uuid4()),
        "whiteboard_id": wb["_id"],
        "page_id": page_id,
        "type": payload.type,
        "x": payload.x,
        "y": payload.y,
        "width": payload.width,
        "height": payload.height,
        "rotation": payload.rotation,
        "z_index": payload.z_index,
        "content": payload.content,
        "style": payload.style,
        "author_id": current_user["_id"],
        "is_locked": False,
        "created_at": now,
        "updated_at": now,
    }
    await db.canvas_objects().insert_one(obj_doc)
    return serialize_object(obj_doc)


@router.put("/{whiteboard_id}/pages/{page_id}/objects/{object_id}")
async def update_canvas_object(
    whiteboard_id: str,
    page_id: str,
    object_id: str,
    payload: CanvasObjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a canvas object's position, size, or content."""
    updates: dict = {"updated_at": now_utc()}
    for field, value in payload.model_dump(exclude_none=True).items():
        updates[field] = value

    result = await db.canvas_objects().update_one(
        {"whiteboard_id": ObjectId(whiteboard_id), "page_id": page_id, "object_id": object_id},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Object not found.")
    return {"success": True}


@router.delete("/{whiteboard_id}/pages/{page_id}/objects/{object_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_canvas_object(
    whiteboard_id: str,
    page_id: str,
    object_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a canvas object."""
    result = await db.canvas_objects().delete_one(
        {"whiteboard_id": ObjectId(whiteboard_id), "page_id": page_id, "object_id": object_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Object not found.")

