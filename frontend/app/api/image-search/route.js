import { NextResponse } from 'next/server';
import path from 'path';
import { loadImageBufferFromUrlOrPath, computeHash, hamming } from '../../server_utils/imageHash';

export const runtime = 'nodejs';

async function loadSightseeing() {
  const fs = await import('fs/promises');
  const p = path.join(process.cwd(), 'public', 'json', 'sightseeing', 'sightseeing.json');
  const txt = await fs.readFile(p, 'utf8');
  return JSON.parse(txt);
}

async function loadPublicImageBuffer(publicPath) {
  const rel = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath;
  const abs = path.join(process.cwd(), 'public', rel);
  return loadImageBufferFromUrlOrPath(abs);
}

export async function POST(req) {
  try {
    const { imageUrl, imageBase64 } = await req.json();
    let buffer;
    if (imageBase64) {
      const base = imageBase64.replace(/^data:image\/(png|jpeg);base64,/i, '');
      buffer = Buffer.from(base, 'base64');
    } else if (imageUrl) {
      if (imageUrl.startsWith('/')) {
        buffer = await loadPublicImageBuffer(imageUrl);
      } else {
        buffer = await loadImageBufferFromUrlOrPath(imageUrl);
      }
    } else {
      return NextResponse.json({ error: 'imageUrl or imageBase64 required' }, { status: 400 });
    }

    const targetHash = await computeHash(buffer);

    const data = await loadSightseeing();
    const locs = data?.locations || [];

    let best = { spot_id: null, image: null, distance: Infinity, hash: null };
    for (const loc of locs) {
      const pubPath = loc.image;
      if (!pubPath) continue;
      try {
        const buf = await loadPublicImageBuffer(pubPath);
        const h = await computeHash(buf);
        const d = hamming(targetHash, h);
        if (d < best.distance) best = { spot_id: loc.id, image: pubPath, distance: d, hash: h };
      } catch {
        // ignore broken image
      }
    }

    return NextResponse.json({
      ok: true,
      targetHash,
      match: best,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
