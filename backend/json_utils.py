"""Shared JSON extraction utilities.

These reproduce the parsing logic from ideaforge.html so the model output
is handled the same way the original product handled it.
"""
from __future__ import annotations

import json
import re
from typing import Any

_FENCED_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)
_OBJ_RE = re.compile(r"\{[\s\S]*\}")


def extract_json(text: str) -> dict[str, Any] | None:
    """Pull a JSON object out of a model response.

    Tries a fenced ```json block first, then falls back to the first
    {...} object in the text. Returns None if nothing parses.
    """
    if not text:
        return None
    m = _FENCED_RE.search(text)
    raw = m.group(1) if m else None
    if raw is None:
        m2 = _OBJ_RE.search(text)
        raw = m2.group(0) if m2 else None
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, ValueError):
        return None


def strip_json(text: str) -> str:
    """Remove fenced JSON blocks so prose stays clean for the chat UI."""
    if not text:
        return ""
    return _FENCED_RE.sub("", text).strip()
