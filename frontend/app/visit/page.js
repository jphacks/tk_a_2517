// app/visit/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

async function fetchJSON(url, init) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`API error: ${JSON.stringify(data)}`);
  }
  return data;
}

export default function VisitPage() {
  const searchParams = useSearchParams();
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  const refresh = useCallback(() => {
    fetchJSON('/api/query-numbers')
      .then((d) => {
        setAll(Array.isArray(d.list) ? d.list : []);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    // 受け取るキー名は運用に合わせてここで調整。
    // 例: /visit?n=123 や /visit?id=123 や /visit?query=123
    const raw = searchParams.get('n') ?? searchParams.get('id') ?? searchParams.get('query');
    const n = raw != null ? Number(raw) : NaN;

    if (Number.isFinite(n)) {
      fetchJSON('/api/query-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: n }),
      })
        .then((d) => {
          setLastSaved(n);
          setAll(Array.isArray(d.list) ? d.list : []);
          setError(null);
        })
        .catch((e) => setError(e.message));
    } else {
      // 数値が来ていない場合でも現状の一覧は表示
      refresh();
    }
  }, [searchParams, refresh]);

  return (
    <main style={{ padding: 24 }}>
      <h1>/visit — Query Number History</h1>

      <section>
        <p>
          URL クエリで渡された数値を Cookie（JSON 配列）に累積保存します。
          例: <code>/visit?n=123</code>, <code>/visit?id=45</code>, <code>/visit?query=9</code>
        </p>
        <p>直近に保存した値: {lastSaved ?? '(なし)'}</p>
        <button onClick={refresh} style={{ marginTop: 8 }}>最新の履歴を取得</button>
        {error && (
          <p style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>エラー: {error}</p>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>これまでに保存した番号（新しい順・重複排除）</h2>
        {all.length === 0 ? (
          <p>(まだ保存がありません)</p>
        ) : (
          <ol reversed>
            {[...all].reverse().map((n, idx) => (
              <li key={`${n}-${idx}`}><code>{n}</code></li>
            ))}
          </ol>
        )}
        <p>総件数: {all.length}</p>
      </section>
    </main>
  );
}
