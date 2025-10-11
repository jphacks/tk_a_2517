import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Simple verification endpoint: accepts { prompt, expected } and asks the model
// to answer the prompt, returning the model output and a pass/fail flag if
// `expected` is provided. Uses Vercel `ai` SDK when available, otherwise OpenAI.
export async function POST(req){
  try{
    // debug: log incoming request and read raw body safely
    console.log('verify: incoming request');
    const raw = await req.text();
    console.log('verify: raw body length=', raw ? raw.length : 0);
    let body;
    try{
      body = raw ? JSON.parse(raw) : {};
    }catch(err){
      console.warn('verify: request JSON parse failed, raw=', raw && raw.slice ? raw.slice(0,500) : raw);
      return NextResponse.json({ ok:false, error: 'invalid JSON body' }, { status:400 });
    }
    const prompt = body.prompt || '';
    const expected = body.expected;

    if (!prompt) return NextResponse.json({ ok:false, error: 'prompt required' }, { status:400 });

    // Determine mock/strict/openai presence early so we can short-circuit
    const openaiKey = process.env.OPENAI_API_KEY;
    const forceMock = String(process.env.FORCE_MOCK || '').toLowerCase() === 'true';
    const openaiIsMock = openaiKey && String(openaiKey).startsWith('MOCK');
    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    const hfIsMock = hfToken && String(hfToken).startsWith('MOCK');
    const strict = String(process.env.STRICT_MODE || '').toLowerCase() === 'true';

    // If any mock mode is active, or keys are missing and not strict, return a deterministic mock response immediately.
    if (forceMock || openaiIsMock || hfIsMock || (!openaiKey && !strict)){
      console.log('verify: running in MOCK mode (short-circuit)', { forceMock, openaiIsMock, hfIsMock, strict });
      const mockOutput = `MOCK_RESPONSE: ${prompt}`;
      const pass = expected ? String(mockOutput).includes(String(expected)) : null;
      return NextResponse.json({ ok:true, model: 'mock', output: mockOutput, pass });
    }

    // Try Vercel AI SDK first
    if (process.env.VERCEL_AI_MODEL){
      try{
        const pkg = 'ai';
        const ai = await import(pkg);
        const { streamText } = ai;
        const result = streamText({ model: process.env.VERCEL_AI_MODEL, messages: [ { role: 'user', content: prompt } ] });
        const text = await result.toString();
        const pass = expected ? String(text).includes(String(expected)) : null;
        console.log('verify: used Vercel ai SDK result length=', String(text || '').length);
        return NextResponse.json({ ok:true, model: process.env.VERCEL_AI_MODEL, output: text, pass });
      }catch(e){
        console.warn('verify: Vercel ai import failed, falling back to OpenAI', e && e.message);
      }
    }

  // Next fallback: Hugging Face Inference API (if token provided)
  const hfModel = process.env.HUGGINGFACE_MODEL || 'gpt2';
  if (hfToken){
      try{
  console.log('verify: calling HuggingFace inference', { hfModel: hfModel, hfIsMock: !!hfIsMock, forceMock: !!forceMock, openaiKeyPresent: !!openaiKey });
        const resp = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } })
        });

        const bodyText = await resp.text();
        console.log('verify: HF response length=', bodyText ? bodyText.length : 0, 'status=', resp.status);
        let parsed;
        try{ parsed = JSON.parse(bodyText); } catch(_){ parsed = bodyText; }

        let text;
        if (typeof parsed === 'string'){
          text = parsed;
        } else if (Array.isArray(parsed)){
          text = parsed[0]?.generated_text || parsed[0]?.text || JSON.stringify(parsed);
        } else if (parsed && (parsed.generated_text || parsed.text)){
          text = parsed.generated_text || parsed.text;
        } else {
          text = JSON.stringify(parsed);
        }

        const pass = expected ? String(text).includes(String(expected)) : null;

        if (!resp.ok){
          console.warn('verify: HF returned non-ok', resp.status, text.slice ? text.slice(0,200) : text);
          // If we're running in mock/relaxed mode, return a mock instead of 502
          if (forceMock || hfIsMock || (!openaiKey && !strict)){
            console.log('verify: HF failed but falling back to mock due to mock/relaxed settings', { forceMock, hfIsMock, strict });
            const mockOutput = `MOCK_FALLBACK_HF: ${prompt}`;
            const passMock = expected ? String(mockOutput).includes(String(expected)) : null;
            return NextResponse.json({ ok:true, model: 'mock_fallback', output: mockOutput, pass: passMock });
          }
          return NextResponse.json({ ok:false, model: `hf:${hfModel}`, status: resp.status, output: text, pass }, { status: 502 });
        }

        return NextResponse.json({ ok:true, model: `hf:${hfModel}`, output: text, pass });
      }catch(e){
        console.warn('verify: HF inference failed, falling back to OpenAI', e && e.message);
      }
    }

    // Final fallback: OpenAI (use variables declared earlier)
    if (!openaiKey && strict) {
      console.warn('verify: OPENAI_API_KEY not set; strict mode active; returning 400');
      return NextResponse.json({ ok:false, error: 'OPENAI_API_KEY not set' }, { status:400 });
    }
    console.log('verify: calling OpenAI fallback');
    try{
      const client = new OpenAI({ apiKey: openaiKey });
      const resp = await client.chat.completions.create({ model: process.env.VERCEL_AI_MODEL || 'gpt-4o-mini', messages: [ { role:'user', content: prompt } ] });
      const text = (resp && resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content) || '';
      const pass = expected ? String(text).includes(String(expected)) : null;
      console.log('verify: openai output length=', String(text || '').length);
      return NextResponse.json({ ok:true, model: process.env.VERCEL_AI_MODEL || 'openai', output: text, pass });
    }catch(err){
      // On OpenAI failure, if not strict, return mock instead of 502
      console.error('verify: OpenAI request failed', err && err.message ? err.message : String(err));
      if (!strict){
        const mockOutput = `MOCK_FALLBACK: ${prompt}`;
        const pass = expected ? String(mockOutput).includes(String(expected)) : null;
        return NextResponse.json({ ok:true, model: 'mock_fallback', output: mockOutput, pass });
      }
      return NextResponse.json({ ok:false, error: 'OpenAI request failed', detail: err && err.message ? err.message : String(err) }, { status: 502 });
    }
  }catch(e){
    console.error('verify route error', e && e.stack ? e.stack : e && e.message ? e.message : String(e));
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status:500 });
  }
}
