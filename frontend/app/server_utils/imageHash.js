import Jimp from 'jimp';

export async function loadImageBufferFromUrlOrPath(input) {
  if (!input) throw new Error('no image input');
  if (/^https?:\/\//i.test(input)) {
    const r = await fetch(input);
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
  }
  // local file path
  const fs = await import('fs');
  return fs.readFileSync(input);
}

export async function computeHash(buffer) {
  const img = await Jimp.read(buffer);
  // Jimp.hash() gives a pHash-like string
  return img.hash();
}

export function hamming(a, b) {
  if (!a || !b) return Infinity;
  const len = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++;
  return d + Math.abs(a.length - b.length);
}
