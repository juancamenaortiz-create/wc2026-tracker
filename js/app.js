// APP.JS — Global state, fetch, routing, standings

const STATE = {
  results:     { groupMatches: [], knockoutMatches: [] },
  myTeams:     [],
  lastUpdated: null,
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

  // Only fetch on startup if cache is older than 30 minutes (or missing).
  // This prevents burning API calls every time someone opens the app.
  const cacheAge = STATE.lastUpdated ? (Date.now() - STATE.lastUpdated.getTime()) : Infinity;
  if (cacheAge > 30 * 60 * 1000) fetchScores();

  // Auto-refresh every 30 min, but ONLY on days when matches are scheduled.
  // No point calling the API on days with no games.
  setInterval(() => {
    if (!document.hidden && isMatchDay()) fetchScores();
  }, 30 * 60 * 1000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isMatchDay()) {
      const age = STATE.lastUpdated ? (Date.now() - STATE.lastUpdated.getTime()) : Infinity;
      if (age > 30 * 60 * 1000) fetchScores();
    }
  });
}

// ── Fetch ─────────────────────────────────────
async function fetchScores() {
  if (STATE.isLoading || STATE.demoMode) return;
  STATE.isLoading = true;
  setRefreshUI(true);

  try {
    const resp = await fetch('/api/scores', { method: 'POST' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    let parsed = null;
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') {
          const m = block.text.match(/\{[\s\S]*?"groupMatches"[\s\S]*?\}/);
          if (m) { try { parsed = JSON.parse(m[0]); break; } catch(e) {} }
        }
      }
    }

    if (parsed && parsed.groupMatches) {
      STATE.results = parsed;
      STATE.lastUpdated = new Date();
      localStorage.setItem('wc2026_results', JSON.stringify({ results: parsed, timestamp: STATE.lastUpdated.toISOString() }));
      updateStatusUI();
      renderActiveTab();
    }
  } catch(err) {
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
  if (STATE.demoMode) { msg.textContent = '🎭 Demo Mode'; return; }
  if (STATE.lastUpdated) {
    msg.textContent = `Updated ${STATE.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    msg.textContent = 'Not yet refreshed';
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
  // Group position: "1st-A", "2nd-B"
  const single = slot.match(/^(1st|2nd)-([A-L])$/);
  if (single) {
    const s = calculateStandings(single[2]);
    return (single[1] === '1st' ? s[0] : s[1])?.name || null;
  }
  // Best 3rd from pool: "3rd-ABCDF"
  const third = slot.match(/^3rd-([A-L]+)$/);
  if (third) {
    const best = third[1].split('').map(g => {
      const s = calculateStandings(g);
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

document.addEventListener('DOMContentLoaded', init);
