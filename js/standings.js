// STANDINGS.JS — Groups tab renderer (matches artifact StandingsGroup)

const GROUPS_STATE = { expanded: null, subTab: 'groups' };

function setGroupsSubTab(tab) {
  GROUPS_STATE.subTab = tab;
  const c = document.getElementById('tab-content');
  if (c) renderGroups(STATE.demoMode ? document.getElementById('tab-inner') || c : c);
}

function renderGroups(container) {
  const sub = GROUPS_STATE.subTab || 'groups';

  const subnav = `<div class="groups-subnav">
    <button class="subnav-btn ${sub==='groups'?'active':''}"  onclick="setGroupsSubTab('groups')">Standings</button>
    <button class="subnav-btn ${sub==='scorers'?'active':''}" onclick="setGroupsSubTab('scorers')">Top Scorers</button>
    <button class="subnav-btn ${sub==='third'?'active':''}"   onclick="setGroupsSubTab('third')">3rd Place Race</button>
  </div>`;

  if (sub === 'scorers') {
    container.innerHTML = subnav + buildScorersHTML();
    if (typeof twemoji !== 'undefined') twemoji.parse(container);
    return;
  }

  if (sub === 'third') {
    container.innerHTML = subnav + build3rdPlaceHTML();
    if (typeof twemoji !== 'undefined') twemoji.parse(container);
    return;
  }

  const groups = Object.keys(GROUP_TEAMS);
  let html = subnav + '<div class="groups-grid">';
  groups.forEach(g => { html += buildGroupCard(g, GROUPS_STATE.expanded === g); });
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-star-team]').forEach(slot => {
    const btn = starBtn(slot.dataset.starTeam, () => renderGroups(container));
    slot.appendChild(btn);
  });
  if (typeof twemoji !== 'undefined') twemoji.parse(container);
}


function buildGroupCard(g, isExpanded) {
  const standings = calculateStandings(g);
  const matches   = SCHEDULE.filter(m => m.g === g);
  const hasPlayed = standings.some(s => s.P > 0);

  if (isExpanded) return buildExpandedCard(g, standings, matches, hasPlayed);
  return buildCompactCard(g, standings, hasPlayed);
}

// Matches artifact StandingsGroup exactly:
// grid-template-columns: 1fr 24px 28px 28px
// green left border when isAdvancing (= hasPlayed && top 2)
// alternating row bg: rgba(255,255,255,0.02) on even rows
// GD: green/red/muted; PTS: gold 12px 800
function buildCompactCard(g, standings, hasPlayed) {
  const colHdr = `<div class="group-col-hdr">
    <span class="group-col-label left">TEAM</span>
    <span class="group-col-label">P</span>
    <span class="group-col-label">GD</span>
    <span class="group-col-label">PTS</span>
  </div>`;

  let rows = '';
  standings.forEach((team, idx) => {
    const isAdvancing = hasPlayed && idx < 2;
    const gdCls = team.GD > 0 ? 'gd-pos' : team.GD < 0 ? 'gd-neg' : 'gd-zero';
    const gdStr = team.GD > 0 ? `+${team.GD}` : `${team.GD}`;
    rows += `<div class="group-row${isAdvancing ? ' advancing' : ''}${idx % 2 === 0 ? ' alt' : ''}">
      <div class="group-row-team">
        <span class="group-row-flag">${getFlag(team.name)}</span>
        <span class="group-row-name team-link" onclick="openTeamProfile('${team.name}')">${team.name}</span>
        <span data-star-team="${team.name}"></span>
      </div>
      <span class="group-row-p">${team.P}</span>
      <span class="group-row-gd ${gdCls}">${gdStr}</span>
      <span class="group-row-pts">${team.Pts}</span>
    </div>`;
  });

  return `<div class="group-card compact" onclick="toggleGroup('${g}')">
    <div class="group-hdr">
      <span class="group-hdr-title">GROUP ${g}</span>
      <span class="group-hdr-arrow">▼</span>
    </div>
    <div class="group-card-body">${colHdr}${rows}</div>
  </div>`;
}

function buildExpandedCard(g, standings, matches, hasPlayed) {
  let tableRows = '';
  standings.forEach((team, idx) => {
    const cls = idx < 2 ? 'q1' : idx === 2 ? 'q3' : 'q4';
    const gdStr = team.GD >= 0 ? `+${team.GD}` : `${team.GD}`;
    tableRows += `<tr class="${cls}">
      <td class="rank-cell">${idx+1}</td>
      <td class="team-cell">
        <span class="flag">${getFlag(team.name)}</span>
        <span class="team-link" onclick="openTeamProfile('${team.name}')">${displayName(team.name)}</span>
        <span data-star-team="${team.name}"></span>
      </td>
      <td>${team.P}</td><td>${team.W}</td><td>${team.D}</td><td>${team.L}</td>
      <td>${gdStr}</td>
      <td class="pts-cell">${team.Pts}</td>
    </tr>`;
  });

  let matchRows = '';
  matches.forEach(m => {
    const result = getMatchResult(m);
    const status = result ? result.status : 'NS';
    const s1 = result ? result.score1 : null, s2 = result ? result.score2 : null;
    const isLive = status === 'LIVE', isFT = status === 'FT';
    let w1 = '', w2 = '';
    if (isFT && s1 !== null) {
      if (s1 > s2) { w1 = 'bold'; w2 = 'dim'; }
      else if (s2 > s1) { w1 = 'dim'; w2 = 'bold'; }
    }
    let scoreStr = '';
    if (isLive) scoreStr = `<span class="live-badge xs"><span class="pulse-dot"></span>LIVE ${s1}–${s2}</span>`;
    else if (isFT && s1 !== null) scoreStr = `<span class="ft-score">${s1}–${s2} FT</span>`;
    else scoreStr = `<span class="ns-time">${formatPillDate(m.date)} · ${formatGameTime(m.date, m.time)} ${getTZAbbr()}</span>`;

    matchRows += `<div class="group-match-row">
      <div class="gm-team ${w1}"><span class="flag">${getFlag(m.t1)}</span><span>${displayName(m.t1)}</span></div>
      <div class="gm-score">${scoreStr}</div>
      <div class="gm-team right ${w2}"><span class="flag">${getFlag(m.t2)}</span><span>${displayName(m.t2)}</span></div>
    </div>`;
  });

  return `<div class="group-card expanded" onclick="toggleGroup('${g}')">
    <div class="group-hdr">
      <span class="group-hdr-title">GROUP ${g}</span>
      <span class="group-hdr-arrow open">▼</span>
    </div>
    <table class="standings-table" onclick="event.stopPropagation()">
      <thead><tr><th>#</th><th class="team-th">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="group-matches" onclick="event.stopPropagation()">${matchRows}</div>
    <div class="legend-row">
      <span class="legend-dot q1"></span>Top 2 advance
      <span class="legend-dot q3"></span>3rd (may advance)
      <span class="legend-dot q4"></span>Eliminated
    </div>
  </div>`;
}

function toggleGroup(g) {
  GROUPS_STATE.expanded = GROUPS_STATE.expanded === g ? null : g;
  const c = document.getElementById('tab-content');
  if (c) renderGroups(STATE.demoMode ? document.getElementById('tab-inner') || c : c);
}

// ── Top Scorers renderer ─────────────────────────────────────────────────
function buildScorersHTML() {
  const scorers = buildTopScorers();

  if (!scorers.length) {
    return `<div class="empty-state" style="margin-top:24px">
      ⚽<br>Goals will appear here once matches are played.
    </div>`;
  }

  const maxGoals = scorers[0].goals;
  let rank = 0, prev = -1, html = '<div class="scorers-list">';

  scorers.forEach((s, i) => {
    if (s.goals !== prev) { rank = i + 1; prev = s.goals; }
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
    const rankEl = medal
      ? `<span class="scorer-rank medal">${medal}</span>`
      : `<span class="scorer-rank num">${rank}</span>`;
    const barPct = Math.round((s.goals / maxGoals) * 100);

    html += `<div class="scorer-row">
      ${rankEl}
      <span class="scorer-flag">${getFlag(s.team)}</span>
      <div class="scorer-info">
        <span class="scorer-name">${s.name}</span>
        <span class="scorer-team">${displayName(s.team)}</span>
      </div>
      <div class="scorer-bar-wrap">
        <div class="scorer-bar" style="width:${barPct}%"></div>
      </div>
      <span class="scorer-goals">${s.goals}</span>
    </div>`;
  });

  return html + '</div>';
}

// ── 3rd Place Race renderer ──────────────────────────────────────────────
function build3rdPlaceHTML() {
  // Gather the 3rd-place team from every group
  const teams = Object.keys(GROUP_TEAMS).map(g => {
    const st = calculateStandings(g);
    const t  = st[2]; // index 2 = 3rd place
    return t ? { group:g, name:t.name, P:t.P, Pts:t.Pts, GD:t.GD, GF:t.GF } : null;
  }).filter(Boolean);

  // Rank by FIFA 3rd-place tiebreakers: Pts → GD → GF
  teams.sort((a,b) => b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF);

  const anyPlayed = teams.some(t => t.P > 0);

  const isFinalRound  = getTodayCT() >= '2026-06-24' && getTodayCT() <= '2026-06-27';
  const isAfterGroups = getTodayCT() >  '2026-06-27';
  const note = isAfterGroups
    ? 'Group stage complete — 8 teams qualified via 3rd place.'
    : isFinalRound
    ? '🔥 Final group round — standings updating live!'
    : 'Top 8 of 12 third-place teams advance · Final places decided Jun 27.';

  let html = `
  <div class="third-title">3rd Place Race</div>
  <div class="third-note">${note}</div>
  <div class="third-list">
    <div class="third-col-hdr">
      <span></span>
      <span></span>
      <span></span>
      <span class="th-name">Team</span>
      <span class="th-stat">P</span>
      <span class="th-stat">Pts</span>
      <span class="th-stat">GD</span>
      <span class="th-stat">GF</span>
      <span></span>
    </div>`;

  teams.forEach((t, i) => {
    const rank       = i + 1;
    const advancing  = rank <= 8;
    const cutoff     = rank === 9;
    const gdStr      = t.GD > 0 ? `+${t.GD}` : `${t.GD}`;
    const noGames    = t.P === 0;

    if (cutoff) {
      html += `<div class="third-cutoff">
        <span>──</span><span class="third-cutoff-txt">Not qualifying (${12 - 8} teams)</span><span>──</span>
      </div>`;
    }

    html += `<div class="third-row ${advancing ? 'third-in' : 'third-out'} ${noGames ? 'third-idle' : ''}">
      <span class="third-rank">${rank}</span>
      <span class="third-grp-badge">${t.group}</span>
      <span class="flag">${getFlag(t.name)}</span>
      <span class="third-name">${displayName(t.name)}</span>
      <span class="th-stat dim">${noGames ? '–' : t.P}</span>
      <span class="th-stat bold">${noGames ? '–' : t.Pts}</span>
      <span class="th-stat ${t.GD>0?'pos':t.GD<0?'neg':'dim'}">${noGames ? '–' : gdStr}</span>
      <span class="th-stat dim">${noGames ? '–' : t.GF}</span>
      <span class="third-status">${noGames ? '' : advancing ? '✅' : '❌'}</span>
    </div>`;
  });

  if (!anyPlayed) {
    html += `<div class="empty-state" style="padding:24px">
      ⚽ Standings will update as group matches are played.
    </div>`;
  }

  html += '</div>'; // close .third-list
  return html;
}
