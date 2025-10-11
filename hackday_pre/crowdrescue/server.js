const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(bodyParser.json());
const axios = require('axios');
const { URL } = require('url');
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// simple in-memory store for demo
const rooms = {};

app.get('/templates', (req, res) => {
  res.json(require('./templates.json'));
});

app.get('/health', (req, res) => res.json({status:'ok'}));

// simple scrape endpoint: fetches a URL, extracts plain text and creates small tasks
// Configuration for safe scraping
const SCRAPE_TIMEOUT = 8000; // ms
const SCRAPE_MAX_BYTES = 200 * 1024; // 200 KB
const SCRAPE_MAX_SNIPPET = 300; // chars per task
const SCRAPE_CONTACT = process.env.SCRAPE_CONTACT || 'you@example.com';

async function robotsAllows(targetUrl){
  try{
    const u = new URL(targetUrl);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const r = await axios.get(robotsUrl, { timeout: 3000, responseType: 'text' });
    const txt = (r.data||'').toString();
    // Very small parser: look for User-agent: * rules and their Disallow lines
    const lines = txt.split(/\r?\n/).map(l=>l.trim());
    let applies = false; let disallows = [];
    for (let line of lines){
      if (!line) continue;
      const m = line.match(/^User-agent:\s*(.*)$/i);
      if (m){ applies = (m[1].trim() === '*' || m[1].toLowerCase().includes('crowdrescue')); continue; }
      const d = line.match(/^Disallow:\s*(.*)$/i);
      if (d && applies){ disallows.push(d[1].trim()); }
      const allow = line.match(/^Allow:\s*(.*)$/i);
      // ignoring Allow specifics for simplicity
    }
    const path = u.pathname || '/';
    for (let dis of disallows){
      if (!dis) continue; // empty means allow all
      // treat prefix match
      if (path.startsWith(dis)) return false;
    }
    return true;
  }catch(e){
    // if robots cannot be fetched, be conservative: allow (but log)
    console.warn('robots.txt check failed', e && e.message);
    return true;
  }
}

function maskPII(text){
  if (!text) return text;
  // email
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig, '[REDACTED_EMAIL]');
  // phone numbers: simple patterns like 03-1234-5678, 09012345678, +81-90-... etc.
  text = text.replace(/(\+?\d[\d\-\s()]{6,}\d)/g, '[REDACTED_PHONE]');
  // postal code (JP) 〒123-4567 or 123-4567
  text = text.replace(/〒?\d{3}-?\d{4}/g, '[REDACTED_POSTAL]');
  return text;
}

app.post('/scrape', async (req, res) => {
  const { url, room, maxTasks = 3 } = req.body || {};
  if (!url) return res.status(400).json({ error: 'missing url' });

  try {
    // robots.txt check
    const allowed = await robotsAllows(url);
    if (!allowed) return res.status(403).json({ error: 'disallowed_by_robots' });

    // fetch with size/time limits
    const r = await axios.get(url, {
      timeout: SCRAPE_TIMEOUT,
      responseType: 'text',
      headers: { 'User-Agent': `CrowdRescueBot/1.0 (+mailto:${SCRAPE_CONTACT})` },
      maxContentLength: SCRAPE_MAX_BYTES,
      maxBodyLength: SCRAPE_MAX_BYTES
    });

    const html = (r.data || '').toString();
    // Naive HTML -> text (remove tags)
    let text = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
                   .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();

    // Mask potential PII before any storage/return
    text = maskPII(text);

    // Split into candidate sentences (Japanese/English punctuation)
    const parts = text.split(/[。！？!?\n]+/).map(s=>s.trim()).filter(Boolean);
    const tasks = [];
    for (let i=0;i<Math.min(maxTasks, parts.length);i++){
      const p = parts[i] || '';
      const snippet = maskPII(p).slice(0, SCRAPE_MAX_SNIPPET);
      tasks.push({ id: `scrape-${Date.now()}-${i}-${Math.floor(Math.random()*1000)}`, title: snippet.slice(0,60), description: snippet, status: 'open' });
    }

    // ensure room exists and append tasks into it
    if (room){
      rooms[room] = rooms[room] || { tasks: [], participants: 0 };
      rooms[room].tasks = rooms[room].tasks.concat(tasks);
      // broadcast updated tasks to room
      io.to(room).emit('task_update', { room, tasks: rooms[room].tasks });
    }

    // respond with only safe snippet (no raw full text)
    return res.json({ snippet: text.slice(0, 2000), tasks });
  } catch (err) {
    console.error('scrape error', err && err.message);
    // axios throws on 413 / maxContentLength; map to friendly message
    if (err && err.response && err.response.status === 413) return res.status(413).json({ error: 'payload_too_large' });
    return res.status(500).json({ error: 'fetch_failed', detail: err.message });
  }
});

// HTTP endpoint for other services (e.g., MCP server) to add tasks into a room
app.post('/api/tasks', (req, res) => {
  const { room, tasks } = req.body || {};
  if (!room || !Array.isArray(tasks)) return res.status(400).json({ error: 'room_and_tasks_required' });
  rooms[room] = rooms[room] || { tasks: [], participants: 0 };
  const normalized = tasks.map(t => ({ id: t.id || `http-${Date.now()}-${Math.floor(Math.random()*10000)}`, title: t.title || '', description: t.description || '', status: t.status || 'open' }));
  rooms[room].tasks = rooms[room].tasks.concat(normalized);
  io.to(room).emit('task_update', { room, tasks: rooms[room].tasks });
  return res.json({ ok: true, added: normalized.length });
});

io.on('connection', socket => {
  socket.on('create_room', ({ room, tasks }) => {
    rooms[room] = { tasks: tasks || [], participants: 0 };
    io.emit('room_created', { room });
  });

  socket.on('join_room', ({ room }) => {
    if (!rooms[room]) return;
    rooms[room].participants = (rooms[room].participants || 0) + 1;
    socket.join(room);
    io.to(room).emit('room_join', { room, participants: rooms[room].participants });
    socket.emit('room_tasks', { room, tasks: rooms[room].tasks });
  });

  socket.on('claim_task', ({ room, id }) => {
    if (!rooms[room]) return;
    rooms[room].tasks = rooms[room].tasks.map(t => t.id === id ? { ...t, status:'claimed' } : t);
    io.to(room).emit('task_update', { room, tasks: rooms[room].tasks });
  });

  socket.on('complete_task', ({ room, id, note }) => {
    if (!rooms[room]) return;
    rooms[room].tasks = rooms[room].tasks.map(t => t.id === id ? { ...t, status:'done', note } : t);
    io.to(room).emit('task_update', { room, tasks: rooms[room].tasks });
  });

  // append tasks sent by client (from local worker or other client-side stepifiers)
  socket.on('add_tasks', ({ room, tasks }) => {
    if (!room || !Array.isArray(tasks)) return;
    rooms[room] = rooms[room] || { tasks: [], participants: 0 };
    // ensure ids
    const normalized = tasks.map(t => ({ id: t.id || `client-${Date.now()}-${Math.floor(Math.random()*10000)}`, title: t.title || '', description: t.description || '', status: t.status || 'open' }));
    rooms[room].tasks = rooms[room].tasks.concat(normalized);
    io.to(room).emit('task_update', { room, tasks: rooms[room].tasks });
  });
});

const port = process.env.PORT || 3003;
server.listen(port, () => console.log(`CrowdRescue demo running on http://localhost:${port}`));
