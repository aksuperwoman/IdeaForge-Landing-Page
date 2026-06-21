import { useState } from "react";
import {
  ArrowRight,
  Network,
  AlertTriangle,
  Milestone,
  CheckCircle2,
  XCircle,
  Hammer,
} from "lucide-react";

// ─── Login URL: all CTAs redirect here ───────────────────────────────────────
const LOGIN_URL = "/login.html";

// ─── Design tokens (from IdeaForge theme doc) ────────────────────────────────
const C = {
  bg:       "#0e0e0f",
  bg2:      "#1c1d20",
  bg3:      "#26282c",
  canvas:   "#141416",
  line:     "#2d2e32",
  ember:    "#ef9f27",
  emberDim: "#b4761b",
  steel:    "#378add",
  steelDim: "#2a6aaf",
  crit:     "#d94545",
  warn:     "#e6a23c",
  safe:     "#4a9d5f",
  purple:   "#a855f7",
  cyan:     "#22d3ee",
  text:     "#f5f5f5",
  soft:     "#a0a0a0",
  muted:    "#666669",
} as const;

const F = {
  display: "'Oswald', Impact, sans-serif",
  body:    "'Inter', 'Helvetica Neue', sans-serif",
  mono:    "'JetBrains Mono', 'Courier New', monospace",
} as const;

const S = {
  stamp:  `3px 3px 0 ${C.bg}`,
  panel:  `6px 6px 0 rgba(0,0,0,.6)`,
  border: `1px solid ${C.line}`,
  heavy:  `2px solid ${C.text}`,
} as const;

// Blueprint 32px grid at 3% white opacity
const blueprintBg = {
  backgroundImage: `linear-gradient(to right, rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.03) 1px, transparent 1px)`,
  backgroundSize: "32px 32px",
};

// Chipped corner clip path
const chipClip = "polygon(0 0, 100% 0, 100% 80%, 80% 100%, 0 100%)";

const keyframes = `
@keyframes stampIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
@keyframes phasepulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1; }
}
@keyframes grPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50%       { opacity: 1;   transform: scale(1.2); }
}
.stamp-in { animation: stampIn 0.45s cubic-bezier(0.2, 1.3, 0.4, 1) both; }
::selection { background: rgba(239,159,39,0.35); }
`;

// ─── Anvil SVG (from design doc) ─────────────────────────────────────────────
function AnvilSVG({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 80" width={size * 1.5} height={size} fill="none">
      <g stroke="#378add" strokeWidth="1" opacity="0.5">
        <rect x="6" y="6" width="108" height="68" strokeDasharray="3 3" />
        <line x1="6" y1="22" x2="114" y2="22" />
        <line x1="6" y1="58" x2="114" y2="58" />
        <line x1="30" y1="6" x2="30" y2="74" />
        <line x1="90" y1="6" x2="90" y2="74" />
      </g>
      <g fill="#ef9f27">
        <path d="M40 44 h40 l-4 8 h-32 z" />
        <rect x="52" y="36" width="16" height="6" />
      </g>
      <g fill="#ef9f27" opacity="0.9">
        <circle cx="60" cy="28" r="1.6" />
        <circle cx="70" cy="22" r="1.1" />
        <circle cx="50" cy="24" r="1.1" />
        <circle cx="64" cy="18" r="0.8" />
      </g>
    </svg>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav({ onForge }: { onForge: () => void }) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: `${C.bg}e0`,
        backdropFilter: "blur(8px)",
        borderBottom: S.border,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: C.bg2,
              border: S.border,
              clipPath: chipClip,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Hammer size={16} color={C.ember} />
          </div>
          <span
            style={{
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.text,
            }}
          >
            IDEA<span style={{ color: C.ember }}>FORGE</span>
          </span>
        </div>

        {/* CTA row — pushed to the far right */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", marginLeft: "auto" }}>
          <a
            href={LOGIN_URL}
            style={{
              fontFamily: F.body,
              fontSize: 14,
              color: C.soft,
              textDecoration: "none",
              padding: "8px 12px",
              whiteSpace: "nowrap",
            }}
          >
            Log In
          </a>

          {/* Sign Up — outline button, leads to login page */}
          <button
            onClick={() => { window.location.href = LOGIN_URL; }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = C.ember;
              el.style.color = C.bg;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "transparent";
              el.style.color = C.ember;
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 16px",
              background: "transparent",
              color: C.ember,
              border: `1px solid ${C.ember}`,
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              cursor: "pointer",
              clipPath: chipClip,
              transition: "background 0.1s, color 0.1s",
              whiteSpace: "nowrap",
            }}
          >
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Shared button components ─────────────────────────────────────────────────
function PrimaryBtn({
  children,
  size = "md",
  onClick,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const pad = size === "lg" ? "14px 28px" : size === "sm" ? "8px 16px" : "10px 18px";
  const fs = size === "lg" ? 15 : size === "sm" ? 12 : 13;
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translate(2px,2px)";
        el.style.boxShadow = `1px 1px 0 ${C.bg}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "none";
        el.style.boxShadow = S.stamp;
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: pad,
        background: C.ember,
        color: C.bg,
        border: "none",
        fontFamily: F.display,
        fontWeight: 700,
        fontSize: fs,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        cursor: "pointer",
        boxShadow: pressed ? `1px 1px 0 ${C.bg}` : S.stamp,
        transform: pressed ? "translate(2px,2px)" : "none",
        transition: "transform 0.1s, box-shadow 0.1s",
        clipPath: chipClip,
      }}
    >
      {children}
    </button>
  );
}

// ─── Pill badge ───────────────────────────────────────────────────────────────
function Pill({
  children,
  color = "ember",
}: {
  children: React.ReactNode;
  color?: "ember" | "steel" | "crit" | "warn" | "safe" | "purple";
}) {
  const map = {
    ember:  { bg: "rgba(239,159,39,.16)",  text: C.ember,  border: "rgba(239,159,39,.3)"  },
    steel:  { bg: "rgba(55,138,221,.16)",  text: C.steel,  border: "rgba(55,138,221,.3)"  },
    crit:   { bg: "rgba(217,69,69,.18)",   text: C.crit,   border: "rgba(217,69,69,.4)"   },
    warn:   { bg: "rgba(230,162,60,.16)",  text: C.warn,   border: "rgba(230,162,60,.4)"  },
    safe:   { bg: "rgba(74,157,95,.16)",   text: C.safe,   border: "rgba(74,157,95,.4)"   },
    purple: { bg: "rgba(168,85,247,.16)",  text: C.purple, border: "rgba(168,85,247,.3)"  },
  };
  const t = map[color];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 9px",
        fontFamily: F.mono,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        background: t.bg,
        color: t.text,
        border: `1px solid ${t.border}`,
      }}
    >
      {children}
    </span>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: F.mono,
        fontSize: 11,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
const PHASES = [
  { key: "Raw",      color: C.ember  },
  { key: "Heated",   color: C.warn   },
  { key: "Shaped",   color: C.crit   },
  { key: "Quenched", color: C.safe   },
  { key: "Struck",   color: C.steel  },
];

function Hero({ onForge }: { onForge: () => void }) {
  const [idea, setIdea] = useState("");

  return (
    <section
      style={{
        ...blueprintBg,
        background: C.bg,
        paddingTop: 120,
        paddingBottom: 80,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ember radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(239,159,39,.09), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", position: "relative" }}>
        {/* Phase pillars */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 6,
            marginBottom: 32,
          }}
        >
          {PHASES.map((p, i) => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.soft,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  border: S.border,
                  padding: "5px 11px",
                  background: C.bg2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: p.color,
                    display: "inline-block",
                  }}
                />
                {p.key}
              </span>
              {i < PHASES.length - 1 && (
                <span style={{ color: C.line, fontSize: 10, fontFamily: F.mono }}>→</span>
              )}
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 16,
          }}
        >
          The Strategist&apos;s Forge · zero-to-one engine
        </div>

        {/* Hero headline */}
        <h1
          style={{
            fontFamily: F.display,
            fontWeight: 700,
            fontSize: "clamp(32px, 6vw, 56px)",
            textTransform: "uppercase",
            letterSpacing: "0.01em",
            color: C.text,
            lineHeight: 1.1,
            marginBottom: 24,
          }}
        >
          From spark to{" "}
          <span style={{ color: C.ember }}>struck</span> gear.
        </h1>

        {/* Hero body */}
        <p
          style={{
            fontFamily: F.body,
            fontSize: 15,
            color: C.soft,
            lineHeight: 1.7,
            maxWidth: 580,
            margin: "0 auto 40px",
          }}
        >
          Not a brainstorming tool. A forcing function that stress-tests your vague idea
          against cold reality — clarifying, surfacing assumptions, mapping risks, and stamping
          one real first step — before you waste 90 days.
        </p>

        {/* Input area */}
        <div
          style={{
            background: C.bg,
            border: S.border,
            boxShadow: S.panel,
            maxWidth: 620,
            margin: "0 auto 24px",
            textAlign: "left",
            position: "relative",
          }}
        >
          {/* Terminal chrome */}
          <div
            style={{
              borderBottom: S.border,
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: C.bg2,
            }}
          >
            <div style={{ display: "flex", gap: 5 }}>
              {["#d94545", "#e6a23c", "#4a9d5f"].map((c) => (
                <span
                  key={c}
                  style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.7 }}
                />
              ))}
            </div>
            <span
              style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: "0.05em" }}
            >
              ideaforge / new-concept.forge
            </span>
          </div>

          <div style={{ padding: "16px 18px" }}>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}
            >
              <span style={{ fontFamily: F.mono, fontSize: 12, color: C.emberDim, marginTop: 2 }}>
                ›
              </span>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={`e.g. "I want to build an app that helps freelancers track mental energy instead of just time, so they schedule deep work around their actual cognitive state..."`}
                rows={4}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontFamily: F.mono,
                  fontSize: 14,
                  color: C.text,
                  resize: "none",
                  lineHeight: 1.6,
                  width: "100%",
                }}
              />
            </div>
          </div>

          <div
            style={{
              borderTop: S.border,
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.muted }}>
              {idea.length} chars · no polish required
            </span>
            <PrimaryBtn size="md" onClick={onForge}>
              Forge Your Idea <ArrowRight size={13} />
            </PrimaryBtn>
          </div>
        </div>

        <p style={{ fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em" }}>
          FORGE YOUR IDEA · FREE TO START
        </p>
      </div>
    </section>
  );
}

// ─── Problem vs Solution ──────────────────────────────────────────────────────
const PROBLEMS = [
  "Generates a generic to-do list and calls it a plan",
  "Ignores market and technical realities entirely",
  "Floods you with optimistic output — zero critical analysis",
  "No structure for the zero-to-one validation phase",
  "Feels productive while building the wrong thing",
];

const SOLUTIONS = [
  "Deconstructs your idea into falsifiable hypotheses",
  "Surfaces every hidden risk, assumption, and blind spot",
  "Adversarial reasoning — no toxic positivity, ever",
  "Milestone architecture with human-in-the-loop gates",
  "Aligns every action to the highest-leverage moment",
];

function ProblemSolution() {
  return (
    <section style={{ background: C.bg, borderTop: S.border, padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>01 / The Problem</SectionLabel>
          <h2
            style={{
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: "clamp(24px, 4vw, 36px)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: C.text,
              lineHeight: 1.15,
            }}
          >
            Why Every Other Tool Fails You
            <br />
            <span style={{ color: C.soft, textDecoration: "line-through" }}>at Inception</span>
          </h2>
          <p
            style={{
              fontFamily: F.body,
              fontSize: 15,
              color: C.soft,
              maxWidth: 500,
              margin: "16px auto 0",
              lineHeight: 1.6,
            }}
          >
            The inception phase is the graveyard of good ideas. Generic productivity tools
            were built for execution — not discovery.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
          className="grid-responsive"
        >
          {/* Problem */}
          <div
            className="stamp-in"
            style={{
              background: C.bg2,
              border: S.border,
              boxShadow: S.panel,
              padding: 28,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: "rgba(217,69,69,.12)",
                  border: "1px solid rgba(217,69,69,.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <XCircle size={15} color={C.crit} />
              </div>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Traditional Tools
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: C.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  The Broken Pattern
                </div>
              </div>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {PROBLEMS.map((p) => (
                <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <XCircle size={13} color={C.crit} style={{ flexShrink: 0, marginTop: 3, opacity: 0.8 }} />
                  <span style={{ fontFamily: F.body, fontSize: 14, color: C.soft, lineHeight: 1.5 }}>{p}</span>
                </li>
              ))}
            </ul>
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: S.border,
                background: "rgba(217,69,69,.06)",
                border: "1px solid rgba(217,69,69,.15)",
                padding: 14,
              }}
            >
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.crit, opacity: 0.9, lineHeight: 1.5, margin: 0 }}>
                Result: 6 months building something nobody wants — with a full to-do list and zero strategic clarity.
              </p>
            </div>
          </div>

          {/* Solution */}
          <div
            className="stamp-in"
            style={{
              background: C.bg2,
              border: `1px solid rgba(239,159,39,.25)`,
              boxShadow: S.panel,
              padding: 28,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "rgba(239,159,39,.04)",
                pointerEvents: "none",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: "rgba(239,159,39,.12)",
                  border: `1px solid rgba(239,159,39,.3)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  clipPath: chipClip,
                }}
              >
                <Hammer size={15} color={C.ember} />
              </div>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.emberDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  IdeaForge
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: C.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Intelligent Co-Pilot
                </div>
              </div>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
              {SOLUTIONS.map((s) => (
                <li key={s} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <CheckCircle2 size={13} color={C.ember} style={{ flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontFamily: F.body, fontSize: 14, color: C.text, lineHeight: 1.5 }}>{s}</span>
                </li>
              ))}
            </ul>
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: `1px solid rgba(239,159,39,.12)`,
                background: "rgba(239,159,39,.06)",
                border: `1px solid rgba(239,159,39,.18)`,
                padding: 14,
              }}
            >
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.ember, opacity: 0.9, lineHeight: 1.5, margin: 0 }}>
                Result: A structured strategic matrix — risks mapped, tradeoffs visible, your single highest-leverage first action identified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Grid ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Network,
    num: "01",
    phase: "Raw → Heated",
    phaseColor: "ember" as const,
    title: "Idea Deconstruction",
    body: "Breaks your concept into its fundamental components — core hypothesis, target persona, value proposition, and key dependencies. No assumptions left implicit.",
    bullets: ["Core hypothesis extraction", "Persona & market segmentation", "Value prop stress-test", "Dependency graph mapping"],
    accentColor: C.ember,
    accentAlpha: "rgba(239,159,39,.16)",
    accentBorder: "rgba(239,159,39,.3)",
  },
  {
    icon: AlertTriangle,
    num: "02",
    phase: "Heated → Shaped",
    phaseColor: "crit" as const,
    title: "Risk & Assumption Mapping",
    body: "No toxic positivity. Adversarial reasoning surfaces your most dangerous hidden assumptions before you waste months chasing the wrong signal.",
    bullets: ["Market assumption audit", "Technical risk exposure matrix", "Competitor blind spot analysis", "Financial viability stress test"],
    accentColor: C.crit,
    accentAlpha: "rgba(217,69,69,.14)",
    accentBorder: "rgba(217,69,69,.3)",
  },
  {
    icon: Milestone,
    num: "03",
    phase: "Quenched → Struck",
    phaseColor: "steel" as const,
    title: "Zero-to-One Roadmap",
    body: "Milestone architecture with human-in-the-loop checkpoints. Every milestone ends with a binary question: does this signal validate the core bet?",
    bullets: ["First Real Step identification", "Validation checkpoint gates", "Pivot/persevere decision points", "Resource constraint modeling"],
    accentColor: C.steel,
    accentAlpha: "rgba(55,138,221,.14)",
    accentBorder: "rgba(55,138,221,.3)",
  },
];

function FeaturesGrid() {
  return (
    <section
      style={{ ...blueprintBg, background: C.canvas, borderTop: S.border, padding: "80px 24px" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>02 / Core Pillars</SectionLabel>
          <h2
            style={{
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: "clamp(24px, 4vw, 36px)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: C.text,
              lineHeight: 1.15,
            }}
          >
            Three Systems. One Mission.
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 15, color: C.soft, maxWidth: 480, margin: "16px auto 0", lineHeight: 1.6 }}>
            Built specifically for the critical inception phase that every other tool ignores.
          </p>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
          className="grid-responsive-3"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.num}
                className="stamp-in"
                style={{
                  background: C.bg2,
                  border: S.border,
                  boxShadow: S.panel,
                  padding: 24,
                  transition: "box-shadow 0.1s, transform 0.1s",
                  cursor: "default",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = f.accentColor;
                  el.style.boxShadow = `6px 6px 0 ${f.accentColor}30`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = C.line;
                  el.style.boxShadow = S.panel;
                }}
              >
                {/* Artifact-box label at top-left */}
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    left: -1,
                    background: f.accentColor,
                    color: C.bg,
                    fontFamily: F.mono,
                    fontSize: 9,
                    padding: "3px 8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                  }}
                >
                  {f.num}
                </div>

                <div style={{ marginBottom: 16, marginTop: 8, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: f.accentAlpha,
                      border: `1px solid ${f.accentBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      clipPath: chipClip,
                    }}
                  >
                    <Icon size={17} color={f.accentColor} />
                  </div>
                  <Pill color={f.phaseColor}>{f.phase}</Pill>
                </div>

                <h3
                  style={{
                    fontFamily: F.display,
                    fontWeight: 700,
                    fontSize: 16,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: f.accentColor,
                    marginBottom: 10,
                  }}
                >
                  {f.title}
                </h3>

                <p style={{ fontFamily: F.body, fontSize: 14, color: C.soft, lineHeight: 1.6, marginBottom: 18 }}>
                  {f.body}
                </p>

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, borderTop: S.border, paddingTop: 16 }}>
                  {f.bullets.map((b) => (
                    <li key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: f.accentColor,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Pipeline (5 Forge Phases) ────────────────────────────────────────────────
const PIPELINE = [
  {
    step: "01",
    phase: "Raw",
    phaseColor: C.ember,
    loader: "Stripping buzzwords to the core job",
    title: "Constrained Raw Input",
    desc: "You paste your unpolished idea — any length, any format. IdeaForge intentionally removes the pressure to be articulate. Raw thinking is better data.",
    tags: ["Natural language", "Voice input", "No structure required"],
  },
  {
    step: "02",
    phase: "Heated",
    phaseColor: C.warn,
    loader: "Surfacing hidden assumptions",
    title: "AI Framework Analysis Engine",
    desc: "The engine applies JTBD, First Principles, Pre-Mortem Analysis, and competitive moat theory simultaneously to your raw input.",
    tags: ["JTBD Framework", "Pre-Mortem Logic", "Moat Analysis"],
  },
  {
    step: "03",
    phase: "Shaped",
    phaseColor: C.crit,
    loader: "Scoring risks by impact × likelihood",
    title: "Risk & Tradeoff Matrix",
    desc: "Every assumption is surfaced. Every tradeoff is mapped. Hidden risks are ranked by probability × impact before you've written a single line of code.",
    tags: ["Assumption registry", "Risk scoring", "Impact matrix"],
  },
  {
    step: "04",
    phase: "Quenched",
    phaseColor: C.safe,
    loader: "Forging the milestone path",
    title: "Milestone Architecture",
    desc: "A structured roadmap with human-in-the-loop checkpoints. Each milestone ends with a binary pivot/persevere decision gate.",
    tags: ["Milestone roadmap", "Human checkpoints", "Pivot gates"],
  },
  {
    step: "05",
    phase: "Struck",
    phaseColor: C.steel,
    loader: "Striking the first step",
    title: "Strategic Matrix Output",
    desc: "A comprehensive strategic matrix delivered: risks mapped, tradeoffs visible, and your single highest-leverage First Real Step stamped and ready to execute.",
    tags: ["Strategic matrix", "First Real Step", "Validation gates"],
  },
];

function Pipeline() {
  return (
    <section style={{ background: C.bg, borderTop: S.border, padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>03 / How It Works</SectionLabel>
          <h2
            style={{
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: "clamp(24px, 4vw, 36px)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: C.text,
              lineHeight: 1.15,
            }}
          >
            Five Phases. Zero Fluff.
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 15, color: C.soft, maxWidth: 480, margin: "16px auto 0", lineHeight: 1.6 }}>
            A deterministic pipeline that transforms ambiguous input into an executable strategic framework.
          </p>
        </div>

        {/* All 5 phases as visible boxes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 0,
            border: S.heavy,
          }}
          className="phase-stepper"
        >
          {PIPELINE.map((p, i) => (
            <div
              key={p.step}
              style={{
                padding: "20px 14px",
                background: C.bg2,
                border: "none",
                borderRight: i < 4 ? S.border : "none",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: F.mono, fontSize: 10, color: p.phaseColor, fontWeight: 700, marginBottom: 6 }}>
                {p.step}
              </div>
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: p.phaseColor,
                  marginBottom: 10,
                }}
              >
                {p.phase}
              </div>
              <h3
                style={{
                  fontFamily: F.display,
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: C.text,
                  marginBottom: 8,
                  lineHeight: 1.2,
                }}
              >
                {p.title}
              </h3>
              <p style={{ fontFamily: F.body, fontSize: 12, color: C.soft, lineHeight: 1.5, marginBottom: 12 }}>
                {p.desc}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                {p.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: F.mono,
                      fontSize: 9,
                      padding: "3px 8px",
                      border: S.border,
                      background: C.bg3,
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Sample Output ────────────────────────────────────────────────────────────
function SampleOutput() {
  return (
    <section style={{ ...blueprintBg, background: C.canvas, borderTop: S.border, padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel>04 / Output Preview</SectionLabel>
          <h2
            style={{
              fontFamily: F.display,
              fontWeight: 700,
              fontSize: "clamp(24px, 4vw, 36px)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: C.text,
              lineHeight: 1.15,
            }}
          >
            What Gets Stamped Out
          </h2>
        </div>

        <div
          style={{
            background: C.bg,
            border: S.heavy,
            boxShadow: S.panel,
            overflow: "hidden",
          }}
        >
          {/* Terminal header */}
          <div
            style={{
              background: C.bg2,
              borderBottom: S.border,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 5 }}>
              {[C.crit, C.warn, C.safe].map((c, i) => (
                <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.7 }} />
              ))}
            </div>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>
              IdeaForge Strategic Matrix — cognitive-scheduling-app.forge · STRUCK ✓
            </span>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}
            className="grid-responsive"
          >
            {/* Risks */}
            <div style={{ padding: 24, borderRight: S.border }}>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.crit,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 18,
                }}
              >
                ⚠ Critical Risks
              </div>
              {[
                { risk: "No validated willingness-to-pay signal", sev: "HIGH", color: C.crit },
                { risk: "Self-reporting bias in energy tracking", sev: "MED",  color: C.warn },
                { risk: "Calendar API permission friction",        sev: "MED",  color: C.warn },
              ].map((r) => (
                <div key={r.risk} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <span
                    style={{
                      fontFamily: F.mono,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      background: r.sev === "HIGH" ? "rgba(217,69,69,.18)" : "rgba(230,162,60,.16)",
                      color: r.color,
                      border: `1px solid ${r.sev === "HIGH" ? "rgba(217,69,69,.4)" : "rgba(230,162,60,.4)"}`,
                      textTransform: "uppercase",
                      flexShrink: 0,
                      height: "fit-content",
                      marginTop: 2,
                    }}
                  >
                    {r.sev}
                  </span>
                  <span style={{ fontFamily: F.body, fontSize: 13, color: C.soft, lineHeight: 1.4 }}>
                    {r.risk}
                  </span>
                </div>
              ))}
            </div>

            {/* Assumptions */}
            <div style={{ padding: 24, borderRight: S.border }}>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.steel,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 18,
                }}
              >
                ◆ Hidden Assumptions
              </div>
              {[
                "Freelancers will track energy consistently over time",
                "Cognitive state is predictable enough to schedule around",
                "Premium pricing justified vs. free calendar tools",
              ].map((a) => (
                <div key={a} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <span style={{ color: C.steelDim, fontSize: 12, flexShrink: 0, marginTop: 2 }}>·</span>
                  <span style={{ fontFamily: F.body, fontSize: 13, color: C.soft, lineHeight: 1.4 }}>{a}</span>
                </div>
              ))}

              {/* Confidence bar */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: S.border }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Confidence Score · 2/5
                </div>
                <div
                  style={{
                    height: 6,
                    background: C.bg3,
                    border: S.border,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: "40%", height: "100%", background: C.crit, transition: "width 0.6s ease" }} />
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.muted, marginTop: 6 }}>
                  LOW — core assumptions unvalidated
                </div>
              </div>
            </div>

            {/* First Real Step */}
            <div style={{ padding: 24, background: "rgba(239,159,39,.03)" }}>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.ember,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 18,
                }}
              >
                ⚡ First Real Step
              </div>
              <div
                style={{
                  background: C.bg,
                  border: `2px solid ${C.ember}`,
                  padding: 16,
                  boxShadow: S.stamp,
                  marginBottom: 16,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    left: -1,
                    background: C.ember,
                    color: C.bg,
                    fontFamily: F.mono,
                    fontSize: 9,
                    padding: "3px 8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                  }}
                >
                  Struck
                </div>
                <p
                  style={{
                    fontFamily: F.body,
                    fontSize: 14,
                    color: C.text,
                    lineHeight: 1.55,
                    marginTop: 12,
                  }}
                >
                  Interview 10 freelancers about their worst cognitive-crash workday.
                  Record it. Don't pitch anything.
                </p>
              </div>
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 10,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  lineHeight: 1.6,
                }}
              >
                Goal: Validate the pain exists before building the cure.
              </div>

              {/* Guardrail flag */}
              <div
                style={{
                  marginTop: 20,
                  padding: "10px 12px",
                  border: `2px solid ${C.purple}`,
                  background: "linear-gradient(135deg, rgba(168,85,247,.12), rgba(34,211,238,.08))",
                  boxShadow: "0 0 18px rgba(168,85,247,.2)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: C.cyan,
                    boxShadow: `0 0 8px ${C.cyan}`,
                    flexShrink: 0,
                    marginTop: 3,
                    animation: "grPulse 1s infinite",
                  }}
                />
                <span style={{ fontFamily: F.mono, fontSize: 10, color: "#c084fc", lineHeight: 1.4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Guardrail: Do not build until 7/10 confirm the pain unprompted.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onForge }: { onForge: () => void }) {
  return (
    <footer style={{ background: C.bg, borderTop: S.heavy }}>
      {/* CTA band */}
      <div
        style={{
          ...blueprintBg,
          background: C.bg,
          padding: "72px 24px",
          textAlign: "center",
          borderBottom: S.border,
        }}
      >
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
          Don't wait for clarity. Forge it.
        </div>
        <h2
          style={{
            fontFamily: F.display,
            fontWeight: 700,
            fontSize: "clamp(26px, 4vw, 42px)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: C.text,
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          Your Idea Deserves{" "}
          <span style={{ color: C.ember }}>Honest Intelligence.</span>
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 15, color: C.soft, maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Stop spinning in place. IdeaForge gives your concept the structured critical
          analysis it needs to become something real.
        </p>
        <PrimaryBtn size="lg" onClick={onForge}>
          Start Forging — It&apos;s Free <ArrowRight size={15} />
        </PrimaryBtn>
        <p style={{ fontFamily: F.mono, fontSize: 10, color: C.muted, marginTop: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          No credit card · Private beta · 2,400+ early builders
        </p>
      </div>

      {/* Footer bottom bar */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
        <div style={{ borderTop: S.border, paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            © 2026 IdeaForge · Built for builders, not dreamers.
          </p>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {["Privacy", "Terms"].map((l) => (
              <a
                key={l}
                href="#"
                style={{ fontFamily: F.body, fontSize: 13, color: C.muted, textDecoration: "none", transition: "color 0.1s" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = C.text)}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = C.muted)}
              >
                {l}
              </a>
            ))}
            <span style={{ color: C.line }}>·</span>
            {["Twitter", "GitHub", "Discord"].map((s) => (
              <a
                key={s}
                href="#"
                style={{ fontFamily: F.body, fontSize: 13, color: C.muted, textDecoration: "none", transition: "color 0.1s" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = C.text)}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = C.muted)}
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const goToLogin = () => {
    window.location.href = LOGIN_URL;
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{keyframes}</style>
      <style>{`
        @media (max-width: 960px) {
          .grid-responsive { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .phase-stepper { grid-template-columns: repeat(5, 1fr) !important; }
        }
        @media (max-width: 620px) {
          .grid-responsive-3 { grid-template-columns: 1fr !important; }
          .phase-stepper { grid-template-columns: 1fr 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>

      <Nav onForge={goToLogin} />
      <main>
        <Hero onForge={goToLogin} />
        <ProblemSolution />
        <FeaturesGrid />
        <Pipeline />
        <SampleOutput />
      </main>
      <Footer onForge={goToLogin} />
    </div>
  );
}
