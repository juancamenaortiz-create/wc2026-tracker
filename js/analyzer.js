// ═══════════════════════════════════════════
// ANALYZER.JS — Group analyzer tab
// ═══════════════════════════════════════════

const ANALYZER_STATE = {
  selectedGroup: 'A',
  overrides:     {},
  mode:          'auto', // kept for backward compat
  tab:           'groups', // 'groups'|'bracket'|'calculator'
};

function isGroupStageOver() { return getTodayCT() > '2026-06-27'; }

function setAnalyzerMode(mode) {
  ANALYZER_STATE.mode = mode;
  const content = document.getElementById('tab-content');
  if (content) renderAnalyzer(STATE.demoMode ? document.getElementById('tab-inner') || content : content);
}
function setAnalyzerTab(tab) {
  ANALYZER_STATE.tab = tab;
  const content = document.getElementById('tab-content');
  if (content) renderAnalyzer(STATE.demoMode ? document.getElementById('tab-inner') || content : content);
}

function renderAnalyzer(container) {
  // Sub-tab nav (looks identical to Groups tab sub-nav)
  const tab = ANALYZER_STATE.tab;
  const subnav = `<div class="groups-subnav">
    <button class="subnav-btn ${tab==='groups'     ?'active':''}" onclick="setAnalyzerTab('groups')">Groups</button>
    <button class="subnav-btn ${tab==='bracket'    ?'active':''}" onclick="setAnalyzerTab('bracket')">Bracket</button>
    <button class="subnav-btn ${tab==='calculator' ?'active':''}" onclick="setAnalyzerTab('calculator')">Calculator</button>
  </div>`;

  if (tab === 'bracket') {
    container.innerHTML = subnav;
    const wrap = document.createElement('div');
    container.appendChild(wrap);
    renderBracketPredictor(wrap);
    return;
  }
  if (tab === 'calculator') {
    container.innerHTML = subnav + buildCalculatorHTML();
    return;
  }

  // Default: groups what-if mode
  const effectiveMode = 'group';
  const g = ANALYZER_STATE.selectedGroup;
  const overrides = ANALYZER_STATE.overrides;

  // Groups what-if: inject subnav first, then the existing groups UI
  container.innerHTML = subnav;
  const groupsWrap = document.createElement('div');
  container.appendChild(groupsWrap);
  // Render into groupsWrap below (replaces container usage)

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
      <span class="az-team-name">${displayName(team.name)}</span>
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
    pathHtml += buildTournamentPath(standings[i].name, i + 1, g, overrides);
  }

  // Any overrides anywhere → show Reset All. Current group overrides → show WHAT-IF badge.
  const totalOverrides     = Object.keys(overrides).length;
  const hasAnyOverrides    = totalOverrides > 0;
  const currentGroupIds    = new Set(matches.map(m => String(m.id)));
  const thisGroupOverrides = Object.keys(overrides).filter(k => currentGroupIds.has(k)).length;
  const thisGroupWhatIf    = thisGroupOverrides > 0;

  const isPostGroup = isGroupStageOver();
  groupsWrap.innerHTML = `
    <div class="az-header">
      <div class="pills-scroll">${groupPills}</div>
    </div>

    <div class="az-section">
      <div class="az-section-title">📊 Projected Standings ${thisGroupWhatIf ? '<span class="what-if-badge">WHAT-IF</span>' : ''}</div>
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
        ${hasAnyOverrides ? `<button class="reset-btn" onclick="resetAnalyzerOverrides()">Reset All${totalOverrides > 1 ? ` (${totalOverrides})` : ''}</button>` : ''}
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
  groupsWrap.querySelectorAll('[data-star-team]').forEach(slot => {
    const team = slot.dataset.starTeam;
    const btn = starBtn(team, () => renderAnalyzer(container));
    slot.appendChild(btn);
  });
  if (typeof twemoji !== 'undefined') twemoji.parse(groupsWrap);
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
      <span class="toggle-team">${displayName(t1)}</span>
      <span class="vs-text">vs</span>
      <span class="toggle-team">${displayName(t2)}</span>
      <span class="flag">${getFlag(t2)}</span>
    </div>
    <div class="az-toggle-btns">
      <button class="toggle-opt ${isHome ? 'active-home' : ''}" onclick="setOverride('${key}','home')">${t1.split(' ')[0]} Win</button>
      <button class="toggle-opt ${isDraw ? 'active-draw' : ''}" onclick="setOverride('${key}','draw')">Draw</button>
      <button class="toggle-opt ${isAway ? 'active-away' : ''}" onclick="setOverride('${key}','away')">${t2.split(' ')[0]} Win</button>
      ${!none ? `<button class="toggle-opt clear-btn" onclick="clearOverride('${key}')">✕</button>` : ''}
    </div>
    <div class="az-match-date">${formatDate(match.date)} · ${formatGameTime(match.date, match.time)} ${getTZAbbr()} · ${match.city}</div>
  </div>`;
}

// ── Slot resolver ────────────────────────────────────────────────────────────
// Turns a slot label ("2nd-B", "3rd-ABCDF") into live team data from standings.
function resolveSlot(slot, overrides = {}) {
  // Single group: "1st-A", "2nd-B", etc.
  const single = slot.match(/^(1st|2nd|3rd|4th)-([A-L])$/);
  if (single) {
    const idx = {'1st':0,'2nd':1,'3rd':2,'4th':3}[single[1]];
    const grp  = single[2];
    const s    = calculateStandings(grp, overrides);
    const entry= s[idx];
    return { type:'single', rank:single[1], group:grp, team:entry?.name||null, pts:entry?.Pts??0, p:entry?.P??0 };
  }
  // Multi-group 3rd place: "3rd-ABCDF"
  const multi = slot.match(/^3rd-([A-L]{2,})$/);
  if (multi) {
    const groups     = multi[1].split('');
    const candidates = groups.map(g => {
      const s = calculateStandings(g, overrides);
      const t = s[2]; // 3rd place
      return { group:g, team:t?.name||null, pts:t?.Pts??0, gd:t?.GD??0, gf:t?.GF??0, p:t?.P??0 };
    });
    return { type:'multi3rd', groups, candidates, played: candidates.filter(c => c.p > 0) };
  }
  return { type:'unknown', slot };
}

function buildTournamentPath(team, rank, group, overrides = {}) {
  const posKey    = `${rank === 1 ? '1st' : '2nd'}-${group}`;
  const r32MatchId= GROUP_POSITION_TO_R32[posKey];
  const r32Match  = r32MatchId ? R32_MATCHES.find(m => m.id === r32MatchId) : null;
  if (!r32Match) return '';

  const opSlot = r32Match.slot1 === posKey ? r32Match.slot2 : r32Match.slot1;
  const opp    = resolveSlot(opSlot, overrides);
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
      <span>${displayName(team)}</span>
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
  // Overrides persist across group switches — use Reset All to clear.
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

// ── Bracket Predictor ─────────────────────────────────────────────────────

function renderBracketPredictor(container) {
  const totalPicks   = Object.keys(STATE.bracketPicks).length;
  const isPost       = isGroupStageOver();
  const activeOvr    = !isPost ? Object.keys(ANALYZER_STATE.overrides || {}) : [];
  const hasGroupOvr  = activeOvr.length > 0;

  const roundDefs = [
    { label:'R32',        dates:'Jun 28–Jul 3', matches: R32_MATCHES },
    { label:'R16',        dates:'Jul 4–7',      matches: KO_ROUNDS.filter(m => m.round === 'R16') },
    { label:'QF',         dates:'Jul 9–11',     matches: KO_ROUNDS.filter(m => m.round === 'QF') },
    { label:'SF',         dates:'Jul 14–15',    matches: KO_ROUNDS.filter(m => m.round === 'SF') },
    { label:'3rd Place',  dates:'Jul 18',       matches: KO_ROUNDS.filter(m => m.round === '3rd Place') },
    { label:'Final 🏆',   dates:'Jul 19',       matches: KO_ROUNDS.filter(m => m.round === 'Final') },
  ];

  let html = `
    <div class="az-header">
      ${hasGroupOvr ? `
        <div class="bp-ovr-banner">
          ⚡ Showing your group what-if scenario (${activeOvr.length} match${activeOvr.length>1?'es':''} overridden)
          <button class="reset-btn" onclick="resetAnalyzerOverrides()">Clear</button>
        </div>` : (!isPost ? '<div style="font-size:11px;color:var(--amber);padding:0 4px 8px">Available after Jun 27 · Previewing with projected qualifiers</div>' : '')}
      ${totalPicks > 0 ? `<button class="reset-btn" style="margin-bottom:8px" onclick="resetBracketPicks()">Reset Bracket Picks (${totalPicks})</button>` : ''}
    </div>`;

  roundDefs.forEach(({ label, dates, matches }) => {
    if (matches.length === 0) return;
    html += `<div class="bp-round-label" style="padding-left:4px">${label} <span class="bp-round-dates">${dates}</span></div>`;
    const isSingle = matches.length <= 1;
    html += `<div class="bp-grid${isSingle ? ' bp-single' : ''}">`;
    matches.forEach(m => { html += buildBracketPickCard(m); });
    html += '</div>';
  });

  container.innerHTML = html;
  if (typeof twemoji !== 'undefined') twemoji.parse(container);
}

function buildBracketPickCard(match) {
  const [t1, t2] = getKOMatchTeams(match.id);
  const picked = getKOWinner(match.id);
  const realResult = getKnockoutResult(match.id);
  const isFinal = !!(realResult && realResult.status === 'FT');

  const c1 = picked === t1 ? 'bp-winner' : (picked && picked !== t1 ? 'bp-loser' : '');
  const c2 = picked === t2 ? 'bp-winner' : (picked && picked !== t2 ? 'bp-loser' : '');

  const dateStr = match.date ? formatPillDate(match.date) : '';
  const hdr = `${match.round || 'R32'} · ${dateStr}${match.city ? ' · ' + match.city : ''}`;

  return `<div class="bp-card">
    <div class="bp-card-hdr">${hdr}</div>
    ${buildPickRow(match.id, t1, match.slot1, c1, isFinal)}
    <div class="bp-divider"></div>
    ${buildPickRow(match.id, t2, match.slot2, c2, isFinal)}
  </div>`;
}

function buildPickRow(matchId, team, slot, cls, isFinal) {
  if (!team) {
    const label = slot.replace('W-M','W').replace('L-M','L');
    return `<div class="bp-team bp-tbd"><span class="bp-tbd-ico">❓</span><span class="bp-name" style="color:var(--dim)">${label}</span></div>`;
  }
  const clickable = !isFinal;
  const onclick   = clickable ? `onclick="pickBracket(${matchId},'${team.replace(/'/g,"\\'")}')"` : '';
  const check     = cls === 'bp-winner' ? '<span class="bp-check">✓</span>' : '';
  return `<div class="bp-team ${cls}" ${onclick} style="${clickable?'cursor:pointer':''}">
    ${getFlag(team)}<span class="bp-name">${displayName(team)}</span>${check}
  </div>`;
}

function pickBracket(matchId, team) {
  STATE.bracketPicks[matchId] = team;
  const content = document.getElementById('tab-content');
  if (content) renderAnalyzer(STATE.demoMode ? document.getElementById('tab-inner') || content : content);
}

function resetBracketPicks() {
  STATE.bracketPicks = {};
  const content = document.getElementById('tab-content');
  if (content) renderAnalyzer(STATE.demoMode ? document.getElementById('tab-inner') || content : content);
}

// ── Calculator: mathematical qualification/elimination ───────────────────────

function getRemainingMatches(group) {
  return SCHEDULE.filter(m => {
    if (m.g !== group) return false;
    const res = (STATE.results.groupMatches || []).find(r =>
      normName(r.team1) === normName(m.t1) && normName(r.team2) === normName(m.t2)
    );
    return !res || (res.status !== 'FT' && res.status !== 'LIVE');
  });
}

// Enumerate all 3^N outcome combinations for remaining matches,
// track best and worst possible rank for each team.
function calcQualStatus(group) {
  const teams    = GROUP_TEAMS[group];
  const rem      = getRemainingMatches(group);
  const numRem   = rem.length;

  // If group is fully played, read standings directly
  if (numRem === 0) {
    const st = calculateStandings(group);
    const status = {};
    st.forEach((t, i) => { status[t.name] = i < 2 ? 'qualified' : 'eliminated'; });
    return status;
  }

  // bestPossible: lowest (best) rank the team can achieve
  // worstPossible: highest (worst) rank the team can achieve
  const best  = {}, worst = {};
  teams.forEach(t => { best[t] = 4; worst[t] = 1; });

  const outcomes = ['home', 'draw', 'away'];
  const total    = Math.pow(3, numRem);

  for (let i = 0; i < total; i++) {
    let n = i;
    const overrides = {};
    rem.forEach(m => { overrides[String(m.id)] = outcomes[n % 3]; n = Math.floor(n / 3); });

    const standings = calculateStandings(group, overrides);
    standings.forEach((t, idx) => {
      const rank = idx + 1;
      if (rank < best[t.name])  best[t.name]  = rank;
      if (rank > worst[t.name]) worst[t.name] = rank;
    });
  }

  const status = {};
  teams.forEach(t => {
    if (worst[t] <= 2)  status[t] = 'qualified';   // top 2 in every scenario
    else if (best[t] > 2) status[t] = 'eliminated'; // never top 2 in any scenario
    else                   status[t] = 'alive';      // possible either way
  });
  return status;
}

function buildCalculatorHTML() {
  const groups  = Object.keys(GROUP_TEAMS);
  let qualified = 0, eliminated = 0, alive = 0;

  // Pre-compute all group statuses
  const allStatus = {};
  groups.forEach(g => {
    allStatus[g] = calcQualStatus(g);
    Object.values(allStatus[g]).forEach(s => {
      if (s === 'qualified')  qualified++;
      else if (s === 'eliminated') eliminated++;
      else alive++;
    });
  });

  // Summary bar
  let html = `<div class="calc-summary">
    <span class="calc-sum-pill calc-q">${qualified} qualified</span>
    <span class="calc-sum-pill calc-e">${eliminated} eliminated</span>
    <span class="calc-sum-pill calc-a">${alive} in contention</span>
  </div>
  <div class="calc-grid">`;

  groups.forEach(g => {
    const st       = allStatus[g];
    const rem      = getRemainingMatches(g).length;
    const played   = 6 - rem; // total group matches = 6 (C(4,2))
    const round    = played <= 2 ? 1 : played <= 4 ? 2 : 3;
    const standings = calculateStandings(g);

    html += `<div class="calc-card">
      <div class="calc-card-hdr">
        <span class="calc-grp-lbl">Group ${g}</span>
        <span class="calc-round-lbl">R${round} · ${played}/6 played</span>
      </div>`;

    standings.forEach((team, idx) => {
      const s = st[team.name] || 'alive';
      const rowCls = s === 'qualified' ? 'calc-row-q' : s === 'eliminated' ? 'calc-row-e' : '';
      const badge  = s === 'qualified'
        ? '<span class="calc-badge calc-bq">Q</span>'
        : s === 'eliminated'
          ? '<span class="calc-badge calc-be">✕</span>'
          : `<span class="calc-badge calc-ba">${team.Pts}p</span>`;

      html += `<div class="calc-row ${rowCls}">
        <span class="calc-rank">${idx+1}</span>
        <span class="flag" style="font-size:15px">${getFlag(team.name)}</span>
        <span class="calc-name">${displayName(team.name)}</span>
        ${badge}
      </div>`;
    });

    html += `</div>`; // calc-card
  });

  html += `</div>`; // calc-grid
  return html;
}
