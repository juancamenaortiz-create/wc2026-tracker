// api/cron-sync.js
// Called automatically by Vercel Cron at 00:10 UTC every day (matches end by ~23:59 UTC).
// Syncs yesterday's completed matches to KV so morning users see fresh data.
// vercel.json sets the schedule.

export default async function handler(req, res) {
  // Vercel automatically provides CRON_SECRET for secured cron endpoints
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const utcStr = d =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;

  // Sync yesterday + today (catches late-UTC games and any stragglers)
  const dates = [
    utcStr(new Date(Date.now() - 86400000)), // yesterday UTC
    utcStr(new Date()),                        // today UTC
  ];

  // Delegate to /api/sync
  const base = `https://${req.headers.host}`;
  const r = await fetch(`${base}/api/sync`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ dates }),
  });
  const result = await r.json();

  console.log('[cron-sync]', result);
  return res.json({ ok: true, ...result });
}
