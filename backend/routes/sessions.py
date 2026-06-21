"""Session CRUD + history endpoints.

These are the non-streaming endpoints: create a session, load one back,
list history. The streaming phase runner lives in forge.py.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Canvas, Idea, PhaseOutput, Session
from .schemas import IdeaCreate, SessionCreated, SessionDetail, SessionSummary

router = APIRouter()


@router.post("/sessions", response_model=SessionCreated)
def create_session(payload: IdeaCreate, db: Session = Depends(get_db)):
    """Create a new IdeaForge session with the user's raw idea."""
    idea_text = payload.idea.strip()
    title = idea_text[:60].replace("\n", " ") + ("…" if len(idea_text) > 60 else "")

    session = Session(title=title, status="active")
    db.add(session)
    db.flush()  # get session.id
    db.add(Idea(session_id=session.id, raw_text=idea_text))
    db.add(Canvas(session_id=session.id, full_json={}, version=1))
    db.commit()
    db.refresh(session)
    return SessionCreated(id=session.id, title=session.title, idea=idea_text)


@router.get("/sessions", response_model=list[SessionSummary])
def list_sessions(db: Session = Depends(get_db)):
    """History list, newest first."""
    rows = db.execute(select(Session).order_by(desc(Session.created_at))).scalars().all()
    return [
        SessionSummary(id=r.id, title=r.title, status=r.status, created_at=r.created_at)
        for r in rows
    ]


def _load_session(db: Session, session_id: int) -> Session:
    session = db.get(Session, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return session


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """Full session: idea, canvas, all phase outputs. Used to restore UI state."""
    session = _load_session(db, session_id)
    idea = db.execute(select(Idea).where(Idea.session_id == session_id)).scalars().first()
    canvas = db.execute(select(Canvas).where(Canvas.session_id == session_id)).scalars().first()
    outputs = (
        db.execute(
            select(PhaseOutput).where(PhaseOutput.session_id == session_id)
        )
        .scalars()
        .all()
    )

    return SessionDetail(
        id=session.id,
        title=session.title,
        status=session.status,
        created_at=session.created_at,
        updated_at=session.updated_at,
        idea=idea.raw_text if idea else "",
        compressed_idea=idea.compressed_idea if idea else None,
        confidence=idea.confidence if idea else None,
        canvas=canvas.full_json if canvas else {},
        phase_outputs=[
            PhaseOutputOut(
                phase_key=o.phase_key,
                content_json=o.content_json,
                raw_text=o.raw_text,
                created_at=o.created_at,
            )
            for o in outputs
        ],
    )


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    """Delete a session and all its data (cascades to idea/outputs/canvas)."""
    session = _load_session(db, session_id)
    db.delete(session)
    db.commit()
    return {"deleted": session_id}
