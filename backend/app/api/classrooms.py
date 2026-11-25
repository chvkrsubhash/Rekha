"""
Rekha — Classrooms API
Create classrooms, manage members, start live sessions.
"""

import random
import string
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from bson import ObjectId

import app.database as db
from app.core.security import get_current_user, get_current_teacher

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])


def now_utc():
    return datetime.now(timezone.utc)


def serialize_obj(doc: dict) -> dict:
    result = {}
    for k, v in doc.items():
        if k == "_id":
            result["id"] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


def generate_classroom_code(length: int = 6) -> str:
    """Generate a readable alphanumeric classroom code."""
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=length))


# ─── Request Schemas ──────────────────────────────────────────────────────────

class ClassroomCreate(BaseModel):
    name: str
    subject: str | None = None
    grade: str | None = None
    section: str | None = None
    description: str | None = None
    academic_year: str | None = None


class ClassroomUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    grade: str | None = None
    section: str | None = None
    description: str | None = None


class JoinClassroomRequest(BaseModel):
    code: str


class SessionCreate(BaseModel):
    whiteboard_id: str | None = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/")
async def list_classrooms(current_user: dict = Depends(get_current_user)):
    """List classrooms for the current user."""
    user_id = current_user["_id"]
    role = current_user.get("role")

    if role in ("teacher", "tutor", "admin"):
        cursor = db.classrooms().find(
            {"teacher_id": user_id, "is_archived": {"$ne": True}},
            sort=[("created_at", -1)],
        )
    else:
        # Student: find classrooms they're a member of
        member_docs = db.classroom_members().find({"user_id": user_id})
        classroom_ids = [m["classroom_id"] async for m in member_docs]
        cursor = db.classrooms().find(
            {"_id": {"$in": classroom_ids}, "is_archived": {"$ne": True}},
            sort=[("created_at", -1)],
        )

    return [serialize_obj(c) async for c in cursor]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_classroom(
    payload: ClassroomCreate,
    current_user: dict = Depends(get_current_teacher),
):
    """Create a new classroom and generate a joining code."""
    # Ensure unique code
    for _ in range(10):
        code = generate_classroom_code()
        if not await db.classrooms().find_one({"code": code}):
            break

    now = now_utc()
    doc = {
        "name": payload.name,
        "subject": payload.subject,
        "grade": payload.grade,
        "section": payload.section,
        "description": payload.description,
        "academic_year": payload.academic_year,
        "teacher_id": current_user["_id"],
        "institution_id": current_user.get("institution_id"),
        "code": code,
        "is_archived": False,
        "settings": {
            "allow_student_drawing": False,
            "allow_chat": True,
            "allow_questions": True,
            "require_approval_to_join": False,
        },
        "created_at": now,
        "updated_at": now,
    }
    result = await db.classrooms().insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_obj(doc)


@router.get("/{classroom_id}")
async def get_classroom(classroom_id: str, current_user: dict = Depends(get_current_user)):
    """Get classroom details."""
    cls = await db.classrooms().find_one({"_id": ObjectId(classroom_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    # Check access
    is_teacher = cls["teacher_id"] == current_user["_id"]
    is_member = await db.classroom_members().find_one(
        {"classroom_id": cls["_id"], "user_id": current_user["_id"]}
    )
    if not is_teacher and not is_member:
        raise HTTPException(status_code=403, detail="Access denied.")

    result = serialize_obj(cls)
    result["member_count"] = await db.classroom_members().count_documents({"classroom_id": cls["_id"]})
    return result


@router.put("/{classroom_id}")
async def update_classroom(
    classroom_id: str,
    payload: ClassroomUpdate,
    current_user: dict = Depends(get_current_teacher),
):
    """Update classroom settings."""
    cls = await db.classrooms().find_one({"_id": ObjectId(classroom_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    if cls["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    updates = {"updated_at": now_utc()}
    for field in ("name", "subject", "grade", "section", "description"):
        v = getattr(payload, field)
        if v is not None:
            updates[field] = v

    await db.classrooms().update_one({"_id": cls["_id"]}, {"$set": updates})
    return {"success": True}


@router.post("/join")
async def join_classroom(
    payload: JoinClassroomRequest,
    current_user: dict = Depends(get_current_user),
):
    """Student joins a classroom using a 6-character code."""
    code = payload.code.strip().upper()
    cls = await db.classrooms().find_one({"code": code, "is_archived": {"$ne": True}})
    if not cls:
        raise HTTPException(status_code=404, detail="Invalid classroom code. Please check and try again.")

    # Prevent teacher from joining their own classroom as student
    if cls["teacher_id"] == current_user["_id"]:
        raise HTTPException(status_code=400, detail="You are the teacher of this classroom.")

    # Check already a member
    existing = await db.classroom_members().find_one(
        {"classroom_id": cls["_id"], "user_id": current_user["_id"]}
    )
    if existing:
        return {"message": "You are already a member of this classroom.", "classroom": serialize_obj(cls)}

    now = now_utc()
    await db.classroom_members().insert_one({
        "classroom_id": cls["_id"],
        "user_id": current_user["_id"],
        "role": "student",
        "joined_at": now,
        "permissions": {
            "can_draw": False,
            "can_chat": True,
            "can_ask_questions": True,
        },
    })
    return {"message": "Successfully joined classroom.", "classroom": serialize_obj(cls)}


@router.get("/{classroom_id}/members")
async def get_members(classroom_id: str, current_user: dict = Depends(get_current_user)):
    """List classroom members."""
    cls = await db.classrooms().find_one({"_id": ObjectId(classroom_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    if cls["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    members_cursor = db.classroom_members().find({"classroom_id": cls["_id"]})
    members = []
    async for m in members_cursor:
        user = await db.users().find_one({"_id": m["user_id"]}, {"hashed_password": 0})
        if user:
            members.append({
                "user_id": str(m["user_id"]),
                "full_name": user["full_name"],
                "email": user["email"],
                "role": m["role"],
                "joined_at": m["joined_at"].isoformat() if m.get("joined_at") else None,
                "permissions": m.get("permissions", {}),
            })
    return members


@router.delete("/{classroom_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    classroom_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_teacher),
):
    """Remove a student from a classroom."""
    cls = await db.classrooms().find_one({"_id": ObjectId(classroom_id)})
    if not cls or cls["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    await db.classroom_members().delete_one(
        {"classroom_id": cls["_id"], "user_id": ObjectId(user_id)}
    )


@router.post("/{classroom_id}/sessions", status_code=status.HTTP_201_CREATED)
async def start_session(
    classroom_id: str,
    payload: SessionCreate,
    current_user: dict = Depends(get_current_teacher),
):
    """Start a live classroom session."""
    cls = await db.classrooms().find_one({"_id": ObjectId(classroom_id)})
    if not cls or cls["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    # End any existing active session
    await db.classroom_sessions().update_many(
        {"classroom_id": cls["_id"], "status": "active"},
        {"$set": {"status": "ended", "ended_at": now_utc()}}
    )

    now = now_utc()
    session_doc = {
        "classroom_id": cls["_id"],
        "teacher_id": current_user["_id"],
        "whiteboard_id": ObjectId(payload.whiteboard_id) if payload.whiteboard_id else None,
        "status": "active",
        "settings": cls.get("settings", {}),
        "started_at": now,
        "ended_at": None,
        "participant_count": 0,
    }
    result = await db.classroom_sessions().insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    return serialize_obj(session_doc)


@router.put("/{classroom_id}/sessions/{session_id}")
async def update_session(
    classroom_id: str,
    session_id: str,
    status_update: dict,
    current_user: dict = Depends(get_current_teacher),
):
    """Update session status (end, lock/unlock)."""
    session = await db.classroom_sessions().find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    updates = {"updated_at": now_utc()}
    if status_update.get("status") == "ended":
        updates["status"] = "ended"
        updates["ended_at"] = now_utc()
    if "settings" in status_update:
        updates["settings"] = status_update["settings"]

    await db.classroom_sessions().update_one({"_id": session["_id"]}, {"$set": updates})
    return {"success": True}

