// APP.JS — Global state, fetch, routing, standings

const STATE = {
  results:     { groupMatches: [], knockoutMatches: [] },
  myTeams:     [],
  lastUpdated: null,
  lastSource:  null,   // 'ESPN' | 'Claude' | null — visible in header
  activeTab:   'today',
  isLoading:   false,
  demoMode:    false,
  bracketPicks: {},  // matchId → team name, for bracket predictor
};

// ── Init ─────────────────────────────────────
function init() {
  try { STATE.myTeams = JSON.parse(localStorage.getItem('wc2026_myteams') || '[]'); } catch(e) { STATE.myTeams = []; }
  try {
    const cached = JSON.parse(localStorage.getItem('wc2026_results') || 'null');
    if (cached && cached.results) { STATE.results = cached.results; STATE.lastUpdated = cached.timestamp ? new Date(cached.timestamp) : null; }
  } catch(e) {}
  updateStatusUI();
  navigateTo('today');

  // Fetch on startup only if cache is older than 1 hour.
  const cacheAge = STATE.lastUpdated ? (Date.now() - STATE.lastUpdated.getTime()) : Infinity;
  if (cacheAge > 60 * 60 * 1000) fetchScores();

  // Auto-refresh once per hour on match days — manual refresh available anytime.
  setInterval(() => {
    if (!document.hidden && isMatchDay()) fetchScores();
  }, 60 * 60 * 1000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isMatchDay()) {
      const age = STATE.lastUpdated ? (Date.now() - STATE.lastUpdated.getTime()) : Infinity;
      if (age > 60 * 60 * 1000) fetchScores();
    }
  });
}

// ── ESPN free scores (primary source — $0) ────────────────────────────────
// Maps ESPN's team display names to our internal names where they differ.
const ESPN_NAMES = {
  "Korea Republic":           "South Korea",
  "Bosnia-Herzegovina":       "Bosnia & Herzegovina",
  "Bosnia and Herzegovina":   "Bosnia & Herzegovina",
  "Curacao":                  "Curaçao",
  "Turkey":                   "Türkiye",
  "Côte d'Ivoire":            "Ivory Coast",
  "DR Congo":                 "Congo DR",
  "Congo, DR":                "Congo DR",
  "Republic of Ireland":      "Ireland",
};
function espnToApp(n) { return ESPN_NAMES[n] || n || ''; }

async function fetchFromESPN() {
  const found = [];
  // Fetch today + yesterday so we catch scores even if opened late
  for (let back = 0; back <= 1; back++) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    const ds = d.toISOString().split('T')[0].replace(/-/g, '');
    try {
      const r = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ds}`,
        { signal: AbortSignal.timeout(7000) }
      );
      if (!r.ok) continue;
      const data = await r.json();
      for (const ev of (data.events || [])) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;
        const st = comp.status?.type || ev.status?.type || {};
        const sn = (st.name || '').toUpperCase();
        let status;
        if (st.completed || sn.includes('FINAL'))               status = 'FT';
        else if (sn.includes('PROGRESS') || sn.includes('HALF')) status = 'LIVE';
        else continue; // not started yet
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
        if (!m) continue;
        const flip = normName(m.t1) === normName(n2);
        // Extract events (goals + cards) and live clock from ESPN
        const homeId = home.team?.id || '';
        const awayId = away.team?.id || '';
        const events = (comp.details || [])
          .filter(d => d.scoringPlay || d.yellowCard || d.redCard)
          .map(d => ({
            min: d.clock?.displayValue || '',
            tid: d.team?.id || '',
            p:   d.athletesInvolved?.[0]?.shortName || '',
            g:   !!(d.scoringPlay),
            y:   !!(d.yellowCard),
            r:   !!(d.redCard),
            og:  !!(d.ownGoal),
          }));
        found.push({ matchId:m.id, team1:m.t1, team2:m.t2,
          score1: flip ? s2 : s1, score2: flip ? s1 : s2,
          status, group:m.g, date:m.date,
          clock:  comp.status?.displayClock || '',
          events,
          tid1: flip ? awayId : homeId,
          tid2: flip ? homeId : awayId,
        });
      }
    } catch(_) { /* skip date on network error */ }
  }
  // Return what we found — empty list is valid on non-match days
  return { groupMatches: found, knockoutMatches: [] };
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

    // Merge fresh data into existing cache so history isn't lost
    const merged = mergeResults(STATE.results.groupMatches, fresh.groupMatches);
    STATE.results = { groupMatches: merged, knockoutMatches: fresh.knockoutMatches || [] };
    STATE.lastUpdated = new Date();
    STATE.lastSource  = source;
    localStorage.setItem('wc2026_results', JSON.stringify({
      results: STATE.results,
      timestamp: STATE.lastUpdated.toISOString(),
    }));
    console.log(`Scores updated via ${source}: ${merged.filter(m=>m.status==='FT').length} FT, ${merged.filter(m=>m.status==='LIVE').length} LIVE`);
    updateStatusUI();
    renderActiveTab();

  } catch(err) {
    console.error('fetchScores:', err.message);
    setStatusError(err.message);
    showToast('Could not refresh scores. Using cached data.');
  } finally {
    STATE.isLoading = false;
    setRefreshUI(false);
  }
}

function setRefreshUI(loading) {
  const btn = document.getElementById('refresh-btn');
  const msg = document.getElementById('status-msg');
  if (btn) {
    btn.disabled = loading;
    btn.textContent = loading ? 'Refreshing\u2026' : '\u21BB Refresh Scores';
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
    const badge = src === 'Claude'
      ? `<span class="src-badge src-claude" title="ESPN unavailable — using Claude API (may incur cost)">Claude ⚠</span>`
      : src === 'ESPN'
      ? `<span class="src-badge src-espn" title="Live data from ESPN (free)">ESPN ✓</span>`
      : '';
    msg.innerHTML = `Updated ${time} ${badge}`;
  } else {
    msg.innerHTML = 'Not yet refreshed';
  }
}

// ── Tab Navigation ────────────────────────────
function navigateTo(tab) {
  STATE.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
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

  SCHEDULE.filter(m => m.g === group).forEach(match => {
    const key = `${match.id}`;
    const ov  = overrides[key];

    if (ov) {
      const t1k = normName(match.t1), t2k = normName(match.t2);
      if (stats[t1k]) stats[t1k].P++;
      if (stats[t2k]) stats[t2k].P++;
      if (ov === 'home') {
        if (stats[t1k]) { stats[t1k].W++; stats[t1k].Pts += 3; stats[t1k].GF++; }
        if (stats[t2k]) { stats[t2k].L++; stats[t2k].GA++; }
      } else if (ov === 'away') {
        if (stats[t2k]) { stats[t2k].W++; stats[t2k].Pts += 3; stats[t2k].GF++; }
        if (stats[t1k]) { stats[t1k].L++; stats[t1k].GA++; }
      } else {
        if (stats[t1k]) { stats[t1k].D++; stats[t1k].Pts++; }
        if (stats[t2k]) { stats[t2k].D++; stats[t2k].Pts++; }
      }
      return;
    }

    const fetched = STATE.results.groupMatches.find(fm =>
      normName(fm.team1) === normName(match.t1) && normName(fm.team2) === normName(match.t2) &&
      (fm.status === 'FT' || fm.status === 'LIVE')
    );
    if (fetched) {
      const s1 = parseInt(fetched.score1)||0, s2 = parseInt(fetched.score2)||0;
      const t1k = normName(match.t1), t2k = normName(match.t2);
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
    }
  });

  Object.values(stats).forEach(s => { s.GD = s.GF - s.GA; });
  return Object.values(stats).sort((a,b) => b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF || a.name.localeCompare(b.name));
}

function getMatchResult(match) {
  return STATE.results.groupMatches.find(fm =>
    normName(fm.team1) === normName(match.t1) && normName(fm.team2) === normName(match.t2)
  ) || null;
}
function getKnockoutResult(matchId) {
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
function formatCountdown(ms) {
  const totalMin = Math.floor(ms / 60000), h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `Kicks off in ${h}h ${m}m` : `Kicks off in ${m}m`;
}
function formatDate(dateStr) {
  const [y,mo,d] = dateStr.split('-').map(Number);
  return new Date(y, mo-1, d).toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });
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
function loadDemoData() {
  STATE.results  = JSON.parse(JSON.stringify(DEMO_RESULTS));
  STATE.demoMode = true;
  STATE.lastUpdated = new Date();
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
function openSettings()  { const m = document.getElementById('settings-modal'); if (m) m.classList.add('open'); }
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
    const best = third[1].split('').map(g => {
      const s = calculateStandings(g, ovr);
      const t = s[2];
      return { team: t?.name||null, pts: t?.Pts??0, gd: t?.GD??0, p: t?.P??0 };
    }).filter(c => c.p > 0 && c.team).sort((a,b) => b.pts-a.pts||b.gd-a.gd);
    return best[0]?.team || null;
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
  const list = goals.map(g => `${g.min} ${g.p}${g.og ? ' (OG)' : ''}`).join(' · ');
  return `<div class="mc-scorers">⚽ ${list}</div>`;
}

function matchCardsHtml(result, num) {
  if (!result?.events?.length) return '';
  const tid = num === 1 ? result.tid1 : result.tid2;
  const evs = result.events.filter(e => e.tid === tid);
  const y = evs.filter(e => e.y).length;
  const r = evs.filter(e => e.r).length;
  if (!y && !r) return '';
  return `<span class="mc-cards">${'🟨'.repeat(y)}${'🟥'.repeat(r)}</span>`;
}

document.addEventListener('DOMContentLoaded', init);
