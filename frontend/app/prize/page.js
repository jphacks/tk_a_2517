"use client";

import { useState } from "react";

export default function PrizePage() {
  const [points, setPoints] = useState(20);
  const cost = 10; // cost per item (example)

  const items = Array.from({ length: 6 }).map((_, i) => ({
    id: i + 1,
    title: `景品${i + 1}`,
    image: "/img/hatena.jpg",
  }));

  function exchange(item) {
    if (points < cost) {
      alert("ポイントが足りません。");
      return;
    }
    if (!confirm(`${item.title} を ${cost}ポイントで交換しますか？`)) return;
    setPoints((p) => p - cost);
    alert(`${item.title} を交換しました。`);
  }

  return (
    <div className="prize-page">
      <link rel="stylesheet" href="/css/prize.css" />
      <main className="prize-main">
        <div className="points-row">
          <div className="points-label">現在のポイント数：</div>
          <div className="points-value"><span>{points}</span>p</div>
        </div>

        <div className="prize-grid">
          {items.map((item) => (
            <div key={item.id} className="prize-card">
              <div className="prize-image"><img src={item.image} alt={item.title} /></div>
              <div className="prize-title">{item.title}</div>
              <button
                type="button"
                className="exchange-btn"
                onClick={() => exchange(item)}
                disabled={points < cost}
                aria-disabled={points < cost}
              >
                {points < cost ? `交換できません (${cost}p)` : `交換する (${cost}p)`}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
