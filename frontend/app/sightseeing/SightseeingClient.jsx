"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import jsQR from "jsqr";
import { marked } from "marked";

export default function SightseeingClient() {
  const [data, setData] = useState(null);
  const [visited, setVisited] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [qrOpen, setQrOpen] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle"); // idle | scanning | success | error
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  // Try to load JSON from likely paths
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const candidates = [
        "/json/sightseeing/sightseeing.json",
        "/json/sightseeing.json",
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const j = await res.json();
            if (!cancelled) setData(j);
            return;
          }
        } catch (e) {
          // continue to next
        }
      }
      if (!cancelled) setData({ locations: [] });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const locations = useMemo(() => (data?.locations ?? []).slice(0, 6), [data]);

  const stats = useMemo(() => {
    const collected = visited.size;
    const total = data?.locations?.length ?? 0;
    const rate = total > 0 ? Math.round((collected / total) * 100) : 0;
    return { collected, total, rate };
  }, [visited, data]);

  // Build a QR that points to the stamp page (auto start)
  const stampUrl = typeof window !== "undefined" ? `${window.location.origin}/stamp?difficulty=medium&auto=1` : "/stamp?difficulty=medium&auto=1";

  const iconFor = (loc) => {
    const iconMap = {
      kinkakuji: "⛩️",
      ginkakuji: "🏛️",
      kiyomizudera: "🏔️",
    };
    return iconMap[loc?.id] || "📍";
  };

  const getCrowdLevelText = (level) => ({ low: "少ない", medium: "普通", high: "多い" }[level] || level);
  const getThemeText = (theme) => ({ gorgeous: "豪華絢爛", wabi_sabi: "わびさび", dynamic: "ダイナミック" }[theme] || theme);

  const onStampClick = (loc) => {
    if (!loc) return;
    if (visited.has(loc.id)) {
      setSelected({ loc, visited: true });
    } else {
      setVisited((prev) => new Set(prev).add(loc.id));
    }
  };

  // QR scanning lifecycle
  const stopScanning = (keepQr = true) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setScanStatus("idle");
    if (!keepQr) setQrOpen(false);
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const code = jsQR(img.data, w, h);
    if (code?.data) {
      const raw = (code.data || "").trim();
      try {
        const u = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
        // If QR is for /stamp, navigate there
        if (u.pathname.startsWith("/stamp")) {
          setScanStatus("success");
          stopScanning(false);
          if (typeof window !== "undefined") window.location.href = u.toString();
          return;
        }
      } catch (e) {
        // fallthrough to error
      }
      setScanStatus("error");
      // keep scanning; minor delay would be handled by next frame
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScanning(true);
      setScanStatus("scanning");
      // wait for video to be ready
      await new Promise((res) => {
        const v = videoRef.current;
        if (!v) return res();
        const onPlay = () => {
          v.removeEventListener("playing", onPlay);
          res();
        };
        v.addEventListener("playing", onPlay);
        v.play().catch(() => res());
      });
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (e) {
      setScanStatus("error");
    }
  };

  useEffect(() => {
    return () => stopScanning();
  }, []);

  return (
    <div className="container" style={{ background: "#f5f1e8", minHeight: "100vh", padding: "16px" }}>
      {/* Try to bring in existing CSS; safe no-op if not found */}
      <link rel="stylesheet" href="/css/sightseeing/sightseeing.css" />

      <h1>QRally</h1>
      <p>京都の名所を巡ってスタンプを集めよう！各観光地をクリックして詳細を確認できます。</p>

      {/* Progress and grid */}
      <div id="stampUI" className="stamp-container" style={{ display: "block" }}>
        <div className="stamp-title">STAMP GET!</div>
        <div className="stamp-subtitle">観光地を巡ってスタンプを集めよう！</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${stats.rate}%` }} />
        </div>
        <div className="stats" id="stats">
          <div className="stat-item">
            <div className="stat-number">{stats.collected}</div>
            <div className="stat-label">獲得済み</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">総数</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats.rate}%</div>
            <div className="stat-label">達成率</div>
          </div>
        </div>

        <div className="stamp-grid">
          {locations.map((loc, idx) => {
            const isVisited = visited.has(loc.id);
            return (
              <div key={loc.id || idx} className={`stamp-slot ${isVisited ? "visited" : ""}`} onClick={() => onStampClick(loc)}>
                {loc.image ? (
                  <>
                    <img src={loc.image} alt={loc.name} style={{ width: 84, height: 64, objectFit: "cover", borderRadius: 8 }} />
                    <div className="stamp-text">{loc.name?.length > 10 ? `${loc.name.slice(0, 10)}...` : loc.name}</div>
                  </>
                ) : (
                  <div className="stamp-icon">{isVisited ? iconFor(loc) : "?"}</div>
                )}
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, 6 - locations.length) }).map((_, i) => (
            <div key={`ph-${i}`} className="stamp-slot placeholder">
              <div className="stamp-icon">?</div>
            </div>
          ))}
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <div className="modal" style={{ display: "flex" }}>
          <div className="modal-content">
            <button className="modal-close" onClick={() => setSelected(null)}>
              ✕
            </button>
            <div id="stampModalContent" style={{ textAlign: "center", maxHeight: "70vh", overflow: "auto" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{iconFor(selected.loc)}</div>
                <h3 style={{ margin: 0, color: "#333" }}>{selected.loc.name}</h3>
              </div>
              <div style={{ textAlign: "left", marginBottom: 16 }}>
                <p>
                  <strong>特徴:</strong> {selected.loc.attributes?.benefit}
                </p>
                <p>
                  <strong>混雑度:</strong> {getCrowdLevelText(selected.loc.attributes?.crowd_level)}
                </p>
                <p>
                  <strong>テーマ:</strong> {getThemeText(selected.loc.attributes?.theme)}
                </p>
              </div>
              {selected.loc.image && (
                <div style={{ marginBottom: 16 }}>
                  <img src={selected.loc.image} alt={selected.loc.name} style={{ maxWidth: "100%", height: 200, objectFit: "cover", borderRadius: 8 }} />
                </div>
              )}
              <div style={{ textAlign: "left", fontSize: 14, lineHeight: 1.6 }}
                   dangerouslySetInnerHTML={{ __html: marked.parse(selected.loc.markdown_details || `# ${selected.loc.name}\n\n${selected.loc.attributes?.benefit || ""}`) }} />
            </div>
          </div>
        </div>
      )}

      {/* QR modal */}
      {qrOpen && (
        <div className="modal qr-modal" style={{ display: "flex" }}>
          <div className="modal-content qr-modal-content" style={{ textAlign: "center" }}>
            <button className="modal-close" onClick={() => setQrOpen(false)}>✕</button>
            <h2 style={{ marginTop: 0, color: "#8b4513" }}>QRally</h2>
            <h3 style={{ color: "#8b7355", margin: "10px 0" }}>QRコードを読み取って開始</h3>
            <p style={{ color: "#8b7355", marginBottom: 20 }}>
              スマホのカメラでQRコードを読み取ると、同じページが開きます。<br />読み取り後にスタンプラリーが開始されます。
            </p>

            {!scanning ? (
              <QRCodeCanvas value={stampUrl} size={220} level="M" bgColor="#ffffff" fgColor="#000000" />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, placeItems: "center" }}>
                <video ref={videoRef} style={{ width: 240, height: 180, background: "#000" }} playsInline muted />
                <canvas ref={canvasRef} width={220} height={220} style={{ display: "none" }} />
                <div id="qrScanStatus" style={{ fontSize: 12, color: scanStatus === "error" ? "#b00" : scanStatus === "success" ? "#070" : "#8b7355" }}>
                  {scanStatus === "scanning" && "スキャン中..."}
                  {scanStatus === "success" && "QRコード読み取り成功！"}
                  {scanStatus === "error" && "無効なQRコードまたは読み取り失敗"}
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              {!scanning ? (
                <button className="qr-button qr-button-scan" onClick={startScanning}>📷 カメラでQRを読み取る</button>
              ) : (
                <button className="qr-button qr-button-secondary" onClick={() => stopScanning(true)}>スキャン停止</button>
              )}
              <button
                className="qr-button qr-button-primary"
                style={{ marginLeft: 8 }}
                onClick={() => { stopScanning(false); setQrOpen(false); if (typeof window !== 'undefined') window.location.href = stampUrl; }}
              >
                QR読み取り完了・開始
              </button>
              <button
                className="qr-button qr-button-secondary"
                style={{ marginLeft: 8 }}
                onClick={() => { stopScanning(true); setQrOpen(false); if (typeof window !== 'undefined') window.location.href = stampUrl; }}
              >
                スキップして開始
              </button>
            </div>
            <div style={{ marginTop: 15, fontSize: 12, color: "#8b7355" }}>💡 Win11のカメラアプリでも読み取れます</div>
          </div>
        </div>
      )}

      <p style={{ marginTop: 30, color: "#8b7355", fontSize: "0.9rem", textAlign: "center" }}>💡 ヒント: スタンプをクリックして観光地の詳細を確認できます！</p>

      <style jsx>{`
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; align-items: center; justify-content: center; }
        .modal-content { background: #fff; padding: 16px; border-radius: 12px; position: relative; max-width: 640px; width: calc(100% - 32px); }
        .modal-close { position: absolute; right: 8px; top: 8px; border: none; background: transparent; font-size: 18px; cursor: pointer; }
        .stamp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .stamp-slot { background: #fff; border-radius: 12px; padding: 10px; text-align: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
        .stamp-slot.visited { outline: 2px solid #8b4513; }
        .stamp-icon { font-size: 36px; }
        .stamp-text { font-size: 12px; margin-top: 4px; color: #444; }
        .progress-bar { background: #e8e0cf; border-radius: 8px; height: 10px; margin: 12px 0; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #8b4513, #a0522d); }
      `}</style>
    </div>
  );
}
