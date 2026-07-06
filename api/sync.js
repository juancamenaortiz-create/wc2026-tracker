// api/sync.js
// POST /api/sync  { dates: ['20260611','20260612',...] }
// Fetches ESPN for the requested dates, parses GROUP STAGE results, merges into KV.
// GET  /api/sync  returns current KV contents (for bootstrapHistory in the client).
//
// NOTE: KO matches are NOT synced here. Server-side sync can't reliably identify KO
// matches because resolution requires client-side functions (getKOMatchTeams, standings).
// KO results are always fetched live by the client's fetchFromESPN.

import { Redis } from '@upstash/redis';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let kv;
try { kv = Redis.fromEnv(); } catch(e) { kv = null; }

// Group stage schedule only — KO matches not included
const SCHEDULE = require('../data/schedule.json');

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
  'Curacao': 'Curaçao',
  'Republic of Ireland': 'Ireland',
};
const espnToApp = n => ESPN_NAMES[n] || n || '';
const normName  = n => (n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function isShootoutDetail(d) {
  if (d.shootout === true) return true;
  const t = ((d.type && (d.type.text || d.type.name)) || '').toLowerCase();
  if (t.includes('shootout')) return true;
  if (t.includes('penalty - scored') || t.includes('penalty - saved') || t.includes('penalty - missed')) {
    const p = d.period && typeof d.period.number === 'number' ? d.period.number : 0;
    return p === 5;
  }
  return false;
}

// Parse a day's ESPN scoreboard for GROUP STAGE matches only.
// Returns only FT matches that we can reliably identify by team names in SCHEDULE.
function parseDay(data) {
  const found = [], unmatched = [];
  for (const ev of (data.events || [])) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const st = comp.status?.type || {};
    const sn = (st.name || '').toUpperCase();
    // Only store fully completed matches
    if (!st.completed && !sn.includes('FINAL') && sn !== 'STATUS_FINAL') continue;

    const cs   = comp.competitors || [];
    const home = cs.find(c => c.homeAway === 'home') || cs[0];
    const away = cs.find(c => c.homeAway === 'away') || cs[1];
    if (!home || !away) continue;

    const n1 = espnToApp(home.team?.displayName || '');
    const n2 = espnToApp(away.team?.displayName || '');

    // Only match against SCHEDULE (group stage) — KO matches are identified by slot labels
    // which require client-side resolution. Unmatched KO matches are silently skipped.
    const m = SCHEDULE.find(mm =>
      (normName(mm.t1) === normName(n1) && normName(mm.t2) === normName(n2)) ||
      (normName(mm.t1) === normName(n2) && normName(mm.t2) === normName(n1))
    );
    if (!m) continue; // KO match or genuinely unmatched — skip silently

    const flip = normName(m.t1) === normName(n2);
    const s1   = parseInt(home.score) || 0;
    const s2   = parseInt(away.score) || 0;
    const homeId = home.team?.id || '';
    const awayId = away.team?.id || '';

    const events = (comp.details || [])
      .filter(d => !isShootoutDetail(d) && (d.scoringPlay || d.yellowCard || d.redCard))
      .map(d => ({
        min: d.clock?.displayValue || '',
        tid: d.team?.id || '',
        p:   d.athletesInvolved?.[0]?.shortName || '',
        g:   !!(d.scoringPlay), y: !!(d.yellowCard), r: !!(d.redCard),
        og:  !!(d.ownGoal),
        pk:  !!(d.penaltyKick || d.scoringType?.abbreviation === 'PK' ||
                d.type?.text?.toLowerCase().includes('penalty')),
      }))
      .filter(e => e.g || (!!e.p && (e.y || e.r)));

    const parseStats = c => {
      const s = {};
      (c.statistics || []).forEach(st => {
        const v = parseFloat(st.displayValue);
        if (!isNaN(v)) s[st.name] = v;
      });
      return s;
    };

    let substatus = '';
    if (sn.includes('PENALT') || sn.includes('SHOOTOUT')) substatus = 'PSO';
    else if (sn.includes('AET') || sn.includes('EXTRA')) substatus = 'AET';
    const homePen = parseInt(home.shootoutScore ?? home.penaltyAggregateScore ?? null);
    const awayPen = parseInt(away.shootoutScore ?? away.penaltyAggregateScore ?? null);
    if (!substatus && !isNaN(homePen) && !isNaN(awayPen)) substatus = 'PSO';

    found.push({
      matchId: m.id, espnId: ev.id,
      team1: m.t1, team2: m.t2, group: m.g || '',
      date: m.date,
      score1: flip ? s2 : s1, score2: flip ? s1 : s2,
      status: 'FT', substatus,
      tid1: flip ? awayId : homeId, tid2: flip ? homeId : awayId,
      penScore1: isNaN(homePen) ? null : (flip ? awayPen : homePen),
      penScore2: isNaN(awayPen) ? null : (flip ? homePen : awayPen),
      events,
      stats: {
        t1: flip ? parseStats(away) : parseStats(home),
        t2: flip ? parseStats(home) : parseStats(away),
      },
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    if (!kv) return res.json({ matches: [], asOf: null, _error: 'KV not configured' });
    try {
      const stored = await kv.get('wc2026:results') || { matches: [], asOf: null };
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.json(stored);
    } catch(e) {
      return res.json({ matches: [], asOf: null, _error: e.message });
    }
  }

  if (req.method === 'POST') {
    if (!kv) return res.status(503).json({ error: 'KV not configured — check env vars in Vercel' });
    const dates = req.body?.dates;
    if (!Array.isArray(dates) || !dates.length) {
      return res.status(400).json({ error: 'dates array required' });
    }

    let stored;
    try {
      stored = await kv.get('wc2026:results') || { matches: [] };
    } catch(e) {
      return res.status(502).json({ error: 'KV read failed', detail: e.message });
    }
    let matches = stored.matches || [];

    const results = await Promise.allSettled(
      dates.slice(0, 15).map(async ds => {
        const r = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ds}`,
          { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined }
        );
        if (!r.ok) return { found: [], unmatched: [] };
        return parseDay(await r.json());
      })
    );

    const synced = [], unmatched = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      matches = mergeResults(matches, r.value.found);
      synced.push(...r.value.found.map(m => m.matchId));
      // Only log truly unmatched group-stage matches (KO are silently skipped by design)
    }

    // Enforce group-stage only in KV — strip any KO matches that leaked in from old syncs
    matches = matches.filter(m => m.matchId <= 72);

    try {
      await kv.set('wc2026:results', { matches, asOf: new Date().toISOString(), count: matches.length });
    } catch(e) {
      return res.status(502).json({ error: 'KV write failed', detail: e.message, synced: synced.length });
    }

    return res.json({ synced: synced.length, total: matches.length, unmatched });
  }

  res.status(405).end();
}
