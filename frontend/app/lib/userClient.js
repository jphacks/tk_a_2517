// Client-side user utilities: generate a temporary tab id and optionally assign
// a sequential numeric id across tabs. Points are stored in a shared map keyed
// by userId inside localStorage under POINTS_MAP_KEY.
function generateId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return `t_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

const SESSION_TEMP_KEY = 'qr_temp_id'; // per-tab temporary id (sessionStorage)
const SESSION_SEQ_KEY = 'qr_seq_id'; // per-tab assigned sequential id (sessionStorage)
const SEQ_LOCK_KEY = 'qr_seq_lock';
const SEQ_NEXT_KEY = 'qr_next_seq_v1';
const POINTS_MAP_KEY = 'qr_points_map_v1';

// synchronous getter: returns assigned seq id if present, else temp tab id.
export function getUserId() {
  if (typeof window === 'undefined') return null;
  try {
    const seq = window.sessionStorage.getItem(SESSION_SEQ_KEY);
    if (seq) return seq;
    let temp = window.sessionStorage.getItem(SESSION_TEMP_KEY);
    if (!temp) {
      temp = generateId();
      window.sessionStorage.setItem(SESSION_TEMP_KEY, temp);
    }
    return temp;
  } catch (e) {
    return null;
  }
}

function readMap() {
  try {
    const raw = window.localStorage.getItem(POINTS_MAP_KEY);
    if (!raw) return {};
    return JSON.parse(raw || '{}') || {};
  } catch (e) {
    return {};
  }
}

function writeMap(m) {
  try {
    window.localStorage.setItem(POINTS_MAP_KEY, JSON.stringify(m || {}));
  } catch (e) {}
}

export function getPointsForUser(userId) {
  if (typeof window === 'undefined') return 0;
  try {
    const m = readMap();
    return Number(m[userId] || 0);
  } catch (e) { return 0; }
}

export function setPointsForUser(userId, points) {
  if (typeof window === 'undefined') return;
  try {
    const m = readMap();
    m[userId] = Number(points || 0);
    writeMap(m);
  } catch (e) {}
}

export function addPointsForUser(userId, delta) {
  if (typeof window === 'undefined') return 0;
  try {
    const m = readMap();
    const cur = Number(m[userId] || 0);
    const np = cur + Number(delta || 0);
    m[userId] = np;
    writeMap(m);
    return np;
  } catch (e) { return 0; }
}

// Simple localStorage lock for cross-tab mutual exclusion
async function acquireLock(key, opts = { timeout: 2000, retryDelay: 50 }) {
  const start = Date.now();
  const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  while (Date.now() - start < opts.timeout) {
    try {
      const cur = window.localStorage.getItem(key);
      if (!cur) {
        window.localStorage.setItem(key, JSON.stringify({ token, ts: Date.now() }));
        // verify we own it
        const verify = JSON.parse(window.localStorage.getItem(key) || '{}');
        if (verify.token === token) return token;
      } else {
        const obj = JSON.parse(cur || '{}');
        // if lock is stale, steal it
        if (Date.now() - (obj.ts || 0) > opts.timeout) {
          window.localStorage.setItem(key, JSON.stringify({ token, ts: Date.now() }));
          const verify = JSON.parse(window.localStorage.getItem(key) || '{}');
          if (verify.token === token) return token;
        }
      }
    } catch (e) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, opts.retryDelay));
  }
  throw new Error('lock_timeout');
}

function releaseLock(key, token) {
  try {
    const cur = JSON.parse(window.localStorage.getItem(key) || '{}');
    if (cur.token === token) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {}
}

// Assign a sequential numeric id for this tab if not already assigned.
// Returns the assigned id (string).
export async function assignSequentialId() {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.sessionStorage.getItem(SESSION_SEQ_KEY);
    if (existing) return existing;
    const lockToken = await acquireLock(SEQ_LOCK_KEY);
    try {
      // read next
      let nextRaw = window.localStorage.getItem(SEQ_NEXT_KEY);
      let next = nextRaw ? Number(nextRaw) : 1;
      const assigned = String(next);
      // increment and persist
      window.localStorage.setItem(SEQ_NEXT_KEY, String(next + 1));

      // migrate points from temp id (if any)
      const temp = window.sessionStorage.getItem(SESSION_TEMP_KEY);
      if (temp) {
        const m = readMap();
        const tempPoints = Number(m[temp] || 0);
        const curAssigned = Number(m[assigned] || 0);
        if (tempPoints > 0) {
          m[assigned] = curAssigned + tempPoints;
          delete m[temp];
          writeMap(m);
        }
      }

      window.sessionStorage.setItem(SESSION_SEQ_KEY, assigned);
      return assigned;
    } finally {
      releaseLock(SEQ_LOCK_KEY, lockToken);
    }
  } catch (e) {
    // fallback: create a non-sequential id
    const fallback = generateId();
    try { window.sessionStorage.setItem(SESSION_SEQ_KEY, fallback); } catch (e2) {}
    return fallback;
  }
}

// One-time token support: generate a short token that maps to a userId so the user
// can reopen the same account in another tab/device (client-side only).
const OTP_MAP_KEY = 'qr_otp_map_v1';

function readOtpMap() {
  try { return JSON.parse(window.localStorage.getItem(OTP_MAP_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function writeOtpMap(m) { try { window.localStorage.setItem(OTP_MAP_KEY, JSON.stringify(m||{})); } catch (e) {} }

export function createOneTimeToken(userId, ttlSeconds = 3600) {
  if (typeof window === 'undefined') return null;
  try {
    const length = 8;
    let token = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // base32-ish, avoid ambiguous
    for (let i = 0; i < length; i++) token += chars[Math.floor(Math.random() * chars.length)];
    const expires = Date.now() + (ttlSeconds * 1000);
    const m = readOtpMap();
    m[token] = { userId, expires, persistent: false };
    writeOtpMap(m);
    return token;
  } catch (e) {
    return null;
  }
}

export function createPersistentToken(userId, length = 10) {
  if (typeof window === 'undefined') return null;
  try {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < length; i++) token += chars[Math.floor(Math.random() * chars.length)];
    const m = readOtpMap();
    m[token] = { userId, persistent: true };
    writeOtpMap(m);
    return token;
  } catch (e) { return null; }
}

export function restoreUserIdFromToken(token) {
  if (typeof window === 'undefined') return null;
  try {
    const m = readOtpMap();
    const entry = m[token];
    if (!entry) return null;
    if (entry.expires && Date.now() > entry.expires) {
      delete m[token]; writeOtpMap(m); return null;
    }
    // assign the userId into session so this tab uses it
    try { window.sessionStorage.setItem(SESSION_SEQ_KEY, String(entry.userId)); } catch (e) {}
    // If token is not persistent, delete it (one-time). Persistent tokens remain.
    if (!entry.persistent) {
      delete m[token]; writeOtpMap(m);
    }
    return entry.userId;
  } catch (e) { return null; }
}

export function resetSessionId() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_SEQ_KEY);
    window.sessionStorage.removeItem(SESSION_TEMP_KEY);
  } catch (e) {}
}
