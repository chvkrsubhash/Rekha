"""
Rekha — WebSocket Classroom Handler
Real-time synchronization for live teaching sessions.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from bson import ObjectId

from app.core.security import decode_token
import app.database as db

logger = logging.getLogger(__name__)
ws_router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """
    Manages WebSocket connections grouped by classroom session.
    connections: session_id → {user_id → websocket}
    """

    def __init__(self):
        self.connections: Dict[str, Dict[str, WebSocket]] = {}
        self.teachers: Dict[str, str] = {}  # session_id → teacher_user_id

    async def connect(self, session_id: str, user_id: str, websocket: WebSocket, is_teacher: bool = False):
        await websocket.accept()
        if session_id not in self.connections:
            self.connections[session_id] = {}
        self.connections[session_id][user_id] = websocket
        if is_teacher:
            self.teachers[session_id] = user_id
        logger.info("WebSocket connected: session=%s user=%s teacher=%s", session_id, user_id, is_teacher)

    def disconnect(self, session_id: str, user_id: str):
        if session_id in self.connections:
            self.connections[session_id].pop(user_id, None)
            if not self.connections[session_id]:
                del self.connections[session_id]
                self.teachers.pop(session_id, None)
        logger.info("WebSocket disconnected: session=%s user=%s", session_id, user_id)

    def get_connection_count(self, session_id: str) -> int:
        return len(self.connections.get(session_id, {}))

    async def send_to_user(self, session_id: str, user_id: str, message: dict):
        ws = self.connections.get(session_id, {}).get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(session_id, user_id)

    async def broadcast(self, session_id: str, message: dict, exclude_user_id: str | None = None):
        """Broadcast a message to all participants in a session."""
        dead = []
        for uid, ws in self.connections.get(session_id, {}).items():
            if uid == exclude_user_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.disconnect(session_id, uid)

    async def broadcast_to_students(self, session_id: str, message: dict):
        """Broadcast only to non-teacher participants."""
        teacher_id = self.teachers.get(session_id)
        await self.broadcast(session_id, message, exclude_user_id=teacher_id)

    async def notify_teacher(self, session_id: str, message: dict):
        """Send a message only to the teacher."""
        teacher_id = self.teachers.get(session_id)
        if teacher_id:
            await self.send_to_user(session_id, teacher_id, message)


manager = ConnectionManager()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@ws_router.websocket("/ws/classroom/{session_id}")
async def classroom_websocket(
    session_id: str,
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    WebSocket endpoint for live classroom synchronization.

    Message types (client → server):
    - canvas_update: broadcast canvas object changes
    - page_change: teacher changes current page
    - raise_hand: student raises hand
    - lower_hand: student lowers hand
    - student_question: student submits a question
    - quiz_response: student answers a quiz question
    - chat_message: classroom chat
    - session_control: teacher ends/locks session (teacher only)
    - permission_change: teacher grants/revokes student drawing (teacher only)
    - ping: keepalive

    Message types (server → client):
    - canvas_update: forwarded from teacher
    - page_change: forwarded from teacher
    - hand_raised: notify teacher of raised hand
    - student_question: notify teacher
    - chat_message: broadcast
    - permission_update: notify specific student
    - session_ended: broadcast when teacher ends session
    - participant_joined: broadcast when user joins
    - participant_left: broadcast when user leaves
    - error: error message
    - pong: keepalive response
    """
    # Authenticate via token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
    except Exception:
        await websocket.close(code=4001, reason="Invalid authentication token.")
        return

    # Verify session exists and is active
    try:
        session = await db.classroom_sessions().find_one(
            {"_id": ObjectId(session_id), "status": "active"}
        )
    except Exception:
        session = None

    if not session:
        await websocket.close(code=4004, reason="Session not found or has ended.")
        return

    # Determine if user is the teacher
    is_teacher = str(session["teacher_id"]) == user_id

    # Connect
    await manager.connect(session_id, user_id, websocket, is_teacher=is_teacher)

    # Fetch user info for broadcast
    try:
        user = await db.users().find_one({"_id": ObjectId(user_id)}, {"hashed_password": 0})
        user_name = user["full_name"] if user else "Unknown"
    except Exception:
        user_name = "Unknown"

    # Notify all participants that this user joined
    await manager.broadcast(session_id, {
        "type": "participant_joined",
        "user_id": user_id,
        "user_name": user_name,
        "is_teacher": is_teacher,
        "participant_count": manager.get_connection_count(session_id),
        "timestamp": now_iso(),
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON."})
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": now_iso()})

            elif msg_type == "canvas_update":
                # Teacher broadcasts canvas object changes to students
                if is_teacher:
                    await manager.broadcast_to_students(session_id, {
                        "type": "canvas_update",
                        "objects": data.get("objects", []),
                        "page_id": data.get("page_id"),
                        "timestamp": now_iso(),
                    })

            elif msg_type == "page_change":
                # Teacher changes page — notify all students
                if is_teacher:
                    await manager.broadcast_to_students(session_id, {
                        "type": "page_change",
                        "page_id": data.get("page_id"),
                        "page_index": data.get("page_index", 0),
                        "timestamp": now_iso(),
                    })

            elif msg_type == "laser_pointer":
                # Teacher's laser pointer position
                if is_teacher:
                    await manager.broadcast_to_students(session_id, {
                        "type": "laser_pointer",
                        "x": data.get("x"),
                        "y": data.get("y"),
                        "visible": data.get("visible", True),
                        "timestamp": now_iso(),
                    })

            elif msg_type == "raise_hand":
                # Student raises hand — notify teacher
                await manager.notify_teacher(session_id, {
                    "type": "hand_raised",
                    "user_id": user_id,
                    "user_name": user_name,
                    "timestamp": now_iso(),
                })

            elif msg_type == "lower_hand":
                await manager.notify_teacher(session_id, {
                    "type": "hand_lowered",
                    "user_id": user_id,
                    "timestamp": now_iso(),
                })

            elif msg_type == "student_question":
                question_text = data.get("question", "").strip()
                if question_text:
                    # Store in DB
                    await db.student_questions().insert_one({
                        "session_id": ObjectId(session_id),
                        "user_id": ObjectId(user_id),
                        "user_name": user_name,
                        "question": question_text,
                        "is_answered": False,
                        "created_at": datetime.now(timezone.utc),
                    })
                    # Notify teacher
                    await manager.notify_teacher(session_id, {
                        "type": "student_question",
                        "user_id": user_id,
                        "user_name": user_name,
                        "question": question_text,
                        "timestamp": now_iso(),
                    })

            elif msg_type == "chat_message":
                # Broadcast chat to all (if chat enabled)
                session_settings = session.get("settings", {})
                if session_settings.get("allow_chat", True):
                    message_text = data.get("message", "").strip()
                    if message_text and len(message_text) <= 500:
                        await manager.broadcast(session_id, {
                            "type": "chat_message",
                            "user_id": user_id,
                            "user_name": user_name,
                            "is_teacher": is_teacher,
                            "message": message_text,
                            "timestamp": now_iso(),
                        })

            elif msg_type == "session_control" and is_teacher:
                action = data.get("action")
                if action == "end_session":
                    await db.classroom_sessions().update_one(
                        {"_id": ObjectId(session_id)},
                        {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc)}}
                    )
                    await manager.broadcast(session_id, {
                        "type": "session_ended",
                        "message": "The teacher has ended the session.",
                        "timestamp": now_iso(),
                    })
                elif action == "lock_classroom":
                    await manager.broadcast_to_students(session_id, {
                        "type": "classroom_locked",
                        "timestamp": now_iso(),
                    })

            elif msg_type == "permission_change" and is_teacher:
                target_user_id = data.get("user_id")
                permissions = data.get("permissions", {})
                await manager.send_to_user(session_id, target_user_id, {
                    "type": "permission_update",
                    "permissions": permissions,
                    "timestamp": now_iso(),
                })

            elif msg_type == "quiz_response":
                question_id = data.get("question_id")
                answer = data.get("answer")
                if question_id:
                    await db.quiz_responses().insert_one({
                        "session_id": ObjectId(session_id),
                        "quiz_question_id": question_id,
                        "user_id": ObjectId(user_id),
                        "answer": answer,
                        "submitted_at": datetime.now(timezone.utc),
                    })
                    # Notify teacher of new response
                    await manager.notify_teacher(session_id, {
                        "type": "quiz_response_received",
                        "question_id": question_id,
                        "user_id": user_id,
                        "timestamp": now_iso(),
                    })

    except WebSocketDisconnect:
        manager.disconnect(session_id, user_id)
        await manager.broadcast(session_id, {
            "type": "participant_left",
            "user_id": user_id,
            "user_name": user_name,
            "participant_count": manager.get_connection_count(session_id),
            "timestamp": now_iso(),
        })

