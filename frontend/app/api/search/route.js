import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { clusterTexts } from '../../../lib/cluster';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { keyword } = await req.json();
    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }
    // Minimal SERP fetch (note: replace with SerpAPI/Custom Search for production)
    const serpRes = await fetch(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      },
    });
    const serpHtml = await serpRes.text();
    const $ = cheerio.load(serpHtml);
    const links = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http') && !href.includes('google.com')) links.push(href);
    });

    const top = Array.from(new Set(links)).slice(0, 6);
    const texts = await Promise.all(top.map(async (u) => {
      try {
        const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const h = await r.text();
        const $$ = cheerio.load(h);
        return $$('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);
      } catch { return ''; }
    }));

  const valid = texts.filter(t => t && t.length > 50);
  const clusters = await clusterTexts(valid, 3);
    return NextResponse.json({ keyword, clusters });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
