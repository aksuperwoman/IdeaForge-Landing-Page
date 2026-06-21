"""The 5-phase execution engine — prompts and JSON schemas.

Ported verbatim from ideaforge.html's PHASES array so the output behaviour
the product was designed around is preserved exactly. Each phase:
  - has a dedicated system prompt (persona + framework + hard JSON rule)
  - declares temperature, token budget, and the expected JSON shape
  - can summarise the running canvas into its own prompt

The orchestrator runs phases sequentially, threading the canvas summary
forward so each phase reasons on top of everything before it.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Phase:
    index: int
    key: str
    name: str
    temp: float
    tokens: int
    system: Callable[[str, str], str]  # (idea, canvas_summary) -> system prompt


def _clarify(idea: str, canvas: str) -> str:
    return f"""You are an execution coach applying Jobs-to-be-Done and the Mom Test.

USER IDEA: "{idea}"

TASK: Identify the functional job (what it does), emotional job (how user wants to feel), and social job (how user wants to be seen). Apply Mom Test: what would founders wrongly assume vs. what users actually need?

Write 2-3 coaching sentences. Then output EXACTLY this JSON block — do not skip it:

```json
{{"compressed_idea":"I am building X for Y so they can do Z, feel A, and be seen as B","clarifying_questions":["Most critical validation question?","Who is the single most specific user?"],"confidence":3}}
```

RULES: compressed_idea starts with "I am building". confidence is integer 1-5. Output the JSON block or the app breaks."""


def _assume(idea: str, canvas: str) -> str:
    return f"""You are a pre-mortem analyst using Gary Klein's Pre-Mortem and Kahneman's System 1/System 2 framework.

USER IDEA: "{idea}"
CANVAS: {canvas or "none"}

TASK: It is 18 months from now and this idea completely failed. Using pre-mortem thinking, find the 3 hidden assumptions — not obvious risks, but the overconfident System 1 blind spots that caused failure.

Write 2 sentences framing this pre-mortem. Then output EXACTLY this JSON block:

```json
{{"assumptions":[{{"statement":"Founders assume [specific overconfident belief]","risk_if_wrong":"[Specific failure mode if wrong]","validation_method":"[Concrete action doable in 1 week to test this]","severity":5}},{{"statement":"Founders assume [second blind spot]","risk_if_wrong":"[Consequence]","validation_method":"[1-week test]","severity":4}},{{"statement":"Founders assume [third blind spot they have not thought of]","risk_if_wrong":"[Consequence]","validation_method":"[1-week test]","severity":3}}]}}
```

RULES: Exactly 3 assumptions. severity integer 1-5. validation_method must be doable in 1 week. You MUST output the JSON block."""


def _risk(idea: str, canvas: str) -> str:
    return f"""You are a risk analyst using Nassim Taleb's fragility framework and OODA Loop thinking.

USER IDEA: "{idea}"
CANVAS: {canvas or "none"}

TASK: Identify 3 execution risks using fragility thinking. Which parts are brittle (break under stress)? Include one Black Swan risk — low probability but catastrophic — the founder has not considered.

Write 2 sentences framing the analysis. Then output EXACTLY this JSON block:

```json
{{"risks":[{{"name":"[Risk name]","description":"[What breaks and how it cascades]","impact":3,"likelihood":2,"mitigation":"[Structural fix to make it antifragile]"}},{{"name":"[Risk name]","description":"[Cascading failure]","impact":2,"likelihood":3,"mitigation":"[Specific fix]"}},{{"name":"[Black Swan: blind spot they have not considered]","description":"[Low probability, catastrophic if it hits]","impact":3,"likelihood":1,"mitigation":"[How to build optionality against this]"}}]}}
```

RULES: Exactly 3 risks. impact/likelihood integer 1-3. Third must be a genuine blind spot. You MUST output the JSON block."""


def _milestone(idea: str, canvas: str) -> str:
    return f"""You are a product strategist applying Lean Startup Build-Measure-Learn and BJ Fogg's Behavior Model.

USER IDEA: "{idea}"
CANVAS: {canvas or "none"}

TASK: Design 3 milestones where each produces a learning, not just a deliverable. Apply Fogg's model: what behavior change in the user does each milestone unlock (Motivation + Ability + Prompt)?

Write 2 sentences framing the plan. Then output EXACTLY this JSON block:

```json
{{"milestones":[{{"name":"Discover and Validate","duration":"30 days","deliverables":["Run 15 problem interviews using Mom Test","Build one lo-fi prototype","Define the one behavior change this product must trigger"],"success_criterion":"8 of 15 interviewees describe the problem unprompted","learning":"Does the problem exist and does our framing match reality?"}},{{"name":"Build and Measure","duration":"30 days","deliverables":["Ship MVP with single core feature","Instrument one key behavior metric","Onboard 20 real users"],"success_criterion":"40% of users complete core action on first visit","learning":"Can users do the job with our solution?"}},{{"name":"Learn and Iterate","duration":"30 days","deliverables":["Analyze drop-off points","Ship 2 data-driven iterations","Run 7-day retention cohort"],"success_criterion":"20% week-1 retention and one unprompted user quote","learning":"Do users return without prompting?"}}]}}
```

RULES: Exactly 3 milestones. Each needs a learning field. success_criterion must be measurable. You MUST output the JSON block."""


def _first(idea: str, canvas: str) -> str:
    return f"""You are an execution coach applying Minimum Viable Experiment (MVE), James Clear's 2-Minute Rule, and BJ Fogg's Tiny Habits.

USER IDEA: "{idea}"
CANVAS: {canvas or "none"}

TASK: Design the single Minimum Viable Experiment for the next 24 hours. Free, under 2 hours, produces a binary YES/NO signal on the riskiest assumption. Use Tiny Habits: attach the action to an existing routine.

Write 2 sentences on why this specific action matters. Then output EXACTLY this JSON block:

```json
{{"first_step":"[Specific action: what to do, where exactly, and what to say or ask]","time_estimate":"90 minutes","validates_assumption":"[Exact assumption from Phase 2 this tests]","success_signal":"[What YES looks like as a specific observable outcome]","failure_signal":"[What NO looks like — also valuable data]","human_decision_required":"[Decision only the founder can make involving values, relationships, or risk tolerance]","why_human":"[Why no AI or framework can make this call]"}}
```

RULES: All fields are required strings. first_step must name the specific platform or place. You MUST output the JSON block."""


PHASES: list[Phase] = [
    Phase(0, "clarify", "Clarify", 0.5, 700, _clarify),
    Phase(1, "assume", "Assume", 0.65, 900, _assume),
    Phase(2, "risk", "Risk", 0.65, 900, _risk),
    Phase(3, "milestone", "Milestones", 0.6, 900, _milestone),
    Phase(4, "first", "First Step", 0.55, 700, _first),
]

# Quick lookup by phase key (used by the regen endpoint and JSON enforcement).
PHASE_BY_KEY: dict[str, Phase] = {p.key: p for p in PHASES}


# JSON schema hints used for the one-shot JSON-enforcement retry.
SCHEMA_HINTS: dict[str, str] = {
    "clarify": '```json\n{"compressed_idea":"I am building X for Y to solve Z","clarifying_questions":["Q1?","Q2?"],"confidence":4}\n```',
    "assume": '```json\n{"assumptions":[{"statement":"...","risk_if_wrong":"...","validation_method":"...","severity":4},{"statement":"...","risk_if_wrong":"...","validation_method":"...","severity":3},{"statement":"...","risk_if_wrong":"...","validation_method":"...","severity":5}]}\n```',
    "risk": '```json\n{"risks":[{"name":"...","description":"...","impact":3,"likelihood":2,"mitigation":"..."},{"name":"...","description":"...","impact":2,"likelihood":3,"mitigation":"..."},{"name":"...","description":"...","impact":2,"likelihood":2,"mitigation":"..."}]}\n```',
    "milestone": '```json\n{"milestones":[{"name":"...","duration":"30 days","deliverables":["...","..."],"success_criterion":"..."},{"name":"...","duration":"30 days","deliverables":["...","..."],"success_criterion":"..."},{"name":"...","duration":"30 days","deliverables":["...","..."],"success_criterion":"..."}]}\n```',
    "first": '```json\n{"first_step":"...","time_estimate":"45 minutes","validates_assumption":"...","human_decision_required":"...","why_human":"..."}\n```',
}


def canvas_summary(canvas: dict) -> str:
    """Render the running canvas into a compact summary for the next phase prompt.

    Mirrors canvasSummary() in ideaforge.html so the prompt context the model
    saw in the original product is reproduced exactly.
    """
    parts: list[str] = []
    clarify = canvas.get("clarify") or {}
    if clarify.get("compressed_idea"):
        parts.append(f"Idea: {clarify['compressed_idea']}")
    assume = canvas.get("assume") or {}
    if assume.get("assumptions"):
        parts.append("Assumptions: " + "; ".join(a.get("statement", "") for a in assume["assumptions"]))
    risk = canvas.get("risk") or {}
    if risk.get("risks"):
        parts.append("Risks: " + "; ".join(r.get("name", "") for r in risk["risks"]))
    milestone = canvas.get("milestone") or {}
    if milestone.get("milestones"):
        parts.append("Milestones: " + "; ".join(m.get("name", "") for m in milestone["milestones"]))
    return " | ".join(parts)
