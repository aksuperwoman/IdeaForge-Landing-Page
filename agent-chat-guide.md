# Agent Chat Guide — IdeaForge P2P Multi-Agent System

## Overview

4 AI agents (one per laptop) + 3 humans collaborate in a shared chat room. Tasks are assigned via `@mentions`, agents execute work (code, research, review) and sync via git automatically.

### Agents (one per laptop)

| ID | Name | Role | Laptop |
|---|---|---|---|
| `ABAI` | Abi's AI | Your agent | Abi |
| `ATCHAI` | Atchaya's AI | Your agent | Atchaya |
| `THIRAI` | Thiru's AI | Your agent | Thiru |
| `DHARAI` | Dharak's AI | Your agent | Dharak |

### Humans (can connect from anywhere)

| ID | Person |
|---|---|
| `ABI` | Abi |
| `HUMAN1` | Atchaya |
| `HUMAN2` | Thiru |
| `HUMAN3` | Dharak |

---

## How to connect

### 1. Prerequisites

```bash
# Install Node.js (if not installed)
# https://nodejs.org/ (v18+)

# Clone the repo
git clone https://github.com/Achiever-s-Syndicate/IdeaForge.git
cd IdeaForge

# Install ws dependency
npm install ws
```

### 2. Start your agent

Each person runs this on **their own laptop** with their assigned ID and the shared room secret:

```bash
node agent.js <YOUR_AGENT_ID> <ROOM_SECRET>
```

Example:

```bash
node agent.js ABAI "hackathon2026"
```

You'll see:
```
✓ Connected to ws://localhost:8080
Agent ABAI active. Waiting for tasks...
```

### 3. Chat commands (in the agent terminal)

| Command | What it does |
|---|---|
| `@ABAI implement login` | Assign task to specific agent |
| `@ATCHAI review my code` | Assign task to another agent |
| `all checkpoint please` | Broadcast to all agents |
| `git: pull origin main` | Run a git command on your machine |
| `git: add -A && git commit -m "msg"` | Commit changes locally |
| `git: push origin main` | Push to GitHub |
| `say hello everyone` | Send a chat message (no task) |
| `status` | Show room status + git status |
| `help` | Show all commands |
| `exit` | Disconnect |

---

## Git workflow (auto-sync)

Your agent can execute git commands remotely via tasks, or you type them locally.

### Typical cycle:

```bash
# 1. Always pull before starting work
git: pull origin main

# 2. Make changes (code, docs, etc.)

# 3. Commit & push
git: add -A
git: commit -m "ABAI: implement user auth"
git: push origin main
```

### Conflict handling:

If two agents edit the same file:

```bash
git: pull origin main
# Resolve conflict manually in your editor
git: add -A
git: commit -m "ABAI: resolve merge conflict"
git: push origin main
```

---

## Task assignment flow

Anyone (human or agent) can assign tasks using `@AgentID`.

```
@ABAI build the login page UI
```

The agent receives:
```
📋 Task from ABI: build the login page UI
```

The agent should:
1. Acknowledge the task
2. Do the work
3. Commit and push changes
4. Report back

---

## Server setup

One person needs to run the relay server on a **publicly reachable machine** (or use a free service like Railway/Render/Glitch).

```bash
node server.js
```

By default it runs on port `8080`. Set `SERVER` env var on each agent to point to it:

```bash
# If server is at 123.456.789.0:8080
SERVER=ws://123.456.789.0:8080 node agent.js ABAI "hackathon2026"
```

For local testing, just run server + agents on the same machine in different terminals.

---

## Message protocol (for agent AI integration)

If you want your AI agent to programmatically parse/respond to messages, the WebSocket messages are JSON:

### Client → Server

```json
{"type": "join", "id": "ABAI", "secret": "room123"}
{"type": "message", "text": "hello"}
{"type": "task", "target": "ATCHAI", "text": "review PR"}
{"type": "task", "target": "all", "text": "status update"}
{"type": "git_status", "status": {"cmd": "pull", "ok": true, "output": "Already up to date."}}
```

### Server → Client

```json
{"type": "joined", "id": "ABAI", "agents": ["ABAI","ATCHAI"], "humans": ["ABI"]}
{"type": "client_joined", "id": "THIRAI", "agents": [...], "humans": [...]}
{"type": "task", "from": "ABI", "text": "build login page", "target": "ABAI"}
{"type": "message", "from": "ABAI", "text": "hello"}
{"type": "git_status", "from": "ABAI", "status": {"cmd": "pull", "ok": true}}
```
