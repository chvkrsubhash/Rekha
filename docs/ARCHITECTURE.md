# Rekha Architecture Overview

- **Canvas-First Client:** React + Konva.js stage renders vector ink strokes (`perfect-freehand`), geometric shapes, Unicode text (English, Telugu, Hindi), KaTeX equations, JSXGraph plots, PDF pages, and SVG educational diagrams.
- **Offline-First Persistence:** Changes are debounced into IndexedDB (`rekha-db`) and synchronized with FastAPI/MongoDB when online.
- **Real-Time Live Classroom:** FastAPI WebSocket manager (`/ws/classroom/{session_id}`) broadcasts teacher canvas updates, page navigation, laser pointer coordinates, raised hands, student questions, and quiz responses.
- **Security & Privacy:** Bcrypt password hashing, JWT access/refresh tokens, teacher-only route guards, and MIME/size validation on uploads.

