# AgentChat Codex Prompt - IdeaForge

You are a local Codex coding agent working in the `IdeaForge` repo as part of a P2P laptop team. You do not use Nemotron as your team chat; Nemotron/OpenRouter is only the product feature being built inside `index.html`.

## Mission

Build and maintain the single-file Nemotron Ultra multi-agent chat room described below. Coordinate with other Codex agents through the local P2P agent chat tools, keep git synchronized, and avoid overwriting other agents' work.

## Team Protocol

1. Identify yourself when joining the room.
   - `ABAI` = Abi's Codex agent
   - `ATCHAI` = Atchaya's Codex agent
   - `THIRAI` = Thiru's Codex agent
   - `DHARAI` = Dharak's Codex agent

2. Start by syncing the repo.
   ```bash
   git pull origin main
   ```

3. Join the local P2P chat if the relay is being used.
   ```bash
   node agent.js <YOUR_AGENT_ID> <ROOM_SECRET>
   ```

4. Say hi and announce status.
   ```text
   say hi everyone, <YOUR_AGENT_ID> is online
   status
   ```

5. Accept tasks only when addressed by `@YOUR_AGENT_ID` or when a human assigns the task.

6. Before editing, state what files you will touch. Prefer disjoint files or clearly scoped sections when multiple agents work at once.

7. After finishing a change, verify it, then report:
   - files changed
   - what was implemented
   - verification performed
   - any remaining risk or blocker

8. Sync through git after each complete unit of work.
   ```bash
   git status
   git add <changed-files>
   git commit -m "<AGENT_ID>: short description"
   git pull --rebase origin main
   git push origin main
   ```

If a conflict appears, stop and report it in chat before resolving unless the fix is obvious and only touches your own changes.

## Prompt For Other Codex Agents

Copy this into each teammate's Codex session before they start work:

```text
You are a local Codex coding agent working on the IdeaForge repo with other laptop-based Codex agents.

Your team lead / master agent is ABAI, Abi's Codex agent. Chat with ABAI through the local P2P room, not through Nemotron. Nemotron/OpenRouter is only the app feature being built in index.html.

Your first actions:
1. Run `git pull origin main`.
2. Start or join the P2P room with `node agent.js <YOUR_AGENT_ID> <ROOM_SECRET>` if the relay is being used.
3. Say: `hi ABAI, <YOUR_AGENT_ID> online, synced with main`.
4. Run `git status` and report whether your tree is clean.

How to talk to ABAI:
- Use `@ABAI` for coordination, blockers, file ownership, merge conflicts, or review requests.
- Before editing, tell ABAI what file or section you plan to touch.
- If you need work from another agent, ask ABAI to assign or approve it.
- Do not silently edit files another agent is already working on.

Message format:
- Starting work: `@ABAI starting <task>; touching <files>; current git status: <summary>`
- Need help: `@ABAI blocked on <problem>; tried <steps>; need <specific decision>`
- Finished: `@ABAI done <task>; changed <files>; verified with <commands>; commit <hash or not committed>`
- Conflict: `@ABAI conflict in <files>; stopping before resolving unless you approve`

Git rules:
- Pull before starting a task.
- Commit only your own scoped changes.
- Before push, run `git status` and `git pull --rebase origin main`.
- Push only after a clean verification pass or after clearly reporting any test you could not run.
- Never reset, checkout, or delete another agent's work unless ABAI explicitly approves it.

Product goal:
Maintain the single-file browser app in `index.html`: a Nemotron Ultra multi-agent chat room powered by OpenRouter. Keep it vanilla HTML/CSS/JS, no backend, no framework, no dependencies.
```

## Current Product Task

Build a multi-agent chat room where multiple Nemotron Ultra AI agents collaborate autonomously, and humans can join, interrupt, and `@ping` any agent at any time. This runs entirely in a single HTML file with no backend, powered by OpenRouter's free Nemotron 3 Ultra endpoint.

## Stack

- Single file: `index.html` only, using HTML, CSS, and vanilla JS.
- No bundler, no framework, no backend.
- AI model: `nvidia/nemotron-3-ultra-550b-a55b:free`.
- API URL: `https://openrouter.ai/api/v1/chat/completions`.
- User pastes their OpenRouter API key into the browser setup screen.
- Store key, room name, settings, and session history in `localStorage`.
- Stream responses with `fetch`, `stream: true`, and `ReadableStream` chunks.

## Required App Features

### Setup Screen

- Full-page centered form.
- OpenRouter API key input.
- Room name input, default `agent-room`.
- `Enter Room` button.
- Note that the key is stored locally only.
- API key must never leave the browser except in the OpenRouter `Authorization` header.

### Main Chat UI

- Dark UI with sidebar and chat area.
- Sidebar shows room name, 6-character session code with copy action, online agents, collaboration toggles, and settings.
- Chat area has topbar, chain breadcrumb, message feed, stop button, and input bar.
- Mobile layout must keep settings and sidebar controls reachable.

### Agents

Define these five in-browser agents. All use the same Nemotron model but distinct system prompts.

| Agent ID | Role | Prompt focus |
|---|---|---|
| `@planner` | Task decomposition | Break tasks into steps and coordinate other agents |
| `@coder` | Code writer | Write clean runnable code; return JSON `{text, code}` when producing code |
| `@critic` | Reviewer and debugger | Find issues and suggest specific improvements |
| `@researcher` | Facts and reasoning | Cite sources and reason carefully |
| `@summarizer` | Synthesis | Condense threads and extract action items |

Each system prompt must be at most 3 sentences.

### Message Object

```js
{
  id: crypto.randomUUID(),
  sender: 'human' || agentId,
  text: string,
  code: string || null,
  thinking: string || null,
  ts: Date.now(),
  auto: boolean
}
```

Render requirements:
- Avatar circle with initials and fixed color per agent.
- Highlight `@mentions` as colored pills.
- Render `code` in a styled `<pre><code>` block with a copy button.
- Parse `<think>...</think>` from Nemotron replies and display it only in a collapsible reasoning block.
- Show timestamps as `HH:MM`.
- Show an `auto` badge on agent-triggered messages.

### Streaming

- Use OpenRouter's OpenAI-compatible streaming chat completions endpoint.
- Show one live streaming bubble per response.
- Update the existing bubble in place as tokens arrive.
- Do not append one DOM node per token.
- Use a blinking cursor at the end of the active stream.

### Token Efficiency

Critical constraints:
- Never send more than the last 6 conversation messages to the API.
- Do not replay full history.
- `max_tokens` must be 800.
- Temperature: `0.3` for `@coder` and `@critic`; `0.7` for the others.
- Keep system prompts short.

Context builder pattern:

```js
function buildContext(agentId, history) {
  const agent = AGENTS[agentId];
  const recentMsgs = history.slice(-6).map(m => ({
    role: m.sender === 'human' ? 'user' : 'assistant',
    content: `[${m.sender}]: ${m.text}`
  }));
  return [
    { role: 'system', content: agent.systemPrompt },
    ...recentMsgs
  ];
}
```

### Human Interrupts

- If a human sends `@agentId`, clear the pending queue and make that agent respond immediately.
- Human input must remain active while agents are responding.
- `Enter` sends; `Shift+Enter` adds a newline.
- `@` opens autocomplete.
- Autocomplete closes on `Escape` and selects on `Enter` or click.
- Stop button must cancel pending queue and the active stream with `AbortController`.

### Agent Chaining

- After an agent reply, scan clean display text for `@mentions`.
- Queue mentioned agents automatically when collaboration is enabled.
- Hard cap chain depth at 3 by default to prevent loops.
- Settings may allow chain depth 1-5, but API context still must never exceed 6 messages.
- Show breadcrumb such as `planner -> coder -> critic`.

### Settings

Include:
- Masked API key field with show/hide.
- Max chain depth slider, 1-5.
- Context window slider, 3-6 preferred to protect the hard 6-message cap.
- Auto-route to planner toggle.
- Clear history button.
- Export chat as `.txt`.

Export must include clean conversation only and must not include hidden reasoning blocks.

### Error Handling

- If OpenRouter returns 429 or 5xx, show a retry button inside the message bubble.
- Do not crash the app.
- Preserve input usability after errors.

## Visual Requirements

- Dark background `#0e0e0f`.
- Card/surface color `#1a1a1b`.
- Agent colors:
  - `@planner`: `#7F77DD`
  - `@coder`: `#378ADD`
  - `@critic`: `#D85A30`
  - `@researcher`: `#1D9E75`
  - `@summarizer`: `#EF9F27`
- Human messages should be visually distinct.
- Code blocks should be dark and copyable.
- Reasoning blocks should be muted and collapsible.

## Deliverable

One complete `index.html` file that runs by opening it in a browser or serving the repo locally. No external dependencies are allowed except calls from the browser to OpenRouter.

## Do Not Do

- Do not build a backend for the Nemotron chat room.
- Do not route API keys through any server.
- Do not use Nemotron as the Codex team coordination layer.
- Do not send analytics or logs anywhere.
- Do not overwrite another agent's uncommitted changes.
- Do not push without first pulling and checking status.
