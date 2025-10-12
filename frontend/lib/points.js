// Points calculation based on "minority" factor using sightseeing dataset

let sightseeingCache = null;

export async function getSightseeingData() {
  if (sightseeingCache) return sightseeingCache;
  try {
    const res = await fetch('/json/sightseeing/sightseeing.json', { cache: 'no-store' });
    const data = await res.json();
    sightseeingCache = data;
    return data;
  } catch {
    return { locations: [] };
  }
}

export async function getSpotMeta(spotId) {
  const data = await getSightseeingData();
  const match = (data.locations || []).find((loc) => loc.id === spotId);
  return match || null;
}

export function minorityMultiplier(crowdLevel) {
  // Smaller crowds → higher multiplier
  switch ((crowdLevel || '').toLowerCase()) {
    case 'high':
      return 1.0; // very popular
    case 'medium':
      return 1.5; // moderately popular
    case 'low':
      return 2.5; // less visited
    default:
      return 3.0; // unknown spots → treat as very minor
  }
}

export async function computeSpotPoints(spotId, base = 10) {
  const meta = await getSpotMeta(spotId);
  const crowd = meta?.attributes?.crowd_level || null;
  const mult = minorityMultiplier(crowd);
  // Round to nearest 5 to keep UI tidy
  const raw = Math.round(base * mult);
  const rounded = Math.max(5, Math.round(raw / 5) * 5);
  return { points: rounded, crowd_level: crowd, multiplier: mult };
}

// Local persistence helpers for de-duplication
const LS_KEY = 'qrally_scanned_spots_v1';

export function getScannedSet() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markScanned(spotId) {
  if (typeof window === 'undefined') return;
  const set = getScannedSet();
  set.add(spotId);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function isScanned(spotId) {
  const set = getScannedSet();
  return set.has(spotId);
}
