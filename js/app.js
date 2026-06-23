// APP.JS — Global state, fetch, routing, standings

const STATE = {
  results:     { groupMatches: [], knockoutMatches: [] },
  myTeams:     [],
  lastUpdated: null,
  lastSource:  null,   // 'ESPN' | 'Claude' | null — visible in header
  activeTab:   'today',
  isLoading:   false,
  demoMode:    false,
  bracketPicks:     {},  // matchId → team name, for bracket predictor
  espnUnmatched:    [],   // ESPN team names that couldn't be matched — surfaced as a warning
  aiPreviews:       {},   // matchId → { text, loading, error }
  nextRefreshAt:    null, // Date.now() + interval — for countdown display
  scheduleCorrections: {}, // matchId → ISO kickoff string from ESPN (overrides static SCHEDULE.time when present)
};

// ── Init ─────────────────────────────────────
// Background history bootstrap — runs once after first successful fetch
// Quietly fetches historical dates and merges FT results into local cache
async function bootstrapHistory() {
  const utcStr  = d => `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
  const cutoff  = new Date(Date.now() - 4 * 86400000);
  const start   = new Date('2026-06-11T00:00:00Z');
  const dates   = [];
  for (let d = new Date(start); d < cutoff; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(utcStr(new Date(d)));
  }
  // Sequentially fetch historical dates in background — no rush, no timeout pressure
  for (const ds of dates) {
    try {
      const ac = new AbortController();
      const t  = setTimeout(() => ac.abort(), 6000);
      const r  = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ds}`,
        { signal: ac.signal }
      ).finally(() => clearTimeout(t));
      if (!r || !r.ok) continue;
      const data = await r.json();
      // Re-use fetchFromESPN's event processing by doing a mini-parse
      for (const ev of (data.events || [])) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;
        const st = comp.status?.type || {};
        if (!st.completed) continue; // only care about FT for historical
        const cs = comp.competitors || [];
        const home = cs.find(c => c.homeAway==='home') || cs[0];
        const away = cs.find(c => c.homeAway==='away') || cs[1];
        if (!home || !away) continue;
        const n1 = espnToApp(home.team?.displayName||'');
        const n2 = espnToApp(away.team?.displayName||'');
        const m  = SCHEDULE.find(m =>
          (normName(m.t1)===normName(n1) && normName(m.t2)===normName(n2)) ||
          (normName(m.t1)===normName(n2) && normName(m.t2)===normName(n1))
        );
        if (!m || STATE.results.groupMatches.find(r => r.matchId===m.id)) continue;
        const flip = normName(m.t1)===normName(n2);
        const s1=parseInt(home.score)||0, s2=parseInt(away.score)||0;
        STATE.results.groupMatches.push({
          matchId:m.id, espnId:ev.id,
          team1:m.t1, team2:m.t2,
          score1:flip?s2:s1, score2:flip?s1:s2,
          status:'FT', substatus:'', tid1:'', tid2:'',
          events:[], stats:null,
        });
      }
      localStorage.setItem('wc2026_results', JSON.stringify({
        results: STATE.results, timestamp: new Date().toISOString()
      }));
    } catch(_) { /* silent fail for individual dates */ }
  }
  renderActiveTab(); // refresh display with newly loaded historical matches
}

// ── Static results JSON ──────────────────────────────────────────────────────
// Load /data/results.json from the server (static file committed to repo).
// Acts as historical baseline; localStorage + ESPN always override it.
async function loadStaticResults() {
  try {
    // Try KV-backed endpoint first (/api/sync GET); fall back to /data/results.json
    let data = null;
    try {
      const r = await fetch('/api/sync');
      if (r.ok) data = await r.json();
    } catch(e) {}
    if (!data || !data.matches) {
      const r2 = await fetch('/data/results.json');
      if (r2.ok) data = await r2.json();
    }
    const matches = (data && data.matches) || [];
    if (!matches.length) return;
    // KV only ever holds fully-completed matches (2+ days old) — it's the canonical
    // synced source for those matchIds, so it should always win over a possibly-stale
    // local cache. (Recent/live matches aren't in KV, so localStorage entries for those
    // are untouched by this merge — only matching matchIds get overwritten.)
    STATE.results.groupMatches = mergeResults(STATE.results.groupMatches, matches);
    // Persist the corrected merge immediately so a stale local cache can't shadow it again
    try {
      localStorage.setItem('wc2026_results', JSON.stringify({
        results: STATE.results,
        timestamp: STATE.lastUpdated ? STATE.lastUpdated.toISOString() : new Date().toISOString(),
      }));
    } catch(e) {}
    renderActiveTab();
    console.log('[KV] Loaded ' + matches.length + ' historical matches (KV takes precedence)');
  } catch(e) { /* KV unavailable — continue without historical data */ }
}

// Async init chain: static JSON → ESPN (if stale)
async function _initAsync() {
  await loadStaticResults();
  const cacheAge = STATE.lastUpdated ? (Date.now() - STATE.lastUpdated.getTime()) : Infinity;
  if (cacheAge > 5 * 60 * 1000) {
    fetchScores();
  } else {
    scheduleNextRefresh();
  }
}

// ── Sync older games (called from Settings) ───────────────────────────────────
// Fetches ESPN for every tournament day older than 2 days, one day at a time.
// Shows live progress in the settings modal. After sync, user can download JSON.
async function syncHistory() {
  const btn  = document.getElementById('sync-history-btn');
  const prog = document.getElementById('sync-progress');
  const dlBtn= document.getElementById('export-json-btn');
  if (btn)  btn.disabled = true;
  if (prog) { prog.style.display = ''; prog.innerHTML = 'Syncing…'; }
  if (dlBtn) dlBtn.style.display = 'none';

  const utcStr  = d => `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
  const start   = new Date('2026-06-11T00:00:00Z');
  const cutoff  = new Date(Date.now() - 2 * 86400000);
  const dates   = [];
  for (let d = new Date(start); d <= cutoff; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(utcStr(new Date(d)));
  }

  if (!dates.length) {
    if (prog) prog.innerHTML = '\u2705 Nothing to sync yet.';
    if (btn)  btn.disabled = false;
    return;
  }

  try {
    if (prog) prog.innerHTML = '\uD83D\uDCE1 Sending dates to server…';
    // POST all dates to /api/sync — server fetches ESPN, merges into KV, returns results
    const r = await fetch('/api/sync', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dates }),
    });
    if (!r.ok) throw new Error('Server returned ' + r.status);
    const result = await r.json();

    // Reload KV data into the app
    await loadStaticResults();

    if (prog) prog.innerHTML = '\u2705 Done! Synced ' + result.synced + ' matches ('
      + result.total + ' total). All users now see this data automatically.';
    if (dlBtn) dlBtn.style.display = ''; // still offer JSON download as backup
  } catch(e) {
    // Fallback: client-side ESPN fetch (same as before KV)
    if (prog) prog.innerHTML = '\u26A0\uFE0F Server sync failed, trying direct…';
    let totalMatches = 0;
    for (let i = 0; i < dates.length; i++) {
      const ds = dates[i];
      if (prog) prog.innerHTML = '\uD83D\uDCE1 Fetching ' + ds.slice(0,4)+'-'+ds.slice(4,6)+'-'+ds.slice(6) + ' (' + (i+1) + '/' + dates.length + ')…';
      try {
        const fresh = await fetchFromESPN(new Set([ds]));
        if (fresh.groupMatches.length) {
          STATE.results.groupMatches = mergeResults(STATE.results.groupMatches, fresh.groupMatches);
          totalMatches += fresh.groupMatches.length;
          renderActiveTab();
        }
      } catch(_) {}
      await new Promise(res => setTimeout(res, 300));
    }
    try { localStorage.setItem('wc2026_results', JSON.stringify({ results: STATE.results, timestamp: new Date().toISOString() })); } catch(_) {}
    if (prog) prog.innerHTML = '\u2705 Done (local only)! Found ' + totalMatches + ' matches.';
    if (dlBtn) dlBtn.style.display = '';
  }

  if (btn) btn.disabled = false;
}

// ── Export results.json (called from Settings after sync) ─────────────────────
// Generates a JSON file the user can save to /data/results.json in the repo.
// Committing that file gives every new visitor instant historical data.
function exportResults() {
  const ftMatches = STATE.results.groupMatches.filter(function(m) { return m.status === 'FT'; });
  const out = {
    asOf: new Date().toISOString().split('T')[0],
    _note: 'Static cache of completed WC2026 group-stage matches. Commit to /data/results.json.',
    matches: ftMatches,
  };
  const json = JSON.stringify(out, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'results.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function init() {
  try { STATE.myTeams = JSON.parse(localStorage.getItem('wc2026_myteams') || '[]'); } catch(e) { STATE.myTeams = []; }
  loadPreviewCache();
  try {
    const cached = JSON.parse(localStorage.getItem('wc2026_results') || 'null');
    if (cached && cached.results) { STATE.results = cached.results; STATE.lastUpdated = cached.timestamp ? new Date(cached.timestamp) : null; }
  } catch(e) {}
  updateStatusUI();
  navigateTo('today');
  initTimezone();

  // Load static JSON first (fills historical gaps), then fetch live ESPN data
  _initAsync();

  // Re-check on tab focus — fetch if stale
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isMatchDay()) {
      const age = STATE.lastUpdated ? (Date.now() - STATE.lastUpdated.getTime()) : Infinity;
      if (age > getRefreshInterval()) {
        if (_refreshTimer) clearTimeout(_refreshTimer);
        fetchScores();
      }
    }
  });
}

// ── Adaptive refresh ──────────────────────────────────────────────────────
// 1 min on match days via ESPN (free), 60 min if ESPN is down and Claude kicks in.
// Non-match days: 30 min (no live games to track).
let _refreshTimer = null;

function hasActiveMatches() {
  // Returns true when there's a LIVE match or an overdue match (kickoff passed, no score yet)
  if ((STATE.results.groupMatches||[]).some(m => m.status === 'LIVE')) return true;
  if ((STATE.results.knockoutMatches||[]).some(m => m.status === 'LIVE')) return true;
  const now = Date.now(), today = getTodayCT();
  return SCHEDULE.some(m => {
    if (m.date !== today) return false;
    const msOver = now - parseGameTimeCT(m.date, m.time).getTime();
    if (msOver < 300000) return false; // less than 5 min past kickoff
    return !(STATE.results.groupMatches||[]).some(r =>
      normName(r.team1) === normName(m.t1) && normName(r.team2) === normName(m.t2)
    );
  });
}

function getRefreshInterval() {
  if (!isMatchDay()) return 30 * 60 * 1000;
  if (STATE.lastSource === 'Claude') return 60 * 60 * 1000;
  return hasActiveMatches() ? 30 * 1000 : 60 * 1000; // 30s during live/overdue matches
}

let _countdownTicker = null;
function startCountdownTicker() {
  if (_countdownTicker) clearInterval(_countdownTicker);
  _countdownTicker = setInterval(() => {
    if (!STATE.nextRefreshAt) return;
    const secs = Math.max(0, Math.ceil((STATE.nextRefreshAt - Date.now()) / 1000));
    const secsStr = secs === 0 ? '…' : `${secs}s`;
    // Update countdown in header status
    const hdr = document.getElementById('refresh-countdown');
    if (hdr) hdr.textContent = secsStr;
    // Update countdown on all overdue cards
    document.querySelectorAll('.overdue-secs').forEach(el => { el.textContent = secsStr; });
  }, 1000);
}

function scheduleNextRefresh() {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  const interval = getRefreshInterval();
  STATE.nextRefreshAt = Date.now() + interval;
  _refreshTimer = setTimeout(() => {
    STATE.nextRefreshAt = null;
    if (!document.hidden && isMatchDay()) fetchScores();
    else scheduleNextRefresh(); // reschedule without fetching if tab is hidden
  }, interval);
  startCountdownTicker(); // keep the countdown display live
}

// ── ESPN free scores (primary source — $0) ────────────────────────────────
// Maps ESPN's team display names to our internal names where they differ.
const ESPN_NAMES = {
  // North America
  "United States":              "USA",
  "United States of America":   "USA",
  // Asia
  "Korea Republic":             "South Korea",
  "Republic of Korea":          "South Korea",
  "IR Iran":                    "Iran",
  "Islamic Republic of Iran":   "Iran",
  // Europe
  "Bosnia-Herzegovina":         "Bosnia & Herzegovina",
  "Bosnia and Herzegovina":     "Bosnia & Herzegovina",
  "Turkey":                     "Türkiye",
  "Turkiye":                    "Türkiye",   // ESPN sometimes omits the ü
  "Czech Republic":             "Czechia",
  // Africa / Caribbean
  "Côte d'Ivoire":              "Ivory Coast",
  "Ivory Coast":                "Ivory Coast",
  "Cabo Verde":                 "Cape Verde",     // ESPN uses Cabo Verde
  "Cape Verde Islands":         "Cape Verde",
  "DR Congo":                   "Congo DR",
  "Congo, DR":                  "Congo DR",
  "Democratic Republic of Congo": "Congo DR",
  "Republic of Congo":          "Congo DR",
  // Oceania / Other
  "Curacao":                    "Curaçao",
  "Curaçao":                    "Curaçao",
  "New Zealand":                "New Zealand",
  "Republic of Ireland":        "Ireland",
};
function espnToApp(n) { return ESPN_NAMES[n] || n || ''; }

async function fetchFromESPN(overrideDates) {
  const found = [];
  const unmatched = []; // collect any ESPN teams we can't match
  const utcStr = d => `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;

  // If called from syncHistory, use the provided date(s); otherwise build the recent window
  const datesToQuery = overrideDates || (() => {
    const s = new Set();
    for (let back = 0; back <= 3; back++) s.add(utcStr(new Date(Date.now() - back * 86400000)));
    s.add(utcStr(new Date(Date.now() + 86400000))); // tomorrow UTC
    return s;
  })();

  for (const ds of datesToQuery) {
    try {
      const ac = new AbortController();
      const t  = setTimeout(() => ac.abort(), 6000);
      const r  = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ds}`,
        { signal: ac.signal }
      ).finally(() => clearTimeout(t));
      if (!r || !r.ok) continue;
      const data = await r.json().catch(() => null);
      if (!data) continue;
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
        } else if (sn.includes('SHOOTOUT') || (sn.includes('PENALT') && !sn.includes('KICK'))) {
          status = 'LIVE'; substatus = 'PSO';
        } else if (sn.includes('EXTRA') || sn.includes('OVERTIME')) {
          status = 'LIVE'; substatus = 'ET';
        } else if (sn.includes('HALF') || sn.includes('PROGRESS')) {
          // STATUS_FIRST_HALF, STATUS_SECOND_HALF, STATUS_IN_PROGRESS → all LIVE
          // Only STATUS_HALFTIME (exact break between halves) gets HT badge
          if (sn === 'STATUS_HALFTIME') substatus = 'HT';
          status = 'LIVE';
        } else {
          // Not started yet — still capture ESPN's authoritative kickoff time so we can
          // correct any wrong/stale time in the hand-typed SCHEDULE data. ESPN's comp.date
          // is the same field broadcasters and ticket vendors pull from, so it's far more
          // reliable than a manually-typed schedule that can drift from late FIFA changes.
          const isoDate = comp.date || ev.date;
          if (isoDate) {
            const cs2 = comp.competitors || [];
            const h2 = cs2.find(c => c.homeAway === 'home') || cs2[0];
            const a2 = cs2.find(c => c.homeAway === 'away') || cs2[1];
            if (h2 && a2) {
              const nn1 = espnToApp(h2.team?.displayName || '');
              const nn2 = espnToApp(a2.team?.displayName || '');
              const sm = SCHEDULE.find(sm =>
                (normName(sm.t1)===normName(nn1) && normName(sm.t2)===normName(nn2)) ||
                (normName(sm.t1)===normName(nn2) && normName(sm.t2)===normName(nn1))
              );
              if (sm) STATE.scheduleCorrections[sm.id] = isoDate;
            }
          }
          continue; // no score/events to parse for a match that hasn't started
        }
        const cs = comp.competitors || [];
        const home = cs.find(c => c.homeAway === 'home') || cs[0];
        const away = cs.find(c => c.homeAway === 'away') || cs[1];
        if (!home || !away) continue;
        const n1 = espnToApp(home.team?.displayName || '');
        const n2 = espnToApp(away.team?.displayName || '');
        const s1 = parseInt(home.score) || 0;
        const s2 = parseInt(away.score) || 0;
        const m = SCHEDULE.find(m =>
          (normName(m.t1)===normName(n1) && normName(m.t2)===normName(n2)) ||
          (normName(m.t1)===normName(n2) && normName(m.t2)===normName(n1))
        );
        if (!m) {
          // Team name not in SCHEDULE — log it so it's visible
          const label = `${n1} vs ${n2}`;
          if (!unmatched.includes(label)) unmatched.push(label);
          continue;
        }
        const flip = normName(m.t1) === normName(n2);
        // Extract events (goals + cards) and live clock from ESPN
        const homeId = home.team?.id || '';
        const awayId = away.team?.id || '';
        const events = (comp.details || [])
          .filter(d => {
            if (d.scoringPlay || d.yellowCard || d.redCard) return true;
            // Capture substitution events (type text = "Substitution")
            const t = (d.type?.text || d.type?.abbreviation || '').toLowerCase();
            return t.includes('sub') || t === 's';
          })
          .map(d => {
            const isSub = !d.scoringPlay && !d.yellowCard && !d.redCard;
            return {
              min: d.clock?.displayValue || '',
              tid: d.team?.id || '',
              p:   d.athletesInvolved?.[0]?.shortName || '',   // scorer / player going off
              pIn: isSub ? (d.athletesInvolved?.[1]?.shortName || '') : '', // player coming on
              g:   !!(d.scoringPlay),
              y:   !!(d.yellowCard),
              r:   !!(d.redCard),
              sub: isSub,
              og:  !!(d.ownGoal),
              pk:  !!(d.penaltyKick || d.scoringType?.abbreviation === 'PK' ||
                      d.type?.text?.toLowerCase().includes('penalty')),
            };
          });
        // Extract per-team match statistics
        const parseStats = (competitor) => {
          const s = {};
          (competitor.statistics || []).forEach(st => {
            const v = parseFloat(st.displayValue);
            if (!isNaN(v)) s[st.name] = v;
          });
          return s;
        };
        const homeStats = parseStats(home);
        const awayStats = parseStats(away);
        // Penalty shootout scores (ESPN uses shootoutScore on the competitor)
        const homePen = parseInt(home.shootoutScore ?? home.penaltyAggregateScore ?? null);
        const awayPen = parseInt(away.shootoutScore ?? away.penaltyAggregateScore ?? null);
        // Score lag fix: derive score from events in case ESPN's counter lags behind.
        // NOTE: ESPN's event "team" field is already the BENEFITING team for own goals
        // (i.e. tid already points to whoever's score the OG counts toward) — no extra flip needed.
        const derivedHome = events.filter(e=>e.g&&e.tid===homeId).length;
        const derivedAway = events.filter(e=>e.g&&e.tid===awayId).length;
        const fs1 = Math.max(s1, derivedHome);
        const fs2 = Math.max(s2, derivedAway);
        found.push({ matchId:m.id, team1:m.t1, team2:m.t2, espnId:ev.id,
          score1: flip ? fs2 : fs1, score2: flip ? fs1 : fs2,
          status, substatus, group:m.g, date:m.date,
          clock:  comp.status?.displayClock || '',
          events,
          tid1: flip ? awayId : homeId,
          tid2: flip ? homeId : awayId,
          penScore1: isNaN(homePen) ? null : (flip ? awayPen : homePen),
          penScore2: isNaN(awayPen) ? null : (flip ? homePen : awayPen),
          stats: {
            t1: flip ? awayStats : homeStats,
            t2: flip ? homeStats : awayStats,
          },
        });
      }
    } catch(_) { /* skip date */ }
  }
  // Return what we found — empty list is valid on non-match days
  return { groupMatches: found, knockoutMatches: [], unmatched };
}

// Merge fresh results into cached ones (keeps history, updates changed scores)
function mergeResults(cached, fresh) {
  const out = [...cached];
  for (const r of fresh) {
    const i = out.findIndex(x => x.matchId === r.matchId);
    if (i >= 0) out[i] = r; else out.push(r);
  }
  return out;
}

// ── Fetch ─────────────────────────────────────────────────────────────────
async function fetchScores() {
  if (STATE.isLoading || STATE.demoMode) return;
  STATE.isLoading = true;
  setRefreshUI(true);

  try {
    let fresh;
    let source = 'ESPN';
    try {
      fresh = await fetchFromESPN();
    } catch(espnErr) {
      // ESPN failed — fall back to Claude Haiku (cheap, ~$0.01/call)
      source = 'Claude';
      console.warn('ESPN failed, using Claude fallback:', espnErr.message);
      const resp = await fetch('/api/scores', { method: 'POST' });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const data = await resp.json();
      if (data._error) console.warn('API warning:', data._error);
      if (!Array.isArray(data.groupMatches)) throw new Error('Bad API response');
      fresh = data;
    }

    // Fire notifications before merging (need old state vs new state)

    // Merge fresh data into existing cache so history isn't lost
    const merged = mergeResults(STATE.results.groupMatches, fresh.groupMatches);
    STATE.results       = { groupMatches: merged, knockoutMatches: fresh.knockoutMatches || [] };
    STATE.lastUpdated   = new Date();
    STATE.lastSource    = source;
    STATE.espnUnmatched = fresh.unmatched || [];
    if (STATE.espnUnmatched.length) console.warn('ESPN teams not matched:', STATE.espnUnmatched);
    localStorage.setItem('wc2026_results', JSON.stringify({
      results: STATE.results,
      timestamp: STATE.lastUpdated.toISOString(),
    }));
    // One-time background bootstrap: fetch historical dates for new devices
    // Runs after initial render so it doesn't block the app loading
    if (!localStorage.getItem('wc2026_bootstrapped')) {
      localStorage.setItem('wc2026_bootstrapped', '1');
      bootstrapHistory().catch(() => {}); // fire-and-forget
    }
    console.log(`Scores updated via ${source}: ${merged.filter(m=>m.status==='FT').length} FT, ${merged.filter(m=>m.status==='LIVE').length} LIVE`);
    updateStatusUI();

  } catch(err) {
    console.error('fetchScores:', err.message);
    setStatusError(err.message);
    showToast('Could not refresh scores. Using cached data.');
  } finally {
    STATE.isLoading = false;
    setRefreshUI(false);
    renderActiveTab(); // always re-render so Loading spinner clears even on errors
    scheduleNextRefresh();
  }
}

function setRefreshUI(loading) {
  const btn = document.getElementById('refresh-btn');
  const msg = document.getElementById('status-msg');
  if (btn) {
    btn.disabled = loading;
    btn.textContent = loading ? '\u21BB' : '\u21BB';
    btn.classList.toggle('spinning', loading);
  }
  if (msg) {
    msg.classList.toggle('loading', loading);
    if (loading) msg.textContent = '\u27F3 Fetching scores\u2026';
  }
}

function setStatusError(errMsg) {
  const msg = document.getElementById('status-msg');
  if (msg) { msg.classList.add('error'); msg.textContent = `\u26A0 ${errMsg}`; }
}

function updateStatusUI() {
  const msg = document.getElementById('status-msg');
  if (!msg) return;
  msg.classList.remove('loading', 'error');
  if (STATE.demoMode) { msg.innerHTML = '🎭 Demo Mode'; return; }
  if (STATE.lastUpdated) {
    const time = STATE.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const src  = STATE.lastSource;
    const srcBadge = src === 'Claude'
      ? `<span class="src-badge src-claude" title="ESPN unavailable — using Claude API">Claude ⚠</span>`
      : src === 'ESPN'
      ? `<span class="src-badge src-espn" title="Live data from ESPN (free)">ESPN ✓</span>`
      : '';
    const unmatched = STATE.espnUnmatched || [];
    const warnBadge = unmatched.length
      ? `<span class="src-badge src-warn" title="ESPN returned unknown team names — tap ⚙ to see details">⚠ ${unmatched.length} unknown</span>`
      : '';
    msg.innerHTML = `Updated ${time} ${srcBadge}${warnBadge}`;
  } else {
    msg.innerHTML = 'Not yet refreshed';
  }
}

// ── Tab Navigation ────────────────────────────
function navigateTo(tab) {
  STATE.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'schedule' && typeof SCHEDULE_STATE !== 'undefined') {
    SCHEDULE_STATE.scrollToToday = true; // fresh tab open — jump to today's matches
  }
  renderActiveTab();
}

function renderActiveTab() {
  const content = document.getElementById('tab-content');
  if (!content) return;

  if (STATE.demoMode) {
    content.innerHTML = `
      <div class="demo-banner">
        <span>🎭 Demo Mode &mdash; fake results loaded for testing</span>
        <button class="demo-exit-btn" onclick="clearDemoData()">Exit Demo</button>
      </div>
      <div id="tab-inner"></div>`;
    renderTab(document.getElementById('tab-inner'));
  } else {
    renderTab(content);
  }
}

function renderTab(el) {
  switch(STATE.activeTab) {
    case 'today':    renderToday(el);    break;
    case 'schedule': renderSchedule(el); break;
    case 'groups':   renderGroups(el);   break;
    case 'bracket':  renderBracket(el);  break;
    case 'analyzer': renderAnalyzer(el); break;
  }
}

// ── Standings Calculator ──────────────────────
function calculateStandings(group, overrides = {}) {
  const teams = GROUP_TEAMS[group];
  const stats = {};
  teams.forEach(t => { stats[normName(t)] = { name:t, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, Pts:0 }; });

  const playedMatches = [];
  SCHEDULE.filter(m => m.g === group).forEach(match => {
    const key = `${match.id}`;
    const ov  = overrides[key];
    const t1k = normName(match.t1), t2k = normName(match.t2);

    if (ov) {
      let s1 = 0, s2 = 0;
      if (ov === 'home') { s1 = 1; } else if (ov === 'away') { s2 = 1; }
      if (stats[t1k]) { stats[t1k].P++; stats[t1k].GF += s1; stats[t1k].GA += s2; }
      if (stats[t2k]) { stats[t2k].P++; stats[t2k].GF += s2; stats[t2k].GA += s1; }
      if (s1 > s2) {
        if (stats[t1k]) { stats[t1k].W++; stats[t1k].Pts += 3; }
        if (stats[t2k])   stats[t2k].L++;
      } else if (s1 < s2) {
        if (stats[t2k]) { stats[t2k].W++; stats[t2k].Pts += 3; }
        if (stats[t1k])   stats[t1k].L++;
      } else {
        if (stats[t1k]) { stats[t1k].D++; stats[t1k].Pts++; }
        if (stats[t2k]) { stats[t2k].D++; stats[t2k].Pts++; }
      }
      playedMatches.push({ t1: match.t1, t2: match.t2, s1, s2 });
      return;
    }

    const fetched = STATE.results.groupMatches.find(fm =>
      normName(fm.team1) === normName(match.t1) && normName(fm.team2) === normName(match.t2) &&
      (fm.status === 'FT' || fm.status === 'LIVE')
    );
    if (fetched) {
      const s1 = parseInt(fetched.score1)||0, s2 = parseInt(fetched.score2)||0;
      if (stats[t1k]) { stats[t1k].P++; stats[t1k].GF += s1; stats[t1k].GA += s2; }
      if (stats[t2k]) { stats[t2k].P++; stats[t2k].GF += s2; stats[t2k].GA += s1; }
      if (s1 > s2) {
        if (stats[t1k]) { stats[t1k].W++; stats[t1k].Pts += 3; }
        if (stats[t2k])   stats[t2k].L++;
      } else if (s1 < s2) {
        if (stats[t2k]) { stats[t2k].W++; stats[t2k].Pts += 3; }
        if (stats[t1k])   stats[t1k].L++;
      } else {
        if (stats[t1k]) { stats[t1k].D++; stats[t1k].Pts++; }
        if (stats[t2k]) { stats[t2k].D++; stats[t2k].Pts++; }
      }
      playedMatches.push({ t1: match.t1, t2: match.t2, s1, s2 });
    }
  });

  Object.values(stats).forEach(s => { s.GD = s.GF - s.GA; });
  return fifaSort(Object.values(stats), playedMatches);
}

// FIFA 2026 tiebreakers: Pts → GD → GF → H2H Pts → H2H GD → H2H GF → alphabetical
function fifaSort(rows, matches) {
  rows.sort((a, b) => b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF);
  const result = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length &&
           rows[j].Pts === rows[i].Pts &&
           rows[j].GD  === rows[i].GD  &&
           rows[j].GF  === rows[i].GF)  j++;
    if (j - i === 1) {
      result.push(rows[i]);
    } else {
      result.push(...applyH2H(rows.slice(i, j), matches));
    }
    i = j;
  }
  return result;
}
function applyH2H(teams, matches) {
  const keys = new Set(teams.map(t => normName(t.name)));
  const h2h  = {};
  teams.forEach(t => { h2h[normName(t.name)] = { Pts:0, GD:0, GF:0 }; });
  matches.forEach(m => {
    const k1 = normName(m.t1), k2 = normName(m.t2);
    if (!keys.has(k1) || !keys.has(k2)) return;
    h2h[k1].GF += m.s1; h2h[k1].GD += m.s1 - m.s2;
    h2h[k2].GF += m.s2; h2h[k2].GD += m.s2 - m.s1;
    if (m.s1 > m.s2) h2h[k1].Pts += 3;
    else if (m.s2 > m.s1) h2h[k2].Pts += 3;
    else { h2h[k1].Pts++; h2h[k2].Pts++; }
  });
  const vals = teams.map(t => h2h[normName(t.name)]);
  const allSame = vals.every(v => v.Pts===vals[0].Pts && v.GD===vals[0].GD && v.GF===vals[0].GF);
  if (allSame) return [...teams].sort((a,b) => a.name.localeCompare(b.name));
  return [...teams].sort((a,b) => {
    const ha = h2h[normName(a.name)], hb = h2h[normName(b.name)];
    return hb.Pts-ha.Pts || hb.GD-ha.GD || hb.GF-ha.GF || a.name.localeCompare(b.name);
  });
}

function getMatchResult(match) {
  return STATE.results.groupMatches.find(fm =>
    normName(fm.team1) === normName(match.t1) && normName(fm.team2) === normName(match.t2)
  ) || null;
}
function getKnockoutResult(matchId) {
  return STATE.results.knockoutMatches.find(m => m.matchId === matchId) || null;
}
// Unified lookup: R32 (73-88) live in groupMatches, R16+ in knockoutMatches
function getAnyMatchResult(matchId) {
  if (!matchId) return null;
  if (matchId <= 88) return STATE.results.groupMatches.find(m => m.matchId === matchId) || null;
  return STATE.results.knockoutMatches.find(m => m.matchId === matchId) || null;
}

// ── Time Helpers ──────────────────────────────
function getTodayCT() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
}
function parseGameTimeCT(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return new Date(dateStr);
  let h = parseInt(m[1]); const min = parseInt(m[2]), ampm = m[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return new Date(Date.UTC(year, month-1, day, h+5, min));
}

// ── Timezone preferences ───────────────────────────────────────────────────
const PREFS = { timezone: null }; // null = browser auto-detect

const TIMEZONE_OPTIONS = [
  { value:'auto',                           label:'Auto-detect' },
  { value:'America/New_York',               label:'New York (ET)',       region:'Americas' },
  { value:'America/Chicago',                label:'Chicago (CT)',        region:'Americas' },
  { value:'America/Denver',                 label:'Denver (MT)',         region:'Americas' },
  { value:'America/Los_Angeles',            label:'Los Angeles (PT)',    region:'Americas' },
  { value:'America/Mexico_City',            label:'Mexico City',         region:'Americas' },
  { value:'America/Bogota',                 label:'Bogotá / Lima',       region:'Americas' },
  { value:'America/Sao_Paulo',              label:'São Paulo',           region:'Americas' },
  { value:'America/Argentina/Buenos_Aires', label:'Buenos Aires',        region:'Americas' },
  { value:'Europe/London',                  label:'London',              region:'Europe'   },
  { value:'Europe/Madrid',                  label:'Madrid / Paris',      region:'Europe'   },
  { value:'Europe/Berlin',                  label:'Berlin / Amsterdam',  region:'Europe'   },
  { value:'Europe/Istanbul',                label:'Istanbul',            region:'Europe'   },
  { value:'Africa/Lagos',                   label:'Lagos / Accra',       region:'Africa'   },
  { value:'Africa/Johannesburg',            label:'Johannesburg',        region:'Africa'   },
  { value:'Asia/Dubai',                     label:'Dubai (GST)',         region:'Asia'     },
  { value:'Asia/Karachi',                   label:'Karachi',             region:'Asia'     },
  { value:'Asia/Kolkata',                   label:'Mumbai / Delhi',      region:'Asia'     },
  { value:'Asia/Tokyo',                     label:'Seoul / Tokyo',       region:'Asia'     },
  { value:'Australia/Sydney',               label:'Sydney',              region:'Pacific'  },
];

function getEffectiveTZ() {
  return PREFS.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getTZAbbr() {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: getEffectiveTZ(), timeZoneName: 'short',
    }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || '';
  } catch(e) { return ''; }
}

// Convert a CT match time to display string in the user's timezone
function formatGameTime(dateStr, timeStr) {
  if (!timeStr || timeStr === 'TBD') return timeStr || '';
  try {
    const utc = parseGameTimeCT(dateStr, timeStr);
    if (!utc || isNaN(utc.getTime())) return timeStr;
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit',
      timeZone: getEffectiveTZ(), hour12: true,
    }).format(utc);
  } catch(e) { return timeStr; }
}

function updateTZLabel() {
  const abbr = getTZAbbr();
  const hdr = document.getElementById('tz-label');
  if (hdr) hdr.textContent = `All times ${abbr}`;
  const det = document.getElementById('setting-tz-detail');
  if (det) det.textContent = PREFS.timezone
    ? PREFS.timezone.split('/').pop().replace(/_/g,' ')
    : `Auto-detected (${abbr})`;
  const sel = document.getElementById('tz-select');
  if (sel) sel.value = PREFS.timezone || 'auto';
}

function setTimezone(value) {
  PREFS.timezone = (value === 'auto') ? null : value;
  localStorage.setItem('wc2026_tz', value || 'auto');
  updateTZLabel();
  renderActiveTab();
  closeSettings();
}

function initTimezone() {
  const saved = localStorage.getItem('wc2026_tz');
  if (saved && saved !== 'auto') {
    PREFS.timezone = saved;
  } else if (!saved) {
    // First open — show a one-time toast if the browser isn't in CT
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== 'America/Chicago') {
      setTimeout(() => showToast(`Times shown in your local timezone (${getTZAbbr()})`), 2000);
    }
  }
  updateTZLabel();
}
function formatCountdown(ms) {
  const totalMin = Math.floor(ms / 60000), h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `Kicks off in ${h}h ${m}m` : `Kicks off in ${m}m`;
}
function formatDate(dateStr) {
  const [y,mo,d] = dateStr.split('-').map(Number);
  return new Date(y, mo-1, d).toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });
}

// Returns the best-known kickoff time string for a scheduled match (e.g. "7:30 PM").
// Prefers ESPN's live-fetched kickoff (STATE.scheduleCorrections), since that reflects
// any last-minute FIFA/broadcast changes; falls back to the static SCHEDULE.time string
// (hand-typed at build time) when ESPN data for that match hasn't been fetched yet.
function getMatchTime(sched) {
  const iso = STATE.scheduleCorrections[sched.id];
  if (!iso) return sched.time;
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago',
    });
  } catch(e) { return sched.time; }
}

// ── My Teams ──────────────────────────────────
function toggleMyTeam(team) {
  const idx = STATE.myTeams.findIndex(t => normName(t) === normName(team));
  if (idx >= 0) { STATE.myTeams.splice(idx, 1); }
  else {
    if (STATE.myTeams.length >= 10) { showToast('Max 10 teams. Remove one first.'); return false; }
    STATE.myTeams.push(team);
  }
  localStorage.setItem('wc2026_myteams', JSON.stringify(STATE.myTeams));
  return true;
}
function isMyTeam(team) { return STATE.myTeams.some(t => normName(t) === normName(team)); }
function starBtn(team, onToggle) {
  const btn = document.createElement('button');
  btn.className = 'star-btn' + (isMyTeam(team) ? ' starred' : '');
  btn.innerHTML = '&#9733;';
  btn.title = isMyTeam(team) ? 'Unpin team' : 'Pin team';
  btn.onclick = e => {
    e.stopPropagation();
    toggleMyTeam(team);
    btn.classList.toggle('starred', isMyTeam(team));
    btn.title = isMyTeam(team) ? 'Unpin team' : 'Pin team';
    if (onToggle) onToggle();
  };
  return btn;
}

// ── Demo Mode ─────────────────────────────────
// ── AI Match Preview ─────────────────────────────────────────────────────
function loadPreviewCache() {
  try {
    const cached = JSON.parse(localStorage.getItem('wc2026_previews') || '{}');
    const today  = getTodayCT();
    // Evict previews for past match days
    const fresh  = {};
    Object.entries(cached).forEach(([id, entry]) => { if (entry.matchDate >= today) fresh[id] = entry; });
    STATE.aiPreviews = fresh;
    localStorage.setItem('wc2026_previews', JSON.stringify(fresh));
  } catch(e) { STATE.aiPreviews = {}; }
}
function savePreviewCache(matchId, entry, matchDate) {
  try {
    const cached = JSON.parse(localStorage.getItem('wc2026_previews') || '{}');
    cached[matchId] = { ...entry, matchDate };
    localStorage.setItem('wc2026_previews', JSON.stringify(cached));
  } catch(e) {}
}

async function fetchMatchPreview(matchId) {
  const match = SCHEDULE.find(m => m.id === matchId)
             || R32_MATCHES.find(m => m.id === matchId);
  if (!match) return;

  // Already fetched or loading — skip
  const existing = STATE.aiPreviews[matchId];
  if (existing?.data || existing?.text || existing?.loading) return;

  STATE.aiPreviews[matchId] = { loading: true };
  renderActiveTab();

  try {
    // Build a compact group standings snapshot to give the AI context it would
    // otherwise need 2-3 web searches to find. This cuts ~15s off the preview time.
    const groupStandings = (() => {
      try {
        const rows = calculateStandings(match.g, STATE.results.groupMatches);
        return rows.map(r => `${r.rank}. ${r.team} — ${r.w}W ${r.d}D ${r.l}L ${r.gf}:${r.ga} (${r.pts} pts)`).join('\n');
      } catch(e) { return ''; }
    })();

    const resp = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team1: match.t1 || match.slot1 || '',
        team2: match.t2 || match.slot2 || '',
        group: match.g || '',
        city:  match.city || '',
        date:  match.date || '',
        groupStandings, // current table so AI doesn't need to search for it
      }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const respData = await resp.json();
    const entry = respData.data
      ? { data: respData.data }
      : respData.text
        ? { text: respData.text }
        : { error: respData.error || 'Preview unavailable' };
    STATE.aiPreviews[matchId] = entry;
    if (entry.data || entry.text) savePreviewCache(matchId, entry, match.date);
  } catch(err) {
    STATE.aiPreviews[matchId] = { error: 'Could not load preview' };
  }
  renderActiveTab();
}

function loadDemoData() {
  STATE.results  = JSON.parse(JSON.stringify(DEMO_RESULTS));
  STATE.demoMode = true;
  STATE.lastUpdated = new Date();
  // Pre-populate a canned AI preview for Australia vs Türkiye (match 8, Jun 13)
  STATE.aiPreviews = {
    8: { data: {
      team1: { name:"Australia", ranking:24, role:"The Underdogs",
        form:"The Socceroos arrive at BC Place on the back of a resilient qualification campaign, led by manager Tony Popovic. They'll rely on their compact defensive shape and fast counter-attacks to trouble a technically superior Türkiye side.",
        tactics:"Low-to-mid block with quick transitions — look for long balls to Leckie behind the Turkish backline.",
        players:[{name:"Mathew Leckie",reason:"Explosive pace in behind; WC goal-scorer with big-moment experience."},{name:"Mathew Ryan",reason:"Crucial goalkeeper — his shot-stopping was key throughout qualification."}],
        history:"Five World Cup appearances. Best finish: Round of 16 in Germany 2006 and Qatar 2022, their most celebrated tournament run." },
      team2: { name:"Türkiye", ranking:26, role:"The Contenders",
        form:"Türkiye arrive in Vancouver with momentum, powered by a golden generation featuring Arda Güler's breakout season at Real Madrid. Manager Vincenzo Montella has built a tactically flexible side that blends European-based talent with physical intensity.",
        tactics:"High press in the first 20 minutes, then possession-based build-up through Güler and Çalhanoğlu. Will look to exploit wide areas.",
        players:[{name:"Arda Güler",reason:"Real Madrid's 19-year-old star brings elite creativity and is capable of decisive moments from nowhere."},{name:"Hakan Çalhanoğlu",reason:"Inter Milan's deep-lying playmaker dictates tempo and is deadly from distance."}],
        history:"Three World Cup appearances. Best finish: 3rd place in 2002 Korea/Japan — Türkiye's finest tournament, featuring Hakan Şükür's famous fastest-ever WC goal." },
      context:"Both nations have genuine knockout ambitions in Group D. This match could define who controls their own destiny heading into the final group round — a win here dramatically simplifies the path forward."
    }},
  };
  updateStatusUI();
  renderActiveTab();
  showToast('Demo mode on \u2014 fake results loaded');
  closeSettings();
}
function clearDemoData() {
  STATE.results  = { groupMatches: [], knockoutMatches: [] };
  STATE.demoMode = false;
  localStorage.removeItem('wc2026_results');
  STATE.lastUpdated = null;
  updateStatusUI();
  renderActiveTab();
  showToast('Demo data cleared');
}

// ── Toast ─────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Settings ──────────────────────────────────
function openSettings() {
  const m = document.getElementById('settings-modal');
  if (!m) return;

  updateTZLabel();
  const src = STATE.lastSource;
  const onClaudeFallback = src === 'Claude';

  const refreshDetail = document.getElementById('setting-refresh-detail');
  if (refreshDetail) {
    refreshDetail.textContent = onClaudeFallback
      ? 'Every 60 min — ESPN unavailable, Claude fallback active'
      : 'Every 1 min on match days (ESPN)';
  }
  const refreshStatus = document.getElementById('setting-refresh-status');
  if (refreshStatus) {
    refreshStatus.classList.add('on');
  }
  const sourceDetail = document.getElementById('setting-source-detail');
  if (sourceDetail) {
    const unmatched = STATE.espnUnmatched || [];
    sourceDetail.textContent = unmatched.length
      ? `⚠ ${unmatched.length} ESPN team name(s) not matched: ${unmatched.join(', ')}`
      : (onClaudeFallback ? 'ESPN unavailable — using Claude AI (may incur cost)' : 'Free live data from ESPN — no API cost');
    sourceDetail.style.color = unmatched.length ? 'var(--amber)' : '';
  }
  const sourceBadge = document.getElementById('setting-source-badge');
  if (sourceBadge) {
    sourceBadge.textContent = onClaudeFallback ? 'Claude ⚠' : 'ESPN ✓';
    sourceBadge.classList.toggle('warn', onClaudeFallback);
  }

  m.classList.add('open');
}
function closeSettings() { const m = document.getElementById('settings-modal'); if (m) m.classList.remove('open'); }
function clearMyTeams()  { STATE.myTeams = []; localStorage.removeItem('wc2026_myteams'); showToast('My Teams cleared.'); renderActiveTab(); }
function clearCache()    { localStorage.removeItem('wc2026_results'); STATE.results = { groupMatches: [], knockoutMatches: [] }; STATE.lastUpdated = null; updateStatusUI(); showToast('Cache cleared. Refreshing...'); fetchScores(); }

// ── Match day detection ───────────────────────────────────────────────────
// Returns true only on days when matches are actually scheduled.
// Prevents pointless API calls on the 300+ non-match days of the year.
function isMatchDay() {
  const today = getTodayCT();
  return SCHEDULE.some(m => m.date === today) ||
         R32_MATCHES.some(m => m.date === today);
}

// ── Bracket resolution helpers (used by bracket.js + analyzer.js) ─────────
// Resolve any slot label to a team name using live standings + picks/results.
// ── 3rd-place bipartite assignment ───────────────────────────────────────────
// Slot-string → match ID for the 8 third-place R32 slots
const THIRD_SLOT_MATCH = {
  'ABCDF': 74, 'CDFGH': 77, 'CEFHI': 79, 'EHIJK': 80,
  'BEFIJ': 81, 'AEHIJ': 82, 'EFGIJ': 85, 'DEIJL': 87
};
// Match ID → eligible group letters (inverted from above)
const MATCH_ELIGIBLE = {
  74: 'ABCDF', 77: 'CDFGH', 79: 'CEFHI', 80: 'EHIJK',
  81: 'BEFIJ', 82: 'AEHIJ', 85: 'EFGIJ', 87: 'DEIJL'
};

let _3rdCache = { key: null, result: null };

// Returns { [slotGroups]: teamName } e.g. { 'CEFHI': 'Mexico', ... }
function getThirdPlaceAssignments(ovr) {
  const key = JSON.stringify(ovr || {});
  if (_3rdCache.key === key) return _3rdCache.result;

  // 1. Rank all 12 third-place teams by Pts → GD → GF
  const thirds = Object.keys(GROUP_TEAMS).map(g => {
    const s  = calculateStandings(g, ovr);
    const t  = s[2];
    return t && t.P > 0 ? { group: g, team: t.name, pts: t.Pts, gd: t.GD, gf: t.GF } : null;
  }).filter(Boolean).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);

  // 2. Take best 8 (or however many have played)
  const best8 = thirds.slice(0, 8);

  // 3. Bipartite matching: assign each team to exactly one slot
  //    Process slots in "most constrained first" order (fewest eligible candidates).
  const matchIds = [74, 77, 79, 80, 81, 82, 85, 87];
  const sorted = [...matchIds].sort((a, b) => {
    const ca = best8.filter(t => MATCH_ELIGIBLE[a].includes(t.group)).length;
    const cb = best8.filter(t => MATCH_ELIGIBLE[b].includes(t.group)).length;
    return ca - cb;
  });

  const assigned = {};  // matchId → teamName
  const used    = new Set();

  function backtrack(i) {
    if (i === sorted.length) return true;
    const mid  = sorted[i];
    const elig = MATCH_ELIGIBLE[mid];
    for (const { group, team } of best8) {
      if (!used.has(team) && elig.includes(group)) {
        assigned[mid] = team;
        used.add(team);
        if (backtrack(i + 1)) return true;
        used.delete(team);
        delete assigned[mid];
      }
    }
    return false;
  }
  backtrack(0);

  // 4. Convert to slot-string keyed result { 'CEFHI': 'Mexico', ... }
  const result = {};
  for (const [mid, team] of Object.entries(assigned)) {
    result[MATCH_ELIGIBLE[mid]] = team;
  }
  _3rdCache = { key, result };
  return result;
}

function resolveKOSlot(slot) {
  // Pass any active what-if overrides from the group analyzer through to standings.
  // ANALYZER_STATE is defined in analyzer.js (loads after app.js) but is always
  // in global scope by the time any UI function calls this. Safe to reference at runtime.
  // After Jun 27, group games are done so overrides are naturally empty anyway.
  const ovr = (typeof ANALYZER_STATE !== 'undefined' && getTodayCT() <= '2026-06-27')
    ? (ANALYZER_STATE.overrides || {}) : {};

  // Group position: "1st-A", "2nd-B"
  const single = slot.match(/^(1st|2nd)-([A-L])$/);
  if (single) {
    const s = calculateStandings(single[2], ovr);
    return (single[1] === '1st' ? s[0] : s[1])?.name || null;
  }
  // Best 3rd from pool: "3rd-ABCDF"
  const third = slot.match(/^3rd-([A-L]+)$/);
  if (third) {
    // Use global bipartite assignment so no team appears in two slots
    const assignments = getThirdPlaceAssignments(ovr);
    return assignments[third[1]] ?? null;
  }
  // Winner of previous match: "W-M89"
  const wm = slot.match(/^W-M(\d+)$/);
  if (wm) return getKOWinner(parseInt(wm[1]));
  // Loser of previous match: "L-M101"
  const lm = slot.match(/^L-M(\d+)$/);
  if (lm) {
    const prevId = parseInt(lm[1]);
    const [t1, t2] = getKOMatchTeams(prevId);
    const winner = getKOWinner(prevId);
    if (!winner || !t1 || !t2) return null;
    return winner === t1 ? t2 : t1;
  }
  return null;
}

function getKOMatchTeams(matchId) {
  if (matchId <= 88) {
    const m = R32_MATCHES.find(r => r.id === matchId);
    return m ? [resolveKOSlot(m.slot1), resolveKOSlot(m.slot2)] : [null, null];
  }
  const m = KO_ROUNDS.find(r => r.id === matchId);
  return m ? [resolveKOSlot(m.slot1), resolveKOSlot(m.slot2)] : [null, null];
}

function getKOWinner(matchId) {
  // Real result takes priority
  const result = getKnockoutResult(matchId);
  if (result && result.status === 'FT') {
    return parseInt(result.score1) > parseInt(result.score2) ? result.team1 : result.team2;
  }
  // Fall back to user's bracket pick
  return STATE.bracketPicks[matchId] || null;
}

// ── Match event helpers (goals + cards from ESPN details) ─────────────────
function matchGoalsHtml(result, num) {
  if (!result?.events?.length) return '';
  const tid   = num === 1 ? result.tid1 : result.tid2;
  const goals = result.events.filter(e => e.g && e.tid === tid);
  if (!goals.length) return '';
  const spans = goals.map(g => {
    const suffix = g.og ? ' <em>(OG)</em>' : g.pk ? ' <em>(P)</em>' : '';
    return `<span class="mc-ev">⚽ ${g.min} ${g.p}${suffix}</span>`;
  });
  return `<div class="mc-scorers">${spans.join('')}</div>`;
}

function matchCardsHtml(result, num) {
  if (!result?.events?.length) return '';
  const tid = num === 1 ? result.tid1 : result.tid2;
  const evs = result.events.filter(e => e.tid === tid);
  const cards = [];
  evs.forEach(e => {
    if (e.r) cards.push(`<span class="mc-ev">🟥 ${e.min} ${e.p}</span>`);
    else if (e.y) cards.push(`<span class="mc-ev">🟨 ${e.min} ${e.p}</span>`);
  });
  return cards.length ? `<span class="mc-cards-wrap">${cards.join('')}</span>` : '';
}

// ── Match stats drawer ────────────────────────────────────────────────────
// Parse "45'+5'" → 45.05 for chronological sort
function parseEventMin(s) {
  const m = (s || '0').replace(/'/g, '').split('+');
  return parseInt(m[0] || 0, 10) + (m[1] ? parseInt(m[1], 10) / 100 : 0);
}

function buildTimeline(result) {
  if (!result?.events?.length) return '';
  // Filter out sub events — those are shown in the Substitutions section
  const evs = [...result.events].filter(e => !e.sub).sort((a, b) => parseEventMin(a.min) - parseEventMin(b.min));
  const t1 = displayName(result.team1 || ''), t2 = displayName(result.team2 || '');
  const f1 = getFlag(result.team1), f2 = getFlag(result.team2);

  const rows = evs.map(ev => {
    const isT1 = ev.tid === result.tid1;
    let icon = ev.g ? (ev.og ? '⚽ OG' : ev.pk ? '⚽ P' : '⚽') : ev.r ? '🟥' : '🟨';
    const name = ev.p || '';
    if (isT1) {
      return `<div class="tl-row">
        <div class="tl-side tl-left"><span class="tl-name">${name}</span><span class="tl-icon">${icon}</span></div>
        <div class="tl-min">${ev.min}</div>
        <div class="tl-side tl-right"></div>
      </div>`;
    } else {
      return `<div class="tl-row">
        <div class="tl-side tl-left"></div>
        <div class="tl-min">${ev.min}</div>
        <div class="tl-side tl-right"><span class="tl-icon">${icon}</span><span class="tl-name">${name}</span></div>
      </div>`;
    }
  }).join('');

  return `<div class="tl-wrap">
    <div class="tl-header">
      <span class="tl-th">${f1} ${t1}</span>
      <span class="tl-th-center">⏱</span>
      <span class="tl-th tl-th-r">${t2} ${f2}</span>
    </div>
    ${rows}
  </div>`;
}

// ── Top Scorers ───────────────────────────────────────────────────────────
// Aggregates goals from all fetched match events into a ranked leaderboard.
function buildTopScorers() {
  const map = {};
  STATE.results.groupMatches.forEach(match => {
    (match.events || []).forEach(ev => {
      if (!ev.g || ev.og) return;          // goals only, skip own goals
      const team = ev.tid === match.tid1 ? match.team1
                 : ev.tid === match.tid2 ? match.team2 : '';
      const key  = `${ev.p}||${ev.tid}`;  // player + team = unique scorer
      if (!map[key]) map[key] = { name: ev.p, team, goals: 0 };
      map[key].goals++;
    });
  });
  return Object.values(map)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 30);
}

document.addEventListener('DOMContentLoaded', init);
