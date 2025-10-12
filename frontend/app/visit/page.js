// app/visit/page.js
"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
        <h1>○○スタンプシート</h1>
        <div style={{ display: 'flex', gap: 32, marginBottom: 16, alignItems: 'center' }}>
          <div>スタンプ保有数：{collectedCount} / {totalCount}</div>
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
                      // 開いたままポップアップ（スタンプ説明機構）
                      setPopupId(loc.id);
                    } else {
                      // 未獲得は従来通りスタンプへ誘導してもOK
                      router.push(`/stamp?id=${loc.id}&difficulty=medium&auto=1`);
                    }
                  }}
                  role="button"
                  aria-label={`${loc.name} を開く`}
                >
                  {isVisited ? (
                    <>
                      {/* Reward icon overlay for Kinkakuji */}
                      {loc.id === 'kinkakuji' && (
                        <img
                          src={rewardIcon}
                          alt="reward"
                          style={{ position: 'absolute', top: -12, left: -12, width: 36, height: 36, borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', objectFit: 'cover' }}
                        />
                      )}
                      {isNew && (
                        <div style={{ position: 'absolute', top: -10, right: -10, background: '#ff2', color: '#c00', fontWeight: 700, padding: '2px 6px', borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                          NEW!
                        </div>
                      )}
                      <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', margin: '0 auto' }}>
                        <img src={loc.image} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                      <div className={styles.stampText} style={{ marginTop: 8 }}>{loc.name}</div>
                    </>
                  ) : (
                    <>
                      <div className={styles.stampIcon} style={{ width: 96, height: 96, lineHeight: '96px', borderRadius: '50%' }}>?</div>
                      <div className={styles.stampText} style={{ opacity: 0.6, marginTop: 8 }}>場所名<br />訪れた日時</div>
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
        <AcquiredPopup id={popupId} initialDifficulty="medium" onClose={() => setPopupId(null)} />
      )}
    </div>
  );
}
