// app/kyoto/page.js
'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  const [stampGetVisible, setStampGetVisible] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoItem, setPromoItem] = useState(null);
  const [error, setError] = useState(null);
  const promoTimerRef = useRef(null);
  const [rankedItems, setRankedItems] = useState(null);
  const [preferredRank, setPreferredRank] = useState(null);

  const triggerStampGetAndPromo = useCallback(() => {
    triggerStampGetAndPromoExternal(setStampGetVisible, setPromoOpen, setPromoItem, setRankedItems, promoTimerRef);
  }, []);

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

  // Parse rank/auto from URL and optionally trigger promo automatically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const usp = new URLSearchParams(window.location.search);
    const rank = parseInt(usp.get('rank') || '', 10);
    const auto = usp.get('auto');
    if (Number.isInteger(rank) && rank >= 1 && rank <= 3) {
      setPreferredRank(rank);
    }
    if (auto && showUI) {
      // trigger after initial UI shows
      triggerStampGetAndPromo();
    }
  }, [showUI]);

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
      // 要件: 1) Stamp Get! エフェクト → 2秒後にプロモ画面
      // ここでは訪問済みスタンプをクリックした時に演出を見せる
      triggerStampGetAndPromo();
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
    <div className="pageRoot">
      {/* Link public CSS: ranked modal and globalized module styles */}
      <link rel="stylesheet" href="/css/stamp/stamp.css" />
      <link rel="stylesheet" href="/css/stamp/stamp.module.css" />
      <div className="container">
        <h1>🏯 京都スタンプラリー</h1>
        <p>京都の名所を巡ってスタンプを集めよう！各観光地をクリックして詳細を確認できます。</p>

        {error && <div className="error">{error}</div>}

        {showUI && (
          <div className="stampContainer">
            <div className="stampTitle">STAMP GET!</div>
            <div className="stampSubtitle">観光地を巡ってスタンプを集めよう！</div>

            <div className="progressBar">
              <div className="progressFill" style={{ width: `${completionRate}%` }} />
            </div>

            <div className="stats">
              <div className="statItem">
                <div className="statNumber">{collectedCount}</div>
                <div className="statLabel">獲得済み</div>
              </div>
              <div className="statItem">
                <div className="statNumber">{totalCount}</div>
                <div className="statLabel">総数</div>
              </div>
              <div className="statItem">
                <div className="statNumber">{completionRate}%</div>
                <div className="statLabel">達成率</div>
              </div>
            </div>

            <div className="stampGrid">
              {locationsToShow.map((loc, idx) => {
                const isVisited = visited.has(loc.id);
                return (
                  <div
                    key={loc.id}
                    data-index={idx}
                    className={`stampSlot ${isVisited ? 'visited' : 'placeholder'}`}
                    onClick={() => onStampClick(loc)}
                  >
                    <div className="stampIcon">
                      {isVisited ? getLocationIcon(loc) : '?'}
                    </div>
                    {isVisited && (
                      <div className="stampText">
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
                  className={`stampSlot placeholder`}
                  onClick={onPlaceholderClick}
                >
                  <div className="stampIcon">?</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="hint">💡 ヒント: スタンプをクリックして観光地の詳細を確認できます！</p>
      </div>

      {/* 1) Stamp Get! エフェクト */}
      {stampGetVisible && (
        <div className="notification" role="status" aria-live="polite">
          <div className="notificationIcon">🎉</div>
          <div>STAMP GET!</div>
          <div className="notificationSmall">おめでとうございます！</div>
        </div>
      )}

      {/* 2) プロモ画面（要件の画像＋説明文） */}
      {promoOpen && promoItem && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => closePromo(setPromoOpen, promoTimerRef)}>
          <div className="promoCard" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={() => closePromo(setPromoOpen, promoTimerRef)}>✕</button>
            <div className="promoBody">
              <img src={promoItem.image} alt="stamp" className="promoImage" />
              <div className="promoText">{promoItem.text}</div>
            </div>
            {/* Ranked modal (1~3) displayed below when available */}
            {rankedItems && (
              <div className="stamp-ranked-modal" onClick={() => closePromo(setPromoOpen, promoTimerRef)}>
                <div className="stamp-ranked-card" onClick={(e) => e.stopPropagation()}>
                  <button className="stamp-ranked-close" onClick={() => closePromo(setPromoOpen, promoTimerRef)}>✕</button>
                  {rankedItems.map((it) => (
                    <div key={it.id} className="stamp-ranked-item">
                      <img src={it.image} alt={it.id} className="stamp-ranked-image" />
                      <div className="stamp-ranked-rank">No.{it.rank}</div>
                      <div className="stamp-ranked-text">{it.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal" onClick={closeStampModal} role="dialog" aria-modal="true">
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <button className="modalClose" onClick={closeStampModal}>✕</button>
            <div className="modalBody">
              {!modalLocation?.placeholder ? (
                <>
                  <div className="modalHeader">
                    <div className="modalIcon">
                      {modalLocation ? getLocationIcon(modalLocation) : '📍'}
                    </div>
                    <h3 className="modalTitle">{modalLocation?.name ?? ''}</h3>
                  </div>

                  {modalLocation?.attributes && (
                    <div className="modalAttrs">
                      <p><strong>特徴:</strong> {modalLocation.attributes.benefit}</p>
                      <p><strong>混雑度:</strong> {getCrowdLevelText(modalLocation.attributes.crowd_level)}</p>
                      <p><strong>テーマ:</strong> {getThemeText(modalLocation.attributes.theme)}</p>
                    </div>
                  )}

                  {modalLocation?.image && (
                    <div className="modalImageWrap">
                      <img src={modalLocation.image} alt={modalLocation.name} className="modalImage" />
                    </div>
                  )}

                  <div
                    className="modalMarkdown"
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
                  <div className="modalHeader">
                    <div className="modalIcon">❓</div>
                    <h3 className="modalTitle">未実装の観光地</h3>
                  </div>
                  <p className="modalPlaceholderText">今後追加予定の観光地です！</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 追加: プロモ表示のロジック
async function loadStampPromos() {
  try {
    // If a preferred rank was given, map it to the corresponding JSON and return it
    // otherwise, fall back to random choice among 1..3
    const pick = async (r) => fetch(`/json/stamp/${r}.json`, { cache: 'no-store' }).then((x) => x.ok ? x.json() : null);
    if (typeof window !== 'undefined') {
      const usp = new URLSearchParams(window.location.search);
      const rank = parseInt(usp.get('rank') || '', 10);
      if (Number.isInteger(rank) && rank >= 1 && rank <= 3) {
        const v = await pick(rank);
        if (v) return v;
      }
    }
    const r = Math.floor(Math.random() * 3) + 1;
    return await pick(r);
  } catch (e) {
    console.error(e);
    return null;
  }
}

function triggerStampGetAndPromoExternal(setStampGetVisible, setPromoOpen, setPromoItem, setRankedItems, promoTimerRef) {
  // 1) Stamp Get! を 2秒表示
  setStampGetVisible(true);
  if (promoTimerRef.current) clearTimeout(promoTimerRef.current);
  promoTimerRef.current = setTimeout(async () => {
    setStampGetVisible(false);
    // 2) ランダム画像＋テキスト（JSON駆動）を表示
    const item = await loadStampPromos();
    if (item) {
      setPromoItem(item);
      // also load ranked 1..3 JSONs for the /stamp ranked view
      try {
        const r1 = await fetch('/json/stamp/1.json', { cache: 'no-store' }).then((r) => r.json());
        const r2 = await fetch('/json/stamp/2.json', { cache: 'no-store' }).then((r) => r.json());
        const r3 = await fetch('/json/stamp/3.json', { cache: 'no-store' }).then((r) => r.json());
        setRankedItems([r1, r2, r3]);
      } catch (e) {
        console.error('failed load ranked', e);
        setRankedItems(null);
      }
      setPromoOpen(true);
    }
  }, 2000);
}

// Helper to close promo and clear timer
function closePromo(setPromoOpen, promoTimerRef) {
  if (promoTimerRef.current) {
    clearTimeout(promoTimerRef.current);
    promoTimerRef.current = null;
  }
  setPromoOpen(false);
}
