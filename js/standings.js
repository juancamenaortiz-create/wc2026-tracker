// STANDINGS.JS — Groups tab renderer (matches artifact StandingsGroup)

const GROUPS_STATE = { expanded: null };

function renderGroups(container) {
  const groups = Object.keys(GROUP_TEAMS);
  let html = '<div class="groups-grid">';
  groups.forEach(g => { html += buildGroupCard(g, GROUPS_STATE.expanded === g); });
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-star-team]').forEach(slot => {
    const btn = starBtn(slot.dataset.starTeam, () => renderGroups(container));
    slot.appendChild(btn);
  });
}
  if (typeof twemoji !== 'undefined') twemoji.parse(container);


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
        <span class="group-row-name">${team.name}</span>
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
        <span>${team.name}</span>
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
    else scoreStr = `<span class="ns-time">${formatPillDate(m.date)} · ${m.time} CT</span>`;

    matchRows += `<div class="group-match-row">
      <div class="gm-team ${w1}"><span class="flag">${getFlag(m.t1)}</span><span>${m.t1}</span></div>
      <div class="gm-score">${scoreStr}</div>
      <div class="gm-team right ${w2}"><span>${m.t2}</span><span class="flag">${getFlag(m.t2)}</span></div>
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
