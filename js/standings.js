// STANDINGS.JS — Groups tab renderer (mockup card layout)

const GROUPS_STATE = { expanded: null, subTab: 'groups' };

// Animate scorer bars after render — works from any entry point
function _animateScorerBars(container) {
  const bars = (container || document).querySelectorAll('.scorer-bar[data-w]');
  if (!bars.length) return;
  setTimeout(function() {
    bars.forEach(function(b, i) {
      setTimeout(function() { b.style.width = b.dataset.w + '%'; }, i * 25);
    });
  }, 30);
}

function setGroupsSubTab(tab) {
  GROUPS_STATE.subTab = tab;
  const c = document.getElementById('tab-content');
  const target = STATE.demoMode ? (document.getElementById('tab-inner') || c) : c;
  if (target) {
    renderGroups(target);
    const wrap = target.querySelector('.gstd-wrap');
    if (wrap) {
      wrap.classList.remove('subtab-enter');
      void wrap.offsetWidth;
      wrap.classList.add('subtab-enter');
    }
    _animateScorerBars(target);
  }
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
    _animateScorerBars(container);
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
        ${isMyTeam(team.name) ? '<span class="gstd-star">★</span>' : ''}
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
    return `<div class="scorers-header"><div><div class="scorers-title">Top Scorers</div><div class="scorers-subtitle">Golden Boot race</div></div><span class="scorers-shoe">👟</span></div>
    <div class="empty-state" style="margin-top:24px">
      ⚽<br>Goals will appear here once matches are played.
    </div>`;
  }

  const maxGoals    = scorers[0].goals;
  const totalGames  = (STATE.results.groupMatches || []).filter(m => m.score1 != null).length;

  // derive a short abbreviation from the team name
  const ABBR_MAP = {
    'Argentina':'ARG','Australia':'AUS','Belgium':'BEL','Brazil':'BRA',
    'Canada':'CAN','Colombia':'COL','Croatia':'CRO','Denmark':'DEN',
    'Ecuador':'ECU','Egypt':'EGY','England':'ENG','France':'FRA',
    'Germany':'GER','Ghana':'GHA','Iran':'IRN','Italy':'ITA',
    'Japan':'JPN','Mexico':'MEX','Morocco':'MAR','Netherlands':'NED',
    'Nigeria':'NGA','Norway':'NOR','Poland':'POL','Portugal':'POR',
    'Qatar':'QAT','Saudi Arabia':'KSA','Senegal':'SEN','Serbia':'SRB',
    'South Korea':'KOR','Spain':'ESP','Sweden':'SWE','Switzerland':'SUI',
    'Tunisia':'TUN','United States':'USA','Uruguay':'URU','Wales':'WAL',
  };
  function teamAbbr(teamName) {
    if (ABBR_MAP[teamName]) return ABBR_MAP[teamName];
    const d = displayName(teamName);
    if (ABBR_MAP[d]) return ABBR_MAP[d];
    const w = d.trim().split(/\s+/);
    if (w.length === 1) return d.slice(0,3).toUpperCase();
    return (w[0][0] + w[1].slice(0,2)).toUpperCase();
  }

  // player initials from full name
  function initials(name) {
    const p = name.trim().split(/\s+/);
    return (p[0][0] + (p[p.length - 1][0] || '')).toUpperCase();
  }

  let rank = 0, prev = -1, html = '';
  scorers.forEach((s, i) => {
    if (s.goals !== prev) { rank = i + 1; prev = s.goals; }
    const medal   = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
    const rankEl  = medal
      ? `<span class="scorer-rank medal">${medal}</span>`
      : `<span class="scorer-rank num">${rank}</span>`;
    const barPct  = Math.round((s.goals / maxGoals) * 100);
    const topOne  = rank === 1 ? ' top1' : '';

    html += `<div class="scorer-row${topOne}">
      ${rankEl}
      <span class="scorer-avatar">${initials(s.name)}</span>
      <div class="scorer-info">
        <div class="scorer-name-row">
          <span class="scorer-name">${s.name}</span>
          <span class="scorer-abbr">${teamAbbr(s.team)}</span>
        </div>
        <div class="scorer-bar-wrap"><div class="scorer-bar" data-w="${barPct}" style="width:0"></div></div>
      </div>
      <div class="scorer-goals-wrap">
        <div class="scorer-goals">${s.goals}</div>
        <div class="scorer-goals-lbl">GOALS</div>
      </div>
    </div>`;
  });

  return `<div class="scorers-header">
    <div>
      <div class="scorers-title">Top Scorers</div>
      <div class="scorers-subtitle">Golden Boot race · ${totalGames} match${totalGames === 1 ? '' : 'es'} played</div>
    </div>
    <span class="scorers-shoe">👟</span>
  </div>
  <div class="scorers-list">${html}</div>`;
}

// ── 3rd Place Race renderer ──────────────────────────────────────────────
function build3rdPlaceHTML() {
  // Gather the 3rd-place team from every group
  const teams = Object.keys(GROUP_TEAMS).map(g => {
    const st = calculateStandings(g);
    const t  = st[2]; // index 2 = 3rd place
    return t ? { group: g, name: t.name, P: t.P, Pts: t.Pts, GD: t.GD, GF: t.GF } : null;
  }).filter(Boolean);

  // Rank by FIFA 3rd-place tiebreakers: Pts → GD → GF
  teams.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);

  const anyPlayed     = teams.some(t => t.P > 0);
  const advanceCount  = 8;
  const eliminated    = teams.length - advanceCount;

  const isFinalRound  = getTodayCT() >= '2026-06-24' && getTodayCT() <= '2026-06-27';
  const isAfterGroups = getTodayCT() >  '2026-06-27';
  const note = isAfterGroups
    ? `Group stage complete — ${advanceCount} teams qualified via 3rd place.`
    : isFinalRound
    ? '🔥 Final group round — places updating live.'
    : `Top ${advanceCount} of ${teams.length} third-placed teams advance to the Round of 32 · final places decided Jun 27.`;

  let rows = '';
  teams.forEach((t, i) => {
    const rank      = i + 1;
    const advancing = rank <= advanceCount;
    const noGames   = t.P === 0;
    const gdStr     = t.GD > 0 ? `+${t.GD}` : `${t.GD}`;
    const gdCls     = t.GD > 0 ? 'pos' : t.GD < 0 ? 'neg' : '';

    if (rank === advanceCount + 1 && eliminated > 0) {
      rows += `<div class="third-cutoff">
        <span class="third-cutoff-line"></span>
        <span class="third-cutoff-txt">Cutoff · bottom ${eliminated} eliminated</span>
        <span class="third-cutoff-line"></span>
      </div>`;
    }

    rows += `<div class="third-row ${advancing ? 'third-in' : 'third-out'}${noGames ? ' third-idle' : ''}">
      <span class="third-rank">${rank}</span>
      <span class="third-grp">${t.group}</span>
      <span class="third-team">
        <span class="gstd-badge">${getFlag(t.name)}</span>
        <span class="third-name team-link" onclick="openTeamProfile('${t.name}')">${displayName(t.name)}</span>
      </span>
      <span class="th-stat">${noGames ? '–' : t.P}</span>
      <span class="th-stat ${gdCls}">${noGames ? '–' : gdStr}</span>
      <span class="th-stat pts">${noGames ? '–' : t.Pts}</span>
    </div>`;
  });

  const empty = !anyPlayed
    ? `<div class="empty-state" style="padding:24px">⚽ Standings will update as group matches are played.</div>`
    : '';

  return `
  <div class="third-title">3rd Place Race</div>
  <div class="third-note">${note}</div>
  <div class="third-list">
    <div class="third-colhdr">
      <span></span><span class="c">GRP</span><span>TEAM</span>
      <span class="c">P</span><span class="c">GD</span><span class="c">PTS</span>
    </div>
    ${rows}${empty}
  </div>
  <div class="gstd-legend"><span class="gstd-legend-bar"></span>Qualifies for Round of 32</div>`;
}
