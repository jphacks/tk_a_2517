// app/kyoto/page.js
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loadSightseeing, numbersToVisited, pickAcquiredId, loadItemByIdAndLevel } from './stampUtils';
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

// numbersToVisited は共有utilsに移動

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
  const router = useRouter();
  const [data, setData] = useState(null);
  const [visited, setVisited] = useState(() => new Set()); // ← ここはAPI同期のみで更新
  const [showUI, setShowUI] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLocation, setModalLocation] = useState(null);
  // Stamp Get! とプロモ表示
  const [stampGetVisible, setStampGetVisible] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null); // 単一アイテム { id, image, text, difficultyLabel }
  const promoTimerRef = useRef(null); // 仕様変更後は未使用だが念のため保持
  const [difficulty, setDifficulty] = useState('medium'); // detailed|medium|simple
  const [error, setError] = useState(null);
  const bootOnceRef = useRef(false);
  const [acquiredId, setAcquiredId] = useState(null); // 左側に表示する獲得画像のID
  const [showInlineAcquiredView, setShowInlineAcquiredView] = useState(false); // モーダルを閉じた後の同一ページ表示

  // データ読み込み
  async function loadSample() {
    try {
      const d = await loadSightseeing();
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
  const d = await loadSightseeing();
        setData(d);
        startStampRally(d);
      } catch {
        // 失敗時はボタンから開始
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 難易度を URL から決定（?difficulty= / ?level=）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const usp = new URLSearchParams(window.location.search);
    let lv = (usp.get('difficulty') || usp.get('level') || 'medium').toLowerCase();
    // alias: detailed → detail
    if (lv === 'detailed') lv = 'detail';
    if (!['detail', 'medium', 'simple'].includes(lv)) lv = 'medium';
    setDifficulty(lv);
  }, []);

  // loadItemByIdAndLevel は共有utilsを使用

  // スタンプGETアニメーション → 2秒後にモーダル表示
  const triggerStampAnimAndOpen = useCallback((chosenId) => {
    if (!chosenId) return;
    setStampGetVisible(true);
    if (promoTimerRef.current) clearTimeout(promoTimerRef.current);
    promoTimerRef.current = setTimeout(async () => {
      setStampGetVisible(false);
      const item = await loadItemByIdAndLevel(chosenId, difficulty);
      if (item) setCurrentItem(item);
      setPromoOpen(true);
    }, 2000);
  }, [difficulty, loadItemByIdAndLevel]);

  // 初期UI表示後に一度だけ自動発火（クリック不要）
  useEffect(() => {
    if (!showUI) return;
    if (bootOnceRef.current) return;
    bootOnceRef.current = true;
    // 取得対象IDをURLまたはデータから決定
    const chosen = pickAcquiredId(data?.locations || []);
    setAcquiredId(chosen);

    // スタンプGET → 2秒後にモーダルではなく、モーダルをすぐ閉じてインラインで表示
    // 仕様: アニメーションは出す、その後は同一路パスで表示
    setStampGetVisible(true);
    if (promoTimerRef.current) clearTimeout(promoTimerRef.current);
    promoTimerRef.current = setTimeout(async () => {
      setStampGetVisible(false);
      const item = await loadItemByIdAndLevel(chosen, difficulty);
      if (item) setCurrentItem(item);
      setPromoOpen(false);
      setShowInlineAcquiredView(true);
    }, 2000);
  }, [showUI, data, difficulty]);

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
    // クリックでは何もしない（新仕様: サイト表示時のみモーダル表示）
    return;
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

  

  // 閉じるボタン処理（×でグリッドに戻る）
  const closePromo = useCallback(() => {
    // 同一路パスのまま、インラインの獲得ページを表示
    setPromoOpen(false);
    setShowInlineAcquiredView(true);
  }, []);

  // 難易度変更
  const handleDifficultyChange = useCallback(async (lv) => {
    let next = String(lv || 'medium').toLowerCase();
    if (next === 'detailed') next = 'detail';
    if (!['detail', 'medium', 'simple'].includes(next)) next = 'medium';
    setDifficulty(next);
    // テキストのみ差し替え（Stamp GET を出さない）
    if (acquiredId) {
      const item = await loadItemByIdAndLevel(acquiredId, next);
      if (item) setCurrentItem(item);
    }
  }, [acquiredId, loadItemByIdAndLevel]);

  return (
    <div className={styles.pageRoot}>
      {/* 初期の説明やグリッドなどのHTMLは非表示にする */}
      <div className={styles.container} style={{ display: 'none' }}>
        <h1>🏯 京都スタンプラリー</h1>
        <p>京都の名所を巡ってスタンプを集めよう！各観光地をクリックして詳細を確認できます。</p>

        {/* 難易度セレクト（既定: 中くらい） */}
        <div className={styles.controls}>
          <label htmlFor="difficulty-select" style={{ marginRight: 8 }}>文章レベル:</label>
          <select
            id="difficulty-select"
            value={difficulty}
            onChange={(e) => handleDifficultyChange(e.target.value)}
            className={styles.primaryBtn}
            style={{ padding: '8px 12px' }}
          >
            <option value="detail">詳し目</option>
            <option value="medium">中くらい</option>
            <option value="simple">簡単</option>
          </select>
        </div>

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

      {/* Stamp GET アニメーション */}
      {stampGetVisible && (
        <div className={styles.notification} role="status" aria-live="polite">
          <div className={styles.notificationIcon}>🎉</div>
          <div>STAMP GET!</div>
          <div className={styles.notificationSmall}>おめでとうございます！</div>
        </div>
      )}

      {/* モーダルは使わず、インライン表示に集約（×操作相当） */}

      {/* モーダルを閉じた後に同一ページで表示する獲得画像ビュー */}
      {!promoOpen && showInlineAcquiredView && currentItem && (
        <div className={styles.container}>
          <div className={styles.stampContainer} style={{ position: 'relative' }}>
            <button
              className={styles.modalClose}
              onClick={() => {
                const ids = (data?.locations || []).map((l) => l.id);
                const idx = acquiredId ? ids.indexOf(acquiredId) : -1;
                const n = idx >= 0 ? idx + 1 : 1;
                router.push(`/visit?n=${n}`);
              }}
            >
              ✕
            </button>
            <div className={styles.stampTitle}>獲得したスタンプ</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 12 }}>
              <img src={currentItem.image} alt={currentItem.id} className={styles.promoImage} style={{ maxWidth: 360, height: 'auto', flex: '0 0 auto' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 8 }}>
                  <label htmlFor="difficulty-inline2" style={{ marginRight: 8 }}>文章レベル:</label>
                  <select
                    id="difficulty-inline2"
                    value={difficulty}
                    onChange={(e) => handleDifficultyChange(e.target.value)}
                    className={styles.primaryBtn}
                    style={{ padding: '6px 10px' }}
                  >
                    <option value="detail">詳し目</option>
                    <option value="medium">中くらい</option>
                    <option value="simple">簡単</option>
                  </select>
                </div>
                <div className={styles.promoText}>
                  <strong>{currentItem.difficultyLabel ?? ''}</strong><br />
                  {currentItem.text}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

