// app/kyoto/page.js
'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './stamp.module.css';
import { marked } from 'marked';

// ---- API JSON fetch (VisitPage と同等の堅牢版)
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

// ---- numbers(list) -> visited(Set<location.id>)
function numbersToVisited(numbers, locations) {
  const set = new Set();
  if (!Array.isArray(numbers) || !Array.isArray(locations)) return set;
  numbers.forEach((n) => {
    const s = String(n);
    const byId = locations.find((loc) => loc.id === s);
    if (byId) return set.add(byId.id);
    if (Number.isInteger(n) && n >= 0 && n < locations.length) return set.add(locations[n].id); // 0-based
    const idx = Number(n) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < locations.length) return set.add(locations[idx].id); // 1-based
    console.warn('[numbersToVisited] 無効な番号をスキップ:', n);
  });
  return set;
}

// 表示用ラベル
const CROWD_MAP = { low: '少ない', medium: '普通', high: '多い' };
const THEME_MAP = { gorgeous: '豪華絢爛', wabi_sabi: 'わびさび', dynamic: 'ダイナミック' };
function getCrowdLevelText(level) { return CROWD_MAP[level] ?? String(level ?? ''); }
function getThemeText(theme) { return THEME_MAP[theme] ?? String(theme ?? ''); }

export default function KyotoStampRallyPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [visited, setVisited] = useState(() => new Set()); // API 同期のみ
  const [showUI, setShowUI] = useState(false);

  // 詳細モーダル（スポット詳細用）
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLocation, setModalLocation] = useState(null);

  const [error, setError] = useState(null);

  // イントロ（スタンプ UI をモーダルで初回表示）。閉じたら何も表示しない。
  const [introOpen, setIntroOpen] = useState(true);

  // 差分検出用
  const prevVisitedRef = useRef(new Set());
  const didInitialSyncRef = useRef(false);

  const DATA_URL = '/json/sightseeing.json';

  // 静的JSON読み込み
  async function loadJsonFromUrl(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`failed fetch: ${res.status}`);
    return res.json();
  }

  // 初回ロード
  useEffect(() => {
    (async () => {
      try {
        const d = await loadJsonFromUrl(DATA_URL);
        setData(d);
        setShowUI(true);
      } catch (e) {
        setError(`sightseeing.json の読み込みに失敗しました: ${e.message}`);
      }
    })();
  }, []);

  const allLocations = useMemo(() => (data?.locations ? [...data.locations] : []), [data]);

  // アクセス時の URL query を保存（/api/query-numbers POST）
  useEffect(() => {
    const raw = searchParams.get('n') ?? searchParams.get('id') ?? searchParams.get('query');
    const n = raw != null ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return;

    fetchJSON('/api/query-numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: n }),
    })
      .then(async () => {
        if (allLocations.length) {
          await syncVisitedFromServer(true); // 同期 & 新規のみ演出
        }
      })
      .catch((e) => {
        console.error('保存に失敗:', e);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allLocations.length]);

  // /api/query-numbers → visited 同期（差分で新規のみ演出）
  const syncVisitedFromServer = useCallback(
    async (allowAnimation = true) => {
      if (!allLocations.length) return;
      try {
        const d = await fetchJSON('/api/query-numbers'); // { list: number[] }
        const next = numbersToVisited(d.list ?? [], allLocations);

        // 差分（新規ID）
        const prev = prevVisitedRef.current;
        const newlyAdded = [];
        next.forEach((id) => {
          if (!prev.has(id)) newlyAdded.push(id);
        });

        setVisited(next);
        prevVisitedRef.current = next;

        if (!didInitialSyncRef.current) {
          didInitialSyncRef.current = true;
          return; // 初回は演出しない
        }
        if (allowAnimation && newlyAdded.length) {
          newlyAdded.forEach((id) => {
            const loc = allLocations.find((l) => l.id === id);
            if (loc) showStampGetAnimation(loc);
          });
        }
      } catch (e) {
        console.error(e);
      }
    },
    [allLocations]
  );

  // 初回同期（演出なし）
  useEffect(() => {
    if (showUI && allLocations.length) {
      syncVisitedFromServer(false);
    }
  }, [showUI, allLocations.length, syncVisitedFromServer]);

  // スロット用の軽いポップ演出 + CSS ベースのトースト
  function showStampGetAnimation(location) {
    // スロットのポップ（Web Animations API）
    const slot = document.querySelector(`[data-id="${CSS.escape(location.id)}"]`);
    if (slot?.animate) {
      slot.animate(
        [
          { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
          { transform: 'scale(1.15)', boxShadow: '0 12px 24px rgba(0,0,0,0.25)' },
          { transform: 'scale(1)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
        ],
        { duration: 650, easing: 'ease-out' }
      );
    }

    // CSS Modules のクラスを使った通知
    const div = document.createElement('div');
    div.className = styles.notification;
    div.innerHTML = `
      <div class="${styles.notificationIcon}">${getLocationIcon(location)}</div>
      <div>スタンプ獲得！</div>
      <div class="${styles.notificationSmall}">— ${location.name}</div>
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2000); // keyframes stampGet に合わせて除去
  }

  // 進捗
  const collectedCount = visited.size;
  const totalCount = allLocations.length;
  const completionRate = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  // アイコン
  function getLocationIcon(loc) {
    const iconMap = { kinkakuji: '⛩️', ginkakuji: '🏛️', kiyomizudera: '🏔️' };
    return iconMap[loc.id] || '📍';
  }

  // モーダル（観光地詳細）
  function openStampModal(location, isVisited) {
    if (!isVisited) return; // 未訪問は開かない
    setModalLocation(location);
    setModalOpen(true);
  }
  function closeStampModal() { setModalOpen(false); setModalLocation(null); }

  // クリックしても visited は変更しない
  function onStampClick(location) {
    const isVisited = visited.has(location.id);
    if (isVisited) openStampModal(location, true);
  }

  // 最大6件表示（プレースホルダーは出さない）
  const locationsToShow = allLocations.slice(0, 6);

  // ---- 共通のスタンプ UI を関数化（モーダルでのみ使用）
  const renderStampPanel = () => (
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
              data-id={loc.id} // アニメ対象の特定用
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
      </div>
    </div>
  );

  return (
    <div className={styles.pageRoot}>
      {/* 初回はポップアップでスタンプ UI を表示。×で閉じたら何も出さない */}
      {showUI && introOpen && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="スタンプ案内">
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setIntroOpen(false)}
              aria-label="閉じる"
            >
              ✕
            </button>
            <div className={styles.modalBody}>
              {renderStampPanel()}
              <div className={styles.modalMarkdown} style={{ marginTop: 12 }}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(
                      [
                        '### 遊び方',
                        '',
                        '- **/visit** ページで URL クエリに数値を渡すと訪問扱いになります。',
                        '  - 例：`/visit?n=1`、`/visit?id=2`、`/visit?query=3`',
                        '- 訪問履歴は Cookie に保存され、このページに同期されます。',
                        '- 訪問済みスタンプをクリックすると詳細が開きます。',
                      ].join('\n')
                    ),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 既存の詳細モーダル（スタンプクリックで開く） */}
      {modalOpen && (
        <div className={styles.modal} onClick={closeStampModal} role="dialog" aria-modal="true">
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeStampModal} aria-label="閉じる">✕</button>
            <div className={styles.modalBody}>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
