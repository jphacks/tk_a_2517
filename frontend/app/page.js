"use client";
import { useCallback, useMemo, useRef, useState } from 'react';
import QRScanner from '../components/QRScanner';
import ResultCard from '../components/ResultCard';
import PointsDisplay from '../components/PointsDisplay';
import { queryRag } from '../lib/ragClient';

export default function Page() {
  const [lastCode, setLastCode] = useState(null);
  const [message, setMessage] = useState('');
  const [nearby, setNearby] = useState([]);
  const [points, setPoints] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [paused, setPaused] = useState(false);
  const scanningRef = useRef(false);

  const onScan = useCallback(async (text) => {
    // de-duplicate rapid scans
    if (scanningRef.current) return;
    if (text === lastCode) return;
    scanningRef.current = true;
    setPaused(true);
    setLastCode(text);

    try {
      // Heuristic to extract spot_id (allow full URLs or plain IDs)
      const spot_id = (() => {
        try {
          const url = new URL(text);
          return url.searchParams.get('spot') || url.pathname.split('/').filter(Boolean).pop() || text;
        } catch {
          return text;
        }
      })();

      // Notify MCP (non-blocking)
      fetch('/api/mcp-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'qr_scanned', spot_id, ts: Date.now() }),
      }).catch(() => {});

      // Query RAG for guidance
      const res = await queryRag({ spot_id, userLang: navigator.language?.slice(0, 2) || 'ja' });
      setMessage(res.message || '');
      setNearby(res.nearby || []);
      setScanned((s) => s + 1);
      // Simple points: +10 per scan (future: MCP returns dynamic points)
      setPoints((p) => p + 10);
    } catch (e) {
      setMessage(`エラー: ${e.message}`);
      setNearby([]);
    } finally {
      // allow new scan after short delay to avoid repeats
      setTimeout(() => {
        scanningRef.current = false;
        setPaused(false);
      }, 1200);
    }
  }, [lastCode]);

  const title = useMemo(() => (lastCode ? `スポット: ${lastCode}` : 'QRally - QRで観光を始めよう'), [lastCode]);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: '#6b7280', marginBottom: 12 }}>カメラにQRをかざして、近隣情報とポイントを獲得しよう</p>

      <QRScanner onResult={onScan} paused={paused} />
      <PointsDisplay points={points} scannedCount={scanned} />
      <ResultCard title="観光ガイド" message={message} nearby={nearby} />
    </main>
  );
}

