"""Forge router — the streaming phase execution engine.

GET /sessions/{id}/stream?phase=N streams a single phase over SSE:
    event: reasoning   data: {"text": "..."}     # model chain-of-thought
    event: token       data: {"text": "..."}     # answer tokens (may contain JSON)
    event: phase_done  data: {...}                # parsed JSON + raw; persisted here
    event: error       data: {...}

On phase_done the orchestrator's parsed JSON is merged into the session's
canvas, a PhaseOutput row is upserted, and the canvas row is updated.
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import SessionLocal, get_db
from ..models import Canvas, Idea, PhaseOutput, Session
from ..orchestrator import run_phase
from ..phases import PHASES

log = logging.getLogger("ideaforge.forge")
router = APIRouter()


def _sse(event: str, data: dict) -> str:
    """Format one Server-Sent Event line. JSON-encode the payload."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.get("/sessions/{session_id}/stream")
def stream_phase(
    session_id: int,
    phase: int = Query(..., ge=0, le=len(PHASES) - 1, description="0-indexed phase number"),
    feedback: str | None = Query(None, description="Optional regen direction"),
    db: Session = Depends(get_db),
):
    """Stream one phase to completion, persisting the result on phase_done."""
    session = db.get(Session, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    idea = db.execute(
        select(Idea).where(Idea.session_id == session_id)
    ).scalars().first()
    if idea is None:
        raise HTTPException(status_code=404, detail="Session has no idea record")

    canvas_row = db.execute(
        select(Canvas).where(Canvas.session_id == session_id)
    ).scalars().first()
    canvas = dict(canvas_row.full_json) if canvas_row else {}
    history = _phase_history(db, session_id)

    # Snapshot the values the generator needs — the request DB session closes
    # once StreamingResponse returns, so the generator persists via SessionLocal.
    idea_text = idea.raw_text
    target_phase = PHASES[phase]

    async def event_stream():
        async for ev in run_phase(
            target_phase,
            idea_text,
            canvas,
            history=history,
            feedback=feedback,
        ):
            if ev.kind == "reasoning":
                yield _sse("reasoning", {"text": ev.data})
            elif ev.kind == "token":
                yield _sse("token", {"text": ev.data})
            elif ev.kind == "phase_done":
                _persist(target_phase, session_id, ev.data)
                yield _sse("phase_done", ev.data)
            elif ev.kind == "error":
                yield _sse("error", ev.data)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering (nginx etc.)
            "Connection": "keep-alive",
        },
    )


# ── persistence helpers ──────────────────────────────────────────────
def _persist(phase, session_id: int, phase_done_data: dict) -> None:
    """Upsert the PhaseOutput and merge the phase JSON into the canvas."""
    parsed = phase_done_data.get("json") or {}
    raw = phase_done_data.get("raw") or ""
    with SessionLocal() as db:
        # Upsert phase output (replace any prior output for this phase).
        existing = db.execute(
            select(PhaseOutput).where(
                PhaseOutput.session_id == session_id,
                PhaseOutput.phase_key == phase.key,
            )
        ).scalars().first()
        if existing:
            existing.content_json = parsed
            existing.raw_text = raw
        else:
            db.add(PhaseOutput(
                session_id=session_id, phase_key=phase.key,
                content_json=parsed, raw_text=raw,
            ))

        # Merge into the canvas JSON.
        canvas_row = db.execute(
            select(Canvas).where(Canvas.session_id == session_id)
        ).scalars().first()
        if canvas_row is None:
            canvas_row = Canvas(session_id=session_id, full_json={}, version=1)
            db.add(canvas_row)
        new_full = dict(canvas_row.full_json)
        new_full[phase.key] = parsed
        canvas_row.full_json = new_full
        canvas_row.version += 1

        # If this was Clarify, also denormalise compressed_idea/confidence onto Idea.
        if phase.key == "clarify":
            idea = db.execute(
                select(Idea).where(Idea.session_id == session_id)
            ).scalars().first()
            if idea:
                idea.compressed_idea = parsed.get("compressed_idea")
                try:
                    idea.confidence = int(parsed.get("confidence") or 0) or None
                except (TypeError, ValueError):
                    idea.confidence = None

        # Mark the session complete after the final phase.
        if phase.index == len(PHASES) - 1:
            sess = db.get(Session, session_id)
            if sess:
                sess.status = "complete"

        db.commit()


def _phase_history(db: Session, session_id: int) -> list[dict]:
    """Build the last-6-message history from prior phase outputs."""
    outputs = (
        db.execute(
            select(PhaseOutput).where(PhaseOutput.session_id == session_id)
        )
        .scalars()
        .all()
    )
    # Keep stable phase order (clarify, assume, ...) and last 6 messages.
    order = {p.key: i for i, p in enumerate(PHASES)}
    outputs.sort(key=lambda o: order.get(o.phase_key, 99))
    msgs = [{"role": "assistant", "content": o.raw_text} for o in outputs]
    return msgs[-6:]
