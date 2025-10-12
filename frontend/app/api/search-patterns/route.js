import { NextResponse } from 'next/server';
import { searchPatternsInText, extractTextFromHtml } from '../../../lib/scraper';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { patterns = [], url, text } = await req.json();
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return NextResponse.json({ error: 'patterns array is required' }, { status: 400 });
    }

    let targetText = text || '';
    if (!targetText && url) {
      const res = await fetch(url);
      const html = await res.text();
      targetText = extractTextFromHtml(html);
    }

    const result = searchPatternsInText(targetText || '', patterns);
    return NextResponse.json({ matches: result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
// パターン化された要素因子の検索API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patterns, location = '京都' } = req.body;

    if (!patterns || !Array.isArray(patterns)) {
      return res.status(400).json({ error: 'Patterns array is required' });
    }

    // 観光地情報のパターン化された要素因子
    const tourismPatterns = [
      { name: '歴史的建造物', keyword: '寺|神社|城|古墳|遺跡' },
      { name: '自然景観', keyword: '山|川|湖|海|公園|庭園' },
      { name: '文化施設', keyword: '博物館|美術館|図書館|劇場' },
      { name: '交通アクセス', keyword: '駅|バス|電車|地下鉄|徒歩' },
      { name: '営業時間', keyword: '開館|閉館|営業|休館|時間' },
      { name: '料金情報', keyword: '入場料|料金|無料|有料|チケット' },
      { name: '観光スポット', keyword: '観光|名所|見どころ|スポット' },
      { name: 'イベント情報', keyword: 'イベント|祭り|催し|展示|企画' }
    ];

    // 検索結果をシミュレート（実際の実装では外部APIやデータベースを使用）
    const searchResults = tourismPatterns.map(pattern => ({
      pattern: pattern.name,
      keyword: pattern.keyword,
      location,
      results: Math.floor(Math.random() * 10) + 1, // シミュレート
      sampleUrls: [
        `https://example.com/${location}/${pattern.name.toLowerCase()}/1`,
        `https://example.com/${location}/${pattern.name.toLowerCase()}/2`
      ],
      lastUpdated: new Date().toISOString()
    }));

    return res.status(200).json({
      success: true,
      location,
      patterns: searchResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search patterns error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}
