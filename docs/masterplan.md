# IdeaForge — Development Masterplan

IdeaForge is an **execution intelligence system** that moves a user from
Idea → Validation → MVP → Execution. It is **not a chatbot**. It reasons
about ideas, discovers assumptions, identifies risks, finds blind spots,
generates MVP plans, and recommends a single first action.

Built for the USAII Global AI Hackathon 2026, Undergraduate Track
("AI for Life, Learning & Work" — Direction B: Zero-to-One Builder).

---

## Locked decisions
- **Build base:** evolve the existing `ideaforge.html` (5-phase engine) into V1.
- **Backend:** Python + FastAPI (matches `test.py` NIM streaming + `proxy.py`).
- **Obsidian:** in scope for V3–V4 (hackathon theme is "Second Brain for Real Life").
- **Pace:** ship V1 now, then V2–V4 to hit the June 21 deadline.

---

## V1 — Core Engine + Real-time Streaming (1 day)
**Goal:** Evolve the working 5-phase engine into a FastAPI-backed system with
live SSE streaming and a premium UI. Submission-ready MVP.

**Features**
- 5-phase engine (Clarify → Assume → Risk → Milestones → First Step).
- **SSE streaming** — reasoning + answer tokens arrive live.
- **Real-time UX** (no static loaders): phase stepper lights up, a collapsible
  reasoning drawer streams the model's thinking, answer text streams token by
  token, and each Canvas card pops in the instant its phase completes.
- Canvas: confidence meter, severity pills, risk grid, milestone cards,
  "First Step" + "Human must decide" box.
- SQLite session persistence — reload the tab, your canvas is still there.
- Responsible AI panel (confidence + human-decision) on every output.

**NOT built yet:** accounts, Obsidian, roadmap synthesis, deployment.
**Complexity:** Medium · ~1 day · reuses ~80% of existing logic + prompts.

## V2 — Living Execution Roadmap + Demo Polish (hackathon day 2)
- Phase 6 Synthesis: a 6th AI pass weaves the 5 outputs into a single timeline Roadmap.
- Interactive Canvas: per-card Regenerate / Tighten (re-run one phase, streamed).
- Deeper coaching chat grounded in full Canvas context.
- Beautiful export (Markdown + PDF).
- Landing hero replacing the empty input panel.
**NOT built yet:** accounts, Obsidian, cross-device sync. **Complexity:** Medium-High.

## V3 — Second Brain: Obsidian Export + History (hackathon day 3)
- Obsidian-flavored export: Markdown + YAML frontmatter + `[[wikilinks]]`.
- History dashboard: list / search / reopen past forged ideas.
- Tag system; cross-idea linking suggestions.
- Download single `.md` or full `.zip` vault.
**NOT built yet:** live two-way sync, accounts, sharing. **Complexity:** Medium.

## V4 — Portfolio Intelligence + Submission Package (hackathon day 4)
- Portfolio view: all ideas' risks/assumptions side by side.
- Idea comparison: AI compares 2 ideas on viability, risk, founder-fit.
- Responsible-AI dashboard: aggregate confidence + system uncertainty.
- Deployment (Render/Railway) for a live judge-demo link.
- Devpost writeup fields drafted from the codebase.
**Complexity:** Medium-High · submission day.

## V5 — Accounts, Sync, Two-way Obsidian (future)
Auth (email/OAuth), cloud sync, **live two-way Obsidian vault sync**, team sharing.

## V6 — Ecosystem & Marketplace (future)
Template marketplace, Notion/Linear/Trello integrations, public idea feed.

---

## Folder Structure
```
IdeaForge/
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── run.bat / run.sh
├── backend/
│   ├── main.py           # FastAPI app + static mount for frontend
│   ├── config.py         # Settings (NIM model/key/endpoint, ports)
│   ├── nim_client.py     # NIM streaming client (ported from test.py)
│   ├── phases.py         # 5 phase prompts + JSON schemas
│   ├── orchestrator.py   # phase execution engine + canvasSummary
│   ├── models.py         # SQLAlchemy models
│   ├── database.py       # engine/session
│   └── routes/
│       ├── forge.py      # SSE phase streaming
│       ├── sessions.py   # session CRUD + history
│       └── export.py     # md/pdf/vault export
├── frontend/
│   ├── index.html        # evolved ideaforge.html (streaming UI)
│   ├── app.css
│   └── app.js
├── tests/
└── docs/
    └── masterplan.md     # this file
```

## Tech Stack
- **Backend:** Python 3.11 + FastAPI + Uvicorn + SQLAlchemy + SQLite (→ Postgres V5).
- **LLM:** NVIDIA NIM (`https://integrate.api.nvidia.com/v1`), model
  `nvidia/nemotron-3-ultra-550b-a55b` (configurable via `NIM_MODEL`), key in
  `NVIDIA_API_KEY` (server-side only — no key in the browser).
- **Streaming:** Server-Sent Events (FastAPI `StreamingResponse`).
- **Frontend:** vanilla HTML/CSS/JS (evolve ideaforge.html; no framework).

## Database Schema (SQLite → Postgres)
- `sessions(id, title, status, created_at, updated_at)`
- `ideas(id, session_id, raw_text, compressed_idea, confidence)`
- `phase_outputs(id, session_id, phase_key, content_json, raw_text, created_at)`
- `canvas(id, session_id, full_json, version)`
- `tags(id, name)` · `session_tags(session_id, tag_id)`  *(V3)*

## API Architecture
- `POST   /api/sessions` — create session + idea
- `GET    /api/sessions/{id}` — full session + canvas
- `GET    /api/sessions/{id}/stream?phase=N` — **SSE** (events: `reasoning`, `token`, `phase_done{json}`, `error`)
- `POST   /api/sessions/{id}/regen` — regen one phase with feedback (SSE) *(V2)*
- `POST   /api/sessions/{id}/synthesize` — roadmap synthesis (SSE) *(V2)*
- `POST   /api/sessions/{id}/chat` — coaching follow-up (SSE) *(V2)*
- `GET    /api/sessions/{id}/export?format=md|vault|pdf` *(V2/V3)*
- `GET    /api/sessions` — history list *(V3)*

## AI Workflow Architecture
1. Orchestrator runs phases sequentially; each phase builds its system prompt from
   the idea + a `canvasSummary()` of prior phases.
2. Each phase call: system prompt + last-6-message history → NIM stream → split
   `reasoning_content` (live reasoning drawer) from `content` (streamed answer + JSON parse).
3. Parse JSON → merge into canvas → emit `phase_done` → next phase.
4. JSON-enforcement retry: if no valid JSON, one retry at temp 0.2 with thinking disabled.
5. V2 adds Phase-6 synthesis; V4 adds cross-idea comparison.

## Streaming Response Architecture
- **Server:** FastAPI `StreamingResponse` yielding SSE lines:
  `event: reasoning\ndata: {tok}\n\n`, `event: token\ndata: {tok}\n\n`,
  `event: phase_done\ndata: {parsedJson}\n\n`.
- **Browser:** `fetch` + `ReadableStream` reader parsing SSE (the pattern already
  proven in `index.html`) — not `EventSource`, so we can POST and read bodies.
- **UX timing:** reasoning streams first (collapsible drawer), answer tokens stream
  into the message bubble, then the matching Canvas card animates in on `phase_done`.

## Obsidian Integration Plan (V3–V4)
- **Export shape:** a vault folder of `.md` files with YAML frontmatter:
  - `Ideas/{slug}.md` — main Canvas (frontmatter: `type`, `confidence`, `tags`, `links`).
  - `Assumptions/{slug}.md`, `Risks/{slug}.md`, `Milestones/{slug}.md` — one note per item,
    `[[wikilink]]`-ed back to the idea.
- Tags + backlinks let Obsidian's graph view visualize an idea's risk/assumption web.
- Delivered as `.zip` (V3); V4 adds optional cross-idea linking suggestions before export.
