import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function POST(req){
  try{
    console.log('chat: incoming request');
    const raw = await req.text();
    console.log('chat: raw body length=', raw ? raw.length : 0);
    let body;
    try{
      body = raw ? JSON.parse(raw) : {};
    }catch(err){
      console.warn('chat: request JSON parse failed, raw=', raw && raw.slice ? raw.slice(0,500) : raw);
      return NextResponse.json({ ok:false, error: 'invalid JSON body' }, { status:400 });
    }
    const messages = body.messages || [];

    // If a Vercel-managed model is configured, try using the `ai` package.
    if (process.env.VERCEL_AI_MODEL){
      try{
        const pkg = 'ai';
        const ai = await import(pkg);
        const { streamText } = ai;
        const result = streamText({ model: process.env.VERCEL_AI_MODEL, messages });
        const text = await result.toString();
        console.log('chat: used Vercel ai SDK, length=', String(text || '').length);
        return NextResponse.json({ ok: true, stream: text });
      }catch(e){
        // If the dynamic import fails, log and fall back to OpenAI below.
        console.warn('chat: Vercel `ai` SDK unavailable, falling back to OpenAI:', e && e.message);
      }
    }

    // Fallback: use OpenAI SDK (requires OPENAI_API_KEY in env)
    const openaiKey = process.env.OPENAI_API_KEY;
    const forceMock = String(process.env.FORCE_MOCK || '').toLowerCase() === 'true';
    const openaiIsMock = openaiKey && String(openaiKey).startsWith('MOCK');
    const strict = String(process.env.STRICT_MODE || '').toLowerCase() === 'true';

    if (forceMock || openaiIsMock || (!openaiKey && !strict)){
      console.log('chat: running in MOCK mode', { forceMock, openaiIsMock, strict });
      const mockText = messages.map(m => m.content).join('\n') || `MOCK:${Date.now()}`;
      return NextResponse.json({ ok:true, stream: `MOCK_RESPONSE: ${mockText}` });
    }

    if (!openaiKey && strict) {
      console.warn('chat: OPENAI_API_KEY not set; strict mode active; returning 400');
      return NextResponse.json({ ok:false, error: 'OPENAI_API_KEY not set' }, { status:400 });
    }

    console.log('chat: calling OpenAI fallback');
    try{
      const client = new OpenAI({ apiKey: openaiKey });
      const resp = await client.chat.completions.create({ model: process.env.VERCEL_AI_MODEL || 'gpt-4o-mini', messages });
      const text = (resp && resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content) || '';
      console.log('chat: openai output length=', String(text || '').length);
      return NextResponse.json({ ok:true, stream: text });
    }catch(err){
      console.error('chat: OpenAI request failed', err && err.message ? err.message : String(err));
      if (!strict){
        const mockText = messages.map(m => m.content).join('\n') || `MOCK_FALLBACK:${Date.now()}`;
        return NextResponse.json({ ok:true, stream: `MOCK_FALLBACK: ${mockText}` });
      }
      return NextResponse.json({ ok:false, error: 'OpenAI request failed', detail: err && err.message ? err.message : String(err) }, { status:502 });
    }
  }catch(e){
    console.error('chat route error', e && e.stack ? e.stack : e && e.message ? e.message : String(e));
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
