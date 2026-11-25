"""
Rekha — Assignments API
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel
from bson import ObjectId

import app.database as db
from app.core.security import get_current_user, get_current_teacher

router = APIRouter(prefix="/assignments", tags=["Assignments"])


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


class AssignmentCreate(BaseModel):
    title: str
    instructions: str = ""
    classroom_id: str
    whiteboard_id: str | None = None
    due_date: str | None = None
    max_marks: int = 100


class SubmissionCreate(BaseModel):
    whiteboard_id: str | None = None
    notes: str = ""


class GradeSubmissionRequest(BaseModel):
    marks: float
    feedback: str = ""


@router.get("/")
async def list_assignments(
    classroom_id: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    query: dict = {}
    if classroom_id:
        query["classroom_id"] = ObjectId(classroom_id)
    if current_user.get("role") in ("teacher", "tutor", "admin"):
        query["teacher_id"] = current_user["_id"]
    cursor = db.assignments().find(query, sort=[("created_at", -1)], limit=100)
    return [serialize_doc(a) async for a in cursor]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    payload: AssignmentCreate,
    current_user: dict = Depends(get_current_teacher),
):
    now = now_utc()
    doc = {
        "title": payload.title,
        "instructions": payload.instructions,
        "classroom_id": ObjectId(payload.classroom_id),
        "whiteboard_id": ObjectId(payload.whiteboard_id) if payload.whiteboard_id else None,
        "teacher_id": current_user["_id"],
        "due_date": payload.due_date,
        "max_marks": payload.max_marks,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.assignments().insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_doc(doc)


@router.get("/{assignment_id}")
async def get_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.assignments().find_one({"_id": ObjectId(assignment_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    return serialize_doc(doc)


@router.post("/{assignment_id}/submit", status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    assignment_id: str,
    payload: SubmissionCreate,
    current_user: dict = Depends(get_current_user),
):
    assignment = await db.assignments().find_one({"_id": ObjectId(assignment_id)})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    now = now_utc()
    sub_doc = {
        "assignment_id": assignment["_id"],
        "student_id": current_user["_id"],
        "whiteboard_id": ObjectId(payload.whiteboard_id) if payload.whiteboard_id else None,
        "notes": payload.notes,
        "marks": None,
        "feedback": None,
        "submitted_at": now,
    }
    await db.assignment_submissions().update_one(
        {"assignment_id": assignment["_id"], "student_id": current_user["_id"]},
        {"$set": sub_doc},
        upsert=True,
    )
    return {"success": True, "submitted_at": now.isoformat()}


@router.put("/{assignment_id}/submissions/{submission_id}")
async def grade_submission(
    assignment_id: str,
    submission_id: str,
    payload: GradeSubmissionRequest,
    current_user: dict = Depends(get_current_teacher),
):
    await db.assignment_submissions().update_one(
        {"_id": ObjectId(submission_id), "assignment_id": ObjectId(assignment_id)},
        {"$set": {"marks": payload.marks, "feedback": payload.feedback, "graded_at": now_utc()}},
    )
    return {"success": True}

