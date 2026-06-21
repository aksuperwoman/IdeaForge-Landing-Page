/* IdeaForge frontend — streaming client + Canvas renderer.
 *
 * Talks ONLY to our FastAPI backend (the NIM key never reaches the browser).
 * Phase execution = GET /api/sessions/{id}/stream?phase=N  (SSE via fetch +
 * ReadableStream, not EventSource, so we can AbortController a run).
 *
 * SSE events from the server:
 *   reasoning  {text}   model chain-of-thought  → reasoning drawer
 *   token      {text}   answer tokens           → message bubble (live)
 *   phase_done {json,raw,...}                    → merge into canvas, pop card
 *   error      {...}                             → error bubble + Retry
 */

const PHASES = [
  {key:"clarify",  name:"Clarify",   dot:"clarify"},
  {key:"assume",   name:"Assume",    dot:"assume"},
  {key:"risk",     name:"Risk",      dot:"risk"},
  {key:"milestone",name:"Milestones",dot:"mile"},
  {key:"first",    name:"First Step",dot:"first"},
];
const LAST_SESSION_KEY = "ideaforge.lastSession";

let state = {
  sessionId: null,
  idea: "",
  phase: 0,        // current/next phase index
  done: [],        // completed phase keys
  history: [],     // [{sender:'ai'|'user'|'error', text, ts, phase}]
  canvas: {},      // {phaseKey: parsedJson}
  busy: false,
};
let currentController = null;   // AbortController for the active stream

const $ = id => document.getElementById(id);
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timeStr = ts => new Date(ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});

// ─── init ────────────────────────────────────────────────────────────
async function init() {
  bind();
  renderPhaseNav();
  // Try to restore an in-progress session from a ?session= param or localStorage.
  const params = new URLSearchParams(location.search);
  const sid = params.get("session") || localStorage.getItem(LAST_SESSION_KEY);
  if (sid) await restoreSession(Number(sid));
  renderAll();
}

function bind() {
  $("ideaInput").addEventListener("input", e => {
    state.idea = e.target.value.trim();
    $("charCount").textContent = `${e.target.value.length} / 600`;
    updateReady();
  });
  $("startBtn").addEventListener("click", start);
  $("nextBtn").addEventListener("click", nextPhase);
  $("resetBtn").addEventListener("click", reset);
  $("clearLogBtn").addEventListener("click", () => { $("debugLog").textContent = "Console cleared."; });
  $("copyBtn").addEventListener("click", copyCanvas);
  $("exportBtn").addEventListener("click", exportChat);
}

// ─── health hint ─────────────────────────────────────────────────────
async function pingHealth() {
  try {
    const r = await fetch("/api/health");
    const d = await r.json();
    $("hint").textContent = `Backend OK · model: ${d.model}. Describe your idea and click Start Forging.`;
  } catch {
    $("hint").textContent = "Backend not reachable — is uvicorn running? (uvicorn backend.main:app --reload)";
  }
}

// ─── start a new forge ───────────────────────────────────────────────
async function start() {
  if (state.busy) return;
  const idea = $("ideaInput").value.trim();
  if (idea.length <= 10) { toast("Describe your idea first"); return; }

  $("startBtn").disabled = true;
  log("Creating session…", "ok");
  const r = await fetch("/api/sessions", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({idea}),
  });
  if (!r.ok) { toast("Failed to create session"); log(`POST /sessions → ${r.status}`, "err"); return; }
  const data = await r.json();
  state.sessionId = data.id;
  state.idea = data.idea;
  localStorage.setItem(LAST_SESSION_KEY, String(data.id));

  state.history = [{sender:"user", text:`My idea: ${state.idea}`, ts:Date.now(), phase:null}];
  $("ideaPanel").style.display = "none";
  $("hero").style.display = "none";
  log(`Session #${data.id} created`, "ok");
  renderConversation();
  await runPhase(0);
}

async function nextPhase() {
  const next = state.phase + 1;
  if (next >= PHASES.length || state.busy) return;
  await runPhase(next);
}

// ─── run ONE phase via SSE ───────────────────────────────────────────
async function runPhase(index) {
  if (state.busy || !state.sessionId) return;
  state.phase = index;
  state.busy = true;
  renderPhaseNav();
  renderFooter();

  const phase = PHASES[index];
  log(`▶ Phase ${index+1} (${phase.name}) — streaming…`, "ok");

  // Create the message bubble + reasoning drawer up front so tokens stream into it.
  const msg = appendAiMessage(index);
  const drawer = appendReasoningDrawer(msg);

  currentController = new AbortController();
  let contentBuf = "";
  let sawReasoning = false;

  try {
    const res = await fetch(
      `/api/sessions/${state.sessionId}/stream?phase=${index}`,
      {signal: currentController.signal},
    );
    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${errText}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buf += dec.decode(value, {stream:true});
      let sep;
      while ((sep = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        handleSSEBlock(block, msg, drawer, phase, index, /*accum*/{contentBuf:{v:contentBuf}, sawReasoning:{v:sawReasoning}});
      }
    }
  } catch (e) {
    if (e.name === "AbortError") {
      log("Stopped.", "warn");
    } else {
      log(`Stream error: ${e.message}`, "err");
      msg.body.innerHTML += `<div class="muted" style="color:var(--bad)">⚠ ${esc(e.message)}</div>`;
    }
  } finally {
    currentController = null;
    state.busy = false;
    setReasoningDone(drawer, sawReasoning);
    removeCursor(msg);
    renderFooter();
    // Re-read server truth: the canvas may have updated server-side on phase_done.
    await syncFromServer();
  }

  function handleSSEBlock(block, msg, drawer, phase, index, acc) {
    const ev = (block.match(/^event: (.+)$/m) || [])[1] || "message";
    const dataLine = (block.match(/^data: (.*)$/m) || [])[1];
    if (!dataLine) return;
    let data;
    try { data = JSON.parse(dataLine); } catch { return; }

    if (ev === "reasoning") {
      if (!acc.sawReasoning.v) { acc.sawReasoning.v = true; sawReasoning = true; drawer.classList.add("thinking","open"); }
      drawer.body.textContent += data.text;
      drawer.body.scrollTop = drawer.body.scrollHeight;
    } else if (ev === "token") {
      acc.contentBuf.v += data.text;
      contentBuf = acc.contentBuf.v;
      msg.body.innerHTML = formatText(stripJson(contentBuf)) + `<span class="cursor"></span>`;
      msg.bubble.scrollIntoView({behavior:"smooth", block:"end"});
    } else if (ev === "phase_done") {
      const json = data.json || {};
      state.canvas[phase.key] = json;
      if (!state.done.includes(phase.key)) state.done.push(phase.key);
      // Replace streaming answer with the clean prose (no JSON block).
      msg.body.innerHTML = formatText(stripJson(data.raw || contentBuf));
      log(`✓ Phase ${index+1} (${phase.name}) complete — canvas updated`, "ok");
      renderCanvas();
      renderPhaseNav();
    } else if (ev === "error") {
      log(`Phase error: ${data.message || "unknown"}`, "err");
      msg.body.innerHTML += `<div class="muted" style="color:var(--bad);margin-top:8px">⚠ ${esc(data.message || "error")}</div>`;
      msg.bubble.classList.add("error");
      appendRetry(msg, index);
    }
  }
}

// ─── DOM: message bubbles ────────────────────────────────────────────
function appendAiMessage(phaseIndex) {
  const bubble = document.createElement("article");
  bubble.className = "message ai";
  const phaseName = PHASES[phaseIndex]?.name || "";
  const head = document.createElement("div");
  head.className = "message-head";
  head.innerHTML = `<span class="phase-tag">Phase ${phaseIndex+1} — ${esc(phaseName)}</span><span>${timeStr(Date.now())}</span>`;
  const body = document.createElement("div");
  body.innerHTML = `<span class="cursor"></span>`;
  bubble.append(head, body);
  $("conversation").appendChild(bubble);
  bubble.scrollIntoView({behavior:"smooth", block:"end"});
  return {bubble, body};
}

function appendReasoningDrawer(msg) {
  const el = document.createElement("div");
  el.className = "reasoning";
  const head = document.createElement("div");
  head.className = "reasoning-head";
  head.innerHTML = `<span class="ic">▸</span> Reasoning`;
  const body = document.createElement("div");
  body.className = "reasoning-body";
  head.addEventListener("click", () => el.classList.toggle("open"));
  el.append(head, body);
  msg.bubble.after(el);
  // Hidden until we actually receive reasoning tokens.
  el.style.display = "none";
  return {el, head, body, classList: el.classList};
}

function setReasoningDone(drawer, sawReasoning) {
  if (!drawer.el) return;
  drawer.el.classList.remove("thinking");
  if (!sawReasoning) drawer.el.style.display = "none";
}
function removeCursor(msg) {
  msg.body.querySelectorAll(".cursor").forEach(c => c.remove());
}
function appendRetry(msg, index) {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "10px";
  const btn = document.createElement("button");
  btn.className = "btn primary"; btn.textContent = "Retry phase";
  btn.addEventListener("click", () => {
    msg.bubble.remove();
    runPhase(index);
  });
  wrap.append(btn);
  msg.body.append(wrap);
}

// ─── conversation render (full, for restore) ─────────────────────────
function renderConversation() {
  $("conversation").innerHTML = "";
  state.history.forEach(m => {
    if (m.sender === "user" && m.text.startsWith("My idea:")) {
      const b = document.createElement("article");
      b.className = "message user";
      b.innerHTML = `<div class="message-head"><span class="phase-tag">You</span><span>${timeStr(m.ts)}</span></div><div>${formatText(m.text)}</div>`;
      $("conversation").appendChild(b);
      return;
    }
    if (m.sender === "ai") {
      const phaseName = Number.isInteger(m.phase) ? PHASES[m.phase].name : "";
      const b = document.createElement("article");
      b.className = "message ai";
      b.innerHTML = `<div class="message-head"><span class="phase-tag">${phaseName ? "Phase "+(m.phase+1)+" — "+esc(phaseName) : "IdeaForge"}</span><span>${timeStr(m.ts)}</span></div><div>${formatText(stripJson(m.text))}</div>`;
      $("conversation").appendChild(b);
    }
  });
}

// ─── phase nav + footer ──────────────────────────────────────────────
function renderPhaseNav() {
  $("phaseNav").innerHTML = PHASES.map((p, i) => {
    const cls = state.phase === i && state.busy ? "active" : state.done.includes(p.key) ? "done" : "";
    return `<button class="phase ${cls}" type="button" disabled>${i+1}<br>${p.name}</button>`;
  }).join("");
}

function renderFooter() {
  const next = state.phase + 1;
  const hasNext = next < PHASES.length && state.done.length > 0 && !state.busy;
  $("followRow").style.display = hasNext ? "grid" : "none";
  if (hasNext) $("nextBtn").textContent = `Next: ${PHASES[next].name}`;
}

function renderAll() {
  pingHealth();
  renderPhaseNav();
  renderCanvas();
  renderFooter();
  const started = !!state.sessionId;
  $("hero").style.display = started ? "none" : "block";
  $("ideaPanel").style.display = started ? "none" : "block";
}

// ─── Canvas rendering (ported from ideaforge.html) ────────────────────
function renderCanvas() {
  const has = Object.keys(state.canvas).length > 0;
  $("emptyCanvas").style.display = has ? "none" : "grid";
  $("canvasContent").innerHTML = [renderClarify(), renderAssume(), renderRisk(), renderMilestone(), renderFirst()].join("");
}
function card(dot, title, body) {
  return `<section class="card"><h3><span class="dot ${dot}"></span>${esc(title)}</h3>${body}</section>`;
}
function renderClarify() {
  const d = state.canvas.clarify; if (!d) return "";
  const q = d.clarifying_questions || d.questions || [];
  return card("clarify", "Idea — Compressed",
    `<div class="strong">${esc(d.compressed_idea||"")}</div>
     ${q.length ? `<div class="item"><span class="muted">Clarifying questions:</span><br>${q.map(esc).join("<br>")}</div>` : ""}
     ${confidence(d.confidence||3)}`);
}
function renderAssume() {
  const d = state.canvas.assume; if (!d?.assumptions) return "";
  return card("assume", "Hidden Assumptions", d.assumptions.map(a => `
    <div class="item">
      <span class="pill sev${a.severity||3}">Severity ${esc(a.severity||3)}</span>
      <div class="strong">${esc(a.statement)}</div>
      <div class="muted">Risk: ${esc(a.risk_if_wrong)}</div>
      <div class="muted">Validate: ${esc(a.validation_method||a.validation)}</div>
    </div>`).join(""));
}
function renderRisk() {
  const d = state.canvas.risk; if (!d?.risks) return "";
  return card("risk", "Top Risks", `<div class="risk-grid">${d.risks.map(r => `
    <div class="mini">
      <div class="strong">${esc(r.name)}</div>
      <div class="muted">${esc(r.description)}</div>
      <div style="margin:7px 0"><span class="pill">Impact ${esc(r.impact)}/3</span> <span class="pill">Likely ${esc(r.likelihood)}/3</span></div>
      <div class="muted">Mitigation: ${esc(r.mitigation)}</div>
    </div>`).join("")}</div>`);
}
function renderMilestone() {
  const d = state.canvas.milestone; if (!d?.milestones) return "";
  return card("mile", "90-Day Milestones", d.milestones.map((m, i) => `
    <div class="item">
      <span class="pill">M${i+1}</span>
      <div class="strong">${esc(m.name)} <span class="muted">(${esc(m.duration)})</span></div>
      <div class="muted">${(m.deliverables||[]).map(esc).join(" · ")}</div>
      <div class="muted" style="color:var(--ok)">✓ ${esc(m.success_criterion)}</div>
      ${m.learning ? `<div class="muted" style="font-style:italic;margin-top:3px">🔬 ${esc(m.learning)}</div>` : ""}
    </div>`).join(""));
}
function renderFirst() {
  const d = state.canvas.first; if (!d) return "";
  return card("first", "First 24-Hour Step", `
    <div class="mini first-box">
      <div class="strong">→ ${esc(d.first_step)}</div>
      <div class="muted" style="margin-top:5px">⏱ ${esc(d.time_estimate)} · Validates: ${esc(d.validates_assumption||d.validates)}</div>
      ${d.success_signal ? `<div class="muted" style="margin-top:4px;color:var(--ok)">✓ YES: ${esc(d.success_signal)}</div>` : ""}
      ${d.failure_signal ? `<div class="muted" style="margin-top:2px;color:var(--warn)">✗ NO: ${esc(d.failure_signal)}</div>` : ""}
    </div>
    <div class="mini human-box" style="margin-top:8px">
      <div class="strong">🤝 Human must decide</div>
      <div>${esc(d.human_decision_required||d.human_decision)}</div>
      <div class="muted">${esc(d.why_human)}</div>
    </div>`);
}
function confidence(value) {
  const v = Math.max(1, Math.min(5, Number(value) || 3));
  const color = v <= 2 ? "var(--bad)" : v === 3 ? "var(--warn)" : "var(--ok)";
  return `<div class="confidence"><span class="muted">Confidence</span><div class="bar"><div class="fill" style="width:${v*20}%;background:${color}"></div></div><span class="muted">${v}/5</span></div>`;
}

// ─── text helpers ────────────────────────────────────────────────────
function stripJson(text) {
  return String(text||"").replace(/```json[\s\S]*?```/ig, "").replace(/```[\s\S]*?```/ig, "").trim();
}
function formatText(text) {
  return esc(text).replace(/\n/g, "<br>");
}

// ─── sync state from the server (source of truth) ────────────────────
async function syncFromServer() {
  if (!state.sessionId) return;
  try {
    const r = await fetch(`/api/sessions/${state.sessionId}`);
    if (!r.ok) return;
    const d = await r.json();
    if (d.canvas && Object.keys(d.canvas).length) state.canvas = d.canvas;
    state.done = (d.phase_outputs || []).map(o => o.phase_key);
    state.history = (d.phase_outputs || []).map(o => ({sender:"ai", text:o.raw_text, ts:new Date(o.created_at).getTime(), phase: PHASES.findIndex(p=>p.key===o.phase_key)}));
    if (state.history.length === 0 && state.idea) {
      state.history = [{sender:"user", text:`My idea: ${state.idea}`, ts:Date.now(), phase:null}];
    }
    renderCanvas();
    renderPhaseNav();
    renderConversation();
    renderFooter();
  } catch (e) { /* ignore transient */ }
}

async function restoreSession(sid) {
  try {
    const r = await fetch(`/api/sessions/${sid}`);
    if (!r.ok) return;
    const d = await r.json();
    state.sessionId = d.id;
    state.idea = d.idea;
    state.canvas = d.canvas || {};
    state.done = (d.phase_outputs || []).map(o => o.phase_key);
    state.phase = Math.min(state.done.length, PHASES.length - 1);
    state.history = (d.phase_outputs || []).map(o => ({sender:"ai", text:o.raw_text, ts:new Date(o.created_at).getTime(), phase: PHASES.findIndex(p=>p.key===o.phase_key)}));
    if (state.history.length === 0 && state.idea) {
      state.history = [{sender:"user", text:`My idea: ${state.idea}`, ts:new Date(d.created_at), phase:null}];
    }
    log(`Restored session #${d.id} — ${d.title}`, "ok");
  } catch (e) {
    localStorage.removeItem(LAST_SESSION_KEY);
  }
}

// ─── export / copy / reset ───────────────────────────────────────────
function buildExportText(canvasOnly) {
  const lines = ["IDEAFORGE EXECUTION CANVAS", ""];
  const add = (title, val) => { if (val) lines.push(title.toUpperCase(), String(val), ""); };
  add("Idea", state.canvas.clarify?.compressed_idea);
  if (state.canvas.assume?.assumptions) add("Assumptions", state.canvas.assume.assumptions.map((a,i)=>`${i+1}. ${a.statement} | Validate: ${a.validation_method||a.validation}`).join("\n"));
  if (state.canvas.risk?.risks) add("Risks", state.canvas.risk.risks.map((r,i)=>`${i+1}. ${r.name}: ${r.mitigation}`).join("\n"));
  if (state.canvas.milestone?.milestones) add("Milestones", state.canvas.milestone.milestones.map((m,i)=>`${i+1}. ${m.name} (${m.duration}) — ${m.success_criterion}`).join("\n"));
  if (state.canvas.first) add("First Step", `${state.canvas.first.first_step}\nHuman decision: ${state.canvas.first.human_decision_required||state.canvas.first.human_decision}`);
  if (!canvasOnly) {
    lines.push("CLEAN CONVERSATION", "");
    state.history.filter(m => m.sender !== "error").forEach(m => lines.push(`[${m.sender}] ${stripJson(m.text)}`, ""));
  }
  return lines.join("\n");
}
function copyCanvas() {
  navigator.clipboard.writeText(buildExportText(true)).then(() => toast("Canvas copied")).catch(() => toast("Copy failed"));
}
function exportChat() {
  const blob = new Blob([buildExportText(false)], {type:"text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ideaforge-canvas.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}
async function reset() {
  if (!confirm("Clear this IdeaForge session and start over?")) return;
  if (currentController) currentController.abort();
  if (state.sessionId) {
    try { await fetch(`/api/sessions/${state.sessionId}`, {method:"DELETE"}); } catch {}
  }
  localStorage.removeItem(LAST_SESSION_KEY);
  state = {sessionId:null, idea:"", phase:0, done:[], history:[], canvas:{}, busy:false};
  $("ideaInput").value = "";
  $("charCount").textContent = "0 / 600";
  $("conversation").innerHTML = "";
  renderAll();
}

// ─── console + toast ─────────────────────────────────────────────────
function log(message, type) {
  const el = $("debugLog");
  if (el.textContent.startsWith("Ready") || el.textContent === "Console cleared.") el.textContent = "";
  const line = document.createElement("div");
  line.className = type || "";
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}
function toast(msg) {
  $("toast").textContent = msg;
  $("toast").style.display = "block";
  setTimeout(() => $("toast").style.display = "none", 1800);
}
function updateReady() {
  $("startBtn").disabled = state.busy || $("ideaInput").value.trim().length <= 10;
}

init();
