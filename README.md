# IdeaForge — AI-Powered Zero-to-One Execution Engine

IdeaForge is an **execution intelligence system** that moves a user from
**Idea → Validation → MVP → Execution**. It is *not* a chatbot. It reasons
about an idea across five phases — clarifying the job, surfacing hidden
assumptions, mapping risks, designing milestones, and recommending one real
first action — then renders the result as a living **Execution Canvas**.

Built for the **USAII Global AI Hackathon 2026**, Undergraduate Track
(Direction B: Zero-to-One Builder).

> **First time here / picking up someone else's work?** Read
> [`ZODEREADMEFIRST.md`](ZODEREADMEFIRST.md) — it's the handoff doc that
> explains exactly what's done and what to build next. Full roadmap:
> [`docs/masterplan.md`](docs/masterplan.md).

---

## ✨ What it does

Type a vague idea. IdeaForge runs five reasoning phases, **streaming each one
live** (you watch the model think, then the answer appears, then the matching
Canvas card pops in):

1. **Clarify** — compress the idea to one crisp sentence (Jobs-to-be-Done + Mom Test)
2. **Assume** — surface 3 dangerous hidden assumptions (Pre-Mortem + System 1/2)
3. **Risk** — identify 3 execution risks + one Black Swan (Taleb fragility)
4. **Milestones** — 3 milestones, each with a measurable success criterion (Lean + Fogg)
5. **First Step** — ONE action doable in 24h that tests the riskiest assumption

Every output carries a **confidence meter** and a **"human must decide"** flag —
the responsible-AI guardrail the judges score.

---

## 🚀 Quick start

### Prerequisites
- Python 3.11+
- A free NVIDIA NIM API key from https://build.nvidia.com

### Run it
```bash
# Windows
run.bat

# Mac / Linux
./run.sh
```
The launcher creates a venv, installs deps, and copies `.env.example` → `.env`
on first run. **Edit `.env` and add your key:**
```
NVIDIA_API_KEY=nvapi-your-key-here
```
Then open **http://localhost:8000**.

### Manual setup
```bash
python -m venv .venv
.venv\Scripts\activate         # Windows
# source .venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
copy .env.example .env         # then edit in your key
uvicorn backend.main:app --reload --port 8000
```

---

## 🧱 Architecture

```
Browser  (frontend/index.html + app.js)
   │  fetch + ReadableStream  (NOT EventSource — needs AbortController for Stop)
   ▼
FastAPI  (backend/main.py)
   ├── routes/sessions.py   POST/GET/DELETE  /api/sessions[/{id}]
   ├── routes/forge.py      GET /api/sessions/{id}/stream?phase=N   ← SSE
   │       event: reasoning | token | phase_done | error
   └── SQLite  (sessions / ideas / phase_outputs / canvas)
            │
            ▼
   orchestrator.run_phase() → nim_client.stream_chat()
            │
            ▼
      NVIDIA NIM  (nvidia/nemotron-3-ultra-550b-a55b, streaming)
```

**Key design points:**
- The **NIM API key never reaches the browser** — it lives in `.env`, used server-side only.
- **Reasoning vs answer are separate streams.** `nim_client` normalises both GLM's
  `reasoning_content` field *and* Nemotron's inline `<think>` tags into one `reasoning` delta.
- **Every phase emits valid JSON** (the Canvas depends on it). If the first pass has no
  parseable JSON, the orchestrator does one enforcement retry (temp 0.2, thinking off).
- **Sessions persist to SQLite** — reload the page and your Canvas is restored.

### API
| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/health` | Health + active model |
| `POST` | `/api/sessions` | Create a session with `{idea}` |
| `GET`  | `/api/sessions` | List history |
| `GET`  | `/api/sessions/{id}` | Full session (idea + canvas + outputs) |
| `DELETE` | `/api/sessions/{id}` | Delete a session |
| `GET`  | `/api/sessions/{id}/stream?phase=N` | **SSE** stream of one phase |

---

## 📁 Project structure
```
IdeaForge/
├── backend/
│   ├── main.py          # FastAPI app, CORS, static mount, routers
│   ├── config.py        # Settings from .env (key stays here)
│   ├── nim_client.py    # Async NIM streaming client (from test.py)
│   ├── phases.py        # 5 phase prompts + JSON schemas (verbatim)
│   ├── orchestrator.py  # phase runner + JSON-enforcement retry
│   ├── json_utils.py    # JSON extraction helpers
│   ├── models.py        # SQLAlchemy models
│   ├── database.py      # engine/session/init_db
│   └── routes/
│       ├── forge.py     # SSE streaming endpoint
│       ├── sessions.py  # CRUD + history
│       └── schemas.py   # Pydantic models
├── frontend/
│   ├── index.html       # App shell + hero
│   ├── app.css          # Premium dark UI, glassmorphism, animations
│   └── app.js           # SSE client + Canvas renderer
├── docs/masterplan.md   # Full V1–V6 roadmap
├── test.py              # Original NIM/GLM CLI prototype (reference)
├── proxy.py             # Legacy CORS proxy (pre-backend)
└── ZODEREADMEFIRST.md   # Handoff doc for teammates/agents
```

---

## 🔑 Secrets
- `NVIDIA_API_KEY` lives in `.env` (gitignored). Get a free one at https://build.nvidia.com.
- Never commit `.env`. Share keys out-of-band only.

---

## 🗺️ Roadmap
- **V1 (done):** core engine + SSE streaming + premium UI + SQLite.
- **V2:** Phase-6 synthesis roadmap, interactive regen, exports, hero polish.
- **V3:** Obsidian vault export + history dashboard ("Second Brain" theme).
- **V4:** portfolio view, idea comparison, deployment, Devpost writeup.
- V5/V6: accounts, two-way Obsidian sync, marketplace.

See [`docs/masterplan.md`](docs/masterplan.md) for full detail.

---

## 🌳 Git workflow (multi-laptop / multi-agent)
```bash
git pull            # ALWAYS first
# ... build one thing ...
git add <file>
git commit -m "what + why"
git pull --rebase
git push
```
Never `--force` push to main. One logical change per commit. Full rules in
[`ZODEREADMEFIRST.md`](ZODEREADMEFIRST.md).
