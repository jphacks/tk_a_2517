"use client";

import { useEffect, useMemo, useState } from "react";

async function fetchJSON(url, init) {
  const res = await fetch(url, { cache: "no-store", ...(init||{}) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return res.json().catch(()=>({}));
  return res.json();
}

export default function MemoryPage() {
  const [numbers, setNumbers] = useState([]); // e.g., [1,3,2]
  const [memConfig, setMemConfig] = useState([]); // from /json/memory/memory.json
  const [sightseeing, setSightseeing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const q = await fetchJSON("/api/query-numbers");
        setNumbers(Array.isArray(q.list) ? q.list : []);
      } catch (e) {
        setNumbers([]);
      }
      try {
        const m = await fetchJSON("/json/memory/memory.json");
        setMemConfig(Array.isArray(m) ? m : []);
      } catch (e) { /* optional */ }
      try {
        const s = await fetchJSON("/json/sightseeing/sightseeing.json");
        setSightseeing(s);
      } catch (e) { /* optional fallback */ }
    })();
  }, []);

  const items = useMemo(() => {
    // Build a map from value -> mem item
    const byVal = new Map((memConfig||[]).map((it)=>[Number(it.value), it]));
    const ssLocs = sightseeing?.locations || [];
    const toItemFromSightseeing = (n) => {
      // Try 1-based index, then 0-based index
      const idx1 = Number(n) - 1;
      const loc = (idx1>=0 && idx1<ssLocs.length) ? ssLocs[idx1]
                : (Number(n)>=0 && Number(n)<ssLocs.length) ? ssLocs[Number(n)]
                : null;
      if (!loc) return null;
      return {
        value: Number(n),
        id: loc.id,
        title: loc.name,
        image: loc.image || "/img/hatena.jpg",
        text: loc.attributes?.benefit || "",
      };
    };
    const seen = new Set();
    const ordered = [];
    (numbers||[]).forEach((nRaw) => {
      const n = Number(nRaw);
      if (!Number.isFinite(n) || seen.has(n)) return; // dedupe, validate
      let item = byVal.get(n);
      if (!item) item = toItemFromSightseeing(n);
      if (item) {
        ordered.push(item);
        seen.add(n);
      }
    });
    return ordered;
  }, [numbers, memConfig, sightseeing]);

  return (
    <div className="memory-page">
      <link rel="stylesheet" href="/css/memory/memory.css" />
      <div className="memory-container">
        <div className="memory-header">
          <h1>🖼️ 記録（Memory）</h1>
          <p>以前記録した番号の順序で画像を並べています。</p>
        </div>
        {error && <div className="memory-empty">{String(error)}</div>}
        {items.length === 0 ? (
          <div className="memory-empty">まだ記録がありません。QR を読み取ってスタンプ画面から記録してください。</div>
        ) : (
          <div className="memory-grid">
            {items.map((it) => (
              <div key={`${it.value}-${it.id||it.title}`} className="memory-card">
                <img className="memory-image" src={it.image || "/img/hatena.jpg"} alt={it.title || it.id || "image"} />
                <div className="memory-body">
                  <div className="memory-rank">No.{it.value}</div>
                  <h3 className="memory-title">{it.title || it.id}</h3>
                  {it.text && <p className="memory-text">{it.text}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
