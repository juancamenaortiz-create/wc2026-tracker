// api/sync.js
// POST /api/sync  { dates: ['20260611','20260612',...] }
// Fetches ESPN for the requested dates, parses results, merges into Vercel KV.
// GET  /api/sync  returns current KV contents (for loadStaticResults in the client).

import { Redis } from '@upstash/redis';
const kv = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Shared data (kept in sync with data.js on the client) ────────────────────
import scheduleData from '../data/schedule.json' assert { type: 'json' };
const SCHEDULE = scheduleData;

const ESPN_NAMES = {
  'United States': 'USA', 'United States of America': 'USA',
  'Korea Republic': 'South Korea', 'Republic of Korea': 'South Korea',
  'IR Iran': 'Iran', 'Islamic Republic of Iran': 'Iran',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina', 'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Turkey': 'Türkiye', 'Turkiye': 'Türkiye',
  'Czech Republic': 'Czechia',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde', 'Cape Verde Islands': 'Cape Verde',
  'DR Congo': 'Congo DR', 'Congo, DR': 'Congo DR',
  'Democratic Republic of Congo': 'Congo DR', 'Republic of Congo': 'Congo DR',
  'Curacao': 'Curaçao', 'Curaçao': 'Curaçao',
  'Republic of Ireland': 'Ireland',
};

const espnToApp = n => ESPN_NAMES[n] || n || '';
const normName  = n => (n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ── ESPN parser (mirrors fetchFromESPN inner loop in app.js) ─────────────────
function parseDay(data, schedule) {
  const found = [], unmatched = [];
  for (const ev of (data.events || [])) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const st = comp.status?.type || ev.status?.type || {};
    const sn = (st.name || '').toUpperCase();
    let status, substatus = '';
    if (st.completed || sn.includes('FINAL')) {
      status = 'FT';
      if      (sn.includes('PENALT') || sn.includes('SHOOTOUT')) substatus = 'PSO';
      else if (sn.includes('AET')    || sn.includes('EXTRA'))    substatus = 'AET';
    } else { continue; } // only store completed matches in KV

    const cs   = comp.competitors || [];
    const home = cs.find(c => c.homeAway === 'home') || cs[0];
    const away = cs.find(c => c.homeAway === 'away') || cs[1];
    if (!home || !away) continue;

    const n1 = espnToApp(home.team?.displayName || '');
    const n2 = espnToApp(away.team?.displayName || '');
    const s1 = parseInt(home.score) || 0;
    const s2 = parseInt(away.score) || 0;

    const m = schedule.find(m =>
      (normName(m.t1)===normName(n1) && normName(m.t2)===normName(n2)) ||
      (normName(m.t1)===normName(n2) && normName(m.t2)===normName(n1))
    );
    if (!m) { unmatched.push(`${n1} vs ${n2}`); continue; }

    const flip = normName(m.t1) === normName(n2);
    const homeId = home.team?.id || '';
    const awayId = away.team?.id || '';

    // Goals + cards + subs from comp.details
    const events = (comp.details || [])
      .filter(d => d.scoringPlay || d.yellowCard || d.redCard ||
        ((d.type?.text || d.type?.abbreviation || '').toLowerCase().includes('sub')))
      .map(d => {
        const isSub = !d.scoringPlay && !d.yellowCard && !d.redCard;
        return {
          min: d.clock?.displayValue || '',
          tid: d.team?.id || '',
          p:   d.athletesInvolved?.[0]?.shortName || '',
          pIn: isSub ? (d.athletesInvolved?.[1]?.shortName || '') : '',
          g:   !!(d.scoringPlay),
          y:   !!(d.yellowCard),
          r:   !!(d.redCard),
          sub: isSub,
          og:  !!(d.ownGoal),
          pk:  !!(d.penaltyKick || d.scoringType?.abbreviation === 'PK' ||
                  d.type?.text?.toLowerCase().includes('penalty')),
        };
      });

    const parseStats = c => {
      const s = {};
      (c.statistics || []).forEach(st => {
        const v = parseFloat(st.displayValue);
        if (!isNaN(v)) s[st.name] = v;
      });
      return s;
    };

    const homePen = parseInt(home.shootoutScore ?? home.penaltyAggregateScore ?? null);
    const awayPen = parseInt(away.shootoutScore ?? away.penaltyAggregateScore ?? null);
    const dH = events.filter(e=>e.g&&!e.og&&e.tid===homeId).length + events.filter(e=>e.g&&e.og&&e.tid===awayId).length;
    const dA = events.filter(e=>e.g&&!e.og&&e.tid===awayId).length + events.filter(e=>e.g&&e.og&&e.tid===homeId).length;
    const fs1 = Math.max(s1, dH), fs2 = Math.max(s2, dA);

    found.push({
      matchId: m.id, espnId: ev.id,
      team1: m.t1, team2: m.t2, group: m.g, date: m.date,
      score1: flip ? fs2 : fs1, score2: flip ? fs1 : fs2,
      status, substatus,
      tid1: flip ? awayId : homeId, tid2: flip ? homeId : awayId,
      penScore1: isNaN(homePen) ? null : (flip ? awayPen : homePen),
      penScore2: isNaN(awayPen) ? null : (flip ? homePen : awayPen),
      events,
      stats: { t1: flip ? parseStats(away) : parseStats(home),
               t2: flip ? parseStats(home) : parseStats(away) },
    });
  }
  return { found, unmatched };
}

function mergeResults(existing, fresh) {
  const out = [...existing];
  for (const r of fresh) {
    const i = out.findIndex(x => x.matchId === r.matchId);
    if (i >= 0) out[i] = r; else out.push(r);
  }
  return out;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // GET → return current KV store (replaces /data/results.json)
  if (req.method === 'GET') {
    try {
      const stored = await kv.get('wc2026:results') || { matches: [], asOf: null };
      res.setHeader('Cache-Control', 'public, s-maxage=60'); // edge-cache 60s
      return res.json(stored);
    } catch(e) {
      return res.json({ matches: [], asOf: null, _error: e.message });
    }
  }

  // POST { dates: ['20260611',...] } → sync those dates from ESPN → store in KV
  if (req.method === 'POST') {
    const dates = req.body?.dates;
    if (!Array.isArray(dates) || !dates.length) {
      return res.status(400).json({ error: 'dates array required' });
    }

    // Load current KV data
    const stored  = await kv.get('wc2026:results') || { matches: [] };
    let   matches = stored.matches || [];
    const schedule = SCHEDULE;

    const synced = [], unmatched = [];
    for (const ds of dates.slice(0, 15)) { // max 15 dates per call
      try {
        const r = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ds}`,
          { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined }
        );
        if (!r.ok) continue;
        const data  = await r.json();
        const { found, unmatched: um } = parseDay(data, schedule);
        matches = mergeResults(matches, found);
        synced.push(...found.map(m => m.matchId));
        unmatched.push(...um);
      } catch(e) { /* skip date */ }
    }

    await kv.set('wc2026:results', {
      matches,
      asOf:  new Date().toISOString(),
      count: matches.length,
    });

    return res.json({ synced: synced.length, total: matches.length, unmatched });
  }

  res.status(405).end();
}
