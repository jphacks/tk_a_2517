const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mcpFetch = require('./mcp/fetch');
const mcpStepify = require('./mcp/stepify');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const API_KEY = process.env.MCP_API_KEY || 'devkey123';

// simple middleware
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// simple health check (no API key) for quick detection
app.get('/health', (req, res) => {
  console.log('health check from', req.ip);
  res.json({ status: 'ok', pid: process.pid });
});

app.get('/mcp/fetch', requireApiKey, async (req, res) => {
  try {
    await mcpFetch(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/mcp/stepify', requireApiKey, async (req, res) => {
  try {
    await mcpStepify(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// AI-backed stepify proxy: forwards to local FastAPI ai_server
app.post('/ai/stepify', requireApiKey, async (req, res) => {
  try {
    const text = req.body && req.body.text;
    if (!text) return res.status(400).json({ error: 'no text' });
    const aiUrl = process.env.MCP_AI_URL || 'http://localhost:8000/ai_stepify';
    const r = await axios.post(aiUrl, { text }, { timeout: 20000 });
    return res.status(r.status).json(r.data);
  } catch (e) {
    console.error('ai proxy error', e && e.message);
    return res.status(500).json({ error: 'ai proxy failed', detail: e.message });
  }
});

const port = process.env.PORT || 3001;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// in-memory room store (for demo)
const rooms = {};

io.on('connection', (socket) => {
  socket.on('room:create', ({ room, tasks }) => {
    rooms[room] = { tasks: tasks || [], participants: 0 };
    io.emit('room:created', { room });
  });

  socket.on('room:join', ({ room }) => {
    if (!rooms[room]) return;
    rooms[room].participants = (rooms[room].participants || 0) + 1;
    socket.join(room);
    io.to(room).emit('room:join', { room, participants: rooms[room].participants });
    // send tasks to the joining participant
    io.to(socket.id).emit('room:tasks', { room, tasks: rooms[room].tasks });
  });

  socket.on('task:claim', ({ room, id }) => {
    if (!rooms[room]) return;
    rooms[room].tasks = rooms[room].tasks.map(t => t.id === id ? { ...t, status: 'claimed' } : t);
    io.to(room).emit('task:update', { room, tasks: rooms[room].tasks });
  });

  socket.on('task:complete', ({ room, id }) => {
    if (!rooms[room]) return;
    rooms[room].tasks = rooms[room].tasks.map(t => t.id === id ? { ...t, status: 'done' } : t);
    io.to(room).emit('task:update', { room, tasks: rooms[room].tasks });
  });

  // Accept OCR-extracted text and generate tasks via stepify.processText
  socket.on('submit_ocr', ({ room, text }) => {
    try {
      const stepify = require('./mcp/stepify');
      const newTasks = stepify.processText(text);
      if (!rooms[room]) {
        rooms[room] = { tasks: newTasks, participants: 0 };
      } else {
        // append new tasks (avoid id collisions by renaming)
        const offset = rooms[room].tasks.length;
        const ren = newTasks.map((t, i) => ({ ...t, id: `t${offset + i + 1}` }));
        rooms[room].tasks = rooms[room].tasks.concat(ren);
      }
      io.to(room).emit('task:update', { room, tasks: rooms[room].tasks });
    } catch (e) {
      io.to(socket.id).emit('error', { message: 'stepify error' });
    }
  });

  socket.on('disconnecting', () => {
    // decrease participant counts (best-effort)
    const joined = Array.from(socket.rooms).filter(r => r !== socket.id);
    joined.forEach(room => {
      if (rooms[room]) {
        rooms[room].participants = Math.max(0, (rooms[room].participants || 1) - 1);
        io.to(room).emit('room:join', { room, participants: rooms[room].participants });
      }
    });
  });
});

server.listen(port, () => console.log(`MCP experiment running on http://localhost:${port}`));
