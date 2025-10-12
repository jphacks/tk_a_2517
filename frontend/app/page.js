"use client";
import { useCallback, useMemo, useRef, useState } from 'react';
import { queryRag } from '../lib/ragClient';
import { computeSpotPoints, isScanned, markScanned } from '../lib/points';

// 簡易的なQRScannerコンポーネント
function QRScanner({ onScan }) {
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>QR Code Scanner (Manual Input)</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter QR code content or spot ID"
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Scan
        </button>
      </form>
    </div>
  );
}

// 簡易的なResultCardコンポーネント
function ResultCard({ message, nearby }) {
  return (
    <div style={{ padding: '20px', border: '1px solid #28a745', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f8f9fa' }}>
      <h3>Search Result</h3>
      <p>{message}</p>
      {nearby && nearby.length > 0 && (
        <div>
          <h4>Nearby Spots:</h4>
          <ul>
            {nearby.map((spot, index) => (
              <li key={index}>{spot.name} - {spot.distance}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 簡易的なPointsDisplayコンポーネント
function PointsDisplay({ points, scanned }) {
  return (
    <div style={{ padding: '20px', border: '1px solid #ffc107', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fff3cd' }}>
      <h3>Points & Progress</h3>
      <p>Total Points: <strong>{points}</strong></p>
      <p>Spots Scanned: <strong>{scanned}</strong></p>
    </div>
  );
}

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

      // Points calculation (minority bonus) and duplicate scan check
      const already = isScanned(spot_id);
      const { points: calcPoints, crowd_level, multiplier } = await computeSpotPoints(spot_id, 10);

      // Notify MCP (non-blocking)
      fetch('/api/mcp-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'qr_scanned',
          spot_id,
          ts: Date.now(),
          already_scanned: already,
          crowd_level,
          multiplier,
          awarded_points: already ? 0 : calcPoints,
        }),
      }).catch(() => {});

      // Query RAG for guidance
      const res = await queryRag({ spot_id, userLang: navigator.language?.slice(0, 2) || 'ja' });
      setMessage(res.message || '');
      setNearby(res.nearby || []);
      // Update counters and points (no double award for duplicates)
      if (!already) {
        markScanned(spot_id);
        setScanned((s) => s + 1);
        setPoints((p) => p + calcPoints);
      }
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

