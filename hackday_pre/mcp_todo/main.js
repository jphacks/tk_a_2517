import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { streamSSE } from 'hono/streaming';
import { SSETransport } from 'hono-mcp-server-sse-transport';
import { z } from 'zod';
import fetch from 'node-fetch';

const app = new Hono();
const mcpServer = new McpServer({ name: 'crowdrescue-mcp', version: '0.1.0' });

// Simple API caller to CrowdRescue server
async function addTasksToCrowdRescue(room, tasks){
  try{
    const resp = await fetch('http://localhost:3003/api/tasks', { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ room, tasks }) });
    return await resp.json();
  }catch(e){ console.error('addTasks error', e); return null; }
}

// Define a tool for MCP: addTasks
mcpServer.tool(
  'addTasks',
  'Add tasks to a CrowdRescue room',
  {
    room: z.string().describe('Room name'),
    tasks: z.array(z.object({ title: z.string().min(1), description: z.string().optional() })).describe('Tasks to add')
  },
  async ({ room, tasks }) => {
    await addTasksToCrowdRescue(room, tasks.map(t=>({ title: t.title, description: t.description }))); 
    return { content: [ { type: 'text', text: `Added ${tasks.length} tasks to ${room}` } ] };
  }
);

// New tool: scrapeAndStepify
mcpServer.tool(
  'scrapeAndStepify',
  'Fetch a URL, extract text and generate tasks (uses Vercel AI route if available)',
  {
    url: z.string().url().describe('URL to scrape'),
    room: z.string().describe('Room to add tasks into'),
    maxTasks: z.number().optional().describe('Max tasks to generate')
  },
  async ({ url, room, maxTasks = 3 }) => {
    try{
      // 1) ask CrowdRescue server to scrape and return snippets
      const resp = await fetch('http://localhost:3003/scrape', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ url, maxTasks }) });
      const scraped = await resp.json();
      const snippet = (scraped && (scraped.snippet || (scraped.tasks && scraped.tasks.map(t=>t.description).join('\n')))) || '';

      // 2) Try to call a local Next.js route that uses Vercel AI SDK (if running)
      let tasks = [];
      try{
        const aiResp = await fetch('http://localhost:3000/api/chat', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ messages: [ { role:'user', content: `Extract up to ${maxTasks} short actionable tasks from the following text:\n\n${snippet}` } ] }) });
        if (aiResp && aiResp.ok){
          const aiData = await aiResp.json();
          // aiData.stream or aiData.result may vary; attempt normalization
          const textOut = (aiData && (aiData.stream || aiData.result || JSON.stringify(aiData))) || '';
          // crude split to tasks
          const parts = textOut.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').split(/[。！？!?\n]+/).map(s=>s.trim()).filter(Boolean);
          for (let i=0;i<Math.min(maxTasks, parts.length); i++) tasks.push({ title: parts[i].slice(0,60), description: parts[i].slice(0,300), status:'open' });
        }
      }catch(e){
        console.warn('AI route call failed, falling back to rules', e && e.message);
      }

      // 3) Fallback: if no tasks from AI, use scraped tasks or simple sentence split
      if (!tasks.length){
        if (scraped && scraped.tasks && scraped.tasks.length){
          tasks = scraped.tasks.map(t=>({ title: t.title || (t.description||'').slice(0,60), description: (t.description||'').slice(0,300), status: 'open' }));
        } else {
          const parts = snippet.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').split(/[。！？!?\n]+/).map(s=>s.trim()).filter(Boolean);
          for (let i=0;i<Math.min(maxTasks, parts.length); i++) tasks.push({ title: parts[i].slice(0,60), description: parts[i].slice(0,300), status:'open' });
        }
      }

      // 4) Post tasks back to CrowdRescue
      await addTasksToCrowdRescue(room, tasks);
      return { content: [ { type:'text', text: `Scraped ${url} and added ${tasks.length} tasks to ${room}` } ] };
    }catch(e){
      console.error('scrapeAndStepify error', e);
      return { content: [ { type:'text', text: 'Failed to scrape and stepify: ' + (e && e.message) } ] };
    }
  }
);

let transports = {};

app.get('/sse', (c) => {
  console.log('[SSE] /sse endpoint accessed');
  return streamSSE(c, async (stream) => {
    try{
      const transport = new SSETransport('/messages', stream);
      transports[transport.sessionId] = transport;
      stream.onAbort(()=>{ delete transports[transport.sessionId]; });
      await mcpServer.connect(transport);
      while(true) await stream.sleep(60_000);
    }catch(e){ console.error('sse error', e); }
  });
});

app.post('/messages', async (c) => {
  const sessionId = c.req.query('sessionId');
  const transport = transports[sessionId ?? ''];
  if (!transport) return c.text('No transport', 400);
  return transport.handlePostMessage(c);
});

serve({ fetch: app.fetch, port: 3001 });
console.log('MCP Todo server running on http://localhost:3001');
