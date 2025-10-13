"use client";

// Load sightseeing data
export async function loadSightseeing() {
  const res = await fetch('/json/sightseeing/sightseeing.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`failed fetch: ${res.status}`);
  return res.json();
}

// numbers(list) → visited(Set<id>)
export function numbersToVisited(numbers, locations) {
  const set = new Set();
  if (!Array.isArray(numbers) || !Array.isArray(locations)) return set;
  numbers.forEach((n) => {
    // 1) id 直接一致（数値でも文字列でもまずはID優先）
    const s = String(n);
    const byId = locations.find((loc) => loc.id === s);
    if (byId) {
      set.add(byId.id);
      return;
    }
    // 2) 数値だった場合は 1-based を優先（>=1）。0 のみ 0-based として扱う。
    if (Number.isInteger(n)) {
      if (n >= 1) {
        const idx1 = n - 1;
        if (idx1 >= 0 && idx1 < locations.length) set.add(locations[idx1].id);
        return;
      }
      if (n === 0) {
        // 明示的に0が来た場合のみ0-based indexとみなす
        if (locations.length > 0) set.add(locations[0].id);
        return;
      }
    }
  });
  return set;
}

// Pick acquired id from URL or fallback to first
export function pickAcquiredId(locations) {
  try {
    const usp = new URLSearchParams(window.location.search);
    let id = usp.get('id') || usp.get('spot') || usp.get('name');
    if (id) id = String(id).toLowerCase();
    const ids = (locations || []).map((l) => l.id);
    if (id && ids.includes(id)) return id;
    // try index by n param (1-based)
    const nRaw = usp.get('n');
    if (nRaw) {
      const n = Number(nRaw);
      if (Number.isFinite(n) && n > 0 && n <= ids.length) return ids[n - 1];
    }
    return ids[0] || 'kinkakuji';
  } catch {
    return 'kinkakuji';
  }
}

// Load single item JSON by id and difficulty level
export async function loadItemByIdAndLevel(id, level = 'medium', language = 'ja') {
  if (!id) return null;
  const lv = level || 'medium';
  const lang = (language || 'ja').toLowerCase();
  // ja: use original folder (detail|medium|simple)
  // en: use *_eg folders (detail_eg|medium_eg|simple_eg)
  const dir = lang === 'en' ? `${lv}_eg` : lv;
  const url = `/json/stamp/${dir}/${id}.json`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`failed: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('loadItemByIdAndLevel failed', id, lv, lang, e);
    return null;
  }
}
