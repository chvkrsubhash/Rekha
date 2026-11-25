"""
Rekha — Educational Templates API
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel
from bson import ObjectId

import app.database as db
from app.core.security import get_current_user, get_current_teacher

router = APIRouter(prefix="/templates", tags=["Templates"])

BUILTIN_TEMPLATES = [
    {
        "id": "builtin-math-lesson",
        "title": "Mathematics Problem Solving",
        "category": "school",
        "subject": "Mathematics",
        "background": "grid",
        "description": "Structured layout with Given, Formula, Step-by-Step Solution, and Final Answer.",
    },
    {
        "id": "builtin-science-lesson",
        "title": "Science Concept & Diagram",
        "category": "school",
        "subject": "Science",
        "background": "white",
        "description": "Two-column board for diagram explanation and key definitions.",
    },
    {
        "id": "builtin-seating-puzzle",
        "title": "Circular Seating Arrangement",
        "category": "competitive",
        "subject": "Logical Reasoning",
        "background": "white",
        "description": "8-person circular seating puzzle template for competitive exam coaching.",
    },
    {
        "id": "builtin-telugu-handwriting",
        "title": "Telugu & Hindi Handwriting Practice",
        "category": "language",
        "subject": "Languages",
        "background": "cornell",
        "description": "Ruled handwriting practice sheet with Unicode text support.",
    },
]


class TemplateCreate(BaseModel):
    title: str
    category: str = "custom"
    subject: str | None = None
    background: str = "white"
    description: str | None = None
    objects: list[dict] = []


@router.get("/")
async def list_templates(
    category: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    results = [t for t in BUILTIN_TEMPLATES if not category or t["category"] == category]
    query: dict = {"teacher_id": current_user["_id"]}
    if category:
        query["category"] = category
    cursor = db.templates().find(query, sort=[("created_at", -1)])
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "title": doc["title"],
            "category": doc["category"],
            "subject": doc.get("subject"),
            "background": doc.get("background", "white"),
            "description": doc.get("description"),
        })
    return results


@router.get("/{template_id}")
async def get_template(template_id: str, current_user: dict = Depends(get_current_user)):
    for t in BUILTIN_TEMPLATES:
        if t["id"] == template_id:
            return t
    doc = await db.templates().find_one({"_id": ObjectId(template_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Template not found.")
    doc["id"] = str(doc.pop("_id"))
    doc["teacher_id"] = str(doc["teacher_id"])
    return doc


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_template(payload: TemplateCreate, current_user: dict = Depends(get_current_teacher)):
    now = datetime.now(timezone.utc)
    doc = {
        "title": payload.title,
        "category": payload.category,
        "subject": payload.subject,
        "background": payload.background,
        "description": payload.description,
        "objects": payload.objects,
        "teacher_id": current_user["_id"],
        "created_at": now,
    }
    res = await db.templates().insert_one(doc)
    return {"id": str(res.inserted_id), "title": payload.title}

