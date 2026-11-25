"""
Rekha — Whiteboard & Classroom Helper Tests
"""

from datetime import datetime, timezone
from bson import ObjectId
from app.api.whiteboards import serialize_object
from app.api.classrooms import generate_classroom_code


def test_serialize_object_converts_ids_and_dates():
    oid = ObjectId()
    now = datetime.now(timezone.utc)
    doc = {
        "_id": oid,
        "teacher_id": oid,
        "title": "Trigonometry Lesson",
        "created_at": now,
    }
    serialized = serialize_object(doc)
    assert serialized["id"] == str(oid)
    assert serialized["teacher_id"] == str(oid)
    assert serialized["title"] == "Trigonometry Lesson"
    assert isinstance(serialized["created_at"], str)


def test_generate_classroom_code_format():
    code = generate_classroom_code()
    assert len(code) == 6
    assert code.isalnum()
    assert code.isupper()

