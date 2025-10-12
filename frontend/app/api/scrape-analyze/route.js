import { NextResponse } from 'next/server';
import { scrapeUrl, searchPatternsInText } from '../../../lib/scraper';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { url, keywords = [], maxResults = 5 } = await req.json();
    if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

    const result = await scrapeUrl(url, Math.min(10, Math.max(1, maxResults)));

    const patterns = (keywords || []).map((k) => ({ name: k, keyword: k }));
    const matches = patterns.length > 0
      ? searchPatternsInText(result.snippet, patterns)
      : [];

    return NextResponse.json({ ...result, patternResults: matches });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
import { scrapeUrl, searchPatternsInText } from '../../lib/scraper';

// スクレイピングと分析のAPI
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, keywords = [], maxResults = 5 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // URLの検証
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // スクレイピング実行
    const scrapeResult = await scrapeUrl(url, maxResults);

    // キーワード検索（指定された場合）
    let patternResults = [];
    if (keywords.length > 0) {
      patternResults = searchPatternsInText(scrapeResult.snippet, keywords);
    }

    return res.status(200).json({
      success: true,
      url: scrapeResult.url,
      snippet: scrapeResult.snippet,
      tasks: scrapeResult.tasks,
      patternResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scrape analyze error:', error);
    
    if (error.message === 'disallowed_by_robots') {
      return res.status(403).json({ error: 'Access disallowed by robots.txt' });
    }
    
    if (error.message === 'payload_too_large') {
      return res.status(413).json({ error: 'Page too large to process' });
    }
    
    if (error.message === 'fetch_failed') {
      return res.status(500).json({ error: 'Failed to fetch page' });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}
