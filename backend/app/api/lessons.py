"""
Rekha — Lessons API
Create, organize, duplicate, and share multi-page lessons.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from bson import ObjectId

import app.database as db
from app.core.security import get_current_user, get_current_teacher

router = APIRouter(prefix="/lessons", tags=["Lessons"])


def now_utc():
    return datetime.now(timezone.utc)


def serialize_doc(doc: dict) -> dict:
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


class LessonCreate(BaseModel):
    title: str
    subject: str | None = None
    grade: str | None = None
    chapter: str | None = None
    topic: str | None = None
    classroom_id: str | None = None
    tags: list[str] = []


class LessonUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None
    grade: str | None = None
    chapter: str | None = None
    topic: str | None = None
    tags: list[str] | None = None
    is_favorite: bool | None = None


class ShareLessonRequest(BaseModel):
    classroom_id: str


@router.get("/")
async def list_lessons(
    subject: str | None = Query(default=None),
    classroom_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    query: dict = {"teacher_id": current_user["_id"], "is_deleted": {"$ne": True}}
    if subject:
        query["subject"] = subject
    if classroom_id:
        query["classroom_id"] = ObjectId(classroom_id)

    cursor = db.lessons().find(query, sort=[("updated_at", -1)], limit=100)
    return [serialize_doc(doc) async for doc in cursor]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lesson(
    payload: LessonCreate,
    current_user: dict = Depends(get_current_teacher),
):
    now = now_utc()
    doc = {
        "title": payload.title,
        "subject": payload.subject,
        "grade": payload.grade,
        "chapter": payload.chapter,
        "topic": payload.topic,
        "classroom_id": ObjectId(payload.classroom_id) if payload.classroom_id else None,
        "teacher_id": current_user["_id"],
        "tags": payload.tags,
        "is_favorite": False,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.lessons().insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_doc(doc)


@router.get("/{lesson_id}")
async def get_lesson(lesson_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.lessons().find_one({"_id": ObjectId(lesson_id), "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    if doc["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied.")
    return serialize_doc(doc)


@router.put("/{lesson_id}")
async def update_lesson(
    lesson_id: str,
    payload: LessonUpdate,
    current_user: dict = Depends(get_current_teacher),
):
    doc = await db.lessons().find_one({"_id": ObjectId(lesson_id), "is_deleted": {"$ne": True}})
    if not doc or doc["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    updates = {"updated_at": now_utc()}
    for k, v in payload.model_dump(exclude_none=True).items():
        updates[k] = v

    await db.lessons().update_one({"_id": doc["_id"]}, {"$set": updates})
    return {"success": True}


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(lesson_id: str, current_user: dict = Depends(get_current_teacher)):
    doc = await db.lessons().find_one({"_id": ObjectId(lesson_id)})
    if not doc or doc["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    await db.lessons().update_one({"_id": doc["_id"]}, {"$set": {"is_deleted": True, "updated_at": now_utc()}})


@router.post("/{lesson_id}/duplicate")
async def duplicate_lesson(lesson_id: str, current_user: dict = Depends(get_current_teacher)):
    doc = await db.lessons().find_one({"_id": ObjectId(lesson_id), "is_deleted": {"$ne": True}})
    if not doc or doc["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    now = now_utc()
    copy_doc = {**doc, "title": f"{doc['title']} (Copy)", "created_at": now, "updated_at": now}
    del copy_doc["_id"]
    res = await db.lessons().insert_one(copy_doc)
    copy_doc["_id"] = res.inserted_id
    return serialize_doc(copy_doc)


@router.post("/{lesson_id}/share")
async def share_lesson(
    lesson_id: str,
    payload: ShareLessonRequest,
    current_user: dict = Depends(get_current_teacher),
):
    doc = await db.lessons().find_one({"_id": ObjectId(lesson_id), "is_deleted": {"$ne": True}})
    if not doc or doc["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    await db.lessons().update_one(
        {"_id": doc["_id"]},
        {"$set": {"classroom_id": ObjectId(payload.classroom_id), "updated_at": now_utc()}},
    )
    return {"success": True, "classroom_id": payload.classroom_id}

