import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const event = await req.json();
    const res = await fetch('http://localhost:4000/mcp/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error(`MCP upstream error ${res.status}`);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ status: 'ok', data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
