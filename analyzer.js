// ═══════════════════════════════════════════
// ANALYZER.JS — Group analyzer tab
// ═══════════════════════════════════════════

const ANALYZER_STATE = {
  selectedGroup: 'A',
  overrides: {},
};

function renderAnalyzer(container) {
  const g = ANALYZER_STATE.selectedGroup;
  const overrides = ANALYZER_STATE.overrides;

  // Group selector pills
  const groupPills = Object.keys(GROUP_TEAMS).map(grpKey =>
    `<button class="pill ${grpKey === g ? 'active' : ''}"
      onclick="selectAnalyzerGroup('${grpKey}')">Grp ${grpKey}</button>`
  ).join('');

  // Current standings with overrides
  const standings = calculateStandings(g, overrides);
  const matches = SCHEDULE.filter(m => m.g === g);
  const playedMatches = matches.filter(m => {
    const r = getMatchResult(m);
    return r && (r.status === 'FT' || r.status === 'LIVE');
  });
  const remainingMatches = matches.filter(m => {
    const r = getMatchResult(m);
    return !r || r.status === 'NS' || r.status === '';
  });

  // Standings table
  let standingsHtml = '';
  standings.forEach((team, idx) => {
    const cls = idx < 2 ? 'qualified' : idx === 2 ? 'third-place' : 'eliminated';
    const qIcon = idx < 2 ? '✅' : idx === 2 ? '🟡' : '❌';
    standingsHtml += `<div class="az-standing-row ${cls}">
      <span class="rank-num">${idx+1}</span>
      <span class="flag">${getFlag(team.name)}</span>
      <span class="az-team-name">${team.name}</span>
      <span data-star-team="${team.name}"></span>
      <span class="az-pts">${team.Pts}pts</span>
      <span class="az-gd">${team.GD >= 0 ? '+'+team.GD : team.GD}</span>
      <span class="az-qual">${qIcon}</span>
    </div>`;
  });

  // Remaining matches with toggles
  let remainingHtml = '';
  if (remainingMatches.length === 0) {
    remainingHtml = `<div class="az-empty">All matches played in this group.</div>`;
  } else {
    remainingMatches.forEach(m => {
      const key = `${m.id}`;
      const ov = overrides[key] || null;
      remainingHtml += buildMatchToggle(m, key, ov);
    });
  }

  // Played matches (read-only)
  let playedHtml = '';
  if (playedMatches.length > 0) {
    playedMatches.forEach(m => {
      const r = getMatchResult(m);
      const s1 = r ? r.score1 : '?';
      const s2 = r ? r.score2 : '?';
      playedHtml += `<div class="az-played-row">
        <span class="flag">${getFlag(m.t1)}</span>
        <span>${m.t1}</span>
        <span class="az-score">${s1}–${s2}</span>
        <span>${m.t2}</span>
        <span class="flag">${getFlag(m.t2)}</span>
        <span class="ft-badge xs">FT</span>
      </div>`;
    });
  }

  // Tournament path for top 2 teams
  let pathHtml = '';
  for (let i = 0; i < Math.min(2, standings.length); i++) {
    pathHtml += buildTournamentPath(standings[i].name, i + 1, g);
  }

  // Reset button only if overrides exist
  const hasOverrides = Object.keys(overrides).length > 0;

  container.innerHTML = `
    <div class="az-header">
      <div class="pills-scroll">${groupPills}</div>
    </div>

    <div class="az-section">
      <div class="az-section-title">📊 Projected Standings ${hasOverrides ? '<span class="what-if-badge">WHAT-IF</span>' : ''}</div>
      ${standingsHtml}
      <div class="legend-row">
        <span class="legend-dot qualified"></span><span>Advance</span>
        <span class="legend-dot third-place"></span><span>3rd</span>
        <span class="legend-dot eliminated"></span><span>Out</span>
      </div>
    </div>

    ${remainingMatches.length > 0 ? `
    <div class="az-section">
      <div class="az-section-title">🔬 What-If Scenarios
        ${hasOverrides ? `<button class="reset-btn" onclick="resetAnalyzerOverrides()">Reset</button>` : ''}
      </div>
      ${remainingHtml}
    </div>` : ''}

    ${playedMatches.length > 0 ? `
    <div class="az-section">
      <div class="az-section-title">✅ Played</div>
      ${playedHtml}
    </div>` : ''}

    <div class="az-section">
      <div class="az-section-title">🗺️ Tournament Path</div>
      <div class="path-legend">
        <span class="path-dot confirmed"></span>Confirmed
        <span class="path-dot likely"></span>Likely
        <span class="path-dot open"></span>Open
      </div>
      ${pathHtml}
    </div>`;

  // Attach star buttons
  container.querySelectorAll('[data-star-team]').forEach(slot => {
    const team = slot.dataset.starTeam;
    const btn = starBtn(team, () => renderAnalyzer(container));
    slot.appendChild(btn);
  });
}

function buildMatchToggle(match, key, override) {
  const t1 = match.t1, t2 = match.t2;
  const isHome  = override === 'home';
  const isDraw  = override === 'draw';
  const isAway  = override === 'away';
  const none    = !override;

  return `<div class="az-match-toggle">
    <div class="az-toggle-teams">
      <span class="flag">${getFlag(t1)}</span>
      <span class="toggle-team">${t1}</span>
      <span class="vs-text">vs</span>
      <span class="toggle-team">${t2}</span>
      <span class="flag">${getFlag(t2)}</span>
    </div>
    <div class="az-toggle-btns">
      <button class="toggle-opt ${isHome ? 'active-home' : ''}" onclick="setOverride('${key}','home')">${t1.split(' ')[0]} Win</button>
      <button class="toggle-opt ${isDraw ? 'active-draw' : ''}" onclick="setOverride('${key}','draw')">Draw</button>
      <button class="toggle-opt ${isAway ? 'active-away' : ''}" onclick="setOverride('${key}','away')">${t2.split(' ')[0]} Win</button>
      ${!none ? `<button class="toggle-opt clear-btn" onclick="clearOverride('${key}')">✕</button>` : ''}
    </div>
    <div class="az-match-date">${formatDate(match.date)} · ${match.time} CT · ${match.city}</div>
  </div>`;
}

function buildTournamentPath(team, rank, group) {
  // Determine which R32 match this team feeds into
  const posKey = `${rank === 1 ? '1st' : '2nd'}-${group}`;
  const r32MatchId = GROUP_POSITION_TO_R32[posKey];
  const r32Match = r32MatchId ? R32_MATCHES.find(m => m.id === r32MatchId) : null;

  const steps = [
    { round:'R32',   label: r32Match ? `vs ${r32Match.slot1 === posKey ? r32Match.slot2 : r32Match.slot1} · ${r32Match.city} · ${formatShortDate(r32Match.date)}` : '?', state:'open' },
    { round:'R16',   label: 'Winner advances', state:'open' },
    { round:'QF',    label: 'Winner advances', state:'open' },
    { round:'SF',    label: 'Winner advances', state:'open' },
    { round:'Final', label: 'Jul 19 · New York/NJ', state:'open' },
  ];

  let stepsHtml = steps.map(s =>
    `<div class="path-step ${s.state}">
      <span class="path-round">${s.round}</span>
      <span class="path-label">${s.label}</span>
    </div>`
  ).join('<div class="path-arrow">›</div>');

  return `<div class="tournament-path">
    <div class="path-team-header">
      <span class="flag">${getFlag(team)}</span>
      <span>${team}</span>
      <span class="rank-badge">${rank === 1 ? '1st' : '2nd'}</span>
    </div>
    <div class="path-steps">${stepsHtml}</div>
  </div>`;
}

function formatShortDate(dateStr) {
  const [, mo, d] = dateStr.split('-').map(Number);
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[mo]} ${d}`;
}

function selectAnalyzerGroup(g) {
  ANALYZER_STATE.selectedGroup = g;
  ANALYZER_STATE.overrides = {};
  const content = document.getElementById('tab-content');
  if (content) renderAnalyzer(content);
}

function setOverride(key, result) {
  ANALYZER_STATE.overrides[key] = result;
  const content = document.getElementById('tab-content');
  if (content) renderAnalyzer(content);
}

function clearOverride(key) {
  delete ANALYZER_STATE.overrides[key];
  const content = document.getElementById('tab-content');
  if (content) renderAnalyzer(content);
}

function resetAnalyzerOverrides() {
  ANALYZER_STATE.overrides = {};
  const content = document.getElementById('tab-content');
  if (content) renderAnalyzer(content);
}
