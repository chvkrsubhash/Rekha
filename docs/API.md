# Rekha API Reference

Base URL: `/api/v1`

## Authentication (`/auth`)
- `POST /auth/register` — Register teacher, tutor, student, or admin account
- `POST /auth/login` — Authenticate and receive JWT access + refresh tokens
- `POST /auth/refresh` — Exchange refresh token for new access token
- `GET /auth/me` — Get current user profile
- `PUT /auth/me` — Update current user profile

## Whiteboards (`/whiteboards`)
- `GET /whiteboards/` — List user's whiteboards
- `POST /whiteboards/` — Create a whiteboard with initial blank page
- `GET /whiteboards/{id}` — Fetch whiteboard, pages, and canvas objects
- `PUT /whiteboards/{id}` — Update whiteboard metadata
- `DELETE /whiteboards/{id}` — Soft-delete whiteboard
- `POST /whiteboards/{id}/duplicate` — Duplicate whiteboard with all pages and objects
- `POST /whiteboards/{id}/pages` — Add a page
- `PUT /whiteboards/{id}/pages/{page_id}` — Update page name, background, or order
- `DELETE /whiteboards/{id}/pages/{page_id}` — Delete page
- `POST /whiteboards/{id}/pages/{page_id}/objects` — Add canvas object
- `PUT /whiteboards/{id}/pages/{page_id}/objects/{object_id}` — Update canvas object
- `DELETE /whiteboards/{id}/pages/{page_id}/objects/{object_id}` — Delete canvas object

## Classrooms & Live Sessions (`/classrooms`)
- `GET /classrooms/` — List classrooms
- `POST /classrooms/` — Create classroom with unique 6-character join code
- `POST /classrooms/join` — Student joins classroom with code
- `GET /classrooms/{id}/members` — List enrolled students
- `POST /classrooms/{id}/sessions` — Start a live classroom session
- `WS /ws/classroom/{session_id}?token=...` — Real-time whiteboard, raised hands, questions, and chat sync

## Lessons, Assignments, Templates, Media & AI
- `/lessons/` — CRUD, duplicate, share to classroom
- `/assignments/` — Create, submit, and grade assignments
- `/templates/` — Built-in and custom educational templates
- `/media/upload` — Upload PNG/JPEG/SVG/PDF assets
- `/ai/chat`, `/ai/generate/*` — Optional Gemini/Groq/OpenRouter teaching assistance

