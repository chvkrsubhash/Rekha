"""
Rekha — Provider-Independent AI Teaching Assistant API
Supports Google Gemini, Groq, and OpenRouter (all optional).
Core whiteboard functions without any AI API keys.
"""

import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.config import settings
from app.core.security import get_current_teacher

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class AIRequest(BaseModel):
    prompt: str
    subject: str = "General"
    grade: str = "Class 8"
    language: str = "English"


async def _call_ai_provider(system_prompt: str, user_prompt: str) -> tuple[str, str]:
    """Call the first configured AI provider: Gemini > Groq > OpenRouter."""
    if not settings.has_ai_provider:
        raise HTTPException(
            status_code=503,
            detail="No AI provider configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in backend/.env.",
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        if settings.GEMINI_API_KEY:
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
            )
            resp = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return text, "gemini"

        if settings.GROQ_API_KEY:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"]
            return text, "groq"

        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
            json={
                "model": "meta-llama/llama-3.1-8b-instruct:free",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        resp.raise_for_status()
        text = resp.json()["choices"][0]["message"]["content"]
        return text, "openrouter"


@router.post("/chat")
async def ai_chat(payload: AIRequest, current_user: dict = Depends(get_current_teacher)):
    system = (
        f"You are Rekha's teaching assistant for {payload.subject} ({payload.grade}). "
        f"Respond clearly in {payload.language} for classroom instruction."
    )
    content, provider = await _call_ai_provider(system, payload.prompt)
    return {"content": content, "provider": provider}


@router.post("/generate/lesson-plan")
async def generate_lesson_plan(payload: AIRequest, current_user: dict = Depends(get_current_teacher)):
    system = (
        f"Create a structured classroom lesson plan for {payload.subject}, {payload.grade}, "
        f"in {payload.language}. Include objectives, key concepts, examples, and summary."
    )
    content, provider = await _call_ai_provider(system, payload.prompt)
    return {"content": content, "provider": provider, "type": "lesson_plan"}


@router.post("/generate/quiz")
async def generate_quiz(payload: AIRequest, current_user: dict = Depends(get_current_teacher)):
    system = (
        f"Generate 5 multiple-choice questions with answers and brief explanations for "
        f"{payload.subject}, {payload.grade}, in {payload.language}."
    )
    content, provider = await _call_ai_provider(system, payload.prompt)
    return {"content": content, "provider": provider, "type": "quiz"}


@router.post("/generate/worksheet")
async def generate_worksheet(payload: AIRequest, current_user: dict = Depends(get_current_teacher)):
    system = (
        f"Create a printable practice worksheet for {payload.subject}, {payload.grade}, "
        f"in {payload.language}."
    )
    content, provider = await _call_ai_provider(system, payload.prompt)
    return {"content": content, "provider": provider, "type": "worksheet"}


@router.post("/generate/explanation")
async def generate_explanation(payload: AIRequest, current_user: dict = Depends(get_current_teacher)):
    system = (
        f"Explain the concept clearly with step-by-step worked examples for "
        f"{payload.subject}, {payload.grade}, in {payload.language}."
    )
    content, provider = await _call_ai_provider(system, payload.prompt)
    return {"content": content, "provider": provider, "type": "explanation"}

