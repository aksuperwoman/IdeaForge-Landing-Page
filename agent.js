const WebSocket = require('ws');
const { execSync } = require('child_process');
const readline = require('readline');

// Config
const SERVER = process.env.SERVER || 'ws://localhost:8080';
const AGENT_ID = process.argv[2];
const ROOM_SECRET = process.argv[3];
const REPO_DIR = process.argv[4] || '.';

const AGENTS = ['ABAI', 'ATCHAI', 'THIRAI', 'DHARAI', 'ABI'];
const HUMANS = ['HUMAN1', 'HUMAN2', 'HUMAN3'];

function isValidId(id) {
  return AGENTS.includes(id) || HUMANS.includes(id);
}

if (!AGENT_ID || !ROOM_SECRET) {
  console.error('Usage: node agent.js <AGENT_ID> <ROOM_SECRET> [REPO_DIR]');
  console.error(`Valid agent IDs: ${AGENTS.join(', ')}`);
  console.error(`Valid human IDs: ${HUMANS.join(', ')}`);
  process.exit(1);
}

if (!isValidId(AGENT_ID)) {
  console.error(`Invalid ID. Must be one of: ${[...AGENTS, ...HUMANS].join(', ')}`);
  process.exit(1);
}

const isAgent = AGENTS.includes(AGENT_ID);
const typeLabel = isAgent ? 'AGENT' : 'HUMAN';

// Terminal UI
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let isInputActive = false;

function clearLine() {
  process.stdout.write('\r\x1b[K');
}

function printMsg(sender, text, gitStatus = null) {
  clearLine();
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const color = s => `\x1b[${s}m`;
  const reset = '\x1b[0m';
  const colors = {
    ABAI: 95, ATCHAI: 94, THIRAI: 93, DHARAI: 92,
    ABI: 96, HUMAN1: 97, HUMAN2: 97, HUMAN3: 97,
    SYSTEM: 90
  };
  const c = colors[sender] || 90;
  const tag = isAgent && sender === 'SYSTEM' ? '' : ` [${color(c)}${sender}${reset}]`;
  console.log(`${color(90)}${time}${reset}${tag}: ${text}`);
  if (gitStatus) {
    console.log(`   ${color(90)}📦 git: ${JSON.stringify(gitStatus)}${reset}`);
  }
  if (isInputActive) {
    process.stdout.write('> ');
  }
}

function runGit(cmd) {
  try {
    const out = execSync(`git ${cmd}`, { cwd: REPO_DIR, encoding: 'utf8', timeout: 30000 }).trim();
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: e.stderr || e.message };
  }
}

// Connect
let ws, pingInterval, reconnectTimer;
let gitBusy = false;

function connect() {
  ws = new WebSocket(SERVER);

  ws.on('open', () => {
    clearLine();
    console.log(`\x1b[32m✓ Connected to ${SERVER}\x1b[0m`);
    if (isAgent) {
      console.log(`\x1b[34mAgent ${AGENT_ID} active. Waiting for tasks...\x1b[0m`);
    } else {
      console.log(`\x1b[34mHuman ${AGENT_ID} active. Use @agent to assign tasks.\x1b[0m`);
    }
    console.log(`\x1b[90mType 'help' for commands.\x1b[0m`);

    ws.send(JSON.stringify({ type: 'join', id: AGENT_ID, secret: ROOM_SECRET }));

    pingInterval = setInterval(() => {
      try { ws.send(JSON.stringify({ type: 'heartbeat' })); } catch {}
    }, 15000);
  });

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
      case 'error':
        printMsg('SYSTEM', `\x1b[31mError: ${msg.text}\x1b[0m`);
        break;

      case 'joined': {
        const agentList = (msg.agents || []).join(', ');
        const humanList = (msg.humans || []).join(', ');
        printMsg('SYSTEM', `Joined room. Agents: ${agentList || 'none'}. Humans: ${humanList || 'none'}.`);
        break;
      }

      case 'client_joined':
        printMsg('SYSTEM', `${msg.id} joined the room.`);
        break;

      case 'client_left':
        printMsg('SYSTEM', `${msg.id} left the room.`);
        break;

      case 'message':
        printMsg(msg.from, msg.text);
        break;

      case 'task':
        handleTask(msg);
        break;

      case 'git_status':
        printMsg(msg.from, `Git status update:`, msg.status);
        break;

      case 'heartbeat_ack':
      case 'ping':
        break;
    }
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
    printMsg('SYSTEM', '\x1b[31mDisconnected.\x1b[0m Reconnecting in 5s...');
    reconnectTimer = setTimeout(connect, 5000);
  });

  ws.on('error', (err) => {
    printMsg('SYSTEM', `\x1b[31mWebSocket error: ${err.message}\x1b[0m`);
  });
}

function sendMessage(text) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'message', text }));
  }
}

function sendTask(target, text) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'task', target, text }));
    printMsg('SYSTEM', `Task sent to ${target}: ${text}`);
  }
}

function sendGitStatus(status) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'git_status', status }));
  }
}

async function handleTask(msg) {
  printMsg('SYSTEM', `\x1b[33m📋 Task from ${msg.from}: ${msg.text}\x1b[0m`);

  if (!isAgent) {
    printMsg('SYSTEM', 'Humans cannot auto-execute tasks.');
    return;
  }

  const taskText = msg.text.toLowerCase();

  if (taskText.startsWith('git:') || taskText.startsWith('git ')) {
    const cmd = msg.text.slice(4).trim();
    printMsg(AGENT_ID, `\x1b[33mRunning: git ${cmd}\x1b[0m`);
    gitBusy = true;
    const result = runGit(cmd);
    gitBusy = false;
    const status = { cmd, ok: result.ok, output: result.out.slice(0, 500) };
    printMsg(AGENT_ID, result.ok ? `\x1b[32m✓ git ${cmd}\x1b[0m` : `\x1b[31m✗ git ${cmd}: ${result.out.slice(0, 200)}\x1b[0m`);
    sendGitStatus(status);
  }
}

function showHelp() {
  console.log(`
\x1b[1mCommands\x1b[0m
  help                          Show this help
  @<agent> <message>            Send task to specific agent
  all <message>                 Broadcast message to all agents
  git: <cmd>                    Run git command (agent only)
  status                        Show room status
  say <message>                 Send chat message
  exit / quit                   Disconnect and exit

\x1b[1mAgent IDs\x1b[0m
  ${AGENTS.join(', ')}  (agents — execute tasks)
  ${HUMANS.join(', ')}  (humans — assign tasks)

\x1b[1mGit Workflow\x1b[0m
  git: pull origin main         Pull latest
  git: add -A && git commit -m  Commit changes
  git: push origin main         Push changes

\x1b[1mAssigning tasks\x1b[0m
  @ABAI implement login button
  @ATCHAI review PR #3
  all checkpoint — everyone report status
`);
}

function handleInput(line) {
  isInputActive = false;
  const trimmed = line.trim();
  if (!trimmed) { promptInput(); return; }

  if (trimmed === 'exit' || trimmed === 'quit') {
    ws.close();
    clearInterval(pingInterval);
    clearTimeout(reconnectTimer);
    process.exit(0);
  }

  if (trimmed === 'help') { showHelp(); promptInput(); return; }

  if (trimmed === 'status') {
    printMsg('SYSTEM', 'Status requested.');
    runGit('status');
    promptInput();
    return;
  }

  // @agent message — send task
  const atMatch = trimmed.match(/^@(\w+)\s+(.+)/);
  if (atMatch && isValidId(atMatch[1])) {
    sendTask(atMatch[1], atMatch[2]);
    promptInput();
    return;
  }

  // all <message> — broadcast task to all agents
  if (trimmed.startsWith('all ')) {
    sendTask('all', trimmed.slice(4));
    promptInput();
    return;
  }

  // git: <cmd>
  if (trimmed.startsWith('git:') || trimmed.startsWith('git ')) {
    if (!isAgent) {
      printMsg('SYSTEM', 'Only agents can run git commands locally.');
      promptInput();
      return;
    }
    const cmd = trimmed.replace(/^git:\s*/, '').replace(/^git\s+/, '');
    gitBusy = true;
    const result = runGit(cmd);
    gitBusy = false;
    printMsg(AGENT_ID, result.ok ? `\x1b[32m${result.out.slice(0, 500)}\x1b[0m` : `\x1b[31m${result.out.slice(0, 300)}\x1b[0m`);
    sendGitStatus({ cmd, ok: result.ok, output: result.out.slice(0, 200) });
    promptInput();
    return;
  }

  // Default: send as chat message
  sendMessage(trimmed);
  promptInput();
}

function promptInput() {
  isInputActive = true;
  rl.question('> ', handleInput);
}

// Capture interrupt
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  ws.close();
  clearInterval(pingInterval);
  clearTimeout(reconnectTimer);
  process.exit(0);
});

// Start
connect();
promptInput();