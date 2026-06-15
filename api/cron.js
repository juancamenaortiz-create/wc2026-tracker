// api/cron.js — called every 5 min by GitHub Actions
// Fetches ESPN scores, compares with last known state in Redis,
// sends Web Push notifications for goals / kickoffs / full time.

import webpush  from 'web-push';
import { Redis } from '@upstash/redis';

// ── ESPN name corrections (same as client-side ESPN_NAMES) ──────────────────
const ESPN_NAMES = {
  "United States": "USA", "United States of America": "USA",
  "Korea Republic": "South Korea",
  "Turkey": "Türkiye", "Turkiye": "Türkiye",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "DR Congo": "Congo DR", "Democratic Republic of Congo": "Congo DR",
  "Côte d'Ivoire": "Ivory Coast", "Cote d'Ivoire": "Ivory Coast",
  "Czech Republic": "Czechia",
  "Curacao": "Curaçao",
  "Cabo Verde": "Cape Verde",
  "IR Iran": "Iran",
};
const mapName = n => ESPN_NAMES[n] || n || '';

// ── Fetch current scores from ESPN ──────────────────────────────────────────
async function fetchESPN() {
  const now    = new Date();
  const dates  = new Set();

  // Local dates (CT ≈ UTC-5)
  for (let i = 0; i <= 1; i++) {
    const d = new Date(now.getTime() - i * 86400000 - 5 * 3600000);
    dates.add(`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`);
  }
  // Current UTC date (catches late-night CT games that roll into the next UTC day)
  dates.add(`${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,'0')}${String(now.getUTCDate()).padStart(2,'0')}`);

  const matches = [];
  for (const date of dates) {
    try {
      const resp = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!resp.ok) continue;
      const data = await resp.json();

      for (const ev of (data.events || [])) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;

        const st = comp.status?.type || {};
        const sn = (st.name || '').toUpperCase();
        let status = 'NS';
        if (st.completed || sn.includes('FINAL'))                           status = 'FT';
        else if (sn.includes('PROGRESS') || sn.includes('HALF') ||
                 sn.includes('SHOOTOUT') || sn.includes('EXTRA'))           status = 'LIVE';
        if (status === 'NS') continue; // skip scheduled matches

        const comps = comp.competitors || [];
        const home  = comps.find(c => c.homeAway === 'home');
        const away  = comps.find(c => c.homeAway === 'away');
        if (!home || !away) continue;

        matches.push({
          id:     ev.id,
          team1:  mapName(home.team?.displayName),
          team2:  mapName(away.team?.displayName),
          score1: parseInt(home.score) || 0,
          score2: parseInt(away.score) || 0,
          status,
          clock:  comp.status?.displayClock || '',
        });
      }
    } catch(e) {
      console.warn(`ESPN fetch failed for ${date}:`, e.message);
    }
  }
  return matches;
}

// ── Detect changes against last known state ──────────────────────────────────
function detectChanges(current, lastState) {
  const events = [];
  for (const m of current) {
    const prev = lastState[m.id];
    const score = `${m.score1}–${m.score2}`;

    if (!prev) {
      // Newly appeared in feed — only notify if already live
      if (m.status === 'LIVE') {
        events.push({ type: 'kickoff', title: `🟢 ${m.team1} vs ${m.team2}`, body: '', tag: `kick-${m.id}` });
      }
      continue;
    }

    // Kicked off
    if (prev.status !== 'LIVE' && m.status === 'LIVE') {
      events.push({ type: 'kickoff', title: `🟢 ${m.team1} vs ${m.team2}`, body: '', tag: `kick-${m.id}` });
    }

    // Full time
    if (prev.status === 'LIVE' && m.status === 'FT') {
      events.push({ type: 'fulltime', title: `🏁 ${m.team1} ${score} ${m.team2}`, body: '', tag: `ft-${m.id}` });
    }

    // Goals (while LIVE)
    if (m.status === 'LIVE') {
      if (m.score1 > prev.score1) {
        events.push({ type: 'goal', title: `⚽ ${m.team1} ${score} ${m.team2}`, body: '', tag: `goal-${m.id}-${m.score1}-${m.score2}` });
      }
      if (m.score2 > prev.score2) {
        events.push({ type: 'goal', title: `⚽ ${m.team2} scores! ${score}`, body: `${m.team1} ${score} ${m.team2}`, tag: `goal-${m.id}-${m.score1}-${m.score2}` });
      }
    }
  }
  return events;
}

// ── Send Web Push to all stored subscriptions ────────────────────────────────
async function sendPushToAll(redis, notification) {
  const raw = await redis.hgetall('wc2026:subs');
  if (!raw || !Object.keys(raw).length) return;

  const entries   = Object.entries(raw);
  const toRemove  = [];

  await Promise.allSettled(entries.map(async ([key, subJson]) => {
    try {
      const sub = typeof subJson === 'string' ? JSON.parse(subJson) : subJson;
      await webpush.sendNotification(sub, JSON.stringify({
        title: notification.title,
        body:  notification.body  || '',
        tag:   notification.tag   || '',
        icon:  '/favicon.ico',
      }));
    } catch(err) {
      // 410 Gone = subscription expired/unsubscribed; 404 = endpoint invalid
      if (err.statusCode === 410 || err.statusCode === 404) {
        toRemove.push(key);
      } else {
        console.warn('Push send error:', err.statusCode, err.message?.substring(0, 80));
      }
    }
  }));

  // Clean up dead subscriptions
  if (toRemove.length) {
    await Promise.all(toRemove.map(k => redis.hdel('wc2026:subs', k)));
    console.log(`Removed ${toRemove.length} expired subscription(s)`);
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') return res.status(405).end();

  // Validate cron secret
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check required env vars
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'push@wc2026.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  });

  try {
    // 1. Fetch current scores
    const current = await fetchESPN();
    if (!current.length) {
      return res.status(200).json({ ok: true, message: 'No active matches found' });
    }

    // 2. Load last known state from Redis
    const rawState  = await redis.get('wc2026:state');
    const lastState = rawState ? (typeof rawState === 'string' ? JSON.parse(rawState) : rawState) : {};

    // 3. Detect changes
    const events = detectChanges(current, lastState);
    console.log(`cron: ${current.length} matches, ${events.length} event(s)`);

    // 4. Send pushes
    for (const event of events) {
      console.log(`  → ${event.type}: ${event.title}`);
      await sendPushToAll(redis, event);
    }

    // 5. Save new state to Redis (TTL 12 hours — auto-cleans after matches end)
    const newState = {};
    current.forEach(m => {
      newState[m.id] = { score1: m.score1, score2: m.score2, status: m.status };
    });
    await redis.set('wc2026:state', JSON.stringify(newState), { ex: 43200 });

    return res.status(200).json({
      ok: true,
      matches: current.length,
      events:  events.length,
      pushed:  events.map(e => e.title),
    });
  } catch(err) {
    console.error('cron.js error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
