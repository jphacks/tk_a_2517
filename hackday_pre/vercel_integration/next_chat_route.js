// Example Next.js App Router route using Vercel AI SDK as MCP client
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { experimental_createMCPClient as createMcpClient } from 'ai';

export async function POST(req){
  const { messages } = await req.json();

  const mcpClient = await createMcpClient({
    transport: { type: 'sse', url: 'http://localhost:3001/sse' }
  });

  const tools = await mcpClient.tools();

  const result = streamText({
    model: process.env.VERCEL_AI_MODEL || 'vercel/ai',
    messages,
    tools,
    onFinish: () => { mcpClient.close(); }
  });

  return NextResponse.json({ ok: true, stream: await result.toString() });
}
