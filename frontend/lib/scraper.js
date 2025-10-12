import axios from 'axios';
import * as cheerio from 'cheerio';

// スクレイピング設定
const SCRAPE_TIMEOUT = 8000; // ms
const SCRAPE_MAX_BYTES = 200 * 1024; // 200 KB
const SCRAPE_MAX_SNIPPET = 300; // chars per task

// robots.txt チェック
export async function robotsAllows(targetUrl) {
  try {
    const u = new URL(targetUrl);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const r = await axios.get(robotsUrl, { timeout: 3000, responseType: 'text' });
    const txt = (r.data || '').toString();
    
    // 簡単なパーサー: User-agent: * ルールとDisallow行を探す
    const lines = txt.split(/\r?\n/).map(l => l.trim());
    let applies = false;
    let disallows = [];
    
    for (let line of lines) {
      if (!line) continue;
      const m = line.match(/^User-agent:\s*(.*)$/i);
      if (m) {
        applies = (m[1].trim() === '*' || m[1].toLowerCase().includes('jphacks'));
        continue;
      }
      const d = line.match(/^Disallow:\s*(.*)$/i);
      if (d && applies) {
        disallows.push(d[1].trim());
      }
    }
    
    const path = u.pathname || '/';
    for (let dis of disallows) {
      if (!dis) continue; // 空は全て許可を意味
      if (path.startsWith(dis)) return false;
    }
    return true;
  } catch (e) {
    // robots.txtが取得できない場合は保守的に許可（ログは出す）
    console.warn('robots.txt check failed', e && e.message);
    return true;
  }
}

// PIIマスキング
export function maskPII(text) {
  if (!text) return text;
  // email
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig, '[REDACTED_EMAIL]');
  // phone numbers: 03-1234-5678, 09012345678, +81-90-... etc.
  text = text.replace(/(\+?\d[\d\-\s()]{6,}\d)/g, '[REDACTED_PHONE]');
  // postal code (JP) 〒123-4567 or 123-4567
  text = text.replace(/〒?\d{3}-?\d{4}/g, '[REDACTED_POSTAL]');
  return text;
}

// HTMLからテキスト抽出
export function extractTextFromHtml(html) {
  const $ = cheerio.load(html);
  
  // スクリプトとスタイルを削除
  $('script, style').remove();
  
  // テキストを抽出
  let text = $('body').text() || $('html').text() || '';
  
  // 空白を正規化
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// テキストをタスクに分割
export function textToTasks(text, maxTasks = 3) {
  if (!text) return [];
  
  // 日本語/英語の句読点で分割
  const parts = text.split(/[。！？!?\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
  
  const tasks = [];
  for (let i = 0; i < Math.min(maxTasks, parts.length); i++) {
    const p = parts[i] || '';
    const snippet = maskPII(p).slice(0, SCRAPE_MAX_SNIPPET);
    tasks.push({
      id: `scrape-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      title: snippet.slice(0, 60),
      description: snippet,
      status: 'open'
    });
  }
  
  return tasks;
}

// メインスクレイピング関数
export async function scrapeUrl(url, maxTasks = 3) {
  try {
    // robots.txt チェック
    const allowed = await robotsAllows(url);
    if (!allowed) {
      throw new Error('disallowed_by_robots');
    }

    // フェッチ（サイズ/時間制限付き）
    const r = await axios.get(url, {
      timeout: SCRAPE_TIMEOUT,
      responseType: 'text',
      headers: { 'User-Agent': `JPHacksBot/1.0 (+mailto:contact@jphacks.com)` },
      maxContentLength: SCRAPE_MAX_BYTES,
      maxBodyLength: SCRAPE_MAX_BYTES
    });

    const html = (r.data || '').toString();
    
    // HTMLからテキスト抽出
    const text = extractTextFromHtml(html);
    
    // PIIマスキング
    const maskedText = maskPII(text);
    
    // タスクに分割
    const tasks = textToTasks(maskedText, maxTasks);
    
    return {
      success: true,
      snippet: maskedText.slice(0, 2000),
      tasks,
      url
    };
  } catch (err) {
    console.error('scrape error', err && err.message);
    if (err && err.response && err.response.status === 413) {
      throw new Error('payload_too_large');
    }
    throw new Error('fetch_failed');
  }
}

// パターン化された要素因子の検索
export function searchPatternsInText(text, patterns) {
  const results = [];
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.keyword, 'gi');
    const matches = text.match(regex);
    
    if (matches) {
      results.push({
        pattern: pattern.name,
        keyword: pattern.keyword,
        matches: matches.length,
        context: extractContext(text, pattern.keyword, 100)
      });
    }
  }
  
  return results;
}

// キーワード周辺のコンテキストを抽出
function extractContext(text, keyword, contextLength = 100) {
  const index = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (index === -1) return '';
  
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + keyword.length + contextLength);
  
  return text.slice(start, end);
}