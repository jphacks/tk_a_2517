import { useState } from 'react';
import { scrapeAndAnalyze, searchPatterns } from '../lib/ragClient';

export default function ScrapingInterface() {
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    if (!url) {
      setError('URLを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const keywordList = keywords.split(',').map(k => ({
        name: k.trim(),
        keyword: k.trim()
      }));

      const result = await scrapeAndAnalyze({
        url,
        keywords: keywordList,
        maxResults: 5
      });

      setResults(result);
    } catch (err) {
      setError(err.message || 'スクレイピングに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePatternSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const patterns = [
        { name: '歴史的建造物', keyword: '寺|神社|城' },
        { name: '自然景観', keyword: '山|川|公園' },
        { name: '文化施設', keyword: '博物館|美術館' }
      ];

      const result = await searchPatterns({
        patterns,
        location: '京都'
      });

      setResults(result);
    } catch (err) {
      setError(err.message || 'パターン検索に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>スクレイピング & 分析</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          URL:
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          キーワード (カンマ区切り):
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="歴史, アクセス, 料金"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleScrape}
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '処理中...' : 'スクレイピング実行'}
        </button>

        <button
          onClick={handlePatternSearch}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '処理中...' : 'パターン検索'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {results && (
        <div>
          <h3>結果</h3>
          
          {results.snippet && (
            <div style={{ marginBottom: '20px' }}>
              <h4>抽出されたテキスト</h4>
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {results.snippet}
              </div>
            </div>
          )}

          {results.tasks && results.tasks.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>生成されたタスク</h4>
              {results.tasks.map((task, index) => (
                <div key={task.id} style={{
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: '#e9ecef',
                  border: '1px solid #ced4da',
                  borderRadius: '4px'
                }}>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                </div>
              ))}
            </div>
          )}

          {results.patternResults && results.patternResults.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>パターン検索結果</h4>
              {results.patternResults.map((pattern, index) => (
                <div key={index} style={{
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: '#d1ecf1',
                  border: '1px solid #bee5eb',
                  borderRadius: '4px'
                }}>
                  <strong>{pattern.pattern}</strong> - {pattern.matches}件のマッチ
                  <p>{pattern.context}</p>
                </div>
              ))}
            </div>
          )}

          {results.patterns && results.patterns.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>観光地パターン検索結果</h4>
              {results.patterns.map((pattern, index) => (
                <div key={index} style={{
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '4px'
                }}>
                  <strong>{pattern.pattern}</strong> ({pattern.location})
                  <p>結果数: {pattern.results}件</p>
                  <p>最終更新: {new Date(pattern.lastUpdated).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
