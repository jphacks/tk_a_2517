// app/visit/page.js
"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import styles from '../stamp/stamp.module.css';
import AcquiredPopup from '../stamp/AcquiredPopup';
import { loadSightseeing, numbersToVisited, loadItemByIdAndLevel } from '../stamp/stampUtils';

async function fetchJSON(url, init) {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, ...init });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const txt = await res.text();
    throw new Error(`Non-JSON response (${res.status}): ${txt.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}

function getParamIdOrIndex(locations) {
  try {
    const usp = new URLSearchParams(window.location.search);
    let id = usp.get('id') || usp.get('spot') || usp.get('name');
    if (id) id = String(id).toLowerCase();
    const ids = (locations || []).map((l) => l.id);
    if (id && ids.includes(id)) return { id, n: ids.indexOf(id) + 1 };
    const nRaw = usp.get('n');
    if (nRaw) {
      const n = Number(nRaw);
      if (Number.isFinite(n) && n > 0 && n <= ids.length) return { id: ids[n - 1], n };
    }
    return null;
  } catch {
    return null;
  }
}

export default function VisitPage() {
  const [data, setData] = useState(null);
  const [visited, setVisited] = useState(() => new Set());
  const [lastId, setLastId] = useState(null);
  const [error, setError] = useState(null);
  const [popupId, setPopupId] = useState(null);

  // popup will load its own item by id so the difficulty selector inside the popup can reload

  // Load dataset + visited history and derive last acquired
  useEffect(() => {
    (async () => {
      try {
        const d = await loadSightseeing();
        setData(d);
        const locs = d?.locations || [];

        // Base: server history
        let serverList = [];
        try {
          const r = await fetchJSON('/api/query-numbers'); // { list: number[] }
          serverList = Array.isArray(r.list) ? r.list : [];
        } catch {}

        const baseVisited = numbersToVisited(serverList, locs);

        // URL param can mark current acquisition as visited and "NEW!"
        const param = getParamIdOrIndex(locs);
        if (param?.id) baseVisited.add(param.id);

        setVisited(baseVisited);
        setLastId(param?.id ?? (locs[serverList.at(-1) - 1]?.id || null));
        setError(null);
      } catch (e) {
        setError(e.message || String(e));
      }
    })();
  }, []);

  const allLocations = useMemo(() => data?.locations || [], [data]);
  const collectedCount = visited.size;
  const totalCount = allLocations.length;
  const points = collectedCount * 2;
  const rewardIcon = '/img/visit/kinkakuzi_reward.jpg';

  const locationsToShow = allLocations.slice(0, 6);
  const remainingSlots = Math.max(0, 6 - locationsToShow.length);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.container}>
        <h1>QRally 保有スタンプ</h1>
        <div style={{ display: 'flex', gap: 32, marginBottom: 16, alignItems: 'center' }}>
          <div>スタンプ保有数：{collectedCount}個</div>
          <div>所持ポイント数：{points}p</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Reward:</span>
            <img src={rewardIcon} alt="reward" width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} />
          </div>
        </div>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.stampContainer}>
          <div className={styles.stampGrid}>
            {locationsToShow.map((loc, idx) => {
              const isVisited = visited.has(loc.id);
              const isNew = lastId && loc.id === lastId;
              return (
                <div
                  key={loc.id}
                  data-index={idx}
                  className={`${styles.stampSlot} ${isVisited ? styles.visited : styles.placeholder}`}
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => {
                    if (isVisited) {
                      // 獲得済みのみポップアップを開く
                      setPopupId(loc.id);
                    }
                    // 未獲得は何もしない（クリック入手の機構を廃止）
                  }}
                  role="button"
                  aria-label={`${loc.name} を開く`}
                >
                  {isVisited ? (
                    <>
                      {/* Reward icon overlay for Kinkakuji */}
                      {loc.id === 'kinkakuji' && (
                        <img src={rewardIcon} alt="reward" className={styles.rewardBadge} />
                      )}
                      {isNew && (
                        <div className={styles.newBadge}>NEW!</div>
                      )}
                      <img src={loc.image} alt={loc.name} className={styles.stampImageOriginal} />
                      <div className={styles.stampText} style={{ marginTop: 8 }}>{loc.name}</div>
                    </>
                  ) : (
                    <>
                      <div className={styles.stampIcon} style={{ width: 96, height: 96, lineHeight: '96px', borderRadius: '50%' }}>?</div>
                      {/* no name/text when image is not present so the ? stays vertically centered */}
                    </>
                  )}
                </div>
              );
            })}
            {Array.from({ length: remainingSlots }).map((_, i) => (
              <div key={`ph-${i}`} data-index={locationsToShow.length + i} className={`${styles.stampSlot} ${styles.placeholder}`}>
                <div className={styles.stampIcon}>?</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {popupId && (
        <AcquiredPopup id={popupId} initialDifficulty="medium" initialLanguage="ja" onClose={() => setPopupId(null)} />
      )}
    </div>
  );
}
