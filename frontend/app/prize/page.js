"use client";

import { useState, useEffect } from "react";
import { getUserId, getPointsForUser, setPointsForUser } from '../lib/userClient';
import { loadSightseeing, numbersToVisited } from '../stamp/stampUtils';
import { getPointsPerStamp } from '../lib/pointsConfig';

export default function PrizePage() {
  const [points, setPoints] = useState(0);
  const [userId, setUserId] = useState(null);
  const [collectedCount, setCollectedCount] = useState(0);
  const cost = 10; // cost per item (example)

  const items = Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    title: `景品${i + 1}`,
    image: "/img/hatena.jpg",
  }));

  function exchange(item) {
    // use effective display points (max of stored and baseline)
    const baseline = collectedCount * getPointsPerStamp();
    const effective = Math.max((points ?? 0), baseline);
    if (effective < cost) {
      alert("ポイントが足りません。");
      return;
    }
    if (!confirm(`${item.title} を ${cost}ポイントで交換しますか？`)) return;
    const np = effective - cost;
    setPoints(np);
    try { setPointsForUser(userId || getUserId(), np); } catch (e) {}
    alert(`${item.title} を交換しました。`);
  }

  // load per-user points on mount
  useEffect(() => {
    (async () => {
      try {
        const assigned = await import('../lib/userClient').then(m => m.assignSequentialId());
        const id = getUserId();
        setUserId(id || assigned);
        const p = getPointsForUser(id || assigned);
        setPoints(p);
        // load sightseeing and server-side visited numbers to compute collectedCount baseline
        try {
          const d = await loadSightseeing();
          const locs = d?.locations || [];
          let serverList = [];
          try {
            const r = await fetch('/api/query-numbers');
            if (r.ok) {
              const jd = await r.json();
              serverList = Array.isArray(jd.list) ? jd.list : [];
            }
          } catch (e) {}
          const baseVisited = numbersToVisited(serverList, locs);
          setCollectedCount(baseVisited.size);
        } catch (e) {}
      } catch (e) {
        try { const id = getUserId(); setUserId(id); setPoints(getPointsForUser(id)); } catch (e2) {}
      }
    })();
  }, []);

  return (
    <div className="prize-page">
      <link rel="stylesheet" href="/css/prize.css" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 18px' }}>
        <a href="/visit" className="header-action">戻る</a>
      </div>
      <main className="prize-main">
        <div className="points-row">
          <div className="points-label">現在のポイント数：</div>
          <div className="points-value"><span>{Math.max((points ?? 0), collectedCount * getPointsPerStamp())}</span>p</div>
        </div>

        <div className="prize-grid">
          {items.map((item) => (
            <div key={item.id} className="prize-card">
              <div className="prize-image"><img src={item.image} alt={item.title} /></div>
              <div className="prize-title">{item.title}</div>
              <button
                type="button"
                className="exchange-btn"
                onClick={() => exchange(item)}
                disabled={points < cost}
                aria-disabled={points < cost}
              >
                {points < cost ? `交換できません (${cost}p)` : `交換する (${cost}p)`}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
