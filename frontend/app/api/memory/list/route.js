import { NextResponse } from 'next/server';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    if (process.env.VERCEL) {
      // Vercel Blob: list objects via REST API (no official list SDK yet)
      const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_TOKEN;
      if (!token) return NextResponse.json({ items: [] });
      const res = await fetch('https://api.vercel.com/v2/blobs?prefix=memory/', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      const files = (data?.blobs || []).filter((b) => b.pathname?.endsWith('.json'));
      const items = [];
      for (const f of files) {
        try {
          const r = await fetch(f.url, { cache: 'no-store' });
          const j = await r.json();
          items.push(j);
        } catch {}
      }
      items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      return NextResponse.json({ items });
    }

    // Local filesystem fallback
    const dir = path.join(process.cwd(), 'app', 'memory', 'logs');
    const fs = await import('fs/promises');
    const files = await fs.readdir(dir).catch(() => []);
    const items = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const txt = await fs.readFile(path.join(dir, f), 'utf8');
        items.push(JSON.parse(txt));
      } catch {}
    }
    items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
