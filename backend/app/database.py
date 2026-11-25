"""
Rekha — MongoDB Database Connection and Collection Access
Includes an in-memory async fallback when MongoDB is unavailable during local dev.
"""

import logging
from copy import deepcopy
from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel, TEXT
from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None
_use_memory_fallback: bool = False


# ─── In-Memory Async Fallback (Local Dev Without MongoDB) ─────────────────────

def _match_filter(doc: dict, filt: dict) -> bool:
    for key, val in filt.items():
        if key == "$and":
            if not all(_match_filter(doc, sub) for sub in val):
                return False
            continue
        doc_val = doc.get(key)
        if isinstance(val, dict):
            if "$ne" in val and doc_val == val["$ne"]:
                return False
            if "$in" in val and doc_val not in val["$in"]:
                return False
        elif doc_val != val:
            return False
    return True


class _InsertResult:
    def __init__(self, inserted_id: ObjectId):
        self.inserted_id = inserted_id


class _UpdateResult:
    def __init__(self, matched_count: int, modified_count: int):
        self.matched_count = matched_count
        self.modified_count = modified_count


class _DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class _MemoryCursor:
    def __init__(self, docs: list[dict], sort=None, limit: int = 0):
        self._docs = docs
        if sort:
            for field, direction in reversed(sort):
                self._docs.sort(key=lambda d: str(d.get(field, "")), reverse=(direction == -1))
        if limit and limit > 0:
            self._docs = self._docs[:limit]
        self._idx = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._idx >= len(self._docs):
            raise StopAsyncIteration
        doc = self._docs[self._idx]
        self._idx += 1
        return deepcopy(doc)


class _MemoryCollection:
    def __init__(self):
        self._docs: list[dict] = []

    async def find_one(self, filt: dict | None = None, projection=None, sort=None) -> dict | None:
        filt = filt or {}
        matches = [d for d in self._docs if _match_filter(d, filt)]
        if sort:
            for field, direction in reversed(sort):
                matches.sort(key=lambda d: str(d.get(field, "")), reverse=(direction == -1))
        if not matches:
            return None
        return deepcopy(matches[0])

    def find(self, filt: dict | None = None, sort=None, limit: int = 0) -> _MemoryCursor:
        filt = filt or {}
        matches = [d for d in self._docs if _match_filter(d, filt)]
        return _MemoryCursor(matches, sort=sort, limit=limit)

    async def insert_one(self, doc: dict) -> _InsertResult:
        copy = deepcopy(doc)
        if "_id" not in copy:
            copy["_id"] = ObjectId()
        self._docs.append(copy)
        return _InsertResult(copy["_id"])

    async def update_one(self, filt: dict, update: dict, upsert: bool = False) -> _UpdateResult:
        for idx, d in enumerate(self._docs):
            if _match_filter(d, filt):
                if "$set" in update:
                    self._docs[idx].update(deepcopy(update["$set"]))
                return _UpdateResult(1, 1)
        if upsert and "$set" in update:
            new_doc = {**deepcopy(filt), **deepcopy(update["$set"])}
            new_doc.setdefault("_id", ObjectId())
            self._docs.append(new_doc)
            return _UpdateResult(1, 1)
        return _UpdateResult(0, 0)

    async def update_many(self, filt: dict, update: dict) -> _UpdateResult:
        count = 0
        for idx, d in enumerate(self._docs):
            if _match_filter(d, filt):
                if "$set" in update:
                    self._docs[idx].update(deepcopy(update["$set"]))
                count += 1
        return _UpdateResult(count, count)

    async def delete_one(self, filt: dict) -> _DeleteResult:
        for idx, d in enumerate(self._docs):
            if _match_filter(d, filt):
                self._docs.pop(idx)
                return _DeleteResult(1)
        return _DeleteResult(0)

    async def delete_many(self, filt: dict) -> _DeleteResult:
        before = len(self._docs)
        self._docs = [d for d in self._docs if not _match_filter(d, filt)]
        return _DeleteResult(before - len(self._docs))

    async def count_documents(self, filt: dict | None = None) -> int:
        filt = filt or {}
        return sum(1 for d in self._docs if _match_filter(d, filt))


class _MemoryDatabase:
    def __init__(self):
        self._collections: dict[str, _MemoryCollection] = {}

    def __getitem__(self, name: str) -> _MemoryCollection:
        if name not in self._collections:
            self._collections[name] = _MemoryCollection()
        return self._collections[name]


_memory_db = _MemoryDatabase()


async def connect_to_mongo() -> None:
    global _client, _db, _use_memory_fallback
    try:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=2500,
            maxPoolSize=20,
            minPoolSize=5,
        )
        _db = _client[settings.MONGODB_DB_NAME]
        await _client.admin.command("ping")
        _use_memory_fallback = False
        logger.info("Connected to MongoDB: %s", settings.MONGODB_DB_NAME)
        await create_indexes()
    except Exception as exc:
        _use_memory_fallback = True
        _client = None
        _db = None
        logger.warning(
            "MongoDB unavailable (%s). Using in-memory store for local development.",
            exc,
        )


async def close_mongo_connection() -> None:
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None


def get_database() -> Any:
    if _use_memory_fallback or _db is None:
        return _memory_db
    return _db


# ─── Collection Accessors ─────────────────────────────────────────────────────

def get_collection(name: str):
    return get_database()[name]


def users():                   return get_collection("users")
def institutions():            return get_collection("institutions")
def workspaces():              return get_collection("workspaces")
def classrooms():              return get_collection("classrooms")
def classroom_members():       return get_collection("classroom_members")
def subjects():                return get_collection("subjects")
def lessons():                 return get_collection("lessons")
def whiteboards():             return get_collection("whiteboards")
def whiteboard_pages():        return get_collection("whiteboard_pages")
def canvas_objects():          return get_collection("canvas_objects")
def ink_strokes():             return get_collection("ink_strokes")
def teaching_resources():      return get_collection("teaching_resources")
def resource_libraries():      return get_collection("resource_libraries")
def media_assets():            return get_collection("media_assets")
def classroom_sessions():      return get_collection("classroom_sessions")
def session_participants():    return get_collection("session_participants")
def student_questions():       return get_collection("student_questions")
def quizzes():                 return get_collection("quizzes")
def quiz_questions():          return get_collection("quiz_questions")
def quiz_responses():          return get_collection("quiz_responses")
def assignments():             return get_collection("assignments")
def assignment_submissions():  return get_collection("assignment_submissions")
def recordings():              return get_collection("recordings")
def templates():               return get_collection("templates")
def permissions():             return get_collection("permissions")
def notifications():           return get_collection("notifications")
def revisions():               return get_collection("revisions")
def ai_conversations():        return get_collection("ai_conversations")
def user_preferences():        return get_collection("user_preferences")
def audit_logs():              return get_collection("audit_logs")


# ─── Index Creation ───────────────────────────────────────────────────────────

async def create_indexes() -> None:
    """Create all required MongoDB indexes on startup."""
    if _use_memory_fallback or _db is None:
        return
    db = _db
    logger.info("Creating database indexes...")

    await db.users.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True),
        IndexModel([("institution_id", ASCENDING)]),
        IndexModel([("role", ASCENDING)]),
    ])
    await db.institutions.create_indexes([
        IndexModel([("slug", ASCENDING)], unique=True, sparse=True),
    ])
    await db.classrooms.create_indexes([
        IndexModel([("code", ASCENDING)], unique=True),
        IndexModel([("teacher_id", ASCENDING)]),
        IndexModel([("institution_id", ASCENDING)]),
        IndexModel([("is_archived", ASCENDING)]),
    ])
    await db.classroom_members.create_indexes([
        IndexModel([("classroom_id", ASCENDING), ("user_id", ASCENDING)], unique=True),
        IndexModel([("user_id", ASCENDING)]),
    ])
    await db.lessons.create_indexes([
        IndexModel([("teacher_id", ASCENDING)]),
        IndexModel([("classroom_id", ASCENDING)]),
        IndexModel([("subject", ASCENDING)]),
        IndexModel([("is_deleted", ASCENDING)]),
        IndexModel([("title", TEXT), ("subject", TEXT)]),
    ])
    await db.whiteboards.create_indexes([
        IndexModel([("lesson_id", ASCENDING)]),
        IndexModel([("teacher_id", ASCENDING)]),
        IndexModel([("is_deleted", ASCENDING)]),
    ])
    await db.whiteboard_pages.create_indexes([
        IndexModel([("whiteboard_id", ASCENDING), ("order", ASCENDING)]),
    ])
    await db.canvas_objects.create_indexes([
        IndexModel([("whiteboard_id", ASCENDING), ("page_id", ASCENDING)]),
        IndexModel([("author_id", ASCENDING)]),
        IndexModel([("z_index", ASCENDING)]),
    ])
    await db.classroom_sessions.create_indexes([
        IndexModel([("classroom_id", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("started_at", DESCENDING)]),
    ])
    await db.session_participants.create_indexes([
        IndexModel([("session_id", ASCENDING), ("user_id", ASCENDING)], unique=True),
    ])
    await db.quizzes.create_indexes([
        IndexModel([("teacher_id", ASCENDING)]),
        IndexModel([("classroom_id", ASCENDING)]),
    ])
    await db.assignments.create_indexes([
        IndexModel([("classroom_id", ASCENDING)]),
        IndexModel([("teacher_id", ASCENDING)]),
        IndexModel([("due_date", ASCENDING)]),
    ])
    await db.assignment_submissions.create_indexes([
        IndexModel([("assignment_id", ASCENDING), ("student_id", ASCENDING)], unique=True),
    ])
    await db.notifications.create_indexes([
        IndexModel([("user_id", ASCENDING), ("is_read", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)]),
    ])
    await db.audit_logs.create_indexes([
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("action", ASCENDING)]),
        IndexModel([("created_at", DESCENDING)]),
    ])

    logger.info("Database indexes created successfully.")
