import { fetchJSON } from './fetchJSON';

// スクレイピングベースのRAGクライアント
export async function queryRag({ spot_id, userLang = 'ja' }) {
  return fetchJSON('/api/rag-query', {
    method: 'POST',
    body: JSON.stringify({ spot_id, userLang }),
  });
}

// 新しいスクレイピング機能
export async function scrapeAndAnalyze({ url, keywords = [], maxResults = 5 }) {
  return fetchJSON('/api/scrape-analyze', {
    method: 'POST',
    body: JSON.stringify({ url, keywords, maxResults }),
  });
}

// パターン化された要素因子の検索
export async function searchPatterns({ patterns, location = '京都' }) {
  return fetchJSON('/api/search-patterns', {
    method: 'POST',
    body: JSON.stringify({ patterns, location }),
  });
}