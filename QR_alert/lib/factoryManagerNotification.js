// factoryManagerNotification.js - single clean server-safe implementation
/* eslint-disable no-console */
let fsLocal = null;
let pathLocal = null;
let EventEmitterLocal = null;
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  try {
    fsLocal = require('fs');
    pathLocal = require('path');
    EventEmitterLocal = require('events').EventEmitter;
  } catch (e) {
    fsLocal = null;
    pathLocal = null;
    EventEmitterLocal = null;
  }
}

function FactoryManagerNotification() {
  this.notificationsDir = (pathLocal && pathLocal.join(process.cwd(), 'notifications')) || 'notifications';
  this.emergencyNotifications = [];
  this.emitter = EventEmitterLocal ? new EventEmitterLocal() : null;
  this.statsPath = pathLocal ? pathLocal.join(this.notificationsDir, 'stats.json') : null;
  this._stats = { grandTotal: 0, byDate: {}, lastTimestamp: null };

  if (fsLocal) {
    try {
      if (!fsLocal.existsSync(this.notificationsDir)) fsLocal.mkdirSync(this.notificationsDir, { recursive: true });
      // load cumulative stats if present
      try {
        if (this.statsPath && fsLocal.existsSync(this.statsPath)) {
          const rawStats = fsLocal.readFileSync(this.statsPath, 'utf8');
          const parsed = JSON.parse(rawStats);
          if (parsed && typeof parsed.grandTotal === 'number') this._stats = parsed;
        }
      } catch (e) { /* ignore */ }
      const files = fsLocal.readdirSync(this.notificationsDir).filter(f => f && f.endsWith('.json'));
      const loaded = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const raw = fsLocal.readFileSync(pathLocal.join(this.notificationsDir, files[i]), 'utf8');
          const obj = JSON.parse(raw);
          if (obj && obj.id) loaded.push(obj);
        } catch (e) {
          // ignore malformed
        }
      }
      loaded.sort((a, b) => new Date(a.dockerTime || a.timestamp).getTime() - new Date(b.dockerTime || b.timestamp).getTime());
      if (loaded.length) this.emergencyNotifications = loaded.slice(-100);
    } catch (e) {
      // ignore
    }
  }
}

FactoryManagerNotification.prototype.sendEmergencyNotification = function(robotId, details) {
  const now = new Date();
  const n = {
    id: 'EMERGENCY_' + robotId + '_' + now.getTime(),
    timestamp: now.toISOString(),
    robotId,
    type: 'EMERGENCY_STOP_REQUIRED',
    title: '🚨 緊急停止要請',
    message: `ロボット ${robotId} で連続危険状況が検知されました。`,
    details: details || [],
    severity: 'CRITICAL',
    actionRequired: 'IMMEDIATE_STOP',
    containerTime: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    dockerTime: now.toISOString()
  };
  this.emergencyNotifications.push(n);
  this._persist(n);
  this._bumpStats(now);
  if (this.emitter) this.emitter.emit('update', this.getNotificationHistory());
  return n;
};

FactoryManagerNotification.prototype._persist = function(notification) {
  if (!fsLocal) return;
  try {
    const base = 'emergency_notification_' + notification.id;
    fsLocal.writeFileSync(pathLocal.join(this.notificationsDir, base + '.txt'), this._format(notification), 'utf8');
    try { fsLocal.writeFileSync(pathLocal.join(this.notificationsDir, base + '.json'), JSON.stringify(notification, null, 2), 'utf8'); } catch (e) {}
  } catch (e) {
    console.error('persist error', e);
  }
};

FactoryManagerNotification.prototype._bumpStats = function(nowDate) {
  if (!fsLocal) return;
  try {
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowDate);
    this._stats.grandTotal = (this._stats.grandTotal || 0) + 1;
    if (!this._stats.byDate) this._stats.byDate = {};
    this._stats.byDate[dayKey] = (this._stats.byDate[dayKey] || 0) + 1;
    this._stats.lastTimestamp = nowDate.toISOString();
    if (this.statsPath) fsLocal.writeFileSync(this.statsPath, JSON.stringify(this._stats, null, 2), 'utf8');
  } catch (e) { /* ignore */ }
};

FactoryManagerNotification.prototype._format = function(notification) {
  let out = '';
  out += `通知ID: ${notification.id}\n`;
  out += `ロボットID: ${notification.robotId}\n`;
  out += `タイトル: ${notification.title}\n\n`;
  out += `${notification.message}\n\n`;
  if (notification.details && notification.details.length) notification.details.forEach((d, i) => out += `${i + 1}. ${d.partName || d.partId}\n`);
  return out;
};

FactoryManagerNotification.prototype.getNotificationHistory = function() {
  return this.emergencyNotifications.slice(-20);
};

FactoryManagerNotification.prototype.removeNotificationsForRobot = function(robotId) {
  if (!robotId) return;
  this.emergencyNotifications = this.emergencyNotifications.filter(n => n.robotId !== robotId);
  if (fsLocal) {
    try {
      const files = fsLocal.readdirSync(this.notificationsDir);
      for (const f of files) {
        if (f.includes(robotId) && (f.endsWith('.txt') || f.endsWith('.json'))) {
          try { fsLocal.unlinkSync(pathLocal.join(this.notificationsDir, f)); } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
  }
  if (this.emitter) this.emitter.emit('update', this.getNotificationHistory());
};

FactoryManagerNotification.prototype.onUpdate = function(cb) {
  if (!this.emitter) return function() {};
  this.emitter.on('update', cb);
  return () => this.emitter.removeListener('update', cb);
};

FactoryManagerNotification.prototype.getNotificationStats = function() {
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const activeCount = this.emergencyNotifications.length;
  const derivedLast = this.emergencyNotifications[this.emergencyNotifications.length - 1] || null;
  const lastTimestamp = this._stats.lastTimestamp || (derivedLast ? derivedLast.timestamp : null);
  return {
    totalNotifications: this._stats.grandTotal || activeCount,
    todayNotifications: (this._stats.byDate && this._stats.byDate[todayKey]) || 0,
    lastNotification: lastTimestamp ? { timestamp: lastTimestamp } : (derivedLast || null),
    activeCount
  };
};

FactoryManagerNotification.prototype.resetAll = function() {
  // Clear in-memory
  this.emergencyNotifications = [];
  this._stats = { grandTotal: 0, byDate: {}, lastTimestamp: null };
  // Remove persisted files
  if (fsLocal) {
    try {
      const files = fsLocal.readdirSync(this.notificationsDir);
      for (const f of files) {
        try { fsLocal.unlinkSync(pathLocal.join(this.notificationsDir, f)); } catch (e) { /* ignore */ }
      }
      // Ensure stats file reflects reset
      if (this.statsPath) {
        try { fsLocal.writeFileSync(this.statsPath, JSON.stringify(this._stats, null, 2), 'utf8'); } catch (e) {}
      }
    } catch (e) { /* ignore */ }
  }
  if (this.emitter) this.emitter.emit('update', this.getNotificationHistory());
};

let singleton = null;
export function getFactoryManagerNotification() { if (!singleton) singleton = new FactoryManagerNotification(); return singleton; }
export default FactoryManagerNotification;
