'use client';
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { marked } from "marked";

export default function SightseeingClient() {
  const [data, setData] = useState(null);

  // Get URL query parameters (reactive to URL changes)
  const searchParams = useSearchParams();
  const rank = useMemo(() => {
    const v = searchParams.get("rank");
    const n = v !== null ? Number.parseInt(v, 10) : null;
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);
  const auto = useMemo(() => searchParams.get("auto") === "1", [searchParams]);

  // Load the JSON
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
        } catch {
          // continue to the next candidate
        }
      }
      if (!cancelled) setData({ locations: [] });
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // rank -> id mapping
  const targetId = useMemo(() => {
    if (rank === 1) return "kinkakuji";
    if (rank === 2) return "ginkakuji"; // not “ginkakuzi”
    if (rank === 3) return "kiyomizudera";
    return null;
  }, [rank]);

  // find location by id
  const targetLoc = useMemo(() => {
    if (!targetId || !Array.isArray(data?.locations)) return null;
    return data.locations.find((loc) => loc.id === targetId) ?? null;
  }, [data, targetId]);

  // pre-render markdown html
  const targetHtml = useMemo(() => {
    if (!targetLoc) return null;
    const md = targetLoc.markdown_details
      ?? `# ${targetLoc.name}\n\n${targetLoc.attributes?.benefit ?? ""}`;
    return marked.parse(md);
  }, [targetLoc]);

  return (
    <div style={{ background: "#f5f1e8", minHeight: "100vh", padding:  " 24px 120px"}}>
      {auto && targetLoc && (
        <section className="detail-card">
          <h2 className="detail-title">{targetLoc.name}</h2>

          {/* Side-by-side layout: left image, right description */}
          <div className="detail-row">
            <div className="detail-media">
              {targetLoc.image ? (
                <img
                  src={targetLoc.image}
                  alt={targetLoc.name}
                  className="detail-img"
                />
              ) : (
                <div className="detail-img placeholder" aria-hidden="true">No image</div>
              )}
            </div>

            <div
              className="detail-body"
              // If importing user-generated markdown, sanitize before injecting.
              dangerouslySetInnerHTML={{ __html: targetHtml }}
            />
          </div>
        </section>
      )}

      <style jsx>{`
        .detail-card {
          background: #fff;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .detail-title {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 1.25rem;
          line-height: 1.3;
        }
        .detail-row {
          display: grid;
          grid-template-columns: 320px 1fr; /* left fixed, right flexible */
          gap: 24px; /* ← wider gap between image and text */
          align-items: start;
        }
        .detail-media {
          width: 100%;
        }
        .detail-img {
          width: 100%;
          height: 220px;
          object-fit: cover;
          border-radius: 10px;
          display: block;
          background: #f0efe9;
        }
        .detail-img.placeholder {
          display: grid;
          place-items: center;
          color: #777;
          font-size: 0.9rem;
        }

        /* ⬇️ Add generous left/right padding to the description area */
        .detail-body {
          padding-inline: clamp(24px, 4vw, 64px); /* 左右余白を拡大（可変） */
          max-width: 70ch;                        /* 行幅を適度に制限して読みやすく */
        }

        .detail-body :global(h1),
        .detail-body :global(h2),
        .detail-body :global(h3) {
          margin-top: 0.2em;
        }
        .detail-body :global(p) {
          margin: 0.5em 0;
        }

        /* Responsive: stack on narrow screens */
        @media (max-width: 720px) {
          .detail-row {
            grid-template-columns: 1fr;
          }
          .detail-img {
            height: 200px;
          }
          .detail-body {
            padding-inline: 16px; /* モバイルでは少し控えめに */
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
