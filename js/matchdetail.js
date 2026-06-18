// ═══════════════════════════════════════════
// MATCHDETAIL.JS — 3-tab match detail modal
// Facts | Lineup | Stats
// ═══════════════════════════════════════════

const MD_CACHE = {};
let MD = { tab:'facts', schedId:null, result:null, sched:null, summary:null };

// ── Open / Close / Tab ────────────────────────────────────────────────────────

function openMatchDetail(scheduleMatchId) {
  const modal = document.getElementById('match-detail-modal');
  if (!modal) return;
  MD.tab = 'facts';
  MD.schedId = scheduleMatchId;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderMatchDetail(scheduleMatchId);
}

function closeMatchDetail() {
  const m = document.getElementById('match-detail-modal');
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

function setMDTab(tab) {
  MD.tab = tab;
  document.querySelectorAll('.md-tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  const c = document.getElementById('md-tab-content');
  if (c) { c.innerHTML = renderTab(tab); if (typeof twemoji !== 'undefined') twemoji.parse(c); }
}

// ── Main render ───────────────────────────────────────────────────────────────

async function renderMatchDetail(scheduleMatchId) {
  const el = document.getElementById('match-detail-content');
  if (!el) return;

  const result = [...(STATE.results.groupMatches||[]), ...(STATE.results.knockoutMatches||[])]
                   .find(r => r.matchId === scheduleMatchId);
  const sched  = SCHEDULE.find(m => m.id === scheduleMatchId)
              || R32_MATCHES.find(m => m.id === scheduleMatchId);
  if (!sched) { el.innerHTML = `<div class="md-empty">Match not found.</div>`; return; }

  MD.result = result; MD.sched = sched; MD.summary = null;

  el.innerHTML = buildShell(result, sched);
  const tc = document.getElementById('md-tab-content');
  if (tc) { tc.innerHTML = renderTab(MD.tab); if (typeof twemoji !== 'undefined') twemoji.parse(el); }

  const espnId = result?.espnId;
  if (espnId && (result?.status === 'FT' || result?.status === 'LIVE')) {
    try {
      MD.summary = await fetchMatchSummary(espnId);
      if (tc) { tc.innerHTML = renderTab(MD.tab); if (typeof twemoji !== 'undefined') twemoji.parse(el); }
    } catch(e) { console.warn('[MD] summary failed:', e.message); }
  }
}

async function fetchMatchSummary(espnId) {
  if (MD_CACHE[espnId]) return MD_CACHE[espnId];
  const r = await fetch(
    `https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnId}&region=us&lang=en&contentorigin=espn`,
    { signal: AbortSignal.timeout(9000) }
  );
  if (!r.ok) throw new Error(`${r.status}`);
  const data = await r.json();
  MD_CACHE[espnId] = data;
  return data;
}

// ── Shell (header + tabs) ─────────────────────────────────────────────────────

function buildShell(result, sched) {
  const t1 = result?.team1 || sched.t1, t2 = result?.team2 || sched.t2;
  const hasResult = result && result.status !== 'NS';
  const score = hasResult ? `${result.score1}<span class="md-score-sep">–</span>${result.score2}` : 'vs';

  let status = sched.time + ' CT';
  if (result?.status === 'FT') {
    const s = result.substatus;
    status = s === 'AET' ? 'Full Time (AET)'
           : s === 'PSO' ? `Full Time · Pens ${result.penScore1}–${result.penScore2}`
           : 'Full Time';
  } else if (result?.status === 'LIVE') {
    status = result.substatus === 'HT' ? 'Half Time' : (result.clock || 'Live');
  }

  // Compact scorer lines (like SofaScore header)
  let scorers = '';
  if (hasResult && result.events?.length) {
    const goals = result.events.filter(e => e.g);
    const hg = goals.filter(e => (!e.og && e.tid===result.tid1) || (e.og && e.tid===result.tid2))
                    .map(e => `${e.p} ${e.min}`).join(', ');
    const ag = goals.filter(e => (!e.og && e.tid===result.tid2) || (e.og && e.tid===result.tid1))
                    .map(e => `${e.p} ${e.min}`).join(', ');
    if (hg || ag) scorers = `<div class="md-scorers-row"><span>${hg}</span><span>${ag}</span></div>`;
  }

  const tabs = ['facts','lineup','stats'].map(t =>
    `<button class="md-tab-btn${MD.tab===t?' active':''}" data-tab="${t}" onclick="setMDTab('${t}')">${t[0].toUpperCase()+t.slice(1)}</button>`
  ).join('');

  const round = sched.g ? `Group ${sched.g}` : (sched.round || 'Knockout');
  return `<div class="md-header">
    <div class="md-round-label">${round} · ${formatDate(sched.date)}</div>
    <div class="md-teams">
      <div class="md-team"><span class="md-flag">${getFlag(t1)}</span><span class="md-tname">${displayName(t1)}</span></div>
      <div class="md-score-block"><div class="md-score">${score}</div><div class="md-status-str">${status}</div></div>
      <div class="md-team md-team-r"><span class="md-tname">${displayName(t2)}</span><span class="md-flag">${getFlag(t2)}</span></div>
    </div>
    ${scorers}
    <div class="md-city">📍 ${sched.city}</div>
  </div>
  <div class="md-tabs">${tabs}</div>
  <div id="md-tab-content"></div>`;
}

function renderTab(tab) {
  const { result, sched, summary } = MD;
  switch(tab) {
    case 'facts':  return buildFactsTab(result, summary);
    case 'lineup': return buildLineupTab(result, summary);
    case 'stats':  return buildStatsTab(result, summary);
    default: return '';
  }
}

// ── FACTS TAB ─────────────────────────────────────────────────────────────────

function buildFactsTab(result, summary) {
  if (!result || result.status === 'NS')
    return `<div class="md-empty">Match hasn't started yet.</div>`;

  const events = result.events || [];

  // Game info row
  const gi = summary?.gameInfo;
  const att = gi?.attendance;
  const ref = (gi?.officials||[]).find(o => (o.position?.name||'').toLowerCase().includes('ref'))?.displayName || '';
  const infoRow = (att||ref) ? `<div class="md-gameinfo">
    ${att ? `<span>👥 ${att.toLocaleString()}</span>` : ''}
    ${ref ? `<span>🟡 ${ref}</span>` : ''}
  </div>` : '';

  if (!events.length) return `${infoRow}<div class="md-empty">No events data yet.</div>`;

  // Sort and compute running scores
  const sorted = [...events].sort((a,b) => parseEventMin(a.min)-parseEventMin(b.min));
  let s1=0, s2=0, htDone=false, htS1=0, htS2=0;
  const rows = [];

  for (const ev of sorted) {
    const min = parseEventMin(ev.min);

    // Insert HT divider before first 2nd-half event
    if (!htDone && min >= 45.5) {
      rows.push({ _ht:true, s1:htS1, s2:htS2 });
      htDone = true;
    }

    // Update running score
    if (ev.g) {
      const ownGoal = ev.og;
      const benefitsT1 = (!ownGoal && ev.tid===result.tid1) || (ownGoal && ev.tid===result.tid2);
      if (benefitsT1) s1++; else s2++;
      if (!htDone) { htS1=s1; htS2=s2; }
    }
    rows.push({ ...ev, rs1:s1, rs2:s2 });
  }

  const rowHtml = rows.map(ev => {
    // HT divider
    if (ev._ht) return `<div class="facts-ht">
      <div class="facts-ht-line"></div>
      <div class="facts-ht-pill">HT <span class="facts-ht-score">${ev.s1}–${ev.s2}</span></div>
      <div class="facts-ht-line"></div>
    </div>`;

    const isT1 = ev.tid === result.tid1;
    let content = '';

    if (ev.sub) {
      content = `<span class="facts-sub-in">↑ ${ev.pIn||''}</span><br><span class="facts-sub-out">↓ ${ev.p||''}</span>`;
    } else if (ev.g) {
      const tag  = ev.og ? ' <span class="facts-og">OG</span>' : ev.pk ? ' <span class="facts-pk">P</span>' : '';
      const curr = isT1 ? `${ev.rs1}-${ev.rs2}` : `${ev.rs2}-${ev.rs1}`; // local perspective
      content = `<span class="facts-scorer">⚽ ${ev.p}${tag}</span> <span class="facts-rscore">(${ev.rs1}-${ev.rs2})</span>`;
    } else if (ev.r) {
      content = `<span class="facts-card facts-red">🟥 ${ev.p}</span>`;
    } else if (ev.y) {
      content = `<span class="facts-card">🟨 ${ev.p}</span>`;
    }

    return isT1
      ? `<div class="facts-row"><div class="facts-home">${content}</div><div class="facts-min">${ev.min}</div><div class="facts-away"></div></div>`
      : `<div class="facts-row"><div class="facts-home"></div><div class="facts-min">${ev.min}</div><div class="facts-away">${content}</div></div>`;
  }).join('');

  return `${infoRow}<div class="facts-timeline">${rowHtml}</div>`;
}

// ── LINEUP TAB ────────────────────────────────────────────────────────────────

function buildLineupTab(result, summary) {
  if (!result) return `<div class="md-empty">No match data.</div>`;
  if (!summary) return `<div class="md-loading"><div class="md-spinner"></div><span>Loading lineups…</span></div>`;

  const boxTeams   = summary.boxscore?.teams || [];
  const boxPlayers = summary.rosters || summary.boxscore?.players || [];
  const findIn = (arr, name) =>
    arr.find(t => normName(espnToApp(t.team?.displayName || t.displayName || '')) === normName(name));

  const t1S = findIn(boxTeams,   result.team1) || boxTeams[0]   || {};
  const t2S = findIn(boxTeams,   result.team2) || boxTeams[1]   || {};
  const t1P = findIn(boxPlayers, result.team1) || boxPlayers[0] || {};
  const t2P = findIn(boxPlayers, result.team2) || boxPlayers[1] || {};

  t1P.formation = t1P.formation || t1S.formation || '';
  t2P.formation = t2P.formation || t2S.formation || '';

  const t1Ath = mdGetAthletes(t1P), t2Ath = mdGetAthletes(t2P);
  const t1Start = t1Ath.filter(a => a.starter);
  const t2Start = t2Ath.filter(a => a.starter);

  if (!t1Start.length && !t2Start.length)
    return `<div class="md-empty">Lineup not available for this match.</div>`;

  const svg    = buildPitchSVG(t1Start, t2Start, t1P.formation, t2P.formation, result);
  const bench1 = t1Ath.filter(a => !a.starter);
  const bench2 = t2Ath.filter(a => !a.starter);

  const pill = a => {
    const n = a.athlete?.shortName || a.athlete?.displayName || '?';
    return `<span class="lu-bench-pill">${a.jersey ? a.jersey+' ' : ''}${n}</span>`;
  };

  const bench = (bench1.length || bench2.length) ? `<div class="lu-bench-wrap">
    <div class="lu-bench-title">Bench</div>
    <div class="lu-bench-cols">
      <div>${bench1.map(pill).join('')}</div>
      <div class="lu-bench-col-r">${bench2.map(pill).join('')}</div>
    </div>
  </div>` : '';

  return `<div class="pitch-wrap">${svg}</div>${bench}`;
}

function mdGetAthletes(t) {
  if (!t) return [];
  if (Array.isArray(t.athletes)) return t.athletes;
  if (Array.isArray(t.roster))   return t.roster;
  const list = [];
  for (const pg of (t.players||[])) for (const a of (pg.athletes||[])) list.push(a);
  return list;
}

function buildPitchSVG(homeAth, awayAth, homeFm, awayFm, result) {
  const W=260, H=390, half=H/2;
  const getRows = fm => fm ? [1,...fm.split('-').map(Number)] : [1,4,3,3];

  const positions = (athletes, rows, isHome) => {
    const sorted = [...athletes].filter(a=>a.formationPlace)
                   .sort((a,b)=>(a.formationPlace||0)-(b.formationPlace||0));
    const list = sorted.length ? sorted : athletes;
    const pos=[], n=rows.length;
    let idx=0;
    rows.forEach((cnt,ri) => {
      const t = n>1 ? ri/(n-1) : 0.5;
      const y = isHome ? 338-t*(338-212) : 48+t*(155-48);
      for(let i=0;i<cnt;i++){
        if(idx>=list.length) break;
        pos.push({ a:list[idx], x:(W/(cnt+1))*(i+1), y });
        idx++;
      }
    });
    return pos;
  };

  const player = ({ a, x, y }, fill) => {
    const last  = (a.athlete?.shortName||a.athlete?.displayName||'?').split(' ').pop().slice(0,8);
    const num   = a.jersey||'';
    const faded = (a.subbedOut||a.didSubOut) ? ' opacity=".55"' : '';
    return `<g${faded}>
      <circle cx="${x}" cy="${y}" r="15" fill="${fill}" stroke="rgba(255,255,255,.75)" stroke-width="1.5"/>
      <text x="${x}" y="${y+5}" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${num}</text>
      <text x="${x}" y="${y+26}" text-anchor="middle" fill="rgba(255,255,255,.9)" font-size="8">${last}</text>
    </g>`;
  };

  const hp = positions(homeAth, getRows(homeFm), true);
  const ap = positions(awayAth, getRows(awayFm), false);

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;display:block;margin:8px auto 0">
    <rect width="${W}" height="${H}" fill="#2a5c1a" rx="6"/>
    <rect x="14" y="8" width="${W-28}" height="${H-16}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
    <line x1="14" y1="${half}" x2="${W-14}" y2="${half}" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
    <circle cx="${W/2}" cy="${half}" r="28" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
    <circle cx="${W/2}" cy="${half}" r="2" fill="rgba(255,255,255,.4)"/>
    <rect x="${W/2-44}" y="8" width="88" height="46" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
    <rect x="${W/2-44}" y="${H-54}" width="88" height="46" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
    <rect x="${W/2-20}" y="8" width="40" height="16" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
    <rect x="${W/2-20}" y="${H-24}" width="40" height="16" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
    <text x="${W/2}" y="${half-10}" text-anchor="middle" fill="rgba(255,255,255,.3)" font-size="9">${awayFm}</text>
    <text x="${W/2}" y="${half+18}" text-anchor="middle" fill="rgba(255,255,255,.3)" font-size="9">${homeFm}</text>
    ${ap.map(p=>player(p,'#a72020')).join('')}
    ${hp.map(p=>player(p,'#1d4cb0')).join('')}
  </svg>`;
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────

function buildStatsTab(result, summary) {
  if (!result || result.status === 'NS')
    return `<div class="md-empty">Stats available after the match starts.</div>`;

  const boxTeams = summary?.boxscore?.teams || [];
  const findIn   = (arr, name) =>
    arr.find(t => normName(espnToApp(t.team?.displayName||'')) === normName(name));
  const t1S = findIn(boxTeams, result?.team1) || boxTeams[0] || {};
  const t2S = findIn(boxTeams, result?.team2) || boxTeams[1] || {};

  return buildMDMotM(result, summary)
       + buildMDStatBars(t1S, t2S, result?.stats)
       + buildLeadersSection(summary)
       + buildUserMotM(result, summary);
}

// MotM from ESPN leaders
function buildMDMotM(result, summary) {
  const leaders = summary?.leaders || [];
  const cat = leaders.find(c => {
    const n = (c.name||c.displayName||'').toLowerCase();
    return n.includes('player')||n.includes('match')||n.includes('rating');
  });
  const l = cat?.leaders?.[0];
  if (!l) return '';
  const name = l.athlete?.shortName || l.athlete?.displayName || '';
  const team = l.team?.displayName ? espnToApp(l.team.displayName) : '';
  if (!name && !team) return '';
  return `<div class="md-section md-motm-box">
    <div class="md-section-title">⭐ Player of the Match</div>
    <div class="md-motm-inner">
      ${getFlag(team)}
      <div><div class="md-motm-name">${name||team}</div><div class="md-motm-team">${team}</div></div>
      ${l.displayValue ? `<div class="md-motm-val">${l.displayValue}</div>` : ''}
    </div>
  </div>`;
}

// Enhanced stats bars
const STAT_DEFS2 = [
  { key:'possessionPct',   label:'Possession',    fmt:v=>v+'%', isPct:true },
  { key:'totalShots',      label:'Shots' },
  { key:'shotsOnTarget',   label:'On Target' },
  { key:'saves',           label:'Saves' },
  { key:'passingAccuracy', label:'Pass Accuracy', fmt:v=>v+'%', isPct:true },
  { key:'totalTackles',    label:'Tackles' },
  { key:'yellowCards',     label:'Yellow Cards' },
  { key:'wonCorners',      label:'Corners' },
  { key:'foulsCommitted',  label:'Fouls' },
  { key:'offsides',        label:'Offsides' },
];
function getStat2(td, key) {
  const s = (td?.statistics||[]).find(s=>s.name===key||s.label?.toLowerCase()===key.toLowerCase());
  if(!s) return null;
  const v=parseFloat(s.displayValue);
  return isNaN(v)?null:v;
}
function buildMDStatBars(t1S, t2S, existing) {
  const s1e=existing?.t1||{}, s2e=existing?.t2||{};
  const rows = STAT_DEFS2.map(({key,label,fmt,isPct})=>{
    const v1=getStat2(t1S,key)??s1e[key], v2=getStat2(t2S,key)??s2e[key];
    if(v1==null&&v2==null) return '';
    const a=parseFloat(v1)||0, b=parseFloat(v2)||0;
    const total=isPct?100:(a+b||1), pct1=Math.round((a/total)*100);
    const d=fmt||(v=>Math.round(v));
    return `<div class="stat-row">
      <span class="stat-val">${d(a)}</span>
      <div class="stat-mid"><div class="stat-bar"><div class="stat-bar-1" style="width:${pct1}%"></div><div class="stat-bar-2" style="width:${100-pct1}%"></div></div><span class="stat-label">${label}</span></div>
      <span class="stat-val r">${d(b)}</span>
    </div>`;
  }).filter(Boolean).join('');
  if(!rows) return '';
  return `<div class="md-section"><div class="md-section-title">📊 Match Stats</div><div class="match-stats-panel">${rows}</div></div>`;
}

// Match leaders
function buildLeadersSection(summary) {
  const leaders = summary?.leaders || [];
  if (!leaders.length) return '';
  const rows = leaders.map(cat=>{
    const cl=(cat.leaders||[]).slice(0,3);
    if(!cl.length) return '';
    const items=cl.map(l=>{
      const name=l.athlete?.shortName||l.athlete?.displayName||l.player?.shortName||l.player?.displayName||'';
      const team=l.team?.displayName?espnToApp(l.team.displayName):'';
      const val=l.displayValue!=null?l.displayValue:(l.value!=null?String(Math.round(l.value)):'');
      if(!name&&!team&&!val) return '';
      return `<div class="ldr-item">${team?getFlag(team):''}<span class="ldr-name">${name||team}</span>${val?`<span class="ldr-val">${val}</span>`:''}</div>`;
    }).filter(Boolean).join('');
    if(!items) return '';
    return `<div class="ldr-cat"><div class="ldr-cat-title">${cat.displayName||cat.name||''}</div>${items}</div>`;
  }).filter(Boolean).join('');
  if(!rows) return '';
  return `<div class="md-section"><div class="md-section-title">⭐ Match Leaders</div><div class="md-leaders">${rows}</div></div>`;
}

// User MotM picker
function buildUserMotM(result, summary) {
  const key = `wc2026_motm_${MD.schedId}`;
  const saved = localStorage.getItem(key) || '';

  const boxPlayers = summary?.rosters || summary?.boxscore?.players || [];
  const findIn = (arr, name) =>
    arr.find(t => normName(espnToApp(t.team?.displayName||t.displayName||'')) === normName(name));
  const t1P = findIn(boxPlayers, result.team1) || boxPlayers[0];
  const t2P = findIn(boxPlayers, result.team2) || boxPlayers[1];
  const t1A = mdGetAthletes(t1P||{}).filter(a=>a.starter||a.subbedIn);
  const t2A = mdGetAthletes(t2P||{}).filter(a=>a.starter||a.subbedIn);
  const allA = [
    ...t1A.map(a=>({...a,side:1})),
    ...t2A.map(a=>({...a,side:2})),
  ];
  if (!allA.length) return '';

  const divider = `<div class="motm-divider">${getFlag(result.team2)} ${displayName(result.team2)}</div>`;
  let crossedSide = false;
  const btns = allA.map(a => {
    const n = a.athlete?.shortName || a.athlete?.displayName || '';
    if (!n) return '';
    let div = '';
    if (a.side === 2 && !crossedSide) { div = divider; crossedSide = true; }
    const picked = saved === n;
    return div + `<button class="motm-pick-btn${picked?' motm-picked':''}" onclick="pickMotM('${n.replace(/'/g,"\\'")}')">
      ${picked?'⭐ ':''}${n}
    </button>`;
  }).filter(Boolean).join('');

  return `<div class="md-section">
    <div class="md-section-title">🌟 Your Man of the Match${saved?` · <span style="color:var(--gold)">${saved}</span>`:''}</div>
    <div class="motm-picker-wrap">
      <div class="motm-team-label">${getFlag(result.team1)} ${displayName(result.team1)}</div>
      <div class="motm-options">${btns}</div>
    </div>
  </div>`;
}

function pickMotM(name) {
  const key = `wc2026_motm_${MD.schedId}`;
  if (name && localStorage.getItem(key) !== name) localStorage.setItem(key, name);
  else localStorage.removeItem(key);
  const tc = document.getElementById('md-tab-content');
  if (tc && MD.tab === 'stats') { tc.innerHTML = renderTab('stats'); }
}

// ── Compatibility stubs (called from other files) ─────────────────────────────
function buildMDRichSections() { return ''; }
function buildMDBasicStats()   { return ''; }
function buildMDEnhancedStats(){ return ''; }
function buildMDPlayerStats(t1,t2,r,s){ return buildLeadersSection(s); }
function buildMDSubs(t1,t2,r){
  const ev=(r?.events||[]).filter(e=>e.sub);
  if(!ev.length) return '';
  return ev.map(e=>{
    const isT1=e.tid===r.tid1;
    const l=`<span class="sub-out">↓ ${e.p}</span><span class="sub-in"> ↑ ${e.pIn}</span>`;
    return `<div class="tl-row"><div class="tl-side tl-left">${isT1?l:''}</div><div class="tl-min">${e.min}</div><div class="tl-side tl-right">${!isT1?l:''}</div></div>`;
  }).join('');
}
