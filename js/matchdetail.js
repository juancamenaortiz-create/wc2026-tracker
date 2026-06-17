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
  const resp = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnId}`,
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

  // Match summary teams to result.team1/team2
  const boxTeams = data.boxscore?.teams || [];
  const findTeam = (name) => boxTeams.find(t => {
    const n = espnToApp(t.team?.displayName || '');
    return normName(n) === normName(name);
  });
  const t1Sum = findTeam(result.team1) || boxTeams[0];
  const t2Sum = findTeam(result.team2) || boxTeams[1];

  let html = '';

  // Game info pill
  if (attendance || ref) {
    html += `<div class="md-gameinfo">
      ${attendance ? `<span>👥 ${attendance.toLocaleString()} fans</span>` : ''}
      ${ref        ? `<span>🟡 ${ref}</span>` : ''}
    </div>`;
  }

  // Enhanced stats (adds passing accuracy, tackles from summary)
  const enhanced = buildMDEnhancedStats(t1Sum, t2Sum, result.stats);
  if (enhanced) {
    html += `<div class="md-section">
      <div class="md-section-title">📊 Match Stats</div>
      <div class="match-stats-panel">${enhanced}</div>
    </div>`;
  }

  // Substitutions
  const subs = buildMDSubs(t1Sum, t2Sum, result);
  if (subs) {
    html += `<div class="md-section">
      <div class="md-section-title">🔄 Substitutions</div>
      <div class="tl-wrap">${subs}</div>
    </div>`;
  }

  // Lineups
  const lineups = buildMDLineups(t1Sum, t2Sum, result);
  if (lineups) {
    html += `<div class="md-section">
      <div class="md-section-title">📋 Lineups</div>
      ${lineups}
    </div>`;
  }

  // Player stats
  const pstats = buildMDPlayerStats(t1Sum, t2Sum, result);
  if (pstats) {
    html += `<div class="md-section">
      <div class="md-section-title">👤 Player Stats</div>
      ${pstats}
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
  const list = [];
  for (const pg of (teamData?.players || [])) {
    for (const ath of (pg.athletes || [])) list.push(ath);
  }
  return list;
}

// ── Substitutions ─────────────────────────────────────────────────────────────

function buildMDSubs(t1, t2, result) {
  const subs = [];

  const extractSubs = (teamData, isT1) => {
    const athletes = mdGetAthletes(teamData);
    athletes.forEach(a => {
      // Various ESPN field names for subs
      const wasSubbedIn  = !!(a.subbedIn || a.didSubIn  || (a.active && !a.starter && a.stats));
      const wasSubbedOut = !!(a.subbedOut || a.didSubOut);
      if (!wasSubbedIn && !wasSubbedOut) return;

      // Try several possible minute fields
      const minIn  = a.subbedIn?.displayValue  || a.subbedInTime?.displayValue
                  || a.substitutionMinute      || '';
      const minOut = a.subbedOut?.displayValue || a.subbedOutTime?.displayValue || '';

      if (wasSubbedIn) {
        // Find who came out (linked by similar timing or explicit out marker)
        const out = athletes.find(x =>
          x !== a && (x.subbedOut || x.didSubOut) &&
          (!minIn || (x.subbedOut?.displayValue || x.subbedOutTime?.displayValue) === minIn)
        );
        subs.push({
          min: minIn || minOut || '?',
          playerIn:  a.athlete?.shortName   || a.athlete?.displayName   || '',
          playerOut: out?.athlete?.shortName || out?.athlete?.displayName || '',
          isT1,
        });
      }
    });
  };

  extractSubs(t1, true);
  extractSubs(t2, false);

  if (!subs.length) return '';

  return subs.map(s => {
    const line = `<span class="sub-out">↓${s.playerOut ? ' '+s.playerOut : ''}</span> <span class="sub-in">↑ ${s.playerIn}</span>`;
    return `<div class="tl-row">
      <div class="tl-side tl-left">${s.isT1 ? line : ''}</div>
      <div class="tl-min">${s.min}</div>
      <div class="tl-side tl-right">${!s.isT1 ? line : ''}</div>
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
        name: a.athlete?.shortName || a.athlete?.displayName || '?',
        jersey: a.athlete?.jersey || '',
        pos: a.athlete?.position?.abbreviation || '',
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

function buildMDPlayerStats(t1, t2, result) {
  const parseTeam = (teamData, teamName) => {
    // Collect stat key names from all player groups
    const statKeys = [];
    for (const pg of (teamData?.players || [])) {
      for (const s of (pg.statistics || [])) {
        if (Array.isArray(s.keys)) statKeys.push(...s.keys);
        else if (s.name) statKeys.push(s.name);
      }
      if (statKeys.length) break;
    }
    const players = [];
    mdGetAthletes(teamData).forEach(a => {
      if (!a.starter && !a.subbedIn && !a.didSubIn) return;
      const raw = {};
      if (a.stats && statKeys.length) {
        statKeys.forEach((k, i) => { if (a.stats[i] != null && a.stats[i] !== '--') raw[k] = a.stats[i]; });
      }
      players.push({
        name: a.athlete?.shortName || a.athlete?.displayName || '?',
        pos:  a.athlete?.position?.abbreviation || '',
        min:  raw.minutesPlayed || raw.minsPlayed || '--',
        shots:raw.shots || raw.totalShots || '--',
        passPct: raw.passPct || raw.passingAccuracy || '--',
        tackles: raw.tackles || raw.totalTackles || '--',
        saves:   raw.saves || '--',
        goals:   raw.goals || '--',
      });
    });
    return { team: teamName, players };
  };

  const d1 = parseTeam(t1, result.team1);
  const d2 = parseTeam(t2, result.team2);
  if (!d1.players.length && !d2.players.length) return '';

  const hasGoals = [...d1.players, ...d2.players].some(p => p.goals !== '--' && p.goals !== '0');
  const hasSaves = [...d1.players, ...d2.players].some(p => p.saves !== '--' && p.saves !== '0');

  const tableFor = (data) => {
    if (!data.players.length) return '';
    const rows = data.players.map(p => `<tr>
      <td class="ps-name">${p.name} <span class="ps-pos">${p.pos}</span></td>
      <td>${p.min}</td>
      ${hasGoals ? `<td>${p.goals}</td>` : ''}
      <td>${p.shots}</td>
      <td>${p.passPct !== '--' ? p.passPct+'%' : '--'}</td>
      <td>${p.pos && ['GK','G'].includes(p.pos.toUpperCase()) ? p.saves : p.tackles}</td>
    </tr>`).join('');
    return `<div class="ps-team-hdr">${getFlag(data.team)} ${displayName(data.team)}</div>
    <table class="ps-table">
      <thead><tr>
        <th class="ps-name">Player</th><th>Min</th>
        ${hasGoals ? '<th>G</th>' : ''}
        <th>Sh</th><th>Pass%</th><th>${hasSaves ? 'Sv/Tk' : 'Tackles'}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  };

  return tableFor(d1) + tableFor(d2);
}
