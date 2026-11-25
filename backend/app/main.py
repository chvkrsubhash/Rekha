"""
Rekha — Interactive Educational Whiteboard Platform
Backend Application Entry Point
by AkashaVyom Labs
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import time

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.api.router import api_router
from app.websocket.classroom import ws_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting Rekha API server...")
    try:
        await connect_to_mongo()
        logger.info("MongoDB connection established.")
    except Exception as exc:
        logger.warning("MongoDB connection unavailable on startup (%s). Configure MONGODB_URL in backend/.env.", exc)
    yield
    logger.info("Shutting down Rekha API server...")
    await close_mongo_connection()
    logger.info("MongoDB connection closed.")


app = FastAPI(
    title="Rekha API",
    description=(
        "Interactive Educational Whiteboard Platform by AkashaVyom Labs. "
        "Teach Better. Learn Visually."
    ),
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    openapi_url="/api/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_timing_middleware(request: Request, call_next):
    """Log request timing for performance monitoring."""
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{duration:.2f}ms"
    if duration > 1000:
        logger.warning(
            "Slow request: %s %s took %.0fms",
            request.method,
            request.url.path,
            duration,
        )
    return response


# ─── Static files ─────────────────────────────────────────────────────────────

import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router)  # WebSocket routes


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "company": "AkashaVyom Labs",
    }


# ─── Global Exception Handlers ────────────────────────────────────────────────

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )


@app.exception_handler(PermissionError)
async def permission_error_handler(request: Request, exc: PermissionError):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": "You do not have permission to perform this action."},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again."},
    )

