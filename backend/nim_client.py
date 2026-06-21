"""NVIDIA NIM streaming client.

Ported from test.py's proven streaming loop. Exposes an async generator
that yields typed delta chunks so the orchestrator can stream reasoning
and answer text separately to the browser via SSE.

Two delta kinds:
    {"kind": "reasoning", "text": "..."}   # chain-of-thought (greyed out)
    {"kind": "content",    "text": "..."}   # the actual answer (may contain JSON)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import AsyncIterator, Literal

from openai import AsyncOpenAI

from .config import get_settings

log = logging.getLogger("ideaforge.nim")

DeltaKind = Literal["reasoning", "content"]


@dataclass
class Delta:
    kind: DeltaKind
    text: str


class NIMError(RuntimeError):
    """Raised when NIM rejects a request or returns no usable output."""


def _client() -> AsyncOpenAI:
    s = get_settings()
    if not s.nvidia_api_key:
        raise NIMError(
            "NVIDIA_API_KEY is not set. Copy .env.example to .env and add your key."
        )
    return AsyncOpenAI(base_url=s.nim_base_url, api_key=s.nvidia_api_key, timeout=s.nim_timeout)


async def stream_chat(
    *,
    system: str,
    history: list[dict] | None = None,
    temperature: float = 0.6,
    max_tokens: int = 900,
    enable_thinking: bool = True,
    reasoning_budget: int = 4096,
) -> AsyncIterator[Delta]:
    """Stream a chat completion from NIM.

    Yields Delta(kind, text) chunks. Reasoning chunks (chain-of-thought)
    come first, then content chunks. The model is Nemotron/GLM — both expose
    reasoning either via a `reasoning_content` field (GLM) or inline
    `<think>` tags (Nemotron); we normalise inline <think> into reasoning
    deltas too so the UI never has to care.
    """
    s = get_settings()
    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)

    extra_body = {
        "chat_template_kwargs": {"enable_thinking": enable_thinking},
    }
    if enable_thinking:
        extra_body["reasoning_budget"] = reasoning_budget

    client = _client()
    try:
        completion = await client.chat.completions.create(
            model=s.nim_model,
            messages=messages,
            temperature=temperature,
            top_p=0.95,
            max_tokens=max_tokens,
            stream=True,
            extra_body=extra_body,
        )
    except Exception as e:  # noqa: BLE001 - surface any provider error cleanly
        raise NIMError(f"NIM request failed: {e}") from e

    # Inline <think>...</think> state machine (Nemotron format).
    # State lives across chunks so tags split across deltas are handled.
    parser = _ThinkParser()
    async for chunk in completion:
        choices = getattr(chunk, "choices", None)
        if not choices:
            continue
        delta = getattr(choices[0], "delta", None)
        if delta is None:
            continue

        # 1) Dedicated reasoning field (GLM-style).
        reasoning = getattr(delta, "reasoning_content", None)
        if reasoning:
            yield Delta("reasoning", reasoning)

        # 2) Normal content — may contain inline <think> blocks (Nemotron).
        content = getattr(delta, "content", None)
        if content:
            for kind, text in parser.feed(content):
                yield Delta(kind, text)

    # Flush whatever the parser is still holding (trailing partial tag).
    for kind, text in parser.flush():
        yield Delta(kind, text)


class _ThinkParser:
    """Stateful splitter for inline <think>...</think> across stream chunks.

    `feed(text)` returns [(kind, text), ...] and keeps at most one partial
    tag in a buffer so a tag split across two chunks is still recognised.
    `flush()` emits any buffered content once the stream ends.
    """

    _OPEN = "<think>"
    _CLOSE = "</think>"

    def __init__(self) -> None:
        self.in_think = False
        self.buf = ""

    def feed(self, text: str) -> list[tuple[DeltaKind, str]]:
        out: list[tuple[DeltaKind, str]] = []
        data = self.buf + text
        self.buf = ""
        kind_open: DeltaKind = "reasoning" if self.in_think else "content"
        tag = self._CLOSE if self.in_think else self._OPEN
        i = 0

        while i < len(data):
            pos = data.find(tag, i)
            if pos == -1:
                # No full tag found. Hold back a tail that *could* be the
                # start of a tag split across chunks, emit the rest.
                safe = len(data) - (len(tag) - 1)
                if safe > i:
                    out.append((kind_open, data[i:safe]))
                self.buf = data[max(i, safe):]
                return out
            # Emit everything up to the tag.
            if pos > i:
                out.append((kind_open, data[i:pos]))
            # Flip state.
            self.in_think = not self.in_think
            kind_open = "reasoning" if self.in_think else "content"
            tag = self._CLOSE if self.in_think else self._OPEN
            i = pos + (len(self._CLOSE) if not self.in_think else len(self._OPEN))

        # Consumed everything with no pending tag boundary.
        return out

    def flush(self) -> list[tuple[DeltaKind, str]]:
        if not self.buf:
            return []
        kind: DeltaKind = "reasoning" if self.in_think else "content"
        rest = self.buf
        self.buf = ""
        return [(kind, rest)]
