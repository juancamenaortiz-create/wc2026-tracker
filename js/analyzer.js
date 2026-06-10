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
  if (typeof twemoji !== 'undefined') twemoji.parse(container);


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

// ── Slot resolver ────────────────────────────────────────────────────────────
// Turns a slot label ("2nd-B", "3rd-ABCDF") into live team data from standings.
function resolveSlot(slot) {
  // Single group: "1st-A", "2nd-B", etc.
  const single = slot.match(/^(1st|2nd|3rd|4th)-([A-L])$/);
  if (single) {
    const idx = {'1st':0,'2nd':1,'3rd':2,'4th':3}[single[1]];
    const grp  = single[2];
    const s    = calculateStandings(grp);
    const entry= s[idx];
    return { type:'single', rank:single[1], group:grp, team:entry?.name||null, pts:entry?.Pts??0, p:entry?.P??0 };
  }
  // Multi-group 3rd place: "3rd-ABCDF"
  const multi = slot.match(/^3rd-([A-L]{2,})$/);
  if (multi) {
    const groups     = multi[1].split('');
    const candidates = groups.map(g => {
      const s = calculateStandings(g);
      const t = s[2]; // 3rd place
      return { group:g, team:t?.name||null, pts:t?.Pts??0, gd:t?.GD??0, gf:t?.GF??0, p:t?.P??0 };
    });
    return { type:'multi3rd', groups, candidates, played: candidates.filter(c => c.p > 0) };
  }
  return { type:'unknown', slot };
}

function buildTournamentPath(team, rank, group) {
  const posKey    = `${rank === 1 ? '1st' : '2nd'}-${group}`;
  const r32MatchId= GROUP_POSITION_TO_R32[posKey];
  const r32Match  = r32MatchId ? R32_MATCHES.find(m => m.id === r32MatchId) : null;
  if (!r32Match) return '';

  const opSlot = r32Match.slot1 === posKey ? r32Match.slot2 : r32Match.slot1;
  const opp    = resolveSlot(opSlot);
  const venue  = `${r32Match.city} · ${formatShortDate(r32Match.date)}`;

  // Build R32 step HTML based on what we know
  let r32Inner = '';
  let wideClass = '';

  if (opp.type === 'single') {
    if (opp.team && opp.p > 0) {
      // We know who's in that position right now
      r32Inner = `<span class="path-round">R32</span>
        <div class="path-opp">${getFlag(opp.team)}&nbsp;${opp.team}</div>
        <div class="path-sub">${opp.rank} Grp ${opp.group} &middot; ${opp.pts}pts</div>
        <div class="path-sub">${venue}</div>`;
    } else {
      r32Inner = `<span class="path-round">R32</span>
        <span class="path-label">vs ${opSlot}</span>
        <div class="path-sub">${venue}</div>`;
    }
  } else if (opp.type === 'multi3rd') {
    wideClass = ' path-step-wide';
    const groupStr = opp.groups.join('/');
    if (opp.played.length > 0) {
      // Sort by pts → GD → GF to show most likely qualifier first
      const sorted = [...opp.played].sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
      const rows = sorted.map((c,i) =>
        `<div class="path-cand${i===0?' path-cand-top':''}">
          ${getFlag(c.team)}&nbsp;<span class="path-cand-name">${c.team}</span>
          <span class="path-cand-meta">Grp ${c.group}</span>
          <span class="path-cand-pts">${c.pts}pts</span>
        </div>`
      ).join('');
      r32Inner = `<span class="path-round">R32</span>
        <div class="path-sub path-sub-hdr">Best 3rd · ${groupStr}</div>
        <div class="path-cands">${rows}</div>
        <div class="path-sub">${venue}</div>`;
    } else {
      r32Inner = `<span class="path-round">R32</span>
        <span class="path-label">Best 3rd</span>
        <div class="path-sub">${groupStr}</div>
        <div class="path-sub">${venue}</div>`;
    }
  }

  const plainSteps = [
    { round:'R16',   label:'Winner advances' },
    { round:'QF',    label:'Winner advances' },
    { round:'SF',    label:'Winner advances' },
    { round:'Final', label:'Jul 19 · New York/NJ' },
  ];

  const stepsHtml =
    `<div class="path-step open${wideClass}">${r32Inner}</div>` +
    plainSteps.map(s =>
      `<div class="path-arrow">›</div>
       <div class="path-step open">
         <span class="path-round">${s.round}</span>
         <span class="path-label">${s.label}</span>
       </div>`
    ).join('');

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
