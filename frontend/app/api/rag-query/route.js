import { NextResponse } from 'next/server';
import { scrapeUrl, searchPatternsInText } from '../../../lib/scraper';

export async function POST(req) {
  try {
    const { spot_id, userLang = 'ja' } = await req.json();
    
    // 観光地のURLを生成（実際の実装では適切なURLを構築）
    const tourismUrls = {
      'kinkakuji': 'https://ja.wikipedia.org/wiki/金閣寺',
      'ginkakuji': 'https://ja.wikipedia.org/wiki/銀閣寺',
      'kiyomizudera': 'https://ja.wikipedia.org/wiki/清水寺',
      'fushimi': 'https://ja.wikipedia.org/wiki/伏見稲荷大社'
    };
    
    const url = tourismUrls[spot_id] || `https://ja.wikipedia.org/wiki/${encodeURIComponent(spot_id)}`;
    
    // スクレイピング実行
    const scrapeResult = await scrapeUrl(url, 5);
    
    // 観光地関連のパターンを検索
    const tourismPatterns = [
      { name: '歴史', keyword: '歴史|建立|創建|年代' },
      { name: 'アクセス', keyword: 'アクセス|交通|駅|バス' },
      { name: '営業時間', keyword: '営業|開館|閉館|時間' },
      { name: '料金', keyword: '料金|入場|無料|有料' },
      { name: '見どころ', keyword: '見どころ|特徴|名所|観光' }
    ];
    
    const patternResults = searchPatternsInText(scrapeResult.snippet, tourismPatterns);
    
    // 要約を生成（簡単な実装）
    const summary = generateSummary(scrapeResult.snippet, patternResults);
    
    // 近隣スポットをシミュレート
    const nearby = generateNearbySpots(spot_id);
    
    return NextResponse.json({
      message: summary,
      nearby: nearby,
      raw: {
        url: scrapeResult.url,
        snippet: scrapeResult.snippet,
        patternResults,
        tasks: scrapeResult.tasks
      },
    });
  } catch (e) {
    console.error('RAG query error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 簡単な要約生成
function generateSummary(text, patterns) {
  const sentences = text.split(/[。！？!?\n]+/).filter(s => s.trim().length > 10);
  const relevantSentences = sentences.slice(0, 3);
  return relevantSentences.join('。') + '。';
}

// 近隣スポット生成
function generateNearbySpots(spot_id) {
  const nearbyMap = {
    'kinkakuji': [
      { name: '龍安寺', distance: '徒歩15分' },
      { name: '仁和寺', distance: '徒歩20分' }
    ],
    'ginkakuji': [
      { name: '哲学の道', distance: '徒歩5分' },
      { name: '南禅寺', distance: '徒歩10分' }
    ],
    'kiyomizudera': [
      { name: '八坂神社', distance: '徒歩10分' },
      { name: '祇園', distance: '徒歩15分' }
    ]
  };
  
  return nearbyMap[spot_id] || [
    { name: '近隣スポット1', distance: '徒歩10分' },
    { name: '近隣スポット2', distance: '徒歩15分' }
  ];
}
