// ═══════════════════════════════════════════
// MATCHDETAIL.JS — Match detail modal (Facts / Lineup / Stats)
// ═══════════════════════════════════════════

const MD_CACHE = {};
let MD_TAB  = 'facts';
let MD_DATA = null; // { result, sched, summary }

// ── Open / Close / Tab ────────────────────────────────────────────────────────

function openMatchDetail(scheduleMatchId) {
  const modal = document.getElementById('match-detail-modal');
  if (!modal) return;
  MD_TAB  = 'facts';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  _mdRender(scheduleMatchId);
}

function closeMatchDetail() {
  const m = document.getElementById('match-detail-modal');
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

function setMDTab(tab) {
  MD_TAB = tab;
  document.querySelectorAll('.md-tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  const el = document.getElementById('md-tab-content');
  if (el && MD_DATA) {
    try { el.innerHTML = _mdTab(tab); } catch(e) { el.innerHTML = '<div class="md-empty">Error rendering tab.</div>'; }
    if (typeof twemoji !== 'undefined') twemoji.parse(el);
  }
}

function pickMotM(name) {
  const key = 'wc2026_motm_' + (MD_DATA && MD_DATA.sched ? MD_DATA.sched.id : '');
  const cur  = localStorage.getItem(key);
  if (name && cur !== name) localStorage.setItem(key, name);
  else localStorage.removeItem(key);
  setMDTab('stats');
}

// ── Main render ───────────────────────────────────────────────────────────────

async function _mdRender(scheduleMatchId) {
  const el = document.getElementById('match-detail-content');
  if (!el) return;

  const result = (STATE.results.groupMatches || []).concat(STATE.results.knockoutMatches || [])
                   .find(function(r) { return r.matchId === scheduleMatchId; });
  const sched  = SCHEDULE.find(function(m) { return m.id === scheduleMatchId; })
              || R32_MATCHES.find(function(m) { return m.id === scheduleMatchId; });

  if (!sched) { el.innerHTML = '<div class="md-empty">Match not found.</div>'; return; }

  MD_DATA = { result: result, sched: sched, summary: null };
  el.innerHTML = _mdShell(result, sched);

  var tc = document.getElementById('md-tab-content');
  if (tc) {
    try { tc.innerHTML = _mdTab(MD_TAB); } catch(e) { tc.innerHTML = ''; }
    if (typeof twemoji !== 'undefined') twemoji.parse(el);
  }

  var espnId = result && result.espnId;
  if (espnId && result && (result.status === 'FT' || result.status === 'LIVE')) {
    try {
      var summary = await _mdFetch(espnId);
      MD_DATA.summary = summary;
      if (tc) {
        try { tc.innerHTML = _mdTab(MD_TAB); } catch(e) {}
        if (typeof twemoji !== 'undefined') twemoji.parse(el);
      }
    } catch(e) { /* summary unavailable */ }
  }
}

async function _mdFetch(espnId) {
  if (MD_CACHE[espnId]) return MD_CACHE[espnId];
  var url = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=' + espnId + '&region=us&lang=en&contentorigin=espn';
  var r = await fetch(url);
  if (!r.ok) throw new Error(r.status);
  var data = await r.json();
  MD_CACHE[espnId] = data;
  return data;
}

// ── Shell (header + tab bar) ──────────────────────────────────────────────────

function _mdShell(result, sched) {
  var t1 = (result && result.team1) || sched.t1;
  var t2 = (result && result.team2) || sched.t2;
  var has = result && result.status !== 'NS';
  var score = has ? result.score1 + '<span class="md-score-sep">\u2013</span>' + result.score2 : 'vs';

  var status = sched.time + ' CT';
  if (result && result.status === 'FT') {
    var s = result.substatus;
    status = s === 'AET' ? 'Full Time (AET)'
           : s === 'PSO' ? 'Full Time \u00b7 Pens ' + result.penScore1 + '\u2013' + result.penScore2
           : 'Full Time';
  } else if (result && result.status === 'LIVE') {
    status = result.substatus === 'HT' ? 'Half Time' : (result.clock || 'Live');
  }

  var scorers = '';
  if (has && result.events && result.events.length) {
    var goals = result.events.filter(function(e) { return e.g; });
    var hg = goals.filter(function(e) { return (!e.og&&e.tid===result.tid1)||(e.og&&e.tid===result.tid2); })
                  .map(function(e) { return e.p + ' ' + e.min; }).join(', ');
    var ag = goals.filter(function(e) { return (!e.og&&e.tid===result.tid2)||(e.og&&e.tid===result.tid1); })
                  .map(function(e) { return e.p + ' ' + e.min; }).join(', ');
    if (hg || ag) scorers = '<div class="md-scorers-row"><span>' + hg + '</span><span>' + ag + '</span></div>';
  }

  var round = sched.g ? 'Group ' + sched.g : (sched.round || 'Knockout');
  var tabs  = ['facts','lineup','stats'].map(function(t) {
    return '<button class="md-tab-btn' + (MD_TAB===t?' active':'') + '" data-tab="' + t + '" onclick="setMDTab(\'' + t + '\')">' + (t[0].toUpperCase()+t.slice(1)) + '</button>';
  }).join('');

  return '<div class="md-header">'
    + '<div class="md-round-label">' + round + ' \u00b7 ' + formatDate(sched.date) + '</div>'
    + '<div class="md-teams">'
    + '<div class="md-team"><span class="md-flag">' + getFlag(t1) + '</span><span class="md-tname">' + displayName(t1) + '</span></div>'
    + '<div class="md-score-block"><div class="md-score">' + score + '</div><div class="md-status-str">' + status + '</div></div>'
    + '<div class="md-team md-team-r"><span class="md-tname">' + displayName(t2) + '</span><span class="md-flag">' + getFlag(t2) + '</span></div>'
    + '</div>'
    + scorers
    + '<div class="md-city">\uD83D\uDCCD ' + sched.city + '</div>'
    + '</div>'
    + '<div class="md-tabs">' + tabs + '</div>'
    + '<div id="md-tab-content"></div>';
}

// ── Tab router ────────────────────────────────────────────────────────────────

function _mdTab(tab) {
  var r = MD_DATA && MD_DATA.result;
  var s = MD_DATA && MD_DATA.sched;
  var sum = MD_DATA && MD_DATA.summary;
  if (tab === 'facts')  return _mdFacts(r, sum);
  if (tab === 'lineup') return _mdLineup(r, sum);
  if (tab === 'stats')  return _mdStats(r, sum, s);
  return '';
}

// ── FACTS TAB ─────────────────────────────────────────────────────────────────

function _mdFacts(result, summary) {
  if (!result || result.status === 'NS')
    return '<div class="md-empty">Match hasn\'t started yet.</div>';

  var events = result.events || [];
  var gi  = summary && summary.gameInfo;
  var att = gi && gi.attendance;
  var ref = gi && gi.officials && gi.officials.filter(function(o) {
    return (o.position && o.position.name || '').toLowerCase().indexOf('ref') >= 0;
  })[0];
  var refName = ref && ref.displayName || '';

  var info = (att || refName) ? '<div class="md-gameinfo">'
    + (att ? '<span>\uD83D\uDC65 ' + att.toLocaleString() + ' fans</span>' : '')
    + (refName ? '<span>\uD83D\UDFE1 ' + refName + '</span>' : '')
    + '</div>' : '';

  if (!events.length) return info + '<div class="md-empty">No events yet.</div>';

  var sorted = events.slice().sort(function(a,b) { return parseEventMin(a.min)-parseEventMin(b.min); });
  var s1=0, s2=0, htDone=false, htS1=0, htS2=0;
  var rows = [];

  sorted.forEach(function(ev) {
    var min = parseEventMin(ev.min);
    if (!htDone && min >= 45.5) {
      rows.push({ _ht:true, s1:htS1, s2:htS2 });
      htDone = true;
    }
    if (ev.g) {
      var bT1 = (!ev.og&&ev.tid===result.tid1)||(ev.og&&ev.tid===result.tid2);
      if (bT1) s1++; else s2++;
      if (!htDone) { htS1=s1; htS2=s2; }
    }
    var ev2 = {};
    Object.keys(ev).forEach(function(k) { ev2[k] = ev[k]; });
    ev2.rs1 = s1; ev2.rs2 = s2;
    rows.push(ev2);
  });

  var html = rows.map(function(ev) {
    if (ev._ht) return '<div class="facts-ht"><div class="facts-ht-line"></div><div class="facts-ht-pill">HT <span class="facts-ht-score">' + ev.s1 + '\u2013' + ev.s2 + '</span></div><div class="facts-ht-line"></div></div>';
    var isT1 = ev.tid === result.tid1;
    var content = '';
    if (ev.sub) {
      content = '<span class="facts-sub-in">\u2191 ' + (ev.pIn||'') + '</span><br><span class="facts-sub-out">\u2193 ' + (ev.p||'') + '</span>';
    } else if (ev.g) {
      var tag = ev.og ? ' <span class="facts-og">OG</span>' : ev.pk ? ' <span class="facts-pk">P</span>' : '';
      content = '<span class="facts-scorer">\u26BD ' + ev.p + tag + '</span> <span class="facts-rscore">(' + ev.rs1 + '\u2013' + ev.rs2 + ')</span>';
    } else if (ev.r) {
      content = '<span class="facts-card">\uD83D\uDFE5 ' + ev.p + '</span>';
    } else if (ev.y) {
      content = '<span class="facts-card">\uD83D\uDFE8 ' + ev.p + '</span>';
    }
    if (isT1) return '<div class="facts-row"><div class="facts-home">' + content + '</div><div class="facts-min">' + ev.min + '</div><div class="facts-away"></div></div>';
    return '<div class="facts-row"><div class="facts-home"></div><div class="facts-min">' + ev.min + '</div><div class="facts-away">' + content + '</div></div>';
  }).join('');

  return info + '<div class="facts-timeline">' + html + '</div>';
}

// ── LINEUP TAB ────────────────────────────────────────────────────────────────

function _getAth(t) {
  if (!t) return [];
  if (Array.isArray(t.athletes)) return t.athletes;
  if (Array.isArray(t.roster))   return t.roster;
  var list = [];
  (t.players||[]).forEach(function(pg) { (pg.athletes||[]).forEach(function(a) { list.push(a); }); });
  return list;
}

function _findT(arr, name) {
  return arr.filter(function(t) {
    return normName(espnToApp(t.team && t.team.displayName || t.displayName || '')) === normName(name);
  })[0];
}

function _mdLineup(result, summary) {
  if (!result) return '<div class="md-empty">No match data.</div>';
  if (!summary) return '<div class="md-loading"><div class="md-spinner"></div><span>Loading lineups\u2026</span></div>';

  var boxTeams   = summary.boxscore && summary.boxscore.teams   || [];
  var boxPlayers = summary.rosters  || (summary.boxscore && summary.boxscore.players) || [];

  var t1S = _findT(boxTeams,   result.team1) || boxTeams[0]   || {};
  var t2S = _findT(boxTeams,   result.team2) || boxTeams[1]   || {};
  var t1P = _findT(boxPlayers, result.team1) || boxPlayers[0] || {};
  var t2P = _findT(boxPlayers, result.team2) || boxPlayers[1] || {};

  t1P.formation = t1P.formation || t1S.formation || '';
  t2P.formation = t2P.formation || t2S.formation || '';

  var t1A = _getAth(t1P), t2A = _getAth(t2P);
  var t1St = t1A.filter(function(a){return a.starter;}), t2St = t2A.filter(function(a){return a.starter;});

  if (!t1St.length && !t2St.length) return '<div class="md-empty">Lineup not available.</div>';

  var svg = _pitch(t1St, t2St, t1P.formation, t2P.formation);

  var bench1 = t1A.filter(function(a){return !a.starter;}),
      bench2 = t2A.filter(function(a){return !a.starter;});
  function pill(a) {
    var n = (a.athlete && (a.athlete.shortName || a.athlete.displayName)) || '?';
    return '<span class="lu-bench-pill">' + (a.jersey ? a.jersey+' ': '') + n + '</span>';
  }
  var bench = (bench1.length||bench2.length) ? '<div class="lu-bench-wrap"><div class="lu-bench-title">Bench</div><div class="lu-bench-cols"><div>' + bench1.map(pill).join('') + '</div><div class="lu-bench-col-r">' + bench2.map(pill).join('') + '</div></div></div>' : '';

  return '<div class="pitch-wrap">' + svg + '</div>' + bench;
}

function _pitch(homeA, awayA, homeFm, awayFm) {
  var W=260, H=390, half=H/2;
  function rows(fm) { return fm ? [1].concat(fm.split('-').map(Number)) : [1,4,3,3]; }

  function calcPos(ath, rs, isHome) {
    var s = ath.filter(function(a){return a.formationPlace;}).sort(function(a,b){return (a.formationPlace||0)-(b.formationPlace||0);});
    var list = s.length ? s : ath;
    var out=[], n=rs.length, idx=0;
    rs.forEach(function(cnt,ri) {
      var t = n>1 ? ri/(n-1) : 0.5;
      var y = isHome ? 338-t*(338-212) : 48+t*(155-48);
      for(var j=0;j<cnt;j++) { if(idx>=list.length)break; out.push({a:list[idx],x:(W/(cnt+1))*(j+1),y:y}); idx++; }
    });
    return out;
  }

  function draw(p, fill) {
    var a=p.a, x=p.x, y=p.y;
    var last = ((a.athlete && (a.athlete.shortName||a.athlete.displayName)) || '?').split(' ').pop().slice(0,8);
    var num  = a.jersey || '';
    var op   = (a.subbedOut||a.didSubOut) ? ' opacity=".5"' : '';
    return '<g'+op+'><circle cx="'+x+'" cy="'+y+'" r="15" fill="'+fill+'" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/><text x="'+x+'" y="'+(y+5)+'" text-anchor="middle" fill="white" font-size="10" font-weight="bold">'+num+'</text><text x="'+x+'" y="'+(y+26)+'" text-anchor="middle" fill="rgba(255,255,255,.85)" font-size="8">'+last+'</text></g>';
  }

  var hp=calcPos(homeA,rows(homeFm),true), ap=calcPos(awayA,rows(awayFm),false);

  return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;display:block;margin:8px auto 0">'
    + '<rect width="'+W+'" height="'+H+'" fill="#2a5c1a" rx="6"/>'
    + '<rect x="14" y="8" width="'+(W-28)+'" height="'+(H-16)+'" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
    + '<line x1="14" y1="'+half+'" x2="'+(W-14)+'" y2="'+half+'" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
    + '<circle cx="'+W/2+'" cy="'+half+'" r="28" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
    + '<text x="'+W/2+'" y="'+(half-10)+'" text-anchor="middle" fill="rgba(255,255,255,.3)" font-size="9">'+awayFm+'</text>'
    + '<text x="'+W/2+'" y="'+(half+17)+'" text-anchor="middle" fill="rgba(255,255,255,.3)" font-size="9">'+homeFm+'</text>'
    + ap.map(function(p){return draw(p,'#a72020');}).join('')
    + hp.map(function(p){return draw(p,'#1d4cb0');}).join('')
    + '</svg>';
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────

var _SD = [
  {key:'possessionPct',   label:'Possession',    fmt:function(v){return v+'%';}, isPct:true},
  {key:'totalShots',      label:'Shots'},
  {key:'shotsOnTarget',   label:'On Target'},
  {key:'saves',           label:'Saves'},
  {key:'passingAccuracy', label:'Pass Accuracy', fmt:function(v){return v+'%';}, isPct:true},
  {key:'totalTackles',    label:'Tackles'},
  {key:'yellowCards',     label:'Yellow Cards'},
  {key:'wonCorners',      label:'Corners'},
  {key:'foulsCommitted',  label:'Fouls'},
  {key:'offsides',        label:'Offsides'},
];

function _mdStats(result, summary, sched) {
  if (!result || result.status === 'NS')
    return '<div class="md-empty">Stats available after the match starts.</div>';

  var boxTeams = summary && summary.boxscore && summary.boxscore.teams || [];
  var t1S = _findT(boxTeams, result.team1) || boxTeams[0] || {};
  var t2S = _findT(boxTeams, result.team2) || boxTeams[1] || {};
  var se1 = result.stats && result.stats.t1 || {}, se2 = result.stats && result.stats.t2 || {};

  function getSt(td, key) {
    var s = (td.statistics||[]).filter(function(s){return s.name===key;})[0];
    if (!s) return null;
    var v = parseFloat(s.displayValue);
    return isNaN(v) ? null : v;
  }

  var rows = _SD.map(function(def) {
    var v1 = getSt(t1S,def.key); if (v1 === null) v1 = se1[def.key];
    var v2 = getSt(t2S,def.key); if (v2 === null) v2 = se2[def.key];
    if (v1 == null && v2 == null) return '';
    var a = parseFloat(v1)||0, b = parseFloat(v2)||0;
    var total = def.isPct ? 100 : (a+b||1);
    var pct1  = Math.round((a/total)*100);
    var d = def.fmt || function(v){return Math.round(v);};
    return '<div class="stat-row"><span class="stat-val">'+d(a)+'</span><div class="stat-mid"><div class="stat-bar"><div class="stat-bar-1" style="width:'+pct1+'%"></div><div class="stat-bar-2" style="width:'+(100-pct1)+'%"></div></div><span class="stat-label">'+def.label+'</span></div><span class="stat-val r">'+d(b)+'</span></div>';
  }).filter(Boolean).join('');

  var statsHtml = rows ? '<div class="md-section"><div class="md-section-title">\uD83D\uDCCA Match Stats</div><div class="match-stats-panel">'+rows+'</div></div>' : '';

  // Leaders
  var leaders = summary && summary.leaders || [];
  var lRows = leaders.map(function(cat) {
    var cl = (cat.leaders||[]).slice(0,3);
    if (!cl.length) return '';
    var items = cl.map(function(l) {
      var name = (l.athlete&&(l.athlete.shortName||l.athlete.displayName)) || (l.player&&(l.player.shortName||l.player.displayName)) || '';
      var team = (l.team&&l.team.displayName) ? espnToApp(l.team.displayName) : '';
      var val  = l.displayValue != null ? l.displayValue : (l.value != null ? String(Math.round(l.value)) : '');
      if (!name && !team && !val) return '';
      return '<div class="ldr-item">'+(team?getFlag(team):'')+' <span class="ldr-name">'+(name||team)+'</span>'+(val?'<span class="ldr-val">'+val+'</span>':'')+' </div>';
    }).filter(Boolean).join('');
    if (!items) return '';
    return '<div class="ldr-cat"><div class="ldr-cat-title">'+(cat.displayName||cat.name||'')+'</div>'+items+'</div>';
  }).filter(Boolean).join('');

  var leadersHtml = lRows ? '<div class="md-section"><div class="md-section-title">\u2B50 Match Leaders</div><div class="md-leaders">'+lRows+'</div></div>' : '';

  // User MotM picker
  var key    = 'wc2026_motm_' + (sched ? sched.id : '');
  var saved  = localStorage.getItem(key) || '';
  var bp     = summary && summary.rosters || (summary && summary.boxscore && summary.boxscore.players) || [];
  var t1P    = _findT(bp, result.team1) || bp[0];
  var t2P    = _findT(bp, result.team2) || bp[1];
  var allA   = _getAth(t1P||{}).filter(function(a){return a.starter||a.subbedIn;})
                .concat(_getAth(t2P||{}).filter(function(a){return a.starter||a.subbedIn;}));

  var pickerHtml = '';
  if (allA.length) {
    var btns = allA.map(function(a) {
      var n = (a.athlete && (a.athlete.shortName||a.athlete.displayName)) || '';
      if (!n) return '';
      var picked = saved === n;
      return '<button class="motm-pick-btn' + (picked?' motm-picked':'') + '" onclick="pickMotM(\'' + n.replace(/'/g,"\\'") + '\')">' + (picked?'\u2B50 ':'') + n + '</button>';
    }).filter(Boolean).join('');
    if (btns) {
      pickerHtml = '<div class="md-section"><div class="md-section-title">\uD83C\uDF1F Your Man of the Match' + (saved?' \u00b7 <span style="color:var(--gold)">'+saved+'</span>':'') + '</div><div class="motm-picker-wrap"><div class="motm-options">'+btns+'</div></div></div>';
    }
  }

  return statsHtml + leadersHtml + pickerHtml;
}

// ── Compatibility stubs ────────────────────────────────────────────────────────
function buildMDRichSections() { return ''; }
function buildMDBasicStats()   { return ''; }
function buildMDEnhancedStats(){ return ''; }
function buildMDPlayerStats()  { return ''; }
function buildMDSubs()         { return ''; }
function mdGetAthletes(t)      { return _getAth(t); }
