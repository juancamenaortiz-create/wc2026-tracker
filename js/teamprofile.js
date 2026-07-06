// TEAMPROFILE.JS — slide-up team detail modal

// ── Cache ─────────────────────────────────────────────────────────────────────
function loadTeamCache() {
  try { return JSON.parse(localStorage.getItem('wc2026_teams') || '{}'); } catch(_) { return {}; }
}
function saveTeamCache(team, data) {
  try {
    const c = loadTeamCache(); c[team] = { data, ts: Date.now() };
    localStorage.setItem('wc2026_teams', JSON.stringify(c));
  } catch(_) {}
}
function loadRosterCache() {
  try { return JSON.parse(localStorage.getItem('wc2026_roster') || '{}'); } catch(_) { return {}; }
}
function saveRosterCache(team, data) {
  try {
    const c = loadRosterCache(); c[team] = { data, ts: Date.now() };
    localStorage.setItem('wc2026_roster', JSON.stringify(c));
  } catch(_) {}
}

// ── Computed helpers (local, instant — no network wait) ──────────────────────
function getTeamAllMatches(team) {
  const all = [...(STATE.results.groupMatches||[]), ...(STATE.results.knockoutMatches||[])];
  return all.filter(m =>
    (normName(m.team1)===normName(team) || normName(m.team2)===normName(team))
    && m.status === 'FT'
  ).sort((a,b) => (a.date||'').localeCompare(b.date||''));
}

function getTournamentStats(team) {
  let P=0,W=0,D=0,L=0,GF=0,GA=0,CS=0,YC=0,RC=0,shots=0,shotsOT=0;
  for (const m of getTeamAllMatches(team)) {
    const isT1 = normName(m.team1)===normName(team);
    const gf = isT1 ? m.score1 : m.score2;
    const ga = isT1 ? m.score2 : m.score1;
    P++; GF+=(gf||0); GA+=(ga||0);
    if (m.substatus === 'PSO') {
      const penW = isT1 ? m.penScore1 : m.penScore2;
      const penL = isT1 ? m.penScore2 : m.penScore1;
      if ((penW||0) > (penL||0)) W++; else L++;
    } else if ((gf||0)>(ga||0)) W++;
    else if ((gf||0)<(ga||0)) L++;
    else D++;
    if ((ga||0)===0) CS++;
    const tid = isT1 ? m.tid1 : m.tid2;
    (m.events||[]).forEach(ev => {
      if (ev.tid!==tid) return;
      if (ev.y) YC++; if (ev.r) RC++;
    });
    const st = isT1 ? m.stats?.t1 : m.stats?.t2;
    if (st) {
      shots  += parseFloat(st.totalShots||st.shots||0)||0;
      shotsOT+= parseFloat(st.shotsOnTarget||st.onTargetShotsTotal||0)||0;
    }
  }
  return { P,W,D,L,GF,GA,GD:GF-GA,CS,YC,RC,
           shots:Math.round(shots), shotsOT:Math.round(shotsOT) };
}

// Fallback player stats (goals/cards only) computed from local match events —
// used if the ESPN roster+stats fetch fails or hasn't returned yet.
function getTeamPlayerStatsLocal(team) {
  const map = {};
  for (const m of getTeamAllMatches(team)) {
    const isT1 = normName(m.team1)===normName(team);
    const tid  = isT1 ? m.tid1 : m.tid2;
    (m.events||[]).forEach(ev => {
      if (ev.tid!==tid || !ev.p) return;
      if (!map[ev.p]) map[ev.p] = { name:ev.p, goals:0, pk:0, y:0, r:0 };
      if (ev.g && !ev.og) { map[ev.p].goals++; if (ev.pk) map[ev.p].pk++; }
      if (ev.y) map[ev.p].y++;
      if (ev.r) map[ev.p].r++;
    });
  }
  return Object.values(map).sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name));
}

// ── Public entry point ────────────────────────────────────────────────────────
async function openTeamProfile(team) {
  if (!team) return;
  const modal = document.getElementById('team-profile-modal');
  const el    = document.getElementById('team-profile-content');
  if (!modal || !el) return;

  window._tpCurrentTeam = team;
  const nameEl = document.getElementById('tp-sheet-team-name');
  const pinEl  = document.getElementById('tp-sheet-pin-btn');
  if (nameEl) nameEl.textContent = displayName(team);
  if (pinEl)  pinEl.classList.toggle('on', isMyTeam(team));

  // ── Phase 1: render everything computable from LOCAL data instantly.
  // No network wait for hero, record, stats, next match, or match log —
  // this is the fix for the "takes too long to load" complaint. Only the
  // squad/player-stats (ESPN roster fetch) and AI profile (Claude call)
  // load progressively into their own placeholders below.
  el.innerHTML = tpStaticContent(team) + tpSquadPlaceholder() + tpProfilePlaceholder();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // ── Phase 2a: squad + per-player stats (ESPN roster endpoint) ───────────────
  const espnId = getEspnTeamId(team);
  const rCache = loadRosterCache();
  const rCached = rCache[team];
  const R_AGE = 24 * 60 * 60 * 1000; // 24h — squads rarely change mid-tournament
  if (rCached && (Date.now() - rCached.ts) < R_AGE) {
    _fillSquadSlot(team, rCached.data);
  } else if (espnId) {
    fetchTeamRosterWithStats(espnId).then(roster => {
      if (roster.length) saveRosterCache(team, roster);
      _fillSquadSlot(team, roster);
    }).catch(() => _fillSquadSlot(team, []));
  } else {
    _fillSquadSlot(team, []);
  }

  // ── Phase 2b: AI profile (manager, style, WC history) ───────────────────────
  const cache = loadTeamCache();
  const cached = cache[team];
  const AGE_MS = 12 * 60 * 60 * 1000;
  if (cached && (Date.now() - cached.ts) < AGE_MS) {
    _fillProfileSlot(cached.data);
  } else {
    (async () => {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 9000);
        const resp = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({ teamProfile: team }),
        });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const raw = await resp.json();
        const d = raw.data || {};
        saveTeamCache(team, d);
        _fillProfileSlot(d);
      } catch(e) {
        _fillProfileSlot(cached?.data || null);
      }
    })();
  }
}

function _fillSquadSlot(team, roster) {
  const slot = document.getElementById('tp-squad-slot');
  const psSlot = document.getElementById('tp-playerstats-slot');
  if (slot) slot.innerHTML = roster.length ? buildRosterHtml(roster)
    : '<div class="tp-empty-note">Squad not available from ESPN for this team yet.</div>';
  if (psSlot) {
    // Prefer real ESPN per-player stats (goals/assists/shots/cards) when available;
    // fall back to locally-computed goals/cards only if the roster fetch came up empty.
    const withStats = roster.filter(p => (p.g||0) + (p.a||0) + (p.shot||0) + (p.yc||0) + (p.rc||0) > 0);
    psSlot.innerHTML = withStats.length
      ? buildPlayerCardsHtml(withStats)
      : buildPlayerCardsHtml(getTeamPlayerStatsLocal(team).map(p => ({
          name: p.name, g: p.goals, pk: p.pk, yc: p.y, rc: p.r,
          a: null, shot: null, sog: null, fc: null, fa: null,
        })));
  }
}

function _fillProfileSlot(d) {
  const slot = document.getElementById('tp-profile-slot');
  if (!slot) return;
  d = d || {};
  const titlesNote = (d.wcHistory?.titles||0)>0 ? ` · ${d.wcHistory.titles} title${d.wcHistory.titles>1?'s':''}` : '';
  const hasAny = d.manager||d.style||d.strengths||d.weaknesses||d.ranking||d.confederation;
  if (!hasAny) { slot.innerHTML = ''; return; }
  slot.innerHTML = `
  <div class="tp-section-lbl">Profile</div>
  <div class="tp-card tp-info">
    ${d.ranking?`<div class="tp-row"><span class="tp-row-lbl">FIFA rank</span><span>#${d.ranking}</span></div>`:''}
    ${d.confederation?`<div class="tp-row"><span class="tp-row-lbl">Confederation</span><span>${d.confederation}</span></div>`:''}
    ${d.manager?`<div class="tp-row"><span class="tp-row-lbl">Manager</span><span>${d.manager}</span></div>`:''}
    ${d.style?`<div class="tp-row"><span class="tp-row-lbl">Style</span><span>${d.style}</span></div>`:''}
    ${d.wcHistory?`<div class="tp-row"><span class="tp-row-lbl">WC history</span><span>${d.wcHistory.appearances} appearances${titlesNote}</span></div>`:''}
    ${d.wcHistory?.bestFinish?`<div class="tp-row"><span class="tp-row-lbl">Best finish</span><span>${d.wcHistory.bestFinish}</span></div>`:''}
  </div>
  ${(d.strengths||d.weaknesses)?`<div class="tp-card tp-sw-card">
    ${d.strengths?`<div class="tp-sw"><span class="tp-sw-ico up">▲</span><span><b>Strength</b> — ${d.strengths}</span></div>`:''}
    ${d.weaknesses?`<div class="tp-sw"><span class="tp-sw-ico down">▼</span><span><b>Watch</b> — ${d.weaknesses}</span></div>`:''}
  </div>`:''}`;
}

function closeTeamProfile() {
  const m = document.getElementById('team-profile-modal');
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

function tpTogglePin(team) {
  if (!team) return;
  const i = STATE.myTeams.findIndex(t => normName(t)===normName(team));
  if (i >= 0) STATE.myTeams.splice(i, 1);
  else if (STATE.myTeams.length < 10) STATE.myTeams.push(team);
  try { localStorage.setItem('wc2026_myteams', JSON.stringify(STATE.myTeams)); } catch(_){}
  const pinEl = document.getElementById('tp-sheet-pin-btn');
  if (pinEl) pinEl.classList.toggle('on', isMyTeam(team));
  renderActiveTab();
}

// ── ESPN roster + per-player stats fetch ─────────────────────────────────────
// ESPN's roster table (confirmed against the live site) reports per-player
// tournament stats: APP, SUB, G, A, SHOT, SOG, FC, FA, YC, RC, SV, GA — the
// same columns shown on espn.com's own squad pages. ESPN's site API commonly
// returns tabular player data as parallel labels[]/stats[] arrays rather than
// named fields, so this parser handles both that shape and a named-field
// fallback, and tries a couple of endpoint variants since the exact query
// needed to include stats isn't publicly documented.
async function fetchTeamRosterWithStats(espnId) {
  const urls = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${espnId}/roster`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${espnId}?enable=roster,stats`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const d = await r.json();
      const parsed = _parseRosterResponse(d);
      if (parsed.length) return parsed;
    } catch(e) { /* try next url shape */ }
  }
  return [];
}

function _parseRosterResponse(d) {
  // Roster groups can appear at d.athletes, d.team.athletes, or d.roster
  const groups = Array.isArray(d.athletes) ? d.athletes
               : Array.isArray(d.team?.athletes) ? d.team.athletes
               : Array.isArray(d.roster) ? d.roster
               : [];
  const flat = [];
  for (const g of groups) {
    const posLabel = g.position || g.displayName || '';
    const items = Array.isArray(g.items) ? g.items
                : Array.isArray(g.athletes) ? g.athletes
                : [];
    // Parallel-array pattern: g.labels = ['G','A','SHOT',...], each athlete has .stats = [3,1,0,...]
    const labels = Array.isArray(g.labels) ? g.labels.map(l => String(l).toUpperCase()) : null;
    for (const p of items) {
      const statMap = {};
      if (labels && Array.isArray(p.stats)) {
        labels.forEach((lbl, i) => { statMap[lbl] = parseFloat(p.stats[i]); });
      } else if (Array.isArray(p.statistics)) {
        p.statistics.forEach(s => {
          const key = String(s.abbreviation || s.name || '').toUpperCase();
          statMap[key] = parseFloat(s.value ?? s.displayValue);
        });
      }
      const num = k => { const v = statMap[k]; return (typeof v === 'number' && !isNaN(v)) ? v : null; };
      flat.push({
        name:    p.fullName || p.displayName || p.shortName || '',
        jersey:  p.jersey || '',
        pos:     (p.position?.abbreviation || posLabel || '').toUpperCase().slice(0,3),
        age:     p.age || null,
        club:    p.team?.displayName || p.club?.displayName || '',
        app:     num('APP'), sub: num('SUB'),
        g:       num('G'),   a:   num('A'),
        shot:    num('SHOT'),sog: num('SOG'),
        fc:      num('FC'),  fa:  num('FA'),
        yc:      num('YC'),  rc:  num('RC'),
        sv:      num('SV'),  ga:  num('GA'),
      });
    }
  }
  return flat;
}

function buildRosterHtml(roster) {
  const ORDER = { GK:0, DF:1, DEF:1, CB:1, LB:1, RB:1, WB:1,
                  MF:2, MID:2, CM:2, DM:2, AM:2,
                  FW:3, ATT:3, CF:3, LW:3, RW:3, ST:3 };
  const posGroup = p => {
    const k = Object.keys(ORDER).find(k => p.pos.startsWith(k));
    return k !== undefined ? ORDER[k] : 4;
  };
  const groupLabels = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'];
  const groups = [[],[],[],[]];
  roster.forEach(p => { const g = Math.min(posGroup(p), 3); groups[g].push(p); });
  return groups.map((g, i) => {
    if (!g.length) return '';
    return `<div class="tp-roster-group">
      <div class="tp-roster-pos-lbl">${groupLabels[i]}</div>
      ${g.map(p => `<div class="tp-roster-row">
        <span class="tp-roster-num">${p.jersey||'–'}</span>
        <span class="tp-roster-name">${p.name}</span>
        <span class="tp-roster-club">${p.club||'–'}</span>
        ${p.age?`<span class="tp-roster-age">${p.age}</span>`:''}
      </div>`).join('')}
    </div>`;
  }).join('');
}

// ── Individual player stat cards (MOTM-style box per player) ─────────────────
function buildPlayerCardsHtml(players) {
  const withInvolvement = players.filter(p => (p.g||0) > 0 || (p.a||0) > 0 || (p.yc||0) > 0 || (p.rc||0) > 0);
  const list = withInvolvement.length ? withInvolvement : players.slice(0, 0); // nothing to show if truly no involvement
  if (!list.length) return '<div class="tp-empty-note">No individual stats recorded yet.</div>';

  list.sort((a,b) => (b.g||0)-(a.g||0) || (b.a||0)-(a.a||0));

  return list.map(p => {
    const initials = p.name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const pkNote = p.pk ? `<span class="tp-pc-pk"> (${p.pk} pen)</span>` : '';
    const stats = [];
    if (p.g  != null) stats.push({ l:'Goals',      v:p.g,  cls:'tp-pc-goals' });
    if (p.a  != null) stats.push({ l:'Assists',    v:p.a,  cls:'tp-pc-assists' });
    if (p.shot!= null) stats.push({ l:'Shots',      v:p.shot });
    if (p.sog!= null) stats.push({ l:'On Target',  v:p.sog });
    if (p.fc != null) stats.push({ l:'Fouls',      v:p.fc });
    if (p.yc)         stats.push({ l:'Yellow',     v:p.yc, cls:'tp-pc-yc' });
    if (p.rc)         stats.push({ l:'Red',        v:p.rc, cls:'tp-pc-rc' });
    return `<div class="tp-player-card">
      <div class="tp-pc-avatar">${initials}</div>
      <div class="tp-pc-body">
        <div class="tp-pc-name">${p.name}${pkNote}</div>
        <div class="tp-pc-stats">
          ${stats.map(s => `<span class="tp-pc-stat"><b class="${s.cls||''}">${s.v}</b> ${s.l}</span>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Static placeholders for async slots ──────────────────────────────────────
function tpSquadPlaceholder() {
  return `
  <div class="tp-section-lbl">Player Stats</div>
  <div class="tp-card tp-player-stats" id="tp-playerstats-slot">
    <div class="tp-loading-sm">Loading player stats…</div>
  </div>
  <div class="tp-section-lbl">Squad</div>
  <div class="tp-card" id="tp-squad-slot">
    <div class="tp-loading-sm">Loading squad…</div>
  </div>`;
}
function tpProfilePlaceholder() {
  return `<div id="tp-profile-slot"></div>`;
}

// ── Synchronous content (hero, record, stats, next match, match log) ────────
function tpStaticContent(team) {
  let groupLetter = '';
  for (const [g, teams] of Object.entries(GROUP_TEAMS)) {
    if (teams.some(t => normName(t)===normName(team))) { groupLetter = g; break; }
  }

  const roundNames = { R32:'Round of 32', R16:'Round of 16', QF:'Quarterfinals', SF:'Semifinals', Final:'Final' };
  function getKOInfo() {
    const allKO = [...(typeof R32_MATCHES!=='undefined'?R32_MATCHES:[]),
                   ...(typeof KO_ROUNDS!=='undefined'?KO_ROUNDS:[])];
    for (const m of allKO) {
      const [t1, t2] = getKOMatchTeams(m.id);
      const isT1 = t1 && normName(t1)===normName(team);
      const isT2 = t2 && normName(t2)===normName(team);
      if (!isT1 && !isT2) continue;
      const result = getKnockoutResult(m.id);
      if (!result || result.status!=='FT') {
        return { type:'upcoming', match:m, opponent:isT1?t2:t1, roundName:roundNames[m.round]||m.round||'Knockout' };
      }
      const winner = getKOWinner(m.id);
      if (!winner || normName(winner)!==normName(team)) {
        return { type:'eliminated', roundName:roundNames[m.round]||m.round||'Knockout' };
      }
    }
    return null;
  }
  const koInfo = getKOInfo();

  // ── Traditional record + stat-row layout (replaces the tile grid) ──────────
  const ts = getTournamentStats(team);
  const statsHtml = ts.P > 0 ? `
  <div class="tp-record-hero">
    <div class="tp-record-main">${ts.W}-${ts.D}-${ts.L}</div>
    <div class="tp-record-sub">W&ndash;D&ndash;L &middot; ${ts.P} played</div>
  </div>
  <div class="tp-card tp-stat-rows">
    <div class="tp-sr"><span>Goals For</span><b>${ts.GF}</b></div>
    <div class="tp-sr"><span>Goals Against</span><b>${ts.GA}</b></div>
    <div class="tp-sr"><span>Goal Difference</span><b class="${ts.GD>0?'tp-stat-green':ts.GD<0?'tp-stat-red':''}">${ts.GD>0?'+':''}${ts.GD}</b></div>
    <div class="tp-sr"><span>Clean Sheets</span><b>${ts.CS}</b></div>
    <div class="tp-sr"><span>Shots</span><b>${ts.shots||'–'}</b></div>
    <div class="tp-sr"><span>Shots On Target</span><b>${ts.shotsOT||'–'}</b></div>
    <div class="tp-sr"><span>Yellow Cards</span><b>${ts.YC}</b></div>
    <div class="tp-sr"><span>Red Cards</span><b class="${ts.RC>0?'tp-stat-red':''}">${ts.RC}</b></div>
  </div>` : '';

  // ── Next / eliminated ───────────────────────────────────────────────────────
  let nextHtml = '';
  if (koInfo?.type==='eliminated') {
    nextHtml = `<div class="tp-card tp-elim-card"><span class="tp-elim-ico">✕</span> Eliminated in the ${koInfo.roundName}</div>`;
  } else if (koInfo?.type==='upcoming') {
    const m=koInfo.match, opp=koInfo.opponent;
    nextHtml = `<div class="tp-section-lbl">Next &middot; ${koInfo.roundName}</div>
    <div class="tp-card tp-next-card">
      <span class="tp-next-opp">${getFlag(opp)} ${displayName(opp)}</span>
      <span class="tp-next-time">${formatShortDate(m.date)} &middot; ${formatGameTime(m.date, m.time)} ${getTZAbbr()}</span>
    </div>`;
  } else {
    const upcoming = SCHEDULE.filter(m =>
      (normName(m.t1)===normName(team)||normName(m.t2)===normName(team)) &&
      !STATE.results.groupMatches.some(r => normName(r.team1)===normName(m.t1)&&normName(r.team2)===normName(m.t2)&&r.status==='FT')
    ).slice(0,3);
    if (upcoming.length) {
      nextHtml = `<div class="tp-section-lbl">Upcoming</div><div class="tp-card">` +
        upcoming.map(m => {
          const opp = normName(m.t1)===normName(team) ? m.t2 : m.t1;
          return `<div class="tp-next-row">${getFlag(opp)} ${displayName(opp)}<span class="tp-next-time">${formatShortDate(m.date)} &middot; ${formatGameTime(m.date,m.time)} ${getTZAbbr()}</span></div>`;
        }).join('') + '</div>';
    }
  }

  // ── Match log ───────────────────────────────────────────────────────────────
  const matches = getTeamAllMatches(team);
  const matchLogHtml = matches.length ? `
  <div class="tp-section-lbl">Match Log</div>
  <div class="tp-card tp-match-log">` +
    matches.map(m => {
      const isT1  = normName(m.team1)===normName(team);
      const opp   = isT1 ? m.team2 : m.team1;
      const gf    = isT1 ? m.score1 : m.score2;
      const ga    = isT1 ? m.score2 : m.score1;
      const isPSO = m.substatus==='PSO';
      const isAET = m.substatus==='AET';
      const res = isPSO
        ? ((isT1 ? m.penScore1 : m.penScore2)||0) > ((isT1 ? m.penScore2 : m.penScore1)||0) ? 'W' : 'L'
        : gf>ga ? 'W' : gf<ga ? 'L' : 'D';
      const resCls = res==='W'?'tp-res-w':res==='L'?'tp-res-l':'tp-res-d';
      const teamTid = isT1 ? m.tid1 : m.tid2;
      const scorers = (m.events||[]).filter(e=>e.g&&!e.og&&e.tid===teamTid&&e.p)
        .map(e=>e.p+(e.pk?' (P)':'')).join(', ');
      const roundLabel = m.group ? `Group ${m.group}` : (m.round||'KO');
      const scoreStr = `${gf}–${ga}${isPSO?` (P ${isT1?m.penScore1:m.penScore2}–${isT1?m.penScore2:m.penScore1})`:''}${isAET?' aet':''}`;
      return `<div class="tp-match-row">
        <div class="tp-match-opp">${getFlag(opp)} ${displayName(opp)}</div>
        <div class="tp-match-score">${scoreStr}</div>
        <span class="tp-res-badge ${resCls}">${res}</span>
        <div class="tp-match-meta">${formatShortDate(m.date)} &middot; ${roundLabel}${scorers?`<div class="tp-match-scorers">${scorers}</div>`:''}</div>
      </div>`;
    }).join('') + `</div>` : '';

  return `
  <div class="tp-hero">
    <span class="cflag tp-flag-lg">${getFlag(team)}</span>
    <div class="tp-hero-info">
      <div class="tp-team-name">${displayName(team)}</div>
      <div class="tp-badges">
        ${groupLetter?`<span class="tp-badge tp-badge-neutral">Group ${groupLetter}</span>`:''}
        ${koInfo?.type==='eliminated'?`<span class="tp-badge tp-badge-red">Eliminated</span>`:''}
      </div>
    </div>
  </div>
  ${statsHtml}
  ${nextHtml}
  ${matchLogHtml}`;
}

document.addEventListener('DOMContentLoaded', loadTeamCache);
