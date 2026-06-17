Now let me give you the complete plan. No fluff.Here is the complete, no-fluff battle plan to win the grand prize against 427 teams.

---

## THE WINNER: **IdeaForge** — AI-Powered Zero-to-One Execution Engine

**Pitch:** *We built IdeaForge to help aspiring founders and creators solve the "idea graveyard" problem — the gap between having an idea and taking a first real step — using AI that structures thinking, surfaces blind spots, and produces a living execution plan, not just a task list.*

---

## TASK 1–3: IDEATE → FILTER → TOP 5

After generating and eliminating 20 concepts, here are the 5 survivors and the final pick:

**Eliminated (summary):** Multi-agent systems (too complex), ML-training-required ideas, Obsidian vault integrations (too niche, hard to demo), voice note processors (audio infra overhead), knowledge graph builders (no clean demo moment), job market analyzers (data pipeline heavy), RAG over personal docs (setup too involved for 4 days).

**Top 5 Survivors:**

| # | Name | Pitch | MVP Difficulty | Demo Strength | 4-Day Completion |
|---|------|-------|:-:|:-:|:-:|
| 1 | **IdeaForge** | Structured idea → execution plan via AI Socratic dialogue | 4 | 10 | 9 |
| 2 | AssumptionCrusher | Surfaces hidden assumptions in any plan | 5 | 8 | 8 |
| 3 | MilestoneMap | Vague goal → 30/60/90 day roadmap | 4 | 7 | 9 |
| 4 | RiskRadar | Identifies top 5 risks in any startup idea | 3 | 7 | 10 |
| 5 | PivotSim | Simulates 3 different execution paths for one idea | 6 | 8 | 7 |

**Winner: IdeaForge** — combines all of 2–5 into one coherent, demonstrable flow. It's the only one judges can *watch* doing reasoning in real-time. Everything else is a feature of IdeaForge.

---

## TASK 4: THE SYSTEM

**What makes IdeaForge different from ChatGPT or a task generator:**

The AI does **not** ask "what do you want to build?" and dump a list. It runs a structured **5-phase interrogation engine**:

```
Phase 1 → CLARIFY    — Compress the idea to one crisp sentence
Phase 2 → ASSUME     — Surface the 3 biggest hidden assumptions
Phase 3 → RISK       — Identify top risks with severity ratings
Phase 4 → MILESTONE  — Break into 3 milestones with success criteria
Phase 5 → FIRST STEP — Identify ONE specific action the user can do in 24h
```

Each phase uses a **different system prompt strategy** — not just "continue the conversation." The AI reasons out loud. The output is a **living Execution Canvas** that updates as the user responds.

**The responsible AI hook (judges love this):** IdeaForge shows a **Confidence Meter** on every output — explicitly telling the user "this assumption has low confidence — you must validate this yourself." The AI never says "do this." It says "here's what we think — now you decide."

---

## TASK 5: 5-STAGE ROADMAP (for IdeaForge)

Here's the complete build plan:---

## TASK 6 & 7: ARCHITECTURE + BUILD PLAN

### Architecture### Day-by-Day Task Breakdown---

## The 5-Phase System Prompts (AI Lead's Day 1 Core Deliverable)

Each phase gets its own system prompt injected before the user's message. Here's the exact structure:

**Phase 1 — CLARIFY**
> *"You are an execution coach. The user has a vague idea. Your job: compress it to ONE crisp sentence in the format 'I am building [X] for [who] to solve [problem].' Ask at most 2 clarifying questions. Output JSON: {compressed_idea, clarifying_questions[], confidence: 1-5}"*

**Phase 2 — ASSUME**
> *"Given this idea: [compressed_idea]. List the 3 most dangerous hidden assumptions the founder is making. For each: state the assumption, why it might be wrong, and what evidence would validate it. Output JSON: {assumptions: [{statement, risk_if_wrong, validation_method, severity: 1-5}]}"*

**Phase 3 — RISK**
> *"Given this idea and its assumptions: identify the top 3 execution risks. Rate each on impact (1-3) and likelihood (1-3). Include one risk the user probably hasn't thought of. Output JSON: {risks: [{name, description, impact, likelihood, mitigation}]}"*

**Phase 4 — MILESTONE**
> *"Given everything above: generate 3 milestones for the next 90 days. Each milestone must have: a name, a duration, 2-3 concrete deliverables, and ONE measurable success criterion. Be specific. Output JSON: {milestones: [{name, duration, deliverables[], success_criterion}]}"*

**Phase 5 — FIRST STEP**
> *"Given everything above: what is the ONE thing this person should do in the next 24 hours? It must be free, completable in under 2 hours, and will directly validate their riskiest assumption. Also flag: what decision does the AI NOT make, and why must the human decide. Output JSON: {first_step, time_estimate, validates_assumption, human_decision_required, why_human}"*

---

## The Demo Plan (3–5 min video)

**Demo Scenario: "A student wants to build a peer tutoring marketplace for college students"** — vague enough to be real, specific enough to show the system working.

**Video Structure:**

**0:00–0:45 — The Problem** (show screen of someone staring at Notion with 47 half-formed ideas)
> *"Every founder has ideas. None of them have a first step. ChatGPT gives you a list. We give you a plan built on reasoning."*

**0:45–2:00 — Live Demo of All 5 Phases** (the wow moment)
- Type the idea. Watch Phase 1 compress it.
- See Phase 2 surface "you're assuming students will pay — they won't." Confidence meter shows red.
- Watch Phase 3 generate the risk matrix visually.
- See milestones appear with success criteria (not just tasks).
- Phase 5: "Your first step: spend 30 minutes in a university Discord asking 10 students if they've ever paid for peer tutoring."

**2:00–2:45 — The Responsible AI Moment** (judges score this 10%)
> *"IdeaForge never tells you what to do. See this panel? 'Human decision required: only you know your risk tolerance and available time.' Every output shows confidence. We show uncertainty — we don't hide it."*

**2:45–3:30 — Architecture in 30 seconds**
> *"Five dedicated AI phases. Each with a structured output schema. Reasoning is shown, not hidden. Built on Claude Sonnet. No backend."*

**3:30–4:00 — Impact close**
> *"We built this because idea graveyards kill potential. IdeaForge turns a vague idea into a first real step in under 10 minutes."*

---

## Why IdeaForge Beats 427 Teams

Most teams will build one of three things: a chatbot wrapper, a task generator, or a pros/cons UI. IdeaForge is none of these.

**The unfair advantages:**

1. **Visible reasoning** — judges can watch the AI think, not just see an output. That directly addresses the 30% "AI Reasoning" dimension.
2. **Structured 5-phase flow** — it's a system, not a prompt. Judges understand systems.
3. **Confidence Meter** — explicitly shows uncertainty. Most teams will present false confidence. You'll be the only team that doesn't.
4. **No backend** — ships in one day, zero infrastructure failure risk during demo.
5. **"Human must decide" moment** — built into Phase 5 output. Judges tick that responsible AI box without you having to explain it.
6. **Specific first action** — the output is "do X in 24 hours." Not "consider Y." That's the mission of Direction B fulfilled completely.

**What judges will remember:** "The team that made the AI show its reasoning and tell you what it can't decide."Got it — you want to swap the Claude API calls for a **zero-cost approach**. The only real free option that works client-side without a backend is **Ollama** (local) or **Groq's free tier**. But the cleanest zero-cost drop-in that needs minimal code change is:

**Groq API (free tier)** — same OpenAI-compatible format, `llama-3.3-70b` is fast and free, no credit card needed.

Or did you mean: **remove the API cost by using the Claude API key the hackathon/user provides themselves** (just don't bundle a paid key)?

Which did you mean:Q: What does 'zero cost' mean for your setup?
A: Google Gemini free tier (generous limits)

Minimal changes needed. Only 3 things change:
1. API endpoint + headers → Gemini format
2. Model name → `gemini-2.0-flash`
3. Add a API key input field in UI (user brings their own free Gemini key)

Everything else — phases, prompts, canvas, UI — stays identical.**What changed (minimal diff from the plan):**

The only parts that changed from the architecture doc:

- **API endpoint** → `generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Auth** → `?key=APIKEY` query param (no `x-api-key` header)
- **Message format** → Gemini uses `contents: [{role, parts:[{text}]}]` + separate `system_instruction`
- **API key input field** → added to UI with a direct link to `aistudio.google.com/apikey`
- **Model** → `gemini-2.0-flash` (free tier, fast, 1M context)

**Everything else is identical** — all 5 phases, system prompts, JSON schemas, Execution Canvas, Confidence Meter, Responsible AI panel, follow-up chat, copy canvas button.

**To run:** Open the HTML file in any browser, paste your free Gemini key, type an idea, click "Start Forging."
