# Rekha — Interactive Educational Whiteboard & Digital Classroom Platform

**A product of AkashaVyom Labs** | *Teach Better. Learn Visually.*

Rekha is a browser-based interactive teaching whiteboard built for school teachers, college professors, tuition teachers, coaching institutes, and students. The core whiteboard works completely offline and without paid AI subscriptions.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Konva.js (`react-konva`), `perfect-freehand`, TipTap, KaTeX, JSXGraph, PDF.js, Radix UI, Lucide Icons, Zustand, IndexedDB (`idb`)
- **Backend:** Python FastAPI, Motor (MongoDB async driver), WebSockets, JWT (`python-jose`, `passlib[bcrypt]`), Pydantic v2
- **AI (Optional):** Provider-independent endpoints supporting Google Gemini, Groq, and OpenRouter

## Getting Started

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MONGODB_URL and SECRET_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

### 3. Docker Compose

```bash
docker compose up --build
```

## Documentation

- [API Reference](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Teacher User Guide](docs/TEACHER_GUIDE.md)
- [Student User Guide](docs/STUDENT_GUIDE.md)

