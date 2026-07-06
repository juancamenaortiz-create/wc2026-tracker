// TEAMPROFILE.JS — slide-up team detail modal

// ── Cache ──────────────────────────────────────────────────────────────────────
function loadTeamCache() {
  try { return JSON.parse(localStorage.getItem('wc2026_teams') || '{}'); } catch(_) { return {}; }
}
function saveTeamCache(team, data) {
  try {
    const c = loadTeamCache(); c[team] = { data, ts: Date.now() };
    localStorage.setItem('wc2026_teams', JSON.stringify(c));
  } catch(_) {}
}

// ── Computed helpers (no API needed) ─────────────────────────────────────────
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
    const tg = isT1 ? m.score1 : m.score2;
    const og = isT1 ? m.score2 : m.score1;
    P++; GF+=(tg||0); GA+=(og||0);
    if ((tg||0)>(og||0)) W++; else if ((tg||0)===(og||0)) D++; else L++;
    if ((og||0)===0) CS++;
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

function getTeamPlayerStats(team) {
  const map = {};
  for (const m of getTeamAllMatches(team)) {
    const isT1 = normName(m.team1)===normName(team);
    const tid  = isT1 ? m.tid1 : m.tid2;
    (m.events||[]).forEach(ev => {
      if (ev.tid!==tid || !ev.p) return;
      if (!map[ev.p]) map[ev.p] = { name:ev.p, goals:0, pk:0, og:0, y:0, r:0 };
      if (ev.g && !ev.og) { map[ev.p].goals++; if (ev.pk) map[ev.p].pk++; }
      if (ev.og) map[ev.p].og++;
      if (ev.y) map[ev.p].y++;
      if (ev.r) map[ev.p].r++;
    });
  }
  return Object.values(map).sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name));
}

// ── Public entry point ────────────────────────────────────────────────────────
async function openTeamProfile(team) {
  if (!team) return;
  const el = document.getElementById('team-profile-modal');
  if (!el) return;
  el.innerHTML = tpShell(team, tpLoading(team));
  el.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Try cache first
  const cache = loadTeamCache();
  const cached = cache[team];
  const AGE_MS = 12 * 60 * 60 * 1000; // 12 h
  if (cached && (Date.now() - cached.ts) < AGE_MS) {
    el.innerHTML = tpShell(team, tpContent(team, cached.data));
    _attachTpHandlers(team);
    return;
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 9000);
    const resp = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ team1: team, team2: '__TEAM_PROFILE__',
        group: '', city: '', date: '', groupStandings: '' }),
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    const d = raw.data || {};
    saveTeamCache(team, d);
    el.innerHTML = tpShell(team, tpContent(team, d));
  } catch(e) {
    const cached2 = cache[team];
    el.innerHTML = tpShell(team, cached2
      ? tpContent(team, cached2.data)
      : tpContent(team, {}));
  }
  _attachTpHandlers(team);

  // Async roster fetch — fills in after the main content renders
  const espnId = getEspnTeamId(team);
  if (espnId) {
    fetchTeamRoster(espnId).then(roster => {
      const rEl = document.getElementById('tp-roster-slot');
      if (rEl && roster.length) rEl.innerHTML = buildRosterHtml(roster);
    }).catch(()=>{});
  }
}

function closeTeamProfile() {
  const m = document.getElementById('team-profile-modal');
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

function _attachTpHandlers(team) {
  const el = document.getElementById('team-profile-modal');
  if (!el) return;
  el.onclick = function(e) { if (e.target === el) closeTeamProfile(); };
}

// ── Roster fetch ──────────────────────────────────────────────────────────────
async function fetchTeamRoster(espnId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${espnId}/roster`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const d = await r.json();
  // ESPN returns either d.athletes (array of position groups) or flat d.roster
  const groups = Array.isArray(d.athletes) ? d.athletes : [];
  const flat = [];
  for (const g of groups) {
    const pos = g.position || g.displayName || '';
    const items = Array.isArray(g.items) ? g.items : (Array.isArray(g.athletes) ? g.athletes : []);
    for (const p of items) {
      flat.push({
        name:    p.fullName || p.displayName || p.shortName || '',
        jersey:  p.jersey || '',
        pos:     (p.position?.abbreviation || pos || '').toUpperCase().slice(0,2),
        posLong: p.position?.displayName || pos || '',
        age:     p.age || '',
        club:    p.team?.displayName || p.club?.displayName || '',
      });
    }
  }
  return flat;
}

function buildRosterHtml(roster) {
  const ORDER = { GK:0, GKP:0, DF:1, DEF:1, CB:1, LB:1, RB:1, WB:1,
                  MF:2, MID:2, CM:2, DM:2, AM:2, WM:2,
                  FW:3, ATT:3, CF:3, LW:3, RW:3, ST:3 };
  const posGroup = (p) => {
    const k = Object.keys(ORDER).find(k => p.pos.startsWith(k));
    return k !== undefined ? ORDER[k] : 4;
  };
  const groupLabels = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'];
  const groups = [[], [], [], [], []];
  roster.forEach(p => groups[Math.min(posGroup(p), 4)].push(p));

  return groups.slice(0,4).map((g, i) => {
    if (!g.length) return '';
    const rows = g.map(p =>
      `<div class="tp-roster-row">
        <span class="tp-roster-num">${p.jersey || '–'}</span>
        <span class="tp-roster-name">${p.name}</span>
        <span class="tp-roster-club">${p.club || '–'}</span>
        ${p.age ? `<span class="tp-roster-age">${p.age}</span>` : ''}
      </div>`
    ).join('');
    return `<div class="tp-roster-group">
      <div class="tp-roster-pos-lbl">${groupLabels[i]}</div>
      ${rows}
    </div>`;
  }).join('');
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function tpLoading(team) {
  return `<div class="tp-loading"><div class="spinner"></div><span>Loading…</span></div>`;
}

function tpShell(team, bodyHtml) {
  const pinned = isMyTeam(team);
  const esc = team.replace(/'/g, "\\'");
  return `<div class="tp-modal-inner">
    <div class="tp-modal-header">
      <button class="tp-close" onclick="closeTeamProfile()">&#8249;</button>
      <span class="tp-modal-title">${displayName(team)}</span>
      <button class="tp-pin-btn${pinned ? ' on' : ''}" onclick="tpTogglePin('${esc}')">★</button>
    </div>
    <div class="tp-modal-body">${bodyHtml}</div>
  </div>`;
}

function tpTogglePin(team) {
  const i = STATE.myTeams.findIndex(t => normName(t)===normName(team));
  if (i >= 0) STATE.myTeams.splice(i, 1);
  else if (STATE.myTeams.length < 10) STATE.myTeams.push(team);
  try { localStorage.setItem('wc2026_my_teams', JSON.stringify(STATE.myTeams)); } catch(_){}
  const el = document.getElementById('team-profile-modal');
  if (el) {
    const btn = el.querySelector('.tp-pin-btn');
    if (btn) btn.classList.toggle('on', isMyTeam(team));
  }
  renderActiveTab();
}

function tpContent(team, d) {
  // ── Group standing ──────────────────────────────────────────────────────────
  let groupStats = null, groupLetter = '', groupPos = 0;
  for (const [g, teams] of Object.entries(GROUP_TEAMS)) {
    if (teams.some(t => normName(t)===normName(team))) {
      const st = calculateStandings(g);
      groupStats = st.find(s => normName(s.name)===normName(team)) || null;
      groupLetter = g; groupPos = st.findIndex(s => normName(s.name)===normName(team)) + 1;
      break;
    }
  }

  // ── KO status ──────────────────────────────────────────────────────────────
  const roundNames = { R32:'Round of 32', R16:'Round of 16', QF:'Quarterfinals', SF:'Semifinals', Final:'Final' };
  function getKOInfo() {
    const allKO = [...(typeof R32_MATCHES!=='undefined'?R32_MATCHES:[]),
                   ...(typeof KO_ROUNDS!=='undefined'?KO_ROUNDS:[])];
    for (const m of allKO) {
      const [t1, t2] = getKOMatchTeams(m.id);
      const isT1 = t1&&normName(t1)===normName(team);
      const isT2 = t2&&normName(t2)===normName(team);
      if (!isT1&&!isT2) continue;
      const result = getKnockoutResult(m.id);
      if (!result||result.status!=='FT') {
        return { type:'upcoming', match:m, opponent:isT1?t2:t1, roundName:roundNames[m.round]||m.round||'Knockout' };
      }
      const winner = getKOWinner(m.id);
      if (!winner||normName(winner)!==normName(team)) {
        return { type:'eliminated', roundName:roundNames[m.round]||m.round||'Knockout' };
      }
    }
    return null;
  }
  const koInfo = getKOInfo();

  // ── Tournament stats (all matches) ─────────────────────────────────────────
  const ts = getTournamentStats(team);
  const statsHtml = ts.P > 0 ? `
  <div class="tp-section-lbl">2026 Tournament</div>
  <div class="tp-card">
    <div class="tp-stats-grid tp-stats-wide">
      <div class="tp-stat"><span class="tp-stat-n">${ts.P}</span><span class="tp-stat-l">Played</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.W}</span><span class="tp-stat-l">Won</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.D}</span><span class="tp-stat-l">Drawn</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.L}</span><span class="tp-stat-l">Lost</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.GF}</span><span class="tp-stat-l">Goals F</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.GA}</span><span class="tp-stat-l">Goals A</span></div>
      <div class="tp-stat"><span class="tp-stat-n ${ts.GD>0?'tp-stat-green':ts.GD<0?'tp-stat-red':''}">${ts.GD>0?'+':''}${ts.GD}</span><span class="tp-stat-l">GD</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.CS}</span><span class="tp-stat-l">Clean Sh.</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.shots||'–'}</span><span class="tp-stat-l">Shots</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.shotsOT||'–'}</span><span class="tp-stat-l">On Target</span></div>
      <div class="tp-stat"><span class="tp-stat-n">${ts.YC}</span><span class="tp-stat-l">Yellows</span></div>
      <div class="tp-stat"><span class="tp-stat-n ${ts.RC>0?'tp-stat-red':''}">${ts.RC}</span><span class="tp-stat-l">Reds</span></div>
    </div>
  </div>` : '';

  // ── KO/Next match ───────────────────────────────────────────────────────────
  let nextHtml = '';
  if (koInfo?.type==='eliminated') {
    nextHtml = `<div class="tp-card tp-elim-card"><span class="tp-elim-ico">✕</span> Eliminated in the ${koInfo.roundName}</div>`;
  } else if (koInfo?.type==='upcoming') {
    const m=koInfo.match, opp=koInfo.opponent;
    nextHtml = `<div class="tp-section-lbl">Next · ${koInfo.roundName}</div>
    <div class="tp-card tp-next-card">
      <span class="tp-next-opp">${getFlag(opp)} ${displayName(opp)}</span>
      <span class="tp-next-time">${formatShortDate(m.date)} · ${formatGameTime(m.date, m.time)} ${getTZAbbr()}</span>
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
          return `<div class="tp-next-row">${getFlag(opp)} ${displayName(opp)} <span class="tp-next-time">${formatShortDate(m.date)} · ${formatGameTime(m.date,m.time)} ${getTZAbbr()}</span></div>`;
        }).join('') + '</div>';
    }
  }

  // ── Match log ───────────────────────────────────────────────────────────────
  const matches = getTeamAllMatches(team);
  const matchLogHtml = matches.length ? `
  <div class="tp-section-lbl">Match Log</div>
  <div class="tp-card tp-match-log">` +
    matches.map(m => {
      const isT1 = normName(m.team1)===normName(team);
      const opp   = isT1 ? m.team2 : m.team1;
      const gf    = isT1 ? m.score1 : m.score2;
      const ga    = isT1 ? m.score2 : m.score1;
      const isPSO = m.substatus==='PSO';
      const isAET = m.substatus==='AET';
      const res   = isPSO
        ? (isT1?(m.penScore1>m.penScore2):(m.penScore2>m.penScore1)) ? 'W' : 'L'
        : gf>ga ? 'W' : gf<ga ? 'L' : 'D';
      const resCls = res==='W'?'tp-res-w':res==='L'?'tp-res-l':'tp-res-d';
      const teamTid = isT1 ? m.tid1 : m.tid2;
      const scorers = (m.events||[]).filter(e=>e.g&&!e.og&&e.tid===teamTid&&e.p)
        .map(e=>e.p+(e.pk?' (P)':'')).join(', ');
      const roundLabel = m.group ? `Group ${m.group}` : (m.round||'KO');
      const scoreStr = `${gf}–${ga}${isPSO?` (P ${isT1?m.penScore1:m.penScore2}–${isT1?m.penScore2:m.penScore1})`:''}${isAET?' (AET)':''}`;
      return `<div class="tp-match-row">
        <div class="tp-match-opp">${getFlag(opp)} ${displayName(opp)}</div>
        <div class="tp-match-score">${scoreStr}</div>
        <span class="tp-res-badge ${resCls}">${res}</span>
        <div class="tp-match-meta">${formatShortDate(m.date)} · ${roundLabel}${scorers?`<div class="tp-match-scorers">${scorers}</div>`:''}</div>
      </div>`;
    }).join('') +
  `</div>` : '';

  // ── Player stats ────────────────────────────────────────────────────────────
  const players = getTeamPlayerStats(team);
  const playerHtml = players.length ? `
  <div class="tp-section-lbl">Player Stats</div>
  <div class="tp-card tp-player-stats">
    <div class="tp-ps-header"><span>Player</span><span>⚽</span><span>🟨</span><span>🟥</span></div>
    ${players.filter(p=>p.goals||p.y||p.r).map(p=>`
    <div class="tp-ps-row">
      <span class="tp-ps-name">${p.name}${p.pk?'<span class="tp-ps-pk"> (P)</span>':''}</span>
      <span class="tp-ps-val ${p.goals?'tp-ps-goals':''}">${p.goals||'–'}</span>
      <span class="tp-ps-val ${p.y?'tp-ps-yc':''}">${p.y||'–'}</span>
      <span class="tp-ps-val ${p.r?'tp-ps-rc':''}">${p.r||'–'}</span>
    </div>`).join('')}
  </div>` : '';

  // ── Roster (async slot) ─────────────────────────────────────────────────────
  const rosterHtml = `
  <div class="tp-section-lbl">Squad</div>
  <div class="tp-card" id="tp-roster-slot">
    <div class="tp-loading-sm">Loading squad…</div>
  </div>`;

  // ── AI profile data (manager, style, key players, WC history) ──────────────
  const titlesHtml = (d.wcHistory?.titles||0)>0 ? ` · ${d.wcHistory.titles} title${d.wcHistory.titles>1?'s':''}` : '';
  const aiHtml = (d.manager||d.style||d.strengths||d.weaknesses) ? `
  <div class="tp-section-lbl">Profile</div>
  <div class="tp-card tp-info">
    ${d.manager?`<div class="tp-row"><span class="tp-row-lbl">Manager</span><span>${d.manager}</span></div>`:''}
    ${d.style?`<div class="tp-row"><span class="tp-row-lbl">Style</span><span>${d.style}</span></div>`:''}
    ${d.confederation?`<div class="tp-row"><span class="tp-row-lbl">Confederation</span><span>${d.confederation}</span></div>`:''}
    ${d.wcHistory?`<div class="tp-row"><span class="tp-row-lbl">WC history</span><span>${d.wcHistory.appearances} appearances${titlesHtml}</span></div>`:''}
    ${d.wcHistory?.bestFinish?`<div class="tp-row"><span class="tp-row-lbl">Best finish</span><span>${d.wcHistory.bestFinish}</span></div>`:''}
  </div>
  ${(d.strengths||d.weaknesses)?`<div class="tp-card tp-sw-card">
    ${d.strengths?`<div class="tp-sw"><span class="tp-sw-ico up">▲</span><span><b>Strength</b> — ${d.strengths}</span></div>`:''}
    ${d.weaknesses?`<div class="tp-sw"><span class="tp-sw-ico down">▼</span><span><b>Watch</b> — ${d.weaknesses}</span></div>`:''}
  </div>`:''}` : '';

  const pinned = isMyTeam(team);
  const esc = team.replace(/'/g, "\\'");
  return `
  <div class="tp-hero">
    <span class="cflag tp-flag-lg">${getFlag(team)}</span>
    <div class="tp-hero-info">
      <div class="tp-team-name">${displayName(team)}</div>
      <div class="tp-badges">
        ${d.ranking?`<span class="tp-badge tp-badge-gold">FIFA #${d.ranking}</span>`:''}
        ${groupLetter?`<span class="tp-badge tp-badge-neutral">Group ${groupLetter}</span>`:''}
        ${koInfo?.type==='eliminated'?`<span class="tp-badge tp-badge-red">Eliminated</span>`:''}
      </div>
    </div>
  </div>
  ${statsHtml}
  ${nextHtml}
  ${matchLogHtml}
  ${playerHtml}
  ${rosterHtml}
  ${aiHtml}`;
}

document.addEventListener('DOMContentLoaded', loadTeamCache);
