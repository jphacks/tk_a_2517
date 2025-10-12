// pages/api/simulate/[id].js
export default function handler(req, res) {
  const { id } = req.query;
  // simple deterministic-ish pseudo-random by id + time
  const now = Date.now();
  const seed = (Array.from(id).reduce((s, c) => s + c.charCodeAt(0), 0) + Math.floor(now / 2000)) % 1000;
  // generate temp & vibration
  const tempBase = 45 + (seed % 30); // 45..75-ish
  const vibrationBase = 0.15 + ((seed % 50) / 200); // 0.15..0.4

  // simulate spikes occasionally
  const spike = (seed % 37) === 0;
  const temp = tempBase + (spike ? 10 : 0);
  const vibration = vibrationBase + (spike ? 0.25 : 0);

  // determine status
  let status = 'normal';
  let reason = 'All within nominal ranges.';
  if (temp > 70 || vibration > 0.45) {
    status = 'critical';
    reason = `Critical: temp=${temp.toFixed(2)} > 70 or vibration=${vibration.toFixed(2)} > 0.45`;
  } else if (temp > 60 || vibration > 0.35) {
    status = 'warning';
    reason = `Warning: temp=${temp.toFixed(2)} > 60 or vibration=${vibration.toFixed(2)} > 0.35`;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    machine_id: id,
    last_check: new Date().toISOString(),
    temp,
    vibration,
    status,
    anomaly_reason: reason
  });
}
