"""Pydantic request/response schemas for the API layer."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class IdeaCreate(BaseModel):
    idea: str = Field(..., min_length=10, max_length=2000)


class SessionCreated(BaseModel):
    id: int
    title: str
    idea: str


class PhaseOutputOut(BaseModel):
    phase_key: str
    content_json: dict[str, Any]
    raw_text: str
    created_at: datetime


class SessionDetail(BaseModel):
    id: int
    title: str
    status: str
    created_at: datetime
    updated_at: datetime
    idea: str
    compressed_idea: str | None = None
    confidence: int | None = None
    canvas: dict[str, Any] = Field(default_factory=dict)
    phase_outputs: list[PhaseOutputOut] = Field(default_factory=list)


class SessionSummary(BaseModel):
    id: int
    title: str
    status: str
    created_at: datetime


class HealthOut(BaseModel):
    status: str
    model: str
