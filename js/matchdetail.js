// ═══════════════════════════════════════════
// MATCHDETAIL.JS — Match detail modal (Facts / Lineup / Stats)
// ═══════════════════════════════════════════

var MD_CACHE = {};
var MD_TAB   = 'facts';
var MD_DATA  = null;

// ── Open / Close / Tab ────────────────────────────────────────────────────────

function openMatchDetail(scheduleMatchId) {
  var modal = document.getElementById('match-detail-modal');
  if (!modal) return;
  MD_TAB  = 'facts';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  _mdRender(scheduleMatchId);
}

function closeMatchDetail() {
  var m = document.getElementById('match-detail-modal');
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

function setMDTab(tab) {
  MD_TAB = tab;
  document.querySelectorAll('.md-tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  var el = document.getElementById('md-tab-content');
  if (el && MD_DATA) {
    try { el.innerHTML = _mdTab(tab); } catch(e) { el.innerHTML = '<div class="md-empty">Error loading section.</div>'; }
    if (typeof twemoji !== 'undefined') twemoji.parse(el);
  }
}

function pickMotM(name) {
  var key = 'wc2026_motm_' + (MD_DATA && MD_DATA.sched ? MD_DATA.sched.id : '');
  var cur = localStorage.getItem(key);
  if (name && cur !== name) localStorage.setItem(key, name);
  else localStorage.removeItem(key);
  setMDTab('stats');
}

// ── Main render ───────────────────────────────────────────────────────────────

async function _mdRender(scheduleMatchId) {
  var el = document.getElementById('match-detail-content');
  if (!el) return;

  var allMatches = (STATE.results.groupMatches || []).concat(STATE.results.knockoutMatches || []);
  var result = allMatches.find(function(r) { return r.matchId === scheduleMatchId; });
  var sched  = SCHEDULE.find(function(m) { return m.id === scheduleMatchId; })
            || R32_MATCHES.find(function(m) { return m.id === scheduleMatchId; });

  if (!sched) { el.innerHTML = '<div class="md-empty">Match not found.</div>'; return; }

  MD_DATA = { result: result, sched: sched, summary: null };
  el.innerHTML = _mdShell(result, sched);

  var tc = document.getElementById('md-tab-content');
  if (tc) {
    try { tc.innerHTML = _mdTab(MD_TAB); } catch(e) {}
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
  var t1  = (result && result.team1) || sched.t1;
  var t2  = (result && result.team2) || sched.t2;
  var has = result && result.status !== 'NS';
  var score = has
    ? result.score1 + '<span class="md-score-sep">&ndash;</span>' + result.score2
    : 'vs';

  var status = sched.time + ' CT';
  if (result && result.status === 'FT') {
    var s = result.substatus;
    status = s === 'AET' ? 'Full Time (AET)'
           : s === 'PSO' ? 'Full Time &middot; Pens ' + result.penScore1 + '&ndash;' + result.penScore2
           : 'Full Time';
  } else if (result && result.status === 'LIVE') {
    status = result.substatus === 'HT' ? 'Half Time' : (result.clock || 'Live');
  }

  // Goal scorers — STACKED (home on top, away below)
  var scorers = '';
  if (has && result.events && result.events.length) {
    var goals = result.events.filter(function(e) { return e.g; });
    // tid already = benefiting team for ALL goals (incl. own goals) — filter directly, no flip
    var hg = goals
      .filter(function(e) { return e.tid===result.tid1; })
      .map(function(e) { return e.p + ' ' + e.min; }).join(', ');
    var ag = goals
      .filter(function(e) { return e.tid===result.tid2; })
      .map(function(e) { return e.p + ' ' + e.min; }).join(', ');
    if (hg || ag) {
      scorers = '<div class="md-scorers-stacked">'
        + (hg ? '<div class="md-sc-home">' + hg + '</div>' : '')
        + (ag ? '<div class="md-sc-away">' + ag + '</div>' : '')
        + '</div>';
    }
  }

  var round = sched.g ? 'Group ' + sched.g : (sched.round || 'Knockout');
  var tabs  = ['facts','lineup','stats'].map(function(t) {
    var label = t.charAt(0).toUpperCase() + t.slice(1);
    return '<button class="md-tab-btn' + (MD_TAB===t?' active':'') + '" data-tab="' + t + '" onclick="setMDTab(\'' + t + '\')">' + label + '</button>';
  }).join('');

  return '<div class="md-header">'
    + '<div class="md-round-label">' + round + ' &middot; ' + formatDate(sched.date) + '</div>'
    + '<div class="md-teams">'
    +   '<div class="md-team"><span class="md-flag">' + getFlag(t1) + '</span><span class="md-tname">' + displayName(t1) + '</span></div>'
    +   '<div class="md-score-block"><div class="md-score">' + score + '</div><div class="md-status-str">' + status + '</div></div>'
    +   '<div class="md-team md-team-r"><span class="md-tname">' + displayName(t2) + '</span><span class="md-flag">' + getFlag(t2) + '</span></div>'
    + '</div>'
    + scorers
    + '<div class="md-city">&#128205; ' + sched.city + '</div>'
    + '</div>'
    + '<div class="md-tabs">' + tabs + '</div>'
    + '<div id="md-tab-content"></div>';
}

// ── Tab router ────────────────────────────────────────────────────────────────

function _mdTab(tab) {
  var r   = MD_DATA && MD_DATA.result;
  var s   = MD_DATA && MD_DATA.sched;
  var sum = MD_DATA && MD_DATA.summary;
  if (tab === 'facts')  return _tabFacts(r, sum);
  if (tab === 'lineup') return _tabLineup(r, sum);
  if (tab === 'stats')  return _tabStats(r, sum, s);
  return '';
}

// ── FACTS TAB ─────────────────────────────────────────────────────────────────

function _tabFacts(result, summary) {
  if (!result || result.status === 'NS')
    return '<div class="md-empty">Match hasn\'t started yet.</div>';

  // Game info row — attendance + referee
  var gi      = summary && summary.gameInfo;
  var att     = gi && gi.attendance;
  var refObj  = gi && gi.officials && gi.officials.filter(function(o) {
    return (o.position && o.position.name || '').toLowerCase().indexOf('ref') >= 0;
  })[0];
  var refName = refObj && refObj.displayName || '';
  var info = '';
  if (att || refName) {
    info = '<div class="md-gameinfo">'
      + (att     ? '<span>&#128101; ' + att.toLocaleString() + ' fans</span>' : '')
      + (refName ? '<span>&#128993; ' + refName + '</span>' : '')
      + '</div>';
  }

  var events = result.events || [];
  if (!events.length) return info + '<div class="md-empty">No events yet.</div>';

  // Sort events and compute running score
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
      // tid already = benefiting team (incl. own goals) — no flip needed
      if (ev.tid === result.tid1) s1++; else s2++;
      if (!htDone) { htS1=s1; htS2=s2; }
    }
    var ev2 = Object.assign({}, ev, { rs1:s1, rs2:s2 });
    rows.push(ev2);
  });

  var html = rows.map(function(ev) {
    if (ev._ht) {
      return '<div class="facts-ht">'
        + '<div class="facts-ht-line"></div>'
        + '<div class="facts-ht-pill">HT <span class="facts-ht-score">' + ev.s1 + '&ndash;' + ev.s2 + '</span></div>'
        + '<div class="facts-ht-line"></div>'
        + '</div>';
    }
    var isT1 = ev.tid === result.tid1;
    var content = '';
    if (ev.sub) {
      content = '<span class="facts-sub-in">&#8593; ' + (ev.pIn||'') + '</span><br>'
              + '<span class="facts-sub-out">&#8595; ' + (ev.p||'') + '</span>';
    } else if (ev.g) {
      var tag = ev.og ? ' <span class="facts-og">OG</span>' : ev.pk ? ' <span class="facts-pk">P</span>' : '';
      content = '<span class="facts-scorer">&#9917; ' + ev.p + tag + '</span>'
              + ' <span class="facts-rscore">(' + ev.rs1 + '&ndash;' + ev.rs2 + ')</span>';
    } else if (ev.r) {
      content = '<span class="facts-card">&#129125; ' + ev.p + '</span>';
    } else if (ev.y) {
      content = '<span class="facts-card">&#128949; ' + ev.p + '</span>';
    }
    if (isT1) {
      return '<div class="facts-row"><div class="facts-home">' + content + '</div><div class="facts-min">' + ev.min + '</div><div class="facts-away"></div></div>';
    }
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
    return normName(espnToApp((t.team && t.team.displayName) || t.displayName || '')) === normName(name);
  })[0];
}

function _tabLineup(result, summary) {
  if (!result) return '<div class="md-empty">No match data.</div>';
  if (!summary) return '<div class="md-loading"><div class="md-spinner"></div><span>Loading lineups&hellip;</span></div>';

  var boxTeams   = (summary.boxscore && summary.boxscore.teams)   || [];
  var boxPlayers = summary.rosters   || (summary.boxscore && summary.boxscore.players) || [];

  var t1S = _findT(boxTeams,   result.team1) || boxTeams[0]   || {};
  var t2S = _findT(boxTeams,   result.team2) || boxTeams[1]   || {};
  var t1P = _findT(boxPlayers, result.team1) || boxPlayers[0] || {};
  var t2P = _findT(boxPlayers, result.team2) || boxPlayers[1] || {};

  t1P.formation = t1P.formation || t1S.formation || '';
  t2P.formation = t2P.formation || t2S.formation || '';

  var t1A  = _getAth(t1P), t2A = _getAth(t2P);
  var t1St = t1A.filter(function(a){return a.starter;}),
      t2St = t2A.filter(function(a){return a.starter;});

  if (!t1St.length && !t2St.length)
    return '<div class="md-empty">Lineup not available for this match.</div>';

  var svg    = _buildPitch(t1St, t2St, t1P.formation, t2P.formation);
  var bench1 = t1A.filter(function(a){return !a.starter;}),
      bench2 = t2A.filter(function(a){return !a.starter;});

  function pill(a) {
    var n = (a.athlete && (a.athlete.shortName || a.athlete.displayName)) || '?';
    return '<span class="lu-bench-pill">' + (a.jersey ? a.jersey + ' ' : '') + n + '</span>';
  }
  var bench = (bench1.length || bench2.length)
    ? '<div class="lu-bench-wrap"><div class="lu-bench-title">Bench</div><div class="lu-bench-cols"><div>' + bench1.map(pill).join('') + '</div><div class="lu-bench-col-r">' + bench2.map(pill).join('') + '</div></div></div>'
    : '';

  return '<div class="pitch-wrap">' + svg + '</div>' + bench;
}

// SVG pitch — smaller circles (r=8), number+name combined below dot

function _buildPitch(homeA, awayA, homeFm, awayFm) {
  var W=260, H=390, half=H/2;

  function getRows(fm) {
    if (!fm) return [1,4,3,3];
    return [1].concat(fm.split('-').map(Number));
  }

  function calcPos(ath, rs, isHome) {
    var sorted = ath.filter(function(a){return a.formationPlace;})
                    .sort(function(a,b){return (a.formationPlace||0)-(b.formationPlace||0);});
    var list = sorted.length ? sorted : ath;
    var out = [], n = rs.length, idx = 0;
    rs.forEach(function(cnt, ri) {
      var t = n > 1 ? ri/(n-1) : 0.5;
      // home: GK at bottom (y=335), FW near center (y=210)
      // away: GK at top (y=50), FW near center (y=170)
      var y = isHome ? 335 - t*(335-210) : 50 + t*(170-50);
      for (var j=0; j<cnt; j++) {
        if (idx >= list.length) break;
        out.push({ a:list[idx], x:(W/(cnt+1))*(j+1), y:y });
        idx++;
      }
    });
    return out;
  }

  // Draw player: small circle + "NUM Name" text below
  function draw(p, fill) {
    var a    = p.a, x = p.x, y = p.y;
    var name = ((a.athlete && (a.athlete.shortName || a.athlete.displayName)) || '?')
                 .split(' ').pop().slice(0,7);
    var num  = a.jersey || '';
    var label = num ? num + ' ' + name : name;
    var op   = (a.subbedOut || a.didSubOut) ? ' opacity=".45"' : '';
    return '<g' + op + '>'
      + '<circle cx="' + x + '" cy="' + y + '" r="8" fill="' + fill + '" stroke="rgba(255,255,255,.6)" stroke-width="1.2"/>'
      + '<text x="' + x + '" y="' + (y+20) + '" text-anchor="middle" fill="rgba(255,255,255,.9)" font-size="7.5">' + label + '</text>'
      + '</g>';
  }

  var hp = calcPos(homeA, getRows(homeFm), true);
  var ap = calcPos(awayA, getRows(awayFm), false);

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;display:block;margin:8px auto 0">'
    // Pitch background
    + '<rect width="' + W + '" height="' + H + '" fill="#2a5c1a" rx="6"/>'
    // Pitch outline
    + '<rect x="14" y="8" width="' + (W-28) + '" height="' + (H-16) + '" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
    // Centre line
    + '<line x1="14" y1="' + half + '" x2="' + (W-14) + '" y2="' + half + '" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
    // Centre circle
    + '<circle cx="' + (W/2) + '" cy="' + half + '" r="28" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
    + '<circle cx="' + (W/2) + '" cy="' + half + '" r="2" fill="rgba(255,255,255,.4)"/>'
    // Penalty areas
    + '<rect x="' + (W/2-44) + '" y="8" width="88" height="46" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
    + '<rect x="' + (W/2-44) + '" y="' + (H-54) + '" width="88" height="46" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
    // Formation labels
    + '<text x="' + (W/2) + '" y="' + (half-10) + '" text-anchor="middle" fill="rgba(255,255,255,.25)" font-size="9">' + awayFm + '</text>'
    + '<text x="' + (W/2) + '" y="' + (half+17) + '" text-anchor="middle" fill="rgba(255,255,255,.25)" font-size="9">' + homeFm + '</text>'
    // Away players (red)
    + ap.map(function(p){return draw(p,'#b52020');}).join('')
    // Home players (blue)
    + hp.map(function(p){return draw(p,'#1d4cb0');}).join('')
    + '</svg>';
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────

var _STAT_DEFS = [
  { key:'possessionPct',   label:'Possession',    fmt:function(v){return v+'%';}, isPct:true },
  { key:'totalShots',      label:'Shots' },
  { key:'shotsOnTarget',   label:'On Target' },
  { key:'saves',           label:'Saves' },
  { key:'passingAccuracy', label:'Pass Accuracy', fmt:function(v){return v+'%';}, isPct:true },
  { key:'totalTackles',    label:'Tackles' },
  { key:'yellowCards',     label:'Yellow Cards' },
  { key:'wonCorners',      label:'Corners' },
  { key:'foulsCommitted',  label:'Fouls' },
  { key:'offsides',        label:'Offsides' },
];

function _tabStats(result, summary, sched) {
  if (!result || result.status === 'NS')
    return '<div class="md-empty">Stats available after the match starts.</div>';

  var boxTeams = (summary && summary.boxscore && summary.boxscore.teams) || [];
  var t1S = _findT(boxTeams, result.team1) || boxTeams[0] || {};
  var t2S = _findT(boxTeams, result.team2) || boxTeams[1] || {};
  var se1 = (result.stats && result.stats.t1) || {},
      se2 = (result.stats && result.stats.t2) || {};

  // Stat lookup
  function getSt(td, key) {
    var found = (td.statistics||[]).filter(function(s){return s.name===key;})[0];
    if (!found) return null;
    var v = parseFloat(found.displayValue);
    return isNaN(v) ? null : v;
  }

  // Stats bars
  var rows = _STAT_DEFS.map(function(def) {
    var v1 = getSt(t1S, def.key); if (v1 === null) v1 = se1[def.key];
    var v2 = getSt(t2S, def.key); if (v2 === null) v2 = se2[def.key];
    if (v1 == null && v2 == null) return '';
    var a = parseFloat(v1)||0, b = parseFloat(v2)||0;
    var total = def.isPct ? 100 : (a+b||1);
    var pct1  = Math.round((a/total)*100);
    var d = def.fmt || function(v){return Math.round(v);};
    return '<div class="stat-row">'
      + '<span class="stat-val">' + d(a) + '</span>'
      + '<div class="stat-mid"><div class="stat-bar"><div class="stat-bar-1" style="width:' + pct1 + '%"></div><div class="stat-bar-2" style="width:' + (100-pct1) + '%"></div></div><span class="stat-label">' + def.label + '</span></div>'
      + '<span class="stat-val r">' + d(b) + '</span>'
      + '</div>';
  }).filter(Boolean).join('');

  var statsHtml = rows
    ? '<div class="md-section"><div class="md-section-title">&#128202; Match Stats</div><div class="match-stats-panel">' + rows + '</div></div>'
    : '';

  // ESPN match leaders
  var leaders = (summary && summary.leaders) || [];
  var lRows = leaders.map(function(cat) {
    var cl = (cat.leaders||[]).slice(0,3);
    if (!cl.length) return '';
    var items = cl.map(function(l) {
      var name = (l.athlete&&(l.athlete.shortName||l.athlete.displayName))
              || (l.player&&(l.player.shortName||l.player.displayName)) || '';
      var team = (l.team&&l.team.displayName) ? espnToApp(l.team.displayName) : '';
      var val  = l.displayValue != null ? l.displayValue : (l.value!=null ? String(Math.round(l.value)) : '');
      if (!name && !team && !val) return '';
      return '<div class="ldr-item">'
        + (team ? getFlag(team) : '')
        + '<span class="ldr-name">' + (name||team) + '</span>'
        + (val ? '<span class="ldr-val">' + val + '</span>' : '')
        + '</div>';
    }).filter(Boolean).join('');
    if (!items) return '';
    return '<div class="ldr-cat"><div class="ldr-cat-title">' + (cat.displayName||cat.name||'') + '</div>' + items + '</div>';
  }).filter(Boolean).join('');

  var leadersHtml = lRows
    ? '<div class="md-section"><div class="md-section-title">&#11088; Match Leaders</div><div class="md-leaders">' + lRows + '</div></div>'
    : '';

  // MotM picker — organized by team
  var motmKey = 'wc2026_motm_' + (sched ? sched.id : '');
  var saved   = localStorage.getItem(motmKey) || '';

  var bp   = (summary && summary.rosters) || (summary && summary.boxscore && summary.boxscore.players) || [];
  var t1P  = _findT(bp, result.team1) || bp[0];
  var t2P  = _findT(bp, result.team2) || bp[1];
  var t1PA = _getAth(t1P||{}).filter(function(a){return a.starter||a.subbedIn;});
  var t2PA = _getAth(t2P||{}).filter(function(a){return a.starter||a.subbedIn;});

  function makeBtn(a) {
    var n = (a.athlete && (a.athlete.shortName||a.athlete.displayName)) || '';
    if (!n) return '';
    var picked = saved === n;
    return '<button class="motm-pick-btn' + (picked?' motm-picked':'') + '" onclick="pickMotM(\'' + n.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')">'
      + (picked ? '&#11088; ' : '') + n
      + '</button>';
  }

  var btns1 = t1PA.map(makeBtn).filter(Boolean).join('');
  var btns2 = t2PA.map(makeBtn).filter(Boolean).join('');
  var pickerHtml = '';
  if (btns1 || btns2) {
    var titleStr = '&#127775; Your Man of the Match'
      + (saved ? ' &middot; <span style="color:var(--gold)">' + saved + '</span>' : '');
    pickerHtml = '<div class="md-section">'
      + '<div class="md-section-title">' + titleStr + '</div>'
      + '<div class="motm-picker-wrap">'
      + (btns1 ? '<div class="motm-team-label">' + getFlag(result.team1) + ' ' + displayName(result.team1) + '</div><div class="motm-options">' + btns1 + '</div>' : '')
      + (btns2 ? '<div class="motm-team-label motm-team-label-2">' + getFlag(result.team2) + ' ' + displayName(result.team2) + '</div><div class="motm-options">' + btns2 + '</div>' : '')
      + '</div></div>';
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
