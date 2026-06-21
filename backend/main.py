"""IdeaForge FastAPI application.

Wires together the routes, initialises the DB, serves the frontend as static
files, and exposes a health check.

Run:
    uvicorn backend.main:app --reload --port 8000
Then open http://localhost:8000
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import REPO_ROOT, get_settings
from .database import init_db
from .routes import forge, sessions
from .routes.schemas import HealthOut

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("ideaforge")

settings = get_settings()

app = FastAPI(title="IdeaForge", version="1.0.0")

# Dev CORS — allow the browser to call us from any origin (incl. file://).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    log.info("IdeaForge ready — model=%s port=%s", settings.nim_model, settings.port)


@app.get("/api/health", response_model=HealthOut, tags=["meta"])
def health() -> HealthOut:
    return HealthOut(status="ok", model=settings.nim_model)


# API routers
app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(forge.router, prefix="/api", tags=["forge"])

# Serve the frontend last (catch-all) so /api/* routes win.
frontend_dir = REPO_ROOT / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    log.warning(
        "frontend/ directory not found at %s — create it (see ZODEREADMEFIRST.md)",
        frontend_dir,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.port, reload=True)
