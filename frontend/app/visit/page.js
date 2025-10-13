// app/visit/page.js
"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import styles from '../stamp/stamp.module.css';
import { getUserId, getPointsForUser, assignSequentialId, resetSessionId, createOneTimeToken } from '../lib/userClient';
import { getPointsPerStamp } from '../lib/pointsConfig';
import { useRouter } from 'next/navigation';
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
  // prefer per-user persisted temporary points
  const [userPoints, setUserPoints] = useState(null);
  const [userIdLocal, setUserIdLocal] = useState(null);
  const [otpToken, setOtpToken] = useState(null);
  const [showReloadModal, setShowReloadModal] = useState(false);
  const router = useRouter();
  const rewardIcon = '/img/visit/kinkakuzi_reward.jpg';

  const locationsToShow = allLocations.slice(0, 6);
  const remainingSlots = Math.max(0, 6 - locationsToShow.length);

  useEffect(() => {
    (async () => {
      try {
        const assigned = await assignSequentialId();
        const id = getUserId();
        setUserIdLocal(id || assigned);
        const p = getPointsForUser(id || assigned);
        setUserPoints(p);
      } catch (e) {
        try { const id = getUserId(); setUserIdLocal(id); setUserPoints(getPointsForUser(id)); } catch (e2) {}
      }
    })();
  }, []);

  // Display points should reflect either stored user points or baseline from stamps
  const baselinePerStamp = getPointsPerStamp();
  const displayPoints = Math.max((userPoints ?? 0), collectedCount * baselinePerStamp);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.container}>
        <h1>QRally 保有スタンプ</h1>
          <div style={{ display: 'flex', gap: 32, marginBottom: 16, alignItems: 'center' }}>
          <div>スタンプ保有数：{collectedCount}個</div>
            <div>所持ポイント数：{displayPoints}p</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Reward:</span>
              <img src={rewardIcon} alt="reward" width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            </div>
            {/* Blue oval: ポイント確認 -> navigate to prize */}
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={() => router.push('/prize')} style={{ background: '#e7f0ff', border: '2px solid #4a90e2', padding: '8px 12px', borderRadius: 20 }}>ポイント確認</button>
            </div>
        </div>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.stampContainer}>
          <div style={{ position: 'absolute', right: 24, top: 24 }}>
            <button onClick={async () => {
              // create one-time token and show reload modal
              const t = createOneTimeToken(userIdLocal);
              setOtpToken(t);
              setShowReloadModal(true);
            }} className={styles.headerAction} style={{ padding: '8px 12px' }}>リロード</button>
          </div>
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
      {popupId && (
        <AcquiredPopup id={popupId} initialDifficulty="medium" initialLanguage="ja" onClose={() => setPopupId(null)} />
      )}

      {/* Reload modal: shows ID and a one-time token when user presses リロード in top-right. */}
      {showReloadModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modalCard">
            {/* Modal may only be closed with this × button per user request */}
            <button className="modalClose" onClick={() => setShowReloadModal(false)}>✕</button>
            <div style={{ textAlign: 'left' }}>
              <h3>リロード用ワンタイムトークン</h3>
              <p>ID: <strong>{userIdLocal}</strong></p>
              <p>トークン（この値は即保存してください）:</p>
              <div style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, background: '#fff', wordBreak: 'break-all' }}>{otpToken}</div>
              <div style={{ marginTop: 12 }}>
                <button className="primaryBtn" onClick={() => { resetSessionId(); router.push('/sightseeing'); }}>リセットしてSightseeingへ</button>
                <button className="primaryBtn" style={{ marginLeft: 8 }} onClick={() => { router.push('/sightseeing'); }}>リセットせずに移動（続行）</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
