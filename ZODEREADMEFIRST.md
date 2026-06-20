# 🛟 ZODE README FIRST — Read this before touching the code

> **If Abi's laptop died mid-build, this file is your lifeline.**
> It tells you exactly what's done, what's half-done, and what to build next so
> the team can keep shipping IdeaForge toward the **June 21, 11:59 PM ET** deadline.

**Team:** Achiever's Syndicate — Abi (lead / ABAI), Atchaya, Thiru, Dharak
**Repo:** https://github.com/Achiever-s-Syndicate/IdeaForge
**Hackathon:** USAII Global AI 2026, Undergraduate Track, Direction B (Zero-to-One Builder)
**Full plan:** [`docs/masterplan.md`](docs/masterplan.md)

---

## ⚡ TL;DR — Where things stand right now

**V1 is functionally COMPLETE and pushed to GitHub.** Backend + streaming frontend
are wired and verified end-to-end (health, session CRUD, SSE format, static serving,
graceful missing-key handling). The ONLY thing needed for a live demo is a `.env`
with a real `NVIDIA_API_KEY`.

| Piece | Status | File |
|---|---|---|
| Masterplan | ✅ Done | `docs/masterplan.md` |
| `.gitignore`, `.env.example`, `requirements.txt` | ✅ Done | repo root |
| Backend: config | ✅ Done | `backend/config.py` |
| Backend: NIM streaming client | ✅ Done | `backend/nim_client.py` |
| Backend: 5 phase prompts + schemas | ✅ Done | `backend/phases.py` |
| Backend: JSON utils | ✅ Done | `backend/json_utils.py` |
| Backend: orchestrator (phase runner + retry) | ✅ Done | `backend/orchestrator.py` |
| Backend: DB models | ✅ Done | `backend/models.py`, `backend/database.py` |
| Backend: main.py + routes (forge/sessions) | ✅ Done | `backend/main.py`, `backend/routes/*` |
| Frontend: streaming UI (SSE + Canvas) | ✅ Done | `frontend/index.html`, `app.css`, `app.js` |
| README + run scripts | ✅ Done | repo root |
| **Live end-to-end test with a real NIM key** | ⏳ **NEEDS A KEY** | — |
| V2: Phase-6 synthesis, regen, exports | ❌ Not started | — |
| V3: Obsidian vault export + history | ❌ Not started | — |
| V4: portfolio + deployment + Devpost | ❌ Not started | — |

**NEXT TASK → add a real NIM key to `.env`, run `run.bat`, type an idea, and
verify Phase 1 streams + a Canvas card appears.** If that works, V1 is shippable
and you can move to V2 (see the "What to build next" section).

---

## 🚀 How to run what exists

### 1. Get the code
```bash
git clone https://github.com/Achiever-s-Syndicate/IdeaForge.git
cd IdeaForge
git pull          # ALWAYS pull first — multiple agents are committing
```

### 2. Install Python deps
```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
```

### 3. Add your NVIDIA NIM key
```bash
copy .env.example .env          # Windows
# cp .env.example .env          # Mac/Linux
```
Then edit `.env` and set `NVIDIA_API_KEY=nvapi-...` (get a free key at https://build.nvidia.com).
**The key lives server-side only — never put it in the browser or commit it.**
`.env` is in `.gitignore` so it won't leak.

### 4. (For now) prove the backend works
Once `main.py` exists (see below), run:
```bash
uvicorn backend.main:app --reload --port 8000
```
Open http://localhost:8000 — you should see the IdeaForge UI.

> ⚠️ Until `main.py` is written, only the library modules import. The CLI prototype
> `test.py` still works standalone: `set NVIDIA_API_KEY=nvapi-...` then `python test.py`.

---

## 🧱 Architecture in one paragraph

`ideaforge.html` (the original single-file product) is being rebuilt as a **FastAPI
backend + vanilla JS frontend**. The backend holds the NIM API key, streams phase
output over **Server-Sent Events (SSE)**, and persists sessions to **SQLite**. The
5 phase prompts + JSON schemas were copied **verbatim** from `ideaforge.html` into
`backend/phases.py` — do not "improve" them, the output format is load-bearing.

**Request flow:**
```
Browser (frontend/index.html)
   │  POST /api/sessions/{id}/stream?phase=N   (fetch + ReadableStream, NOT EventSource)
   ▼
FastAPI (backend/main.py → routes/forge.py)
   │  async generator of PhaseEvent(reasoning|token|phase_done|error)
   ▼
orchestrator.run_phase()  ──►  nim_client.stream_chat()  ──►  NVIDIA NIM (Nemotron, streaming)
                                   │  yields Delta(kind, text)
                                   │  reasoning_content (GLM) OR <think> tags (Nemotron)
                                   ▼
                            SSE lines → browser renders reasoning drawer + streamed answer + Canvas card
```

**Key design rules (don't break these):**
1. **Never put the API key in the browser.** It stays in `.env` / server only.
2. **Reasoning vs content are separate streams.** `nim_client` normalises both GLM's
   `reasoning_content` field and Nemotron's inline `<think>` tags into `reasoning` deltas.
3. **Every phase MUST emit valid JSON** (the Canvas depends on it). The orchestrator
   does one enforcement retry (temp 0.2, thinking off) if the first pass has no JSON.
4. **Phases are sequential** and each sees a `canvas_summary()` of prior phases.

---

## 🎯 What to build next (the actual next steps)

These are ordered. Do them one at a time, commit after each.

### STEP 1 — `backend/main.py` (the FastAPI app)
Create it with:
- An `app = FastAPI(title="IdeaForge")`
- CORS middleware allowing all origins (dev only — `allow_origins=["*"]`)
- Call `init_db()` on startup (from `backend/database.py`)
- Mount the frontend as static files at `/`: `app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")`
- Include routers: `app.include_router(forge.router, prefix="/api")` etc.
- A health check `GET /api/health` returning `{"status":"ok", "model": settings.nim_model}`
- `if __name__ == "__main__": uvicorn.run("backend.main:app", port=settings.port, reload=True)`

### STEP 2 — `backend/routes/forge.py` (the SSE endpoints) — **THE CORE**
This is the most important file. Endpoints:

**`POST /api/sessions`** — create a session + idea
- Body: `{"idea": "..."}` → creates `Session`, `Idea`, returns `{"id":..., "idea":...}`
- Title can be the first ~60 chars of the idea.

**`GET /api/sessions/{id}`** — load a session
- Returns session + idea + all phase_outputs + current canvas JSON.
- This is what the frontend calls on page load to restore state.

**`GET /api/sessions/{id}/stream?phase=N`** — **THE SSE STREAM** (0-indexed phase)
- Returns `StreamingResponse(media_type="text/event-stream")`.
- Internally calls `orchestrator.run_phase(PHASES[N], idea, canvas, history)`.
- For each `PhaseEvent`, emit an SSE line:
  - `reasoning` → `event: reasoning\ndata: {"text": "..."}\n\n`
  - `token` → `event: token\ndata: {"text": "..."}\n\n`
  - `phase_done` → `event: phase_done\ndata: {...the full dict...}\n\n`  **← on this event, persist: save a `PhaseOutput` row AND upsert the canvas JSON, then return.**
  - `error` → `event: error\ndata: {...}\n\n`
- **Build the SSE line helper carefully** — JSON-encode the data, join with `\n\n`.
- Load the current canvas from DB (the latest `Canvas` row for the session, or `{}`).
- Load history = the session's prior phase outputs as `[{"role":"assistant","content": raw_text}]`.

**`DELETE /api/sessions/{id}`** — delete a session (for the Reset button).

**SSE line format helper (use this exactly):**
```python
import json
def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
```

### STEP 3 — `backend/routes/sessions.py` (history list — small, can be V3)
**`GET /api/sessions`** — list all sessions newest first. Returns `[{"id","title","status","created_at"}]`.

### STEP 4 — The frontend (`frontend/index.html` + `app.css` + `app.js`)
**Start from the existing `ideaforge.html`** — copy it into `frontend/index.html` and
evolve it. The CSS + Canvas rendering + phase definitions are all reusable; what
changes is the **data flow**:

- **Remove** the NIM endpoint/proxy logic. The frontend now calls OUR backend only.
- **Create session:** `POST /api/sessions {idea}` → get `sessionId`.
- **Stream a phase:** use `fetch` + `ReadableStream` reader (NOT `EventSource` — we need
  GET with query params, which EventSource supports, but fetch gives us AbortController
  for a Stop button). Parse SSE lines: split on `\n\n`, each chunk has `event: X\ndata: {...}`.
  - On `reasoning` → append to the reasoning drawer (collapsible, greyed text).
  - On `token` → append to the current answer bubble (streams live).
  - On `phase_done` → store `data.json` into `state.canvas[phaseKey]`, re-render that
    Canvas card, mark phase done, advance the stepper.
  - On `error` → show error message + Retry button.
- **Load on page open:** `GET /api/sessions/{id}` if a `?session=` query param exists
  (or from `localStorage`), to restore a half-finished session.
- **Persistence is now the DB**, not `localStorage`. Keep a tiny localStorage of just
  the last `sessionId` so reloads restore state.

**Streaming fetch parser (proven pattern from the old index.html):**
```javascript
const res = await fetch(`/api/sessions/${id}/stream?phase=${n}`, {method:'GET'});
const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = '';
while (true) {
  const {done, value} = await reader.read();
  if (done) break;
  buf += dec.decode(value, {stream:true});
  let idx;
  while ((idx = buf.indexOf('\n\n')) !== -1) {
    const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
    const ev = (block.match(/^event: (.+)$/m)||[])[1] || 'message';
    const d = (block.match(/^data: (.+)$/m)||[])[1];
    if (d) handleEvent(ev, JSON.parse(d));
  }
}
```

### STEP 5 — README + run scripts (`run.bat`, `run.sh`)
- `run.bat`: activate venv, `uvicorn backend.main:app --reload --port 8000`
- `run.sh`: same for Mac/Linux.
- `README.md`: setup + run + architecture summary (mirror `docs/masterplan.md`).

---

## 🔑 API key & secrets

- **Where:** `.env` → `NVIDIA_API_KEY=nvapi-...` (server-side only).
- **Get one free:** https://build.nvidia.com → sign up → copy key.
- **Never** commit `.env`. It's gitignored. If you need to share the key among the
  team, do it over a private channel (Discord DM), not git.
- Default model: `nvidia/nemotron-3-ultra-550b-a55b`. `test.py` used `z-ai/glm-5.1`
  — both work on the same NIM endpoint, configurable via `NIM_MODEL` in `.env`.

---

## 🌳 Git rules for multi-laptop/multi-agent work

We learned this from the P2P agent setup (`agentchat.md`). Rules:

1. **ALWAYS `git pull` before you start.** Someone else may have pushed.
2. **Commit small, commit often** — after each working file, not at the end.
3. **`git pull --rebase` before `git push`** if someone pushed while you worked.
4. **Never `git reset` or `git push --force` on main.** Ever.
5. **One logical change per commit.** Don't bundle unrelated files.
6. **Write clear commit messages** — what + why. Other agents read these.

Standard loop:
```bash
git pull
# ... build one file ...
git add <that file>
git commit -m "Add backend NIM streaming client (ported from test.py)"
git pull --rebase
git push
```

---

## 🧪 How to know each piece works

- **NIM client works:** run `python -c "import asyncio; from backend.nim_client import stream_chat; [print(d.kind, repr(d.text)) async for d in stream_chat(system='Say hi', max_tokens=20)]"` (needs `.env` set). You should see reasoning then content.
- **Orchestrator works:** the same but call `run_phase(PHASES[0], 'a tutoring app', {})` and check the final `phase_done` event has parseable JSON.
- **Server works:** `uvicorn backend.main:app` → `curl http://localhost:8000/api/health` → `{"status":"ok",...}`.
- **Full flow works:** open browser, type idea, watch Phase 1 stream + a Canvas card appear.

---

## 🗺️ Roadmap reminder (full detail in docs/masterplan.md)

- **V1 (NOW):** core engine + SSE streaming + premium UI + SQLite. ← we are here
- **V2:** Phase-6 synthesis roadmap, interactive regen, exports, hero.
- **V3:** Obsidian vault export + history dashboard (the "Second Brain" theme).
- **V4:** portfolio view + comparison + deployment + Devpost writeup.
- V5/V6: future (accounts, two-way Obsidian sync, marketplace).

---

## 🆘 If you're totally stuck

1. Read `docs/masterplan.md` (the full plan) and `claudeidea.md` (the strategy/pitch).
2. The original working product is **`ideaforge.html`** — open it directly in a browser
   with `python proxy.py nvapi-YOURKEY` running, and it still works. That's your fallback demo.
3. `test.py` is a working NIM streaming reference — run it to confirm your API key works.
4. The phase prompts in `backend/phases.py` are sacred — copied verbatim from the
   working product. Don't rewrite them; if output looks wrong, it's a plumbing bug, not a prompt bug.

**You've got this. Ship V1. — Abi**
