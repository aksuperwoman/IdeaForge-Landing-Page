const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const AGENTS = ['ABAI', 'ATCHAI', 'THIRAI', 'DHARAI', 'ABI'];
const HUMANS = ['HUMAN1', 'HUMAN2', 'HUMAN3'];

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Agent Relay Server Running\n');
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();

function getRoom(secret) {
  if (!rooms.has(secret)) {
    rooms.set(secret, new Map());
  }
  return rooms.get(secret);
}

function broadcast(room, message, excludeId = null) {
  const clients = room.values();
  for (const client of clients) {
    if (client.id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

function sendToId(room, targetId, message) {
  const client = room.get(targetId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

function isValidClient(id) {
  return AGENTS.includes(id) || HUMANS.includes(id);
}

wss.on('connection', (ws, req) => {
  let clientId = null;
  let roomSecret = null;
  let room = null;

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    switch (msg.type) {
        case 'join': {
        roomSecret = msg.secret;
        clientId = msg.id;

        if (!isValidClient(clientId)) {
          ws.send(JSON.stringify({ type: 'error', text: `Invalid client ID. Must be one of: ${[...AGENTS, ...HUMANS].join(', ')}` }));
          ws.close();
          return;
        }

        room = getRoom(roomSecret);
        if (room.has(clientId)) {
          ws.send(JSON.stringify({ type: 'error', text: `Client ${clientId} already connected in this room` }));
          ws.close();
          return;
        }

        room.set(clientId, { ws, id: clientId, joined: Date.now(), type: AGENTS.includes(clientId) ? 'agent' : 'human' });
        const type = AGENTS.includes(clientId) ? 'agent' : 'human';
        console.log(`[${roomSecret}] ${clientId} (${type}) joined (${room.size} clients)`);

        ws.send(JSON.stringify({
          type: 'joined', id: clientId,
          agents: Array.from(room.keys()).filter(id => AGENTS.includes(id)),
          humans: Array.from(room.keys()).filter(id => HUMANS.includes(id)),
          my_type: type
        }));

        broadcast(room, {
          type: 'client_joined', id: clientId,
          agents: Array.from(room.keys()).filter(id => AGENTS.includes(id)),
          humans: Array.from(room.keys()).filter(id => HUMANS.includes(id)),
          is_agent: type === 'agent'
        }, clientId);
        break;
      }

      case 'task': {
        if (!room || !clientId) return;
        const { target, text } = msg;
        if (target === 'all') {
          broadcast(room, { type: 'task', from: clientId, text, target: 'all' }, clientId);
        } else {
          sendToId(room, target, { type: 'task', from: clientId, text, target });
        }
        break;
      }

      case 'message': {
        if (!room || !clientId) return;
        broadcast(room, { type: 'message', from: clientId, text: msg.text }, clientId);
        break;
      }

      case 'git_status': {
        if (!room || !clientId) return;
        broadcast(room, { type: 'git_status', from: clientId, status: msg.status }, clientId);
        break;
      }

      case 'heartbeat': {
        ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
        break;
      }
    }
  });

  ws.on('close', () => {
    if (room && clientId) {
      const type = AGENTS.includes(clientId) ? 'agent' : 'human';
      room.delete(clientId);
      console.log(`[${roomSecret}] ${clientId} (${type}) left (${room.size} clients remaining)`);
      broadcast(room, {
        type: 'client_left', id: clientId,
        agents: Array.from(room.keys()).filter(id => AGENTS.includes(id)),
        humans: Array.from(room.keys()).filter(id => HUMANS.includes(id))
      });
      if (room.size === 0) rooms.delete(roomSecret);
    }
  });

  ws.on('error', (err) => {
    console.error(`WS error:`, err.message);
  });
});

setInterval(() => {
  for (const [secret, room] of rooms) {
    for (const [id, client] of room) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`Agent Relay Server listening on port ${PORT}`);
  console.log(`Valid agent IDs: ${AGENTS.join(', ')}`);
});