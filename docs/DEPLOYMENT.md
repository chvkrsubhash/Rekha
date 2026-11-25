# Deployment Guide

1. Provision MongoDB Atlas (or self-hosted MongoDB 7) and set `MONGODB_URL` in `backend/.env`.
2. Generate a strong `SECRET_KEY` (minimum 32 characters).
3. Configure `ALLOWED_ORIGINS` with your production frontend domain.
4. Optionally set `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY` for AI features.
5. Run `docker compose up -d --build` or deploy `backend` with `uvicorn app.main:app` and `frontend/dist` behind Nginx with HTTPS/TLS.

