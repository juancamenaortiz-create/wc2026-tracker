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

// Circular flag badge (shared analyzer visual vocabulary)
function azFlag(team, size) { size = size || 18; return `<span class="cflag" style="width:${size}px;height:${size}px">${getFlag(team)}</span>`; }

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
  const subnav = `<h2 class="az-page-title">Analyzer</h2>
  <div class="groups-subnav">
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
    const gd  = team.GD > 0 ? '+'+team.GD : ''+team.GD;
    standingsHtml += `<div class="az-srow ${cls}">
      <span class="az-srank">${idx+1}</span>
      ${azFlag(team.name, 20)}
      <span class="az-sname team-link" onclick="openTeamProfile('${team.name.replace(/'/g,"\\'")}')">${displayName(team.name)}</span>
      <span data-star-team="${team.name}"></span>
      <span class="az-sgd">${gd}</span>
      <span class="az-spts">${team.Pts}</span>
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
        ${azFlag(m.t1, 16)}
        <span>${m.t1}</span>
        <span class="az-score">${s1}–${s2}</span>
        <span>${m.t2}</span>
        ${azFlag(m.t2, 16)}
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
      <div class="az-section-title">Projected &middot; Group ${g} ${thisGroupWhatIf ? '<span class="what-if-badge">WHAT-IF</span>' : ''}</div>
      ${standingsHtml}
    </div>

    ${remainingMatches.length > 0 ? `
    <div class="az-section">
      <div class="az-section-title">What-If Scenarios
        ${hasAnyOverrides ? `<button class="reset-btn" onclick="resetAnalyzerOverrides()">Reset All${totalOverrides > 1 ? ` (${totalOverrides})` : ''}</button>` : ''}
      </div>
      ${remainingHtml}
    </div>` : ''}

    ${playedMatches.length > 0 ? `
    <div class="az-section">
      <div class="az-section-title">Played</div>
      ${playedHtml}
    </div>` : ''}

    <div class="az-section">
      <div class="az-section-title">Tournament Path</div>
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
      ${azFlag(t1, 18)}
      <span class="toggle-team">${displayName(t1)}</span>
      <span class="vs-text">vs</span>
      <span class="toggle-team">${displayName(t2)}</span>
      ${azFlag(t2, 18)}
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
        <div class="path-opp">${azFlag(opp.team, 16)}<span class="path-opp-name">${opp.team}</span></div>
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
          ${azFlag(c.team, 14)}<span class="path-cand-name">${c.team}</span>
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
    `<div class="path-step path-r32${wideClass}">${r32Inner}</div>` +
    plainSteps.map(s =>
      `<div class="path-arrow">›</div>
       <div class="path-step open">
         <span class="path-round">${s.round}</span>
         <span class="path-label">${s.label}</span>
       </div>`
    ).join('');

  return `<div class="tournament-path">
    <div class="path-team-header">
      ${azFlag(team, 22)}
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

// ── Bracket Predictor — horizontal bracket tree ────────────────────────────

function renderBracketPredictor(container) {
  const numR32  = 16;
  const slotR32 = R32_SLOT;
  const TOTAL_H = numR32 * slotR32 + LABEL_H + 16;

  const koById = function(id) { return KO_ROUNDS.find(function(r){return r.id===id;}) || {}; };
  const r16Info = [89,90,93,94,91,92,95,96].map(function(id){return Object.assign({matchId:id},koById(id));});
  const roundCards = [
    buildR32Cards(slotR32),
    buildRoundCards(1, slotR32, 2,  r16Info),
    buildRoundCards(2, slotR32, 4,  [97,98,99,100].map(function(id){return Object.assign({matchId:id},koById(id));})),
    buildRoundCards(3, slotR32, 8,  [101,102].map(function(id){return Object.assign({matchId:id},koById(id));})),
    buildRoundCards(4, slotR32, 16, [104].map(function(id){return Object.assign({matchId:id},koById(id));})),
  ];

  // Confidence per round: R32 = results in, R16 = likely, QF/SF/Final = open
  const CONF = ['bp-confirmed','bp-likely','bp-open','bp-open','bp-open'];

  // SVG connector lines
  var svgLines = '';
  for (var r = 0; r < 4; r++) {
    for (var i = 0; i < roundCards[r].length; i += 2) {
      var a    = roundCards[r][i];
      var b    = roundCards[r][i + 1];
      var next = roundCards[r + 1][Math.floor(i / 2)];
      if (!a || !b || !next) continue;
      var ax   = r * COL_STRIDE + CARD_W;
      var ay   = a.midY, by = b.midY;
      var nx   = (r + 1) * COL_STRIDE, ny = next.midY;
      var midX = ax + COL_GAP / 2;
      svgLines += '<polyline class="bracket-line" fill="none" points="'
        + ax+','+ay+' '+midX+','+ay+' '+midX+','+by+' '+ax+','+by
        +' '+midX+','+by+' '+midX+','+ny+' '+nx+','+ny+'"/>';
    }
  }

  // Build column cards + round labels
  var cardsHtml = '';
  ROUNDS.forEach(function(round, r) {
    var colX = r * COL_STRIDE;
    var roundDate = roundLabelDate(roundCards[r]);
    cardsHtml += '<div class="bracket-col" style="left:'+colX+'px" data-round="'+round+'">'
      + '<div class="round-label '+CONF[r]+'">'+round
      + (roundDate ? '<span class="round-date"> · '+roundDate+'</span>' : '')
      + '</div>';
    roundCards[r].forEach(function(card){ cardsHtml += buildBracketCard(card, r); });
    cardsHtml += '</div>';
  });

  container.innerHTML =
    '<div class="bp-proj-header">'
    + '<div><div class="bp-proj-title">Projected bracket</div>'
    + '<div class="bp-proj-sub">Based on current standings · swipe to explore later rounds</div></div>'
    + '<div class="bp-conf-legend">'
    + '<span class="bp-conf-item"><span class="bp-conf-dot conf-confirmed"></span>Confirmed</span>'
    + '<span class="bp-conf-item"><span class="bp-conf-dot conf-likely"></span>Likely</span>'
    + '<span class="bp-conf-item"><span class="bp-conf-dot conf-open"></span>Open</span>'
    + '</div></div>'
    + '<div class="bracket-scroll-wrap">'
    + '<div class="bracket-wrap" style="width:'+TOTAL_W+'px;height:'+(TOTAL_H+90)+'px">'
    + '<svg class="bracket-svg" width="'+TOTAL_W+'" height="'+TOTAL_H+'" style="position:absolute;top:0;left:0;pointer-events:none">'+svgLines+'</svg>'
    + cardsHtml
    + '</div></div>'
    + buildThirdPlaceCard();

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
    return `<div class="bp-team bp-tbd"><span class="cflag empty" style="width:18px;height:18px"></span><span class="bp-name" style="color:var(--dim)">${label}</span></div>`;
  }
  const clickable = !isFinal;
  const onclick   = clickable ? `onclick="pickBracket(${matchId},'${team.replace(/'/g,"\\'")}')"` : '';
  const check     = cls === 'bp-winner' ? '<span class="bp-check">✓</span>' : '';
  return `<div class="bp-team ${cls}" ${onclick} style="${clickable?'cursor:pointer':''}">
    ${azFlag(team, 18)}<span class="bp-name">${displayName(team)}</span>${check}
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
        <span class="calc-round-lbl">${played}/6</span>
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
        ${azFlag(team.name, 17)}
        <span class="calc-name">${displayName(team.name)}</span>
        ${badge}
      </div>`;
    });

    html += `</div>`; // calc-card
  });

  html += `</div>`; // calc-grid
  return html;
}
