"""SQLAlchemy models for IdeaForge.

Schema (V1):
    sessions        — one per forged idea
    ideas           — the user's raw idea text + compressed form (1:1 with session)
    phase_outputs   — one row per completed phase (the JSON + raw model text)
    canvas          — the merged full canvas JSON, versioned

V3 will add tags / session_tags for the Second Brain features.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), default="Untitled Idea")
    status: Mapped[str] = mapped_column(String(20), default="active")  # active|complete|archived
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    idea: Mapped["Idea | None"] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")
    phase_outputs: Mapped[list["PhaseOutput"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    canvas: Mapped["Canvas | None"] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")


class Idea(Base):
    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    raw_text: Mapped[str] = mapped_column(Text)
    compressed_idea: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[int | None] = mapped_column(Integer, nullable=True)

    session: Mapped["Session"] = relationship(back_populates="idea")


class PhaseOutput(Base):
    __tablename__ = "phase_outputs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    phase_key: Mapped[str] = mapped_column(String(20))  # clarify|assume|risk|milestone|first
    content_json: Mapped[dict] = mapped_column(JSON)
    raw_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    session: Mapped["Session"] = relationship(back_populates="phase_outputs")


class Canvas(Base):
    __tablename__ = "canvas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True, unique=True)
    full_json: Mapped[dict] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(Integer, default=1)

    session: Mapped["Session"] = relationship(back_populates="canvas")
