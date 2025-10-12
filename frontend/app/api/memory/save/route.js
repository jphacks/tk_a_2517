import { NextResponse } from 'next/server';
import path from 'path';

async function saveToBlob(filename, data) {
  // Lazy import to avoid local dev dependency issues
  const { put } = await import('@vercel/blob');
  const res = await put(`memory/${filename}`, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
  return res.url;
}

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const ts = Date.now();
    const id = body?.spot_id || 'unknown';
    const fname = `${ts}_${id}.json`;
    const payload = { ts, ...body };
    // Use Blob storage on Vercel, filesystem locally
    if (process.env.VERCEL) {
      const url = await saveToBlob(fname, payload);
      return NextResponse.json({ ok: true, file: fname, url });
    } else {
      const dir = path.join(process.cwd(), 'app', 'memory', 'logs');
      const fs = await import('fs/promises');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, fname), JSON.stringify(payload, null, 2), 'utf8');
      return NextResponse.json({ ok: true, file: fname });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
