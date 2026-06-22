// STANDINGS.JS — Groups tab renderer (mockup card layout)

const GROUPS_STATE = { expanded: null, subTab: 'groups' };

function setGroupsSubTab(tab) {
  GROUPS_STATE.subTab = tab;
  const c = document.getElementById('tab-content');
  if (c) renderGroups(STATE.demoMode ? document.getElementById('tab-inner') || c : c);
}

function renderGroups(container) {
  const sub = GROUPS_STATE.subTab || 'groups';

  const top = `<div class="gstd-top">
    <h2 class="gstd-title">Standings</h2>
    <div class="gstd-tabs">
      <button class="gstd-tab${sub === 'groups' ? ' active' : ''}" onclick="setGroupsSubTab('groups')">Groups</button>
      <button class="gstd-tab${sub === 'third' ? ' active' : ''}" onclick="setGroupsSubTab('third')">3rd place</button>
      <button class="gstd-tab${sub === 'scorers' ? ' active' : ''}" onclick="setGroupsSubTab('scorers')">Scorers</button>
    </div>
  </div>`;

  if (sub === 'scorers') {
    container.innerHTML = top + '<div class="gstd-wrap">' + buildScorersHTML() + '</div>';
    return;
  }
  if (sub === 'third') {
    container.innerHTML = top + '<div class="gstd-wrap">' + build3rdPlaceHTML() + '</div>';
    return;
  }

  const groups = Object.keys(GROUP_TEAMS);
  let html = top + '<div class="gstd-wrap">';
  groups.forEach(g => { html += buildGroupStandingCard(g); });
  html += `<div class="gstd-legend"><span class="gstd-legend-bar"></span>Advances to the Round of 32</div>`;
  html += '</div>';
  container.innerHTML = html;
}

function buildGroupStandingCard(g) {
  const standings = calculateStandings(g);
  const hasPlayed = standings.some(s => s.P > 0);
  const maxP = standings.reduce((m, s) => Math.max(m, s.P), 0);
  const mdLabel = maxP === 0 ? 'Not started' : maxP >= 3 ? 'Final standings' : `Matchday ${maxP} of 3`;

  const colHdr = `<div class="gstd-colhdr">
    <span></span><span>TEAM</span>
    <span class="c">P</span><span class="c">GD</span><span class="c">PTS</span>
  </div>`;

  let rows = '';
  standings.forEach((team, idx) => {
    const adv    = hasPlayed && idx < 2;
    const isLast = idx === standings.length - 1;
    const gdCls  = team.GD > 0 ? 'pos' : team.GD < 0 ? 'neg' : 'zero';
    const gdStr  = team.GD > 0 ? `+${team.GD}` : `${team.GD}`;
    rows += `<div class="gstd-row${adv ? ' adv' : ''}${adv && idx === 0 ? ' first' : ''}${isLast ? ' last' : ''}">
      <span class="gstd-rank">${idx + 1}</span>
      <span class="gstd-team">
        <span class="gstd-badge">${getFlag(team.name)}</span>
        <span class="gstd-name team-link" onclick="openTeamProfile('${team.name}')">${displayName(team.name)}</span>
      </span>
      <span class="gstd-p">${team.P}</span>
      <span class="gstd-gd ${gdCls}">${gdStr}</span>
      <span class="gstd-pts">${team.Pts}</span>
    </div>`;
  });

  return `<div class="gstd-card">
    <div class="gstd-hdr">
      <span class="gstd-hdr-title">Group ${g}</span>
      <span class="gstd-hdr-md">${mdLabel}</span>
    </div>
    ${colHdr}${rows}
  </div>`;
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
