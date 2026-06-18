// ═══════════════════════════════════════════
// MATCHDETAIL.JS — Full match detail modal
// ═══════════════════════════════════════════

const MD_CACHE = {}; // espnId → raw summary data

// ── Open / close ──────────────────────────────────────────────────────────────

function openMatchDetail(scheduleMatchId) {
  const modal = document.getElementById('match-detail-modal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderMatchDetail(scheduleMatchId);
}

function closeMatchDetail() {
  const modal = document.getElementById('match-detail-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Main renderer ─────────────────────────────────────────────────────────────

async function renderMatchDetail(scheduleMatchId) {
  const content = document.getElementById('match-detail-content');
  if (!content) return;

  const result = [
    ...(STATE.results.groupMatches   || []),
    ...(STATE.results.knockoutMatches || []),
  ].find(r => r.matchId === scheduleMatchId);

  const sched = SCHEDULE.find(m => m.id === scheduleMatchId)
             || R32_MATCHES.find(m => m.id === scheduleMatchId);

  if (!sched) { content.innerHTML = `<div class="md-empty">Match not found.</div>`; return; }

  const isFT   = result?.status === 'FT';
  const isLive = result?.status === 'LIVE';

  // Show basic info right away (no wait)
  content.innerHTML = buildMDHeader(result, sched)
    + (result ? buildMDTimeline(result) : '')
    + (result ? buildMDBasicStats(result.stats) : '')
    + `<div id="md-rich"></div>`;

  // Fetch ESPN summary for rich data (lineups, player stats, etc.)
  const espnId = result?.espnId;
  const richEl = document.getElementById('md-rich');
  if (espnId && (isFT || isLive)) {
    richEl.innerHTML = `<div class="md-loading"><div class="md-spinner"></div><span>Loading lineup &amp; player stats…</span></div>`;
    try {
      const summary = await fetchMatchSummary(espnId);
      richEl.innerHTML = buildMDRichSections(summary, result, sched);
      if (typeof twemoji !== 'undefined') twemoji.parse(content);
    } catch(e) {
      richEl.innerHTML = `<div class="md-empty" style="margin-top:8px">Detailed stats unavailable right now.</div>`;
    }
  } else if (isFT || isLive) {
    richEl.innerHTML = `<div class="md-empty">Lineups will appear shortly.</div>`;
  }

  if (typeof twemoji !== 'undefined') twemoji.parse(content);
}

async function fetchMatchSummary(espnId) {
  if (MD_CACHE[espnId]) return MD_CACHE[espnId];
  // site.web.api.espn.com returns richer soccer data (lineups, rosters) than site.api
  const resp = await fetch(
    `https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnId}&region=us&lang=en&contentorigin=espn`,
    { signal: AbortSignal.timeout(9000) }
  );
  if (!resp.ok) throw new Error(`ESPN ${resp.status}`);
  const data = await resp.json();
  MD_CACHE[espnId] = data;
  return data;
}

// ── Header ────────────────────────────────────────────────────────────────────

function buildMDHeader(result, sched) {
  const t1Name = result?.team1 || sched.t1;
  const t2Name = result?.team2 || sched.t2;
  const score  = (result && result.status !== 'NS')
    ? `${result.score1}<span class="md-score-sep">–</span>${result.score2}` : 'vs';

  let statusStr = sched.time + ' CT';
  if (result?.status === 'FT') {
    const sub = result.substatus;
    statusStr = 'Full Time'
      + (sub === 'AET' ? ' (AET)' : '')
      + (sub === 'PSO' && result.penScore1 != null ? ` · Pens ${result.penScore1}–${result.penScore2}` : '');
  } else if (result?.status === 'LIVE') {
    statusStr = `${result.substatus === 'HT' ? 'Half Time' : (result.clock || 'Live')}`;
  }

  const round = sched.g ? `Group ${sched.g}` : (sched.round || 'Knockout');

  return `<div class="md-header">
    <div class="md-round-label">${round} · ${formatDate(sched.date)}</div>
    <div class="md-teams">
      <div class="md-team">
        <span class="md-flag">${getFlag(t1Name)}</span>
        <span class="md-tname">${displayName(t1Name)}</span>
      </div>
      <div class="md-score-block">
        <div class="md-score">${score}</div>
        <div class="md-status-str">${statusStr}</div>
      </div>
      <div class="md-team md-team-r">
        <span class="md-tname">${displayName(t2Name)}</span>
        <span class="md-flag">${getFlag(t2Name)}</span>
      </div>
    </div>
    <div class="md-city">📍 ${sched.city}</div>
  </div>`;
}

// ── Timeline (from scoreboard events) ────────────────────────────────────────

function buildMDTimeline(result) {
  if (!result?.events?.length) return '';
  const html = buildTimeline(result); // from app.js
  if (!html) return '';
  return `<div class="md-section">
    <div class="md-section-title">⏱ Timeline</div>
    ${html}
  </div>`;
}

// ── Basic stats (from scoreboard data) ───────────────────────────────────────

const MD_STAT_DEFS = [
  { key:'possessionPct',  label:'Possession',  fmt: v=>v+'%', isPct:true },
  { key:'totalShots',     label:'Shots' },
  { key:'shotsOnTarget',  label:'On Target' },
  { key:'saves',          label:'Saves' },
  { key:'wonCorners',     label:'Corners' },
  { key:'foulsCommitted', label:'Fouls' },
  { key:'offsides',       label:'Offsides' },
];

function buildMDBasicStats(stats) {
  if (!stats) return '';
  const s1 = stats.t1 || {}, s2 = stats.t2 || {};
  const rows = MD_STAT_DEFS.map(({ key, label, fmt, isPct }) => {
    const v1 = s1[key], v2 = s2[key];
    if (v1 == null && v2 == null) return '';
    const a = v1 ?? 0, b = v2 ?? 0;
    const total = isPct ? 100 : (a + b || 1);
    const pct1  = Math.round((a / total) * 100);
    const disp  = fmt || (v => v);
    return `<div class="stat-row">
      <span class="stat-val">${disp(a)}</span>
      <div class="stat-mid">
        <div class="stat-bar"><div class="stat-bar-1" style="width:${pct1}%"></div><div class="stat-bar-2" style="width:${100-pct1}%"></div></div>
        <span class="stat-label">${label}</span>
      </div>
      <span class="stat-val r">${disp(b)}</span>
    </div>`;
  }).filter(Boolean).join('');

  if (!rows) return '';
  return `<div class="md-section">
    <div class="md-section-title">📊 Match Stats</div>
    <div class="match-stats-panel">${rows}</div>
  </div>`;
}

// ── Rich sections (ESPN summary) ─────────────────────────────────────────────

function buildMDRichSections(data, result, sched) {
  const gameInfo = data.gameInfo || {};
  const attendance = gameInfo.attendance;
  const ref = (gameInfo.officials || [])
    .find(o => (o.position?.name || o.position?.displayName || '').toLowerCase().includes('ref'))
    ?.displayName || '';

  // ESPN soccer summary structure:
  //   boxscore.teams[i].statistics → team-level stats (possession, shots, etc.)
  //   rosters[i].athletes[]        → player lineups, formations, subs (TOP-LEVEL key)
  const boxTeams = data.boxscore?.teams || [];

  // Rosters are at data.rosters[], not data.boxscore.players
  const rosters = data.rosters || data.boxscore?.players || [];

  const findIn = (arr, name) =>
    arr.find(t => {
      const n = espnToApp(t.team?.displayName || t.displayName || t.name || '');
      return normName(n) === normName(name);
    });

  const t1Stats   = findIn(boxTeams, result.team1) || boxTeams[0] || {};
  const t2Stats   = findIn(boxTeams, result.team2) || boxTeams[1] || {};
  const t1Players = findIn(rosters,  result.team1) || rosters[0]  || {};
  const t2Players = findIn(rosters,  result.team2) || rosters[1]  || {};

  // Formation may be on roster entry or team entry
  if (!t1Players.formation) t1Players.formation = t1Stats.formation || '';
  if (!t2Players.formation) t2Players.formation = t2Stats.formation || '';

  let html = '';

  // Game info pill
  if (attendance || ref) {
    html += `<div class="md-gameinfo">
      ${attendance ? `<span>👥 ${attendance.toLocaleString()} fans</span>` : ''}
      ${ref        ? `<span>🟡 ${ref}</span>` : ''}
    </div>`;
  }

  // Enhanced stats (passes t1Stats/t2Stats which have statistics[])
  const enhanced = buildMDEnhancedStats(t1Stats, t2Stats, result.stats);
  if (enhanced) {
    html += `<div class="md-section">
      <div class="md-section-title">📊 Match Stats</div>
      <div class="match-stats-panel">${enhanced}</div>
    </div>`;
  }

  // Substitutions (uses t1Players/t2Players which have athletes[])
  const subs = buildMDSubs(t1Players, t2Players, result);
  if (subs) {
    html += `<div class="md-section">
      <div class="md-section-title">🔄 Substitutions</div>
      <div class="tl-wrap">${subs}</div>
    </div>`;
  }

  // Lineups
  const lineups = buildMDLineups(t1Players, t2Players, result);
  if (lineups) {
    html += `<div class="md-section">
      <div class="md-section-title">📋 Lineups</div>
      ${lineups}
    </div>`;
  }

  // Match leaders
  const pstats = buildMDPlayerStats(t1Players, t2Players, result, data);
  if (pstats) {
    html += `<div class="md-section">
      <div class="md-section-title">⭐ Match Leaders</div>
      <div class="md-leaders">${pstats}</div>
    </div>`;
  }

  return html;
}

// ── Enhanced stats (summary adds passing accuracy + tackles) ──────────────────

const MD_ENHANCED_DEFS = [
  { key:'possessionPct',   label:'Possession',     fmt:v=>v+'%', isPct:true },
  { key:'totalShots',      label:'Shots' },
  { key:'shotsOnTarget',   label:'On Target' },
  { key:'saves',           label:'Saves' },
  { key:'passingAccuracy', label:'Pass Accuracy',  fmt:v=>v+'%', isPct:true },
  { key:'totalTackles',    label:'Tackles' },
  { key:'yellowCards',     label:'Yellow Cards' },
  { key:'wonCorners',      label:'Corners' },
  { key:'foulsCommitted',  label:'Fouls' },
  { key:'offsides',        label:'Offsides' },
];

function getSummaryStat(teamData, key) {
  const st = (teamData?.statistics || []).find(s =>
    s.name === key || s.label?.toLowerCase() === key.toLowerCase()
  );
  if (!st) return null;
  const v = parseFloat(st.displayValue);
  return isNaN(v) ? st.displayValue : v;
}

function buildMDEnhancedStats(t1, t2, existing) {
  const s1e = existing?.t1 || {}, s2e = existing?.t2 || {};
  const rows = MD_ENHANCED_DEFS.map(({ key, label, fmt, isPct }) => {
    const v1 = getSummaryStat(t1, key) ?? s1e[key];
    const v2 = getSummaryStat(t2, key) ?? s2e[key];
    if (v1 == null && v2 == null) return '';
    const a = parseFloat(v1) || 0, b = parseFloat(v2) || 0;
    const total = isPct ? 100 : (a + b || 1);
    const pct1  = Math.round((a / total) * 100);
    const disp  = fmt || (v => Math.round(v));
    return `<div class="stat-row">
      <span class="stat-val">${disp(a)}</span>
      <div class="stat-mid">
        <div class="stat-bar"><div class="stat-bar-1" style="width:${pct1}%"></div><div class="stat-bar-2" style="width:${100-pct1}%"></div></div>
        <span class="stat-label">${label}</span>
      </div>
      <span class="stat-val r">${disp(b)}</span>
    </div>`;
  }).filter(Boolean).join('');
  return rows;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mdGetAthletes(teamData) {
  if (!teamData) return [];
  // Flat athletes array (soccer rosters[] style)
  if (Array.isArray(teamData.athletes)) return teamData.athletes;
  // roster[] key
  if (Array.isArray(teamData.roster)) return teamData.roster;
  // Nested in players groups (american sports style)
  const list = [];
  for (const pg of (teamData.players || [])) {
    for (const ath of (pg.athletes || [])) list.push(ath);
  }
  return list;
}

// ── Substitutions (from scoreboard events — accurate, no roster guesswork) ───────

function buildMDSubs(t1, t2, result) {
  // Only show substitutions when ESPN's scoreboard includes them as events
  // (Roster data is unreliable — subbedIn/formationPlace is set on all bench players)
  const subEvents = (result.events || []).filter(e => e.sub);
  if (!subEvents.length) return '';

  return subEvents.map(e => {
    const isT1 = e.tid === result.tid1;
    const line = `<span class="sub-out">↓ ${e.p}</span><span class="sub-in"> ↑ ${e.pIn}</span>`;
    return `<div class="tl-row">
      <div class="tl-side tl-left">${isT1 ? line : ''}</div>
      <div class="tl-min">${e.min}</div>
      <div class="tl-side tl-right">${!isT1 ? line : ''}</div>
    </div>`;
  }).join('');
}

// ── Lineups ───────────────────────────────────────────────────────────────────

const POS_ORDER_MAP = {
  GK:0, G:0,
  CB:1, LB:1, RB:1, WB:1, D:1, DEF:1,
  DM:2, CM:2, AM:2, M:2, MF:2, MID:2,
  LW:3, RW:3, ST:3, CF:3, F:3, FW:3, ATT:3,
};
function posOrd(abbr) { return POS_ORDER_MAP[(abbr||'').toUpperCase()] ?? 2; }

function buildMDLineups(t1, t2, result) {
  const parseLineup = (teamData) => {
    const starters = [], bench = [];
    const formation = teamData?.formation || '';
    mdGetAthletes(teamData).forEach(a => {
      const p = {
        name:      a.athlete?.shortName || a.athlete?.displayName || '?',
        jersey:    a.jersey || '',              // direct on athlete (not a.athlete.jersey)
        pos:       a.position?.abbreviation || '', // direct on athlete
        subbedOut: !!(a.subbedOut || a.didSubOut),
      };
      (a.starter ? starters : bench).push(p);
    });
    starters.sort((a,b) => posOrd(a.pos) - posOrd(b.pos));
    return { formation, starters, bench };
  };

  const l1 = parseLineup(t1), l2 = parseLineup(t2);
  if (!l1.starters.length && !l2.starters.length) return '';

  const playerCell = (p, right = false) =>
    `<div class="lu-player${p.subbedOut ? ' lu-subbed' : ''}${right ? ' lu-r' : ''}">
      ${right ? '' : (p.jersey ? `<span class="lu-num">${p.jersey}</span>` : '')}
      <span class="lu-name">${p.name}</span>
      ${p.pos ? `<span class="lu-pos">${p.pos}</span>` : ''}
      ${p.subbedOut ? '<span class="lu-out-icon">↓</span>' : ''}
      ${right ? (p.jersey ? `<span class="lu-num">${p.jersey}</span>` : '') : ''}
    </div>`;

  const maxLen = Math.max(l1.starters.length, l2.starters.length);
  let rows = '';
  for (let i = 0; i < maxLen; i++) {
    const p1 = l1.starters[i], p2 = l2.starters[i];
    rows += `<div class="lu-row">
      <div class="lu-cell">${p1 ? playerCell(p1, false) : ''}</div>
      <div class="lu-cell lu-cell-r">${p2 ? playerCell(p2, true) : ''}</div>
    </div>`;
  }

  const benchRow = (players) => players.map(p =>
    `<span class="lu-bench-pill">${p.jersey ? p.jersey+' ' : ''}${p.name}</span>`
  ).join('');

  return `<div class="lu-team-headers">
    <span>${getFlag(result.team1)} ${displayName(result.team1)}${l1.formation ? ` <span class="lu-form">${l1.formation}</span>` : ''}</span>
    <span class="lu-th-r">${l2.formation ? `<span class="lu-form">${l2.formation}</span> ` : ''}${displayName(result.team2)} ${getFlag(result.team2)}</span>
  </div>
  <div class="lu-grid">${rows}</div>
  ${(l1.bench.length || l2.bench.length) ? `
  <div class="lu-bench-wrap">
    <div class="lu-bench-title">Bench</div>
    <div class="lu-bench-cols">
      <div>${benchRow(l1.bench)}</div>
      <div class="lu-bench-col-r">${benchRow(l2.bench)}</div>
    </div>
  </div>` : ''}`;
}

// ── Player Stats ──────────────────────────────────────────────────────────────

function buildMDPlayerStats(t1, t2, result, summaryData) {
  const leaders = summaryData?.leaders || [];
  if (!leaders.length) return '';

  const rows = leaders.map(cat => {
    const catLeaders = (cat.leaders || []).slice(0, 3);
    if (!catLeaders.length) return '';

    const items = catLeaders.map(l => {
      const name = l.athlete?.shortName || l.athlete?.displayName
                 || l.player?.shortName  || l.player?.displayName || '';
      const teamName = l.team?.displayName ? espnToApp(l.team.displayName) : '';
      const flag  = teamName ? getFlag(teamName) : '';
      const value = l.displayValue != null ? l.displayValue
                  : (l.value != null ? String(Math.round(l.value)) : '');
      if (!name && !teamName && !value) return '';
      return `<div class="ldr-item">
        ${flag}
        <span class="ldr-name">${name || teamName}</span>
        ${value ? `<span class="ldr-val">${value}</span>` : ''}
      </div>`;
    }).filter(Boolean).join('');

    if (!items) return '';
    return `<div class="ldr-cat">
      <div class="ldr-cat-title">${cat.displayName || cat.name || ''}</div>
      ${items}
    </div>`;
  }).filter(Boolean).join('');

  return rows || '';
}
