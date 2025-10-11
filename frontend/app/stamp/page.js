// app/kyoto/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './stamp.module.css';
import { marked } from 'marked';

export default function KyotoStampRallyPage() {
  const [data, setData] = useState(null);
  const [visited, setVisited] = useState(() => new Set()); // 訪問済みIDの集合
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
      const d = await loadJsonFromUrl('/sightseeing.json');
      setData(d);
      setShowUI(false); // 一旦閉じてから開始
      setError(null);
      startStampRally(d);
    } catch (e) {
      setError(`sightseeing.json の読み込みに失敗しました: ${e.message}`);
    }
  }

  // file:// などで自動ロードが失敗する可能性があるので try
  useEffect(() => {
    (async () => {
      try {
        const d = await loadJsonFromUrl('/sightseeing.json');
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

  // 進捗などのメトリクス
  const collectedCount = visited.size;
  const totalCount = allLocations.length;
  const completionRate = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  // アイコン取得
  function getLocationIcon(loc) {
    const iconMap = {
      kinkakuji: '⛩️',
      ginkakuji: '🏛️',
      kiyomizudera: '🏔️',
    };
    return iconMap[loc.id] || '📍';
  }

  // モーダルを開閉
  function openStampModal(location, isVisited) {
    if (!isVisited) return;
    setModalLocation(location);
    setModalOpen(true);
  }
  function closeStampModal() {
    setModalOpen(false);
    setModalLocation(null);
  }

  // スタンプ獲得時の通知アニメーション
  function showStampGetAnimation(location) {
    const div = document.createElement('div');
    div.className = styles.notification;
    div.innerHTML = `
      <div class="${styles.notificationIcon}">${getLocationIcon(location)}</div>
      <div>スタンプ獲得！</div>
      <div class="${styles.notificationSmall}">${location.name}</div>
    `;
    document.body.appendChild(div);
    setTimeout(() => {
      div.remove();
    }, 2000);
  }

  // テキスト化ヘルパ
  function getCrowdLevelText(level) {
    const levelMap = { low: '少ない', medium: '普通', high: '多い' };
    return levelMap[level] || level;
  }
  function getThemeText(theme) {
    const themeMap = { gorgeous: '豪華絢爛', wabi_sabi: 'わびさび', dynamic: 'ダイナミック' };
    return themeMap[theme] || theme;
  }

  // スタンプのクリック
  function onStampClick(location) {
    const isVisited = visited.has(location.id);
    if (isVisited) {
      openStampModal(location, true);
    } else {
      // 新規に訪問として登録
      setVisited(prev => {
        const next = new Set(prev);
        next.add(location.id);
        return next;
      });
      showStampGetAnimation(location);
    }
  }

  // プレースホルダークリック
  function onPlaceholderClick() {
    setModalLocation({
      id: 'placeholder',
      name: '未実装の観光地',
      placeholder: true,
    });
    setModalOpen(true);
  }

  // グリッドに表示する最大 6 件
  const locationsToShow = allLocations.slice(0, 6);
  const remainingSlots = Math.max(0, 6 - locationsToShow.length);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.container}>
        <h1>🏯 京都スタンプラリー</h1>
        <p>京都の名所を巡ってスタンプを集めよう！各観光地をクリックして詳細を確認できます。</p>

        <div className={styles.controls}>
          <button className={styles.primaryBtn} onClick={loadSample}>
            スタンプラリー開始
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {showUI && (
          <div className={styles.stampContainer}>
            <div className={styles.stampTitle}>STAMP GET!</div>
            <div className={styles.stampSubtitle}>観光地を巡ってスタンプを集めよう！</div>

            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${completionRate}%` }}
              />
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

        <p className={styles.hint}>
          💡 ヒント: スタンプをクリックして観光地の詳細を確認できます！
        </p>
      </div>

      {/* モーダル */}
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
                    <h3 className={styles.modalTitle}>
                      {modalLocation?.name ?? ''}
                    </h3>
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
                      <img
                        src={modalLocation.image}
                        alt={modalLocation.name}
                        className={styles.modalImage}
                      />
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
                  <p className={styles.modalPlaceholderText}>
                    今後追加予定の観光地です！
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
