"""
Rekha — API Router — aggregates all route modules
"""

from fastapi import APIRouter
from app.api import auth, whiteboards, classrooms, lessons, ai, media, templates, assignments

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(whiteboards.router)
api_router.include_router(classrooms.router)
api_router.include_router(lessons.router)
api_router.include_router(ai.router)
api_router.include_router(media.router)
api_router.include_router(templates.router)
api_router.include_router(assignments.router)
