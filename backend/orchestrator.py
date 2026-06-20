"""Phase orchestration — runs one phase, streams deltas, enforces JSON.

The orchestrator is the bridge between the NIM streaming client and the SSE
endpoint. For a single phase it:

  1. builds the system prompt (idea + canvas summary of prior phases),
  2. streams reasoning then content tokens back as typed events,
  3. parses the JSON out of the content,
  4. if parsing fails, does ONE retry with thinking disabled + a hard
     "output only JSON" prompt (the retryJsonEnforce behaviour).

It yields PhaseEvent objects; the route layer formats them into SSE lines.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import AsyncIterator, Literal

from .config import get_settings
from .json_utils import extract_json
from .nim_client import NIMError, stream_chat
from .phases import PHASE_BY_KEY, SCHEMA_HINTS, Phase, canvas_summary

log = logging.getLogger("ideaforge.orch")

EventKind = Literal["reasoning", "token", "phase_done", "error"]


@dataclass
class PhaseEvent:
    kind: EventKind
    """Event payload — a token string for reasoning/token, a dict for
    phase_done/error (containing at minimum `phase` and `phase_name`)."""
    data: dict | str


async def run_phase(
    phase: Phase,
    idea: str,
    canvas: dict,
    history: list[dict] | None = None,
    *,
    feedback: str | None = None,
) -> AsyncIterator[PhaseEvent]:
    """Stream a single phase.

    `feedback` (optional) turns this into a "regenerate with notes" run —
    appended to the user message so the model tightens its output.
    """
    system = phase.system(idea, canvas_summary(canvas))
    full_content: list[str] = []

    try:
        async for delta in stream_chat(
            system=system,
            history=history,
            temperature=phase.temp,
            max_tokens=phase.tokens,
            enable_thinking=True,
        ):
            if delta.kind == "reasoning":
                yield PhaseEvent("reasoning", delta.text)
            else:
                full_content.append(delta.text)
                yield PhaseEvent("token", delta.text)
    except NIMError as e:
        yield PhaseEvent("error", {"phase": phase.key, "phase_name": phase.name, "message": str(e)})
        return

    content = "".join(full_content)
    parsed = extract_json(content)

    if parsed is None:
        # One-shot JSON enforcement retry, thinking off, temp low.
        log.warning("phase %s produced no JSON — retrying with enforcement", phase.key)
        retry_content = await _enforce_json(phase, idea, content, feedback)
        if retry_content is not None:
            for tok in retry_content:
                yield PhaseEvent("token", tok)
            content = content + "\n\n" + retry_content
            parsed = extract_json(content) or extract_json(retry_content)

    if parsed is None:
        yield PhaseEvent(
            "error",
            {
                "phase": phase.key,
                "phase_name": phase.name,
                "message": "The model did not return valid JSON for this phase.",
                "raw": content,
            },
        )
        return

    yield PhaseEvent("phase_done", {"phase": phase.key, "phase_name": phase.name, "json": parsed, "raw": content})


async def _enforce_json(
    phase: Phase, idea: str, previous: str, feedback: str | None
) -> str | None:
    """One retry asking only for the JSON block. Returns the streamed text
    or None if it also failed (network error etc)."""
    schema = SCHEMA_HINTS.get(phase.key, "{}")
    note = f"\n\nExtra direction from the founder: {feedback}" if feedback else ""
    system = (
        f"You are IdeaForge. Output ONLY a JSON code block. No prose, no "
        f"explanation. Just the JSON fenced block. The user idea is: \"{idea}\".{note}"
    )
    user = (
        f"Your previous response was missing the required JSON block. "
        f"Output ONLY this JSON now:\n\n{schema}"
    )
    pieces: list[str] = []
    try:
        async for delta in stream_chat(
            system=system,
            history=[{"role": "user", "content": user}],
            temperature=0.2,
            max_tokens=700,
            enable_thinking=False,
        ):
            if delta.kind == "content":
                pieces.append(delta.text)
    except NIMError as e:
        log.error("JSON enforcement retry failed: %s", e)
        return None
    return "".join(pieces)
