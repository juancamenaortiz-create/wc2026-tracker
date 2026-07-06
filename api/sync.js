// api/sync.js
// POST /api/sync  { dates: ['20260611','20260612',...] }
// Fetches ESPN for the requested dates, parses results, merges into Vercel KV.
// GET  /api/sync  returns current KV contents (for bootstrapHistory in the client).

import { Redis } from '@upstash/redis';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Redis.fromEnv() auto-detects whichever naming pattern Vercel's Upstash
// integration used: UPSTASH_REDIS_REST_URL/TOKEN, KV_REST_API_URL/TOKEN, etc.
// Wrapped in a try so a missing/archived database returns a clear error
// rather than crashing the module at cold-start time.
let kv;
try {
  kv = Redis.fromEnv();
} catch(e) {
  kv = null; // handled per-request below
}

// ── Shared data — loaded via createRequire so no assert/with import syntax needed
const SCHEDULE   = require('../data/schedule.json');   // 72 group matches
const R32_DATA   = require('../data/r32.json');        // 16 R32 matches (fallback: [])
const KO_DATA    = require('../data/ko.json');         // R16/QF/SF/Final (fallback: [])

const ALL_MATCHES = [
  ...(Array.isArray(SCHEDULE) ? SCHEDULE : []),
  ...(Array.isArray(R32_DATA) ? R32_DATA  : []),
  ...(Array.isArray(KO_DATA)  ? KO_DATA   : []),
];

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
  'New Zealand': 'New Zealand',
};

const espnToApp = n => ESPN_NAMES[n] || n || '';
const normName  = n => (n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Detect penalty-shootout kick entries (excludes in-play AET penalties like 120+5')
function isShootoutDetail(d) {
  if (d.shootout === true) return true;
  const t = ((d.type && (d.type.text || d.type.name)) || '').toLowerCase();
  if (t.includes('shootout')) return true;
  if (t.includes('penalty - scored') || t.includes('penalty - saved') || t.includes('penalty - missed')) return true;
  return false;
}

// ── ESPN parser ───────────────────────────────────────────────────────────────
function parseDay(data) {
  const found = [], unmatched = [];
  for (const ev of (data.events || [])) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const st = comp.status?.type || ev.status?.type || {};
    const sn = (st.name || '').toUpperCase();
    let status = '', substatus = '';

    if (st.completed || sn.includes('FINAL') || sn === 'STATUS_FINAL') {
      status = 'FT';
      if      (sn.includes('PENALT') || sn.includes('SHOOTOUT')) substatus = 'PSO';
      else if (sn.includes('AET')    || sn.includes('EXTRA'))    substatus = 'AET';
    } else {
      continue; // only store completed matches in KV
    }

    const cs   = comp.competitors || [];
    const home = cs.find(c => c.homeAway === 'home') || cs[0];
    const away = cs.find(c => c.homeAway === 'away') || cs[1];
    if (!home || !away) continue;

    const n1 = espnToApp(home.team?.displayName || '');
    const n2 = espnToApp(away.team?.displayName || '');
    const s1 = parseInt(home.score) || 0;
    const s2 = parseInt(away.score) || 0;

    // PSO substatus fallback: ESPN drops "Penalties" from status text on completed matches
    const homePen = parseInt(home.shootoutScore ?? home.penaltyAggregateScore ?? null);
    const awayPen = parseInt(away.shootoutScore ?? away.penaltyAggregateScore ?? null);
    if (!substatus && !isNaN(homePen) && !isNaN(awayPen)) substatus = 'PSO';

    // Find match in all match lists — try exact two-team match first
    let m = ALL_MATCHES.find(mm =>
      (normName(mm.t1)===normName(n1) && normName(mm.t2)===normName(n2)) ||
      (normName(mm.t1)===normName(n2) && normName(mm.t2)===normName(n1))
    );

    // Fallback: one-team match for KO matches with a 3rd-place slot projection
    // (our algorithm may assign the wrong 3rd-place team — if one team matches the
    // fixed slot and the other doesn't, still accept the match and use ESPN's names)
    if (!m) {
      const koWithThird = ALL_MATCHES.filter(mm =>
        /^3rd-/.test(mm.slot1 || '') || /^3rd-/.test(mm.slot2 || '')
      );
      for (const mm of koWithThird) {
        const fixedT = /^3rd-/.test(mm.slot1||'') ? mm.t2 : mm.t1;
        if (fixedT && (normName(fixedT)===normName(n1) || normName(fixedT)===normName(n2))) {
          m = mm; break;
        }
      }
    }

    if (!m) { unmatched.push(`${n1} vs ${n2}`); continue; }

    const flip   = normName(m.t1||'') === normName(n2);
    const homeId = home.team?.id || '';
    const awayId = away.team?.id || '';

    // Events: exclude PSO kicks so they don't inflate the score or appear in the timeline
    const events = (comp.details || [])
      .filter(d => !isShootoutDetail(d) && (d.scoringPlay || d.yellowCard || d.redCard ||
        ((d.type?.text || d.type?.abbreviation || '').toLowerCase().includes('sub'))))
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
      })
      .filter(e => e.g || e.sub || (!!e.p && (e.y || e.r))); // drop nameless cards

    const parseStats = c => {
      const s = {};
      (c.statistics || []).forEach(st => {
        const v = parseFloat(st.displayValue);
        if (!isNaN(v)) s[st.name] = v;
      });
      return s;
    };

    const dH  = events.filter(e=>e.g&&e.tid===homeId).length;
    const dA  = events.filter(e=>e.g&&e.tid===awayId).length;
    const fs1 = Math.max(s1, dH), fs2 = Math.max(s2, dA);

    // Use ESPN's actual team names (ground truth), not our potentially-wrong projection
    const actualT1 = flip ? n2 : n1;
    const actualT2 = flip ? n1 : n2;

    found.push({
      matchId: m.id, espnId: ev.id,
      team1: actualT1, team2: actualT2,
      group: m.g || '', round: m.round || '',
      date: m.date,
      score1: flip ? fs2 : fs1, score2: flip ? fs1 : fs2,
      status, substatus,
      tid1: flip ? awayId : homeId, tid2: flip ? homeId : awayId,
      penScore1: isNaN(homePen) ? null : (flip ? awayPen : homePen),
      penScore2: isNaN(awayPen) ? null : (flip ? homePen : awayPen),
      pso: substatus === 'PSO' ? (comp.details || [])
        .filter(isShootoutDetail)
        .map(d => ({
          name: d.athletesInvolved?.[0]?.shortName || '',
          tid:  d.team?.id || '',
          scored: !!d.scoringPlay,
        })) : [],
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

  // GET → return current KV store
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

  // POST { dates: ['20260611',...] } → sync those dates from ESPN → store in KV
  if (req.method === 'POST') {
    if (!kv) return res.status(503).json({ error: 'KV not configured — check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars in Vercel' });
    const dates = req.body?.dates;
    if (!Array.isArray(dates) || !dates.length) {
      return res.status(400).json({ error: 'dates array required' });
    }

    try {
      let stored;
      try {
        stored = await kv.get('wc2026:results') || { matches: [] };
      } catch (e) {
        return res.status(502).json({ error: 'KV read failed', detail: e.message });
      }
      let matches = stored.matches || [];

      const results = await Promise.allSettled(
        dates.slice(0, 15).map(async (ds) => {
          const r = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ds}`,
            { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined }
          );
          if (!r.ok) return { found: [], unmatched: [] };
          const data = await r.json();
          return parseDay(data);
        })
      );

      const synced = [], unmatched = [];
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        matches = mergeResults(matches, r.value.found);
        synced.push(...r.value.found.map(m => m.matchId));
        unmatched.push(...r.value.unmatched);
      }

      try {
        await kv.set('wc2026:results', {
          matches,
          asOf:  new Date().toISOString(),
          count: matches.length,
        });
      } catch (e) {
        return res.status(502).json({
          error: 'KV write failed', detail: e.message,
          synced: synced.length, total: matches.length, unmatched,
        });
      }

      return res.json({ synced: synced.length, total: matches.length, unmatched });
    } catch (e) {
      return res.status(500).json({ error: 'sync failed', detail: e.message });
    }
  }

  res.status(405).end();
}
