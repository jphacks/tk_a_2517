"use client";

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import styles from './stamp.module.css';
import { loadItemByIdAndLevel } from './stampUtils';

// AcquiredPopup supports two modes:
// - item mode: pass `item` prop (already-loaded) and optionally `level` to display
// - id mode: pass `id` and `initialDifficulty` and the component will load the item
export default function AcquiredPopup({ item: itemProp = null, id = null, initialDifficulty = 'medium', level = null, initialLanguage = 'ja', onClose }) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [item, setItem] = useState(itemProp);
  const [language, setLanguage] = useState((initialLanguage || 'ja').toLowerCase());

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const it = await loadItemByIdAndLevel(id, difficulty, language);
      setItem(it);
    } catch (e) {
      setItem(null);
    }
  }, [id, difficulty, language]);

  useEffect(() => {
    // if an item prop was provided, prefer it; otherwise load when id/difficulty present
    if (itemProp) {
      setItem(itemProp);
      return;
    }
    if (id) load();
  }, [id, difficulty, language, itemProp, load]);

  const handleDifficultyChange = useCallback((lv) => {
    let next = String(lv || 'medium').toLowerCase();
    if (next === 'detailed') next = 'detail';
    if (!['detail', 'medium', 'simple'].includes(next)) next = 'medium';
    setDifficulty(next);
  }, []);

  const handleLanguageChange = useCallback((lv) => {
    const next = String(lv || 'ja').toLowerCase() === 'en' ? 'en' : 'ja';
    setLanguage(next);
  }, []);

  // determine displayed level label
  const displayLevel = level || difficulty || initialDifficulty || 'medium';

  if (!item) return null;

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className={styles.modalClose} onClick={onClose} aria-label="閉じる">✕</button>

        <div className={styles.modalBody}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>獲得したスタンプ</h2>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div className={styles.modalImageWrap}>
              <img src={item.image || item.img || item.src} alt={item.title || item.name || ''} className={styles.modalImage} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.modalAttrs}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <strong>文章レベル:</strong>
                  <select
                    value={displayLevel}
                    onChange={(e) => handleDifficultyChange(e.target.value)}
                    className={styles.primaryBtn}
                    style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}
                  >
                    <option value="detail">詳し目</option>
                    <option value="medium">中くらい</option>
                    <option value="simple">簡単</option>
                  </select>
                  <span style={{ margin: '0 4px 0 12px' }}><strong>言語:</strong></span>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className={styles.primaryBtn}
                    style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}
                    aria-label="言語"
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalMarkdown}>
                <h3 style={{ marginTop: 0 }}>{item.title || item.name}</h3>
                <p>{item.text || item.description || item.body}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
