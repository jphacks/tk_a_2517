import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { spot_id, userLang } = await req.json();
    const url = `http://localhost:3001/rag?spot=${encodeURIComponent(spot_id)}&lang=${encodeURIComponent(userLang || 'ja')}`;
    const results = await fetch(url);
    if (!results.ok) throw new Error(`Upstream error ${results.status}`);
    const data = await results.json();

    return NextResponse.json({
      message: data.summary || data.message || '',
      nearby: data.recommendations || data.nearby || [],
      raw: data,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
