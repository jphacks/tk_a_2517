// app/kyoto/page.js
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import styles from './stamp.module.css';
import { marked } from 'marked';

// ---------- 追加: API用の JSON フェッチ ----------
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

// ---------- 追加: numbers(list) → visited(Set<id>) 変換 ----------
function numbersToVisited(numbers, locations) {
  const set = new Set();
  if (!Array.isArray(numbers) || !Array.isArray(locations)) return set;

  numbers.forEach((n) => {
    const s = String(n);
    // 1) id 直接一致
    const byId = locations.find((loc) => loc.id === s);
    if (byId) return set.add(byId.id);
    // 2) 0-based index
    if (Number.isInteger(n) && n >= 0 && n < locations.length) return set.add(locations[n].id);
    // 3) 1-based index
    const idx = Number(n) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < locations.length) return set.add(locations[idx].id);

    console.warn('[numbersToVisited] 無効な番号をスキップ:', n);
  });
  return set;
}

// app/stamp/page.js あるいは app/kyoto/page.js の先頭付近に追加
const CROWD_MAP = { low: '少ない', medium: '普通', high: '多い' };
const THEME_MAP = { gorgeous: '豪華絢爛', wabi_sabi: 'わびさび', dynamic: 'ダイナミック' };

function getCrowdLevelText(level) {
  return CROWD_MAP[level] ?? String(level ?? '');
}

function getThemeText(theme) {
  return THEME_MAP[theme] ?? String(theme ?? '');
}


export default function KyotoStampRallyPage() {
  const [data, setData] = useState(null);
  const [visited, setVisited] = useState(() => new Set()); // ← ここはAPI同期のみで更新
  const [showUI, setShowUI] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLocation, setModalLocation] = useState(null);
  const [error, setError] = useState(null);

  // データ読み込み
  async function loadJsonFromUrl(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`failed fetch: ${res.status}`);
    return res.json();
  }

  async function loadSample() {
    try {
      const d = await loadJsonFromUrl('/json/sightseeing.json');
      setData(d);
      setShowUI(false);
      setError(null);
      startStampRally(d);
    } catch (e) {
      setError(`sightseeing.json の読み込みに失敗しました: ${e.message}`);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const d = await loadJsonFromUrl('/json/sightseeing.json');
        setData(d);
        startStampRally(d);
      } catch {
        // 失敗時はボタンから開始
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // スタンプラリー開始
  function startStampRally(d = data) {
    if (!d) return;
    setShowUI(true);
  }

  const allLocations = useMemo(() => {
    return data?.locations ? [...data.locations] : [];
  }, [data]);

  // ---------- 追加: サーバ履歴から visited を同期 ----------
  const syncVisitedFromServer = useCallback(async () => {
    if (!allLocations.length) return;
    try {
      const d = await fetchJSON('/api/query-numbers'); // { list: number[] }
      const next = numbersToVisited(d.list ?? [], allLocations);
      setVisited(next);
    } catch (e) {
      console.error(e);
    }
  }, [allLocations]);

  // data(=locations) が揃い UI 表示になったら同期
  useEffect(() => {
    if (showUI && allLocations.length) {
      syncVisitedFromServer();
    }
  }, [showUI, allLocations.length, syncVisitedFromServer]);

  // 進捗
  const collectedCount = visited.size;
  const totalCount = allLocations.length;
  const completionRate = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  // アイコン取得
  function getLocationIcon(loc) {
    const iconMap = { kinkakuji: '⛩️', ginkakuji: '🏛️', kiyomizudera: '🏔️' };
    return iconMap[loc.id] || '📍';
  }

  // モーダル
  function openStampModal(location, isVisited) {
    if (!isVisited) return; // 未訪問は開かない
    setModalLocation(location);
    setModalOpen(true);
  }
  function closeStampModal() {
    setModalOpen(false);
    setModalLocation(null);
  }

  // ---------- 変更: クリックしても visited を更新しない ----------
  function onStampClick(location) {
    const isVisited = visited.has(location.id);
    if (isVisited) {
      openStampModal(location, true);
    } else {
      // クリックでは何もしない（状態変更しない）
      // 必要なら軽いトースト表示など:
      // alert('未訪問の観光地です（/visit によるチェックインが必要）');
    }
  }

  // プレースホルダークリック
  function onPlaceholderClick() {
    setModalLocation({ id: 'placeholder', name: '未実装の観光地', placeholder: true });
    setModalOpen(true);
  }

  // スタンプ獲得演出（今回は visited 変更しないため未使用だが残しておく）
  function showStampGetAnimation(_location) { /* no-op or keep for future */ }

  // グリッドに表示する最大 6 件
  const locationsToShow = allLocations.slice(0, 6);
  const remainingSlots = Math.max(0, 6 - locationsToShow.length);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.container}>
        <h1>🏯 京都スタンプラリー</h1>
        <p>京都の名所を巡ってスタンプを集めよう！各観光地をクリックして詳細を確認できます。</p>

        {error && <div className={styles.error}>{error}</div>}

        {showUI && (
          <div className={styles.stampContainer}>
            <div className={styles.stampTitle}>STAMP GET!</div>
            <div className={styles.stampSubtitle}>観光地を巡ってスタンプを集めよう！</div>

            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${completionRate}%` }} />
            </div>

            <div className={styles.stats}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{collectedCount}</div>
                <div className={styles.statLabel}>獲得済み</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{totalCount}</div>
                <div className={styles.statLabel}>総数</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{completionRate}%</div>
                <div className={styles.statLabel}>達成率</div>
              </div>
            </div>

            <div className={styles.stampGrid}>
              {locationsToShow.map((loc, idx) => {
                const isVisited = visited.has(loc.id);
                return (
                  <div
                    key={loc.id}
                    data-index={idx}
                    className={`${styles.stampSlot} ${isVisited ? styles.visited : styles.placeholder}`}
                    onClick={() => onStampClick(loc)}
                  >
                    <div className={styles.stampIcon}>
                      {isVisited ? getLocationIcon(loc) : '?'}
                    </div>
                    {isVisited && (
                      <div className={styles.stampText}>
                        {loc.name.length > 8 ? `${loc.name.slice(0, 8)}...` : loc.name}
                      </div>
                    )}
                  </div>
                );
              })}
              {Array.from({ length: remainingSlots }).map((_, i) => (
                <div
                  key={`ph-${i}`}
                  data-index={locationsToShow.length + i}
                  className={`${styles.stampSlot} ${styles.placeholder}`}
                  onClick={onPlaceholderClick}
                >
                  <div className={styles.stampIcon}>?</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={styles.hint}>💡 ヒント: スタンプをクリックして観光地の詳細を確認できます！</p>
      </div>

      {modalOpen && (
        <div className={styles.modal} onClick={closeStampModal} role="dialog" aria-modal="true">
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeStampModal}>✕</button>
            <div className={styles.modalBody}>
              {!modalLocation?.placeholder ? (
                <>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalIcon}>
                      {modalLocation ? getLocationIcon(modalLocation) : '📍'}
                    </div>
                    <h3 className={styles.modalTitle}>{modalLocation?.name ?? ''}</h3>
                  </div>

                  {modalLocation?.attributes && (
                    <div className={styles.modalAttrs}>
                      <p><strong>特徴:</strong> {modalLocation.attributes.benefit}</p>
                      <p><strong>混雑度:</strong> {getCrowdLevelText(modalLocation.attributes.crowd_level)}</p>
                      <p><strong>テーマ:</strong> {getThemeText(modalLocation.attributes.theme)}</p>
                    </div>
                  )}

                  {modalLocation?.image && (
                    <div className={styles.modalImageWrap}>
                      <img src={modalLocation.image} alt={modalLocation.name} className={styles.modalImage} />
                    </div>
                  )}

                  <div
                    className={styles.modalMarkdown}
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(
                        modalLocation?.markdown_details ||
                          `# ${modalLocation?.name}\n\n${modalLocation?.attributes?.benefit ?? ''}`
                      ),
                    }}
                  />
                </>
              ) : (
                <>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalIcon}>❓</div>
                    <h3 className={styles.modalTitle}>未実装の観光地</h3>
                  </div>
                  <p className={styles.modalPlaceholderText}>今後追加予定の観光地です！</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
