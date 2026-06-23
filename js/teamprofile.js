// ═══════════════════════════════════════════
// TEAMPROFILE.JS — Slide-up team profile sheet
// ═══════════════════════════════════════════

const _teamCache = {}; // team → { data, fetchedAt }

function loadTeamCache() {
  try {
    const raw = JSON.parse(localStorage.getItem('wc2026_teams') || '{}');
    const now  = Date.now();
    Object.entries(raw).forEach(([t, e]) => {
      if (now - e.fetchedAt < 6 * 60 * 60 * 1000) _teamCache[t] = e; // 6h TTL
    });
  } catch(e) {}
}
function saveTeamCache(team, data) {
  try {
    const raw = JSON.parse(localStorage.getItem('wc2026_teams') || '{}');
    raw[team] = { data, fetchedAt: Date.now() };
    localStorage.setItem('wc2026_teams', JSON.stringify(raw));
  } catch(e) {}
}

// ── Public entry point ───────────────────────────────────────────────────────
async function openTeamProfile(team) {
  if (!team) return;
  const modal   = document.getElementById('team-profile-modal');
  const content = document.getElementById('team-profile-content');
  if (!modal || !content) return;

  // Show immediately with loading state
  content.innerHTML = tpLoading(team);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // 1. Static hand-curated data — instant, no API call
  if (typeof TEAM_PROFILES !== 'undefined' && TEAM_PROFILES[team]) {
    content.innerHTML = tpContent(team, TEAM_PROFILES[team]);
    return;
  }

  // 2. localStorage cache from a previous API call
  if (_teamCache[team]?.data) {
    content.innerHTML = tpContent(team, _teamCache[team].data);
    return;
  }

  // 3. Fall back to API (teams not yet in teamdata.js)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000); // 20s client timeout
    const resp = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const json = resp.ok ? await resp.json() : { data: null };
    if (json.data) {
      _teamCache[team] = { data: json.data, fetchedAt: Date.now() };
      saveTeamCache(team, json.data);
    }
    if (modal.classList.contains('open'))
      content.innerHTML = json.data ? tpContent(team, json.data) : tpError(team);
  } catch(err) {
    const isTimeout = err.name === 'AbortError';
    if (modal.classList.contains('open')) content.innerHTML = tpError(team, isTimeout);
  }
}

function closeTeamProfile() {
  const modal = document.getElementById('team-profile-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Rendering helpers ────────────────────────────────────────────────────────
function tpLoading(team) {
  return `<div class="tp-loading">
    <span class="cflag tp-flag-lg">${getFlag(team)}</span>
    <div class="tp-team-name">${displayName(team)}</div>
    <div class="tp-spinner"><span class="preview-spin">⟳</span> Loading profile…</div>
  </div>`;
}
function tpError(team, isTimeout = false) {
  const msg = isTimeout
    ? 'Request timed out — try again on WiFi'
    : 'Profile unavailable — tap to retry';
  return `<div class="tp-loading">
    <span class="cflag tp-flag-lg">${getFlag(team)}</span>
    <div class="tp-team-name">${displayName(team)}</div>
    <div class="tp-spinner" style="color:var(--muted)">${msg}</div>
    <button class="modal-btn" style="margin-top:12px" onclick="delete _teamCache['${team}'];openTeamProfile('${team}')">↻ Try Again</button>
  </div>`;
}

// Pin toggle from inside the profile header
function tpTogglePin(team) {
  toggleMyTeam(team);
  const c = document.getElementById('team-profile-content');
  const d = (typeof TEAM_PROFILES !== 'undefined' && TEAM_PROFILES[team])
         || (_teamCache[team] && _teamCache[team].data);
  if (c && d) c.innerHTML = tpContent(team, d);
  if (typeof renderActiveTab === 'function') renderActiveTab();
}

function tpContent(team, d) {
  // Current tournament stats
  let groupStats = null;
  for (const [g, teams] of Object.entries(GROUP_TEAMS)) {
    if (teams.some(t => normName(t) === normName(team))) {
      const st = calculateStandings(g);
      groupStats = st.find(s => normName(s.name) === normName(team)) || null;
      break;
    }
  }

  // Upcoming matches
  const upcoming = SCHEDULE.filter(m =>
    (normName(m.t1) === normName(team) || normName(m.t2) === normName(team)) &&
    !STATE.results.groupMatches.some(r =>
      normName(r.team1) === normName(m.t1) && normName(r.team2) === normName(m.t2) && r.status === 'FT'
    )
  ).slice(0, 3);

  // Form dots
  const form = (d.recentForm || '').replace(/[^WDLP]/g, '').split('').slice(0,5);
  const formHtml = form.map(c =>
    `<span class="form-dot form-${c.toLowerCase()}">${c}</span>`
  ).join('');

  // Players
  const playersHtml = (d.topPlayers || []).map(p =>
    `<div class="tp-player">
      <span class="tp-player-name">${p.name}</span>
      <span class="tp-player-meta">${p.role} · ${p.club}</span>
    </div>`
  ).join('');

  // WC titles
  const titles = d.wcHistory?.titles || 0;
  const trophySvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5h10V9a5 5 0 0 1-10 0V4.5Z"/><path d="M9.5 14.2 9 18.5h6l-.5-4.3M7.5 21h9"/></svg>';
  const titlesHtml = titles > 0 ? `<span class="tp-titles">${trophySvg} ${titles} title${titles>1?'s':''}</span>` : '';

  // Tournament stats row
  const statsHtml = groupStats ? `
    <div class="tp-label">2026 Tournament</div>
    <div class="tp-card">
      <div class="tp-stats-grid">
        <div class="tp-stat"><span class="tp-stat-n">${groupStats.P}</span><span class="tp-stat-l">Played</span></div>
        <div class="tp-stat"><span class="tp-stat-n">${groupStats.W}</span><span class="tp-stat-l">Won</span></div>
        <div class="tp-stat"><span class="tp-stat-n">${groupStats.D}</span><span class="tp-stat-l">Drawn</span></div>
        <div class="tp-stat"><span class="tp-stat-n">${groupStats.L}</span><span class="tp-stat-l">Lost</span></div>
        <div class="tp-stat"><span class="tp-stat-n">${groupStats.GF}</span><span class="tp-stat-l">GF</span></div>
        <div class="tp-stat"><span class="tp-stat-n ${groupStats.Pts>=4?'tp-pts-hi':''}">${groupStats.Pts}</span><span class="tp-stat-l">Pts</span></div>
      </div>
    </div>` : '';

  // Upcoming matches
  const upcomingHtml = upcoming.length ? `
    <div class="tp-label">Upcoming</div>
    <div class="tp-card">
      ${upcoming.map(m => {
        const opp = normName(m.t1) === normName(team) ? m.t2 : m.t1;
        return `<div class="tp-up-row">
          <span class="tp-up-team"><span class="cflag" style="width:20px;height:20px">${getFlag(opp)}</span>${displayName(opp)}</span>
          <span class="tp-up-time">${formatShortDate(m.date)} · ${formatGameTime(m.date, m.time)} ${getTZAbbr()}</span>
        </div>`;
      }).join('')}
    </div>` : '';

  const pinned = isMyTeam(team);
  const escTeam = team.replace(/'/g, "\\'");

  return `
    <div class="tp-header">
      <span class="cflag tp-flag-lg">${getFlag(team)}</span>
      <div class="tp-head-info">
        <div class="tp-team-name">${displayName(team)}</div>
        <div class="tp-badges">
          ${d.ranking ? `<span class="tp-badge tp-badge-gold">FIFA #${d.ranking}</span>` : ''}
          ${d.confederation ? `<span class="tp-badge tp-badge-neutral">${d.confederation}</span>` : ''}
          <button class="tp-pin${pinned ? ' on' : ''}" onclick="tpTogglePin('${escTeam}')">★ ${pinned ? 'Pinned' : 'Pin'}</button>
        </div>
      </div>
    </div>

    ${statsHtml}
    ${upcomingHtml}

    ${(d.manager || d.style) ? `<div class="tp-card tp-info">
      ${d.manager ? `<div class="tp-row"><span class="tp-row-lbl">Manager</span><span>${d.manager}</span></div>` : ''}
      ${d.style   ? `<div class="tp-row"><span class="tp-row-lbl">Style</span><span>${d.style}</span></div>` : ''}
    </div>` : ''}

    ${playersHtml ? `<div class="tp-label">Key Players</div>
    <div class="tp-card">${playersHtml}</div>` : ''}

    ${d.wcHistory ? `<div class="tp-label">World Cup History</div>
    <div class="tp-card tp-info">
      <div class="tp-row"><span class="tp-row-lbl">Appearances</span><span>${d.wcHistory.appearances}</span></div>
      ${titlesHtml ? `<div class="tp-row"><span class="tp-row-lbl">Titles</span><span>${titlesHtml}</span></div>` : ''}
      <div class="tp-row"><span class="tp-row-lbl">Best finish</span><span>${d.wcHistory.bestFinish || '—'}</span></div>
      ${d.wcHistory.notable ? `<div class="tp-notable">${d.wcHistory.notable}</div>` : ''}
    </div>` : ''}

    ${form.length ? `<div class="tp-label">Form</div>
    <div class="tp-form">${formHtml}</div>
    ${d.recentForm && d.recentForm.length > 5 ? `<div class="tp-notable" style="padding:0 2px">${d.recentForm}</div>` : ''}` : ''}

    ${(d.strengths || d.weaknesses) ? `<div class="tp-card tp-sw-card">
      ${d.strengths  ? `<div class="tp-sw"><span class="tp-sw-ico up">▲</span><span><b>Strength</b> — ${d.strengths}</span></div>` : ''}
      ${d.weaknesses ? `<div class="tp-sw"><span class="tp-sw-ico down">▼</span><span><b>Watch</b> — ${d.weaknesses}</span></div>` : ''}
    </div>` : ''}
  `;
}

document.addEventListener('DOMContentLoaded', loadTeamCache);
