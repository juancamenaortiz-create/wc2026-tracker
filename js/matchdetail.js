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
    try {
      el.classList.remove('subtab-enter');
      void el.offsetWidth; // force reflow
      el.innerHTML = _mdTab(tab);
      el.classList.add('subtab-enter');
    } catch(e) { el.innerHTML = '<div class="md-empty">Error loading section.</div>'; }
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

// Build a stacked goal list for one team in the header (shown below the flag).
// Uses result.events which are available immediately from the scoreboard parse.
function _mdGoalList(events, tid) {
  if (!events || !events.length) return '';
  var goals = events.filter(function(e) { return e.g && e.tid === tid; });
  if (!goals.length) return '';
  var sorted = goals.slice().sort(function(a, b) {
    return parseEventMin(a.min) - parseEventMin(b.min);
  });
  return '<div class="md-goal-list">'
    + sorted.map(function(g) {
        var extra = g.og ? ' <span class="facts-og">OG</span>'
                  : g.pk ? ' <span class="facts-pk">P</span>' : '';
        return '<div class="md-goal-item">'
          + (g.p || '') + extra
          + ' <span class="md-goal-min">' + (g.min || '') + '</span>'
          + '</div>';
      }).join('')
    + '</div>';
}

function _mdShell(result, sched) {
  var t1  = (result && result.team1) || sched.t1;
  var t2  = (result && result.team2) || sched.t2;
  var has = result && result.status !== 'NS';
  var hasPSO = result && result.substatus === 'PSO' && result.penScore1 != null && result.penScore2 != null;
  var score = has
    ? result.score1 + (hasPSO ? '<span class="md-pen-paren">(' + result.penScore1 + ')</span>' : '')
      + '<span class="md-score-sep">&ndash;</span>'
      + result.score2 + (hasPSO ? '<span class="md-pen-paren">(' + result.penScore2 + ')</span>' : '')
    : '<span class="md-score-sep">vs</span>';

  // Goal lists for header (only shown for played/live matches)
  var t1Goals = (has && result.events) ? _mdGoalList(result.events, result.tid1) : '';
  var t2Goals = (has && result.events) ? _mdGoalList(result.events, result.tid2) : '';

  // Status pill
  var statusTxt, statusCls;
  if (result && result.status === 'FT') {
    var s = result.substatus;
    statusTxt = s === 'AET' ? 'Full Time (AET)'
              : s === 'PSO' ? 'Full Time (Pens)'
              : 'Full Time';
    statusCls = 'md-pill-ft';
  } else if (result && result.status === 'LIVE') {
    statusTxt  = result.substatus === 'HT' ? 'Half Time' : (result.clock || 'Live');
    statusCls  = 'md-pill-live';
  } else {
    statusTxt = sched.time + ' CT';
    statusCls = 'md-pill-ns';
  }

  var round = sched.g ? 'Group ' + sched.g : (sched.round || 'Knockout');
  var tabs  = [['facts','Summary'],['stats','Stats'],['lineup','Lineups']].map(function(t) {
    return '<button class="md-tab-btn' + (MD_TAB===t[0]?' active':'') + '" data-tab="' + t[0] + '" onclick="setMDTab(\'' + t[0] + '\')">' + t[1] + '</button>';
  }).join('');

  var s1 = t1.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  var s2 = t2.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

  return '<div class="md-header">'
    + '<div class="md-round-label">' + round + ' &middot; ' + formatDate(sched.date) + '</div>'
    + '<div class="md-teams">'
    +   '<div class="md-team md-team-link" onclick="openTeamProfile(\'' + s1 + '\')">'
    +     '<span class="md-flag-badge">' + getFlag(t1) + '</span>'
    +     '<span class="md-tname">' + displayName(t1) + '</span>'
    +     t1Goals
    +   '</div>'
    +   '<div class="md-score-block"><div class="md-score">' + score + '</div></div>'
    +   '<div class="md-team md-team-link" onclick="openTeamProfile(\'' + s2 + '\')">'
    +     '<span class="md-flag-badge">' + getFlag(t2) + '</span>'
    +     '<span class="md-tname">' + displayName(t2) + '</span>'
    +     t2Goals
    +   '</div>'
    + '</div>'
    + '<div class="md-status-wrap"><span class="md-status-pill ' + statusCls + '">' + statusTxt + '</span></div>'
    + '<div class="md-city">' + sched.city + '</div>'
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

  // Enrich scoreboard events (goals + cards) with substitutions, VAR decisions
  // and shootout kicks from the summary plays array. The scoreboard API only
  // returns goals and cards; everything else lives in the summary endpoint.
  var events = _enrichEvents(result.events || [], summary, result);
  // PSO kicks: the lightweight scoreboard endpoint (result.pso) typically only
  // records SUCCESSFUL shootout kicks — ESPN's "scoring plays" list omits misses.
  // The summary endpoint's full play-by-play has the complete sequence including
  // misses, so prefer it whenever it returns anything; fall back to result.pso
  // (available immediately on every refresh) only if the summary hasn't loaded yet.
  var summaryPsoKicks = _extractPSOKicks(summary, result);
  var psoKicks = summaryPsoKicks.length ? summaryPsoKicks : (result.pso || []);

  if (!events.length && !psoKicks.length)
    return info + '<div class="md-empty">No events yet.</div>';

  // Sort events and compute running score
  var sorted = events.slice().sort(function(a,b) { return parseEventMin(a.min)-parseEventMin(b.min); });
  var s1=0, s2=0, htDone=false, htS1=0, htS2=0, aetDone=false;
  var rows = [];
  sorted.forEach(function(ev) {
    var min = parseEventMin(ev.min);
    if (!htDone && min >= 45.5) {
      rows.push({ _ht:true, s1:htS1, s2:htS2 });
      htDone = true;
    }
    if (!aetDone && min >= 105.5) {
      rows.push({ _aet:true });
      aetDone = true;
    }
    if (ev.g) {
      if (ev.tid === result.tid1) s1++; else s2++;
      if (!htDone) { htS1=s1; htS2=s2; }
    }
    var ev2 = Object.assign({}, ev, { rs1:s1, rs2:s2 });
    rows.push(ev2);
  });

  var html = rows.map(function(ev) {
    // HT divider
    if (ev._ht) {
      return '<div class="facts-ht"><div class="facts-ht-line"></div>'
           + '<div class="facts-ht-pill">Half Time <span class="facts-ht-score">' + ev.s1 + '&ndash;' + ev.s2 + '</span></div>'
           + '<div class="facts-ht-line"></div></div>';
    }
    // AET divider
    if (ev._aet) {
      return '<div class="facts-ht"><div class="facts-ht-line"></div>'
           + '<div class="facts-ht-pill" style="color:var(--gold)">AET</div>'
           + '<div class="facts-ht-line"></div></div>';
    }

    var isT1 = ev.tid === result.tid1;
    var marker = '', name = '', sub = '', nameCls = '';

    if (ev.sub) {
      marker  = '<span class="fr-icon fr-sub-icon">&#8645;</span>';
      name    = ev.pIn || '';
      sub     = 'for ' + (ev.p || '');
    } else if (ev.var) {
      marker  = '<span class="fr-dot fr-ball" style="opacity:.4"></span>';
      name    = ev.p || '';
      nameCls = 'fr-strike';
      sub     = '<span class="fr-var">VAR &middot; disallowed</span>';
    } else if (ev.g) {
      var tag = ev.og ? ' <span class="facts-og">OG</span>' : ev.pk ? ' <span class="facts-pk">P</span>' : '';
      marker  = '<span class="fr-dot fr-ball"></span>';
      name    = ev.p + tag;
      sub     = 'Goal &middot; ' + ev.rs1 + '&ndash;' + ev.rs2;
    } else if (ev.r) {
      marker  = '<span class="fr-card fr-red"></span>';
      name    = ev.p;
      sub     = 'Red card';
    } else if (ev.y) {
      marker  = '<span class="fr-card fr-yellow"></span>';
      name    = ev.p;
      sub     = 'Yellow card';
    }

    if (!name && !marker) return '';
    var text = '<div class="fr-text"><div class="fr-name ' + nameCls + '">' + name + '</div>'
             + (sub ? '<div class="fr-sub">' + sub + '</div>' : '') + '</div>';
    var cell = isT1 ? text + marker : marker + text;

    return '<div class="facts-row">'
         + '<div class="facts-home">' + (isT1 ? cell : '') + '</div>'
         + '<div class="facts-min"><span class="fr-min-pill">' + ev.min + '</span></div>'
         + '<div class="facts-away">' + (!isT1 ? cell : '') + '</div></div>';
  }).filter(Boolean).join('');

  // Penalty shootout section
  var psoHtml = '';
  if (psoKicks.length) {
    var t1Kicks = psoKicks.filter(function(k){ return k.tid === result.tid1; });
    var t2Kicks = psoKicks.filter(function(k){ return k.tid === result.tid2; });
    var maxKicks = Math.max(t1Kicks.length, t2Kicks.length);
    var t1Score  = t1Kicks.filter(function(k){ return k.scored; }).length;
    var t2Score  = t2Kicks.filter(function(k){ return k.scored; }).length;

    function kickDot(scored) {
      return scored
        ? '<span class="pso-dot pso-dot-scored">&#10003;</span>'
        : '<span class="pso-dot pso-dot-missed">&#10005;</span>';
    }

    var kickRows = '';
    for (var i = 0; i < maxKicks; i++) {
      var k1 = t1Kicks[i], k2 = t2Kicks[i];
      kickRows += '<div class="pso-kick-row">'
        + '<span class="pso-kname pso-kname-left">' + (k1 ? k1.name : '') + '</span>'
        + '<span class="pso-icon-cell">' + (k1 ? kickDot(k1.scored) : '') + '</span>'
        + '<span class="pso-kick-num">' + (i + 1) + '</span>'
        + '<span class="pso-icon-cell">' + (k2 ? kickDot(k2.scored) : '') + '</span>'
        + '<span class="pso-kname pso-kname-right">' + (k2 ? k2.name : '') + '</span>'
        + '</div>';
    }

    // Dot summary strip for each team
    function dotStrip(kicks) {
      return kicks.map(function(k) { return kickDot(k.scored); }).join('');
    }

    psoHtml = '<div class="pso-section">'
      + '<div class="pso-banner">'
      + '<div class="pso-banner-team">'
      + '<span class="pso-banner-flag">' + getFlag(result.team1) + '</span>'
      + '<span class="pso-banner-name">' + displayName(result.team1) + '</span>'
      + '<span class="pso-banner-score' + (t1Score > t2Score ? ' pso-winner' : '') + '">' + t1Score + '</span>'
      + '</div>'
      + '<span class="pso-banner-label">Penalties</span>'
      + '<div class="pso-banner-team pso-banner-team-r">'
      + '<span class="pso-banner-score' + (t2Score > t1Score ? ' pso-winner' : '') + '">' + t2Score + '</span>'
      + '<span class="pso-banner-name">' + displayName(result.team2) + '</span>'
      + '<span class="pso-banner-flag">' + getFlag(result.team2) + '</span>'
      + '</div>'
      + '</div>'
      + '<div class="pso-dot-strips">'
      + '<div class="pso-dot-strip">' + dotStrip(t1Kicks) + '</div>'
      + '<div class="pso-dot-strip pso-dot-strip-r">' + dotStrip(t2Kicks) + '</div>'
      + '</div>'
      + (kickRows ? '<div class="pso-kicks">' + kickRows + '</div>' : '')
      + '</div>';
  }

  return info + '<div class="facts-timeline">' + html + '</div>' + psoHtml
       + '<button class="md-fullstats-btn" onclick="setMDTab(\'stats\')">View full match stats</button>';
}

// ── Event enrichment helpers ───────────────────────────────────────────────────

// Merge scoreboard events (goals+cards) with richer summary plays (subs, VAR)
function _enrichEvents(stored, summary, result) {
  if (!summary) return stored;

  // Try every path ESPN might use for their play-by-play timeline
  var plays = summary.plays
           || (summary.boxscore && summary.boxscore.plays)
           || summary.events
           || [];

  if (!plays.length) {
    // No play-by-play from summary — skip roster-derived subs here.
    // They have no minute info and clutter the timeline.
    // Subs are shown in the Lineup tab's Substitutions section instead.
    return stored;
  }

  // Build a set of matchIds we already have from scoreboard to avoid duplicates
  var storedGoals = {};
  stored.forEach(function(e) {
    if (e.g && e.p) storedGoals[(e.p + e.min).toLowerCase().replace(/\s/g,'')] = true;
  });

  var extra = [];
  plays.forEach(function(p) {
    var typeText = ((p.type && (p.type.text || p.type.name)) || p.text || '').toLowerCase();
    var min  = (p.clock && p.clock.displayValue) || '';
    var tid  = (p.team && p.team.id) || '';
    var ath  = p.participants || p.athletes || [];
    var name0 = (ath[0] && (ath[0].athlete && (ath[0].athlete.shortName || ath[0].athlete.displayName)) || ath[0] && (ath[0].shortName || ath[0].displayName)) || '';
    var name1 = (ath[1] && (ath[1].athlete && (ath[1].athlete.shortName || ath[1].athlete.displayName)) || ath[1] && (ath[1].shortName || ath[1].displayName)) || '';

    if ((typeText.includes('sub') || typeText.includes('substitut')) && min) {
      // Only include subs that have a real minute — untimed subs go to Lineup tab instead
      extra.push({ min:min, tid:tid, p:name0, pIn:name1, sub:true, g:false, y:false, r:false, og:false, pk:false });
    } else if (typeText.includes('disallow') || typeText.includes('var') || typeText.includes('overturned')) {
      // VAR disallowed goal
      extra.push({ min:min, tid:tid, p:name0, var:true, g:false, sub:false, y:false, r:false });
    }
    // Goals and cards already come from the scoreboard; we skip them here to avoid dups
  });

  return stored.concat(extra);
}

// Fallback: build minimal sub events from roster flags when summary.plays is unavailable
function _subsFromRosters(summary, result) {
  var subs = [];
  var rosters = summary.rosters || (summary.boxscore && summary.boxscore.players) || [];
  rosters.forEach(function(team) {
    var tid = (team.team && team.team.id) || '';
    var ath = (team.roster || team.athletes || []);
    ath.forEach(function(a) {
      var name = (a.athlete && (a.athlete.shortName || a.athlete.displayName)) || '';
      if (a.subbedIn && name) {
        subs.push({ min:'', tid:tid, p:'', pIn:name, sub:true, g:false, y:false, r:false, og:false, pk:false });
      }
    });
  });
  return subs;
}

// Extract penalty shootout kicks from the summary endpoint
function _extractPSOKicks(summary, result) {
  if (!result || result.substatus !== 'PSO') return [];
  var plays = summary && (summary.plays || (summary.boxscore && summary.boxscore.plays) || []);
  if (!plays.length) return [];
  var kicks = [];
  plays.forEach(function(p) {
    var typeText = ((p.type && (p.type.text || p.type.name)) || p.text || '').toLowerCase();
    var period = p.period && p.period.number;
    var inShootout = typeof period === 'number' && period >= 5;
    // ESPN's confirmed real phrasing for shootout kicks is "Penalty - Scored",
    // "Penalty - Saved", or "Penalty - Missed" (hyphenated triplet, distinct from
    // a regular in-play "Penalty Kick" goal). Match these directly — far more
    // reliable than period numbers, which aren't consistently present.
    var isPSOkick = typeText.includes('penalty - scored') || typeText.includes('penalty - saved')
                 || typeText.includes('penalty - missed') || typeText.includes('shootout')
                 || (inShootout && typeText.includes('penalty'));
    if (isPSOkick) {
      var ath = p.participants || p.athletes || [];
      var name = (ath[0] && (ath[0].athlete && (ath[0].athlete.shortName || ath[0].athlete.displayName) || ath[0].shortName || ath[0].displayName)) || '';
      var tid  = (p.team && p.team.id) || '';
      // "Saved" (keeper stopped it) and "Missed" (off target) both count as a miss.
      var scored = typeText.includes('scored') || (!typeText.includes('saved') && !typeText.includes('missed') && !!p.scoringPlay);
      if (name || tid) kicks.push({ name:name, tid:tid, scored:scored });
    }
  });
  return kicks;
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

  // Build sub minute lookup from plays (name → minute string)
  var subMins = {};
  var plays = (summary.plays || (summary.boxscore && summary.boxscore.plays) || []);
  plays.forEach(function(p) {
    var typeText = ((p.type && (p.type.text || p.type.name)) || '').toLowerCase();
    if ((typeText.includes('sub') || typeText.includes('substitut')) && p.clock && p.clock.displayValue) {
      var min  = p.clock.displayValue;
      var ath  = p.participants || p.athletes || [];
      var nameIn = (ath[1] && (ath[1].athlete && (ath[1].athlete.shortName || ath[1].athlete.displayName) || ath[1].shortName || ath[1].displayName)) || '';
      if (nameIn) subMins[nameIn] = min;
    }
  });

  var svg = _buildPitch(t1St, t2St, t1P.formation, t2P.formation);

  var bench1 = t1A.filter(function(a){return !a.starter;}),
      bench2 = t2A.filter(function(a){return !a.starter;});

  function benchPill(a) {
    var n = (a.athlete && (a.athlete.shortName || a.athlete.displayName)) || '?';
    var num = a.jersey || '';
    return '<span class="lu-bench-pill">'
      + (num ? '<span class="lu-bench-pill-num">' + num + '</span>' : '')
      + n + '</span>';
  }

  // Formation header
  var fmHeader = '<div class="lu-fm-header">'
    + '<div class="lu-fm-team">'
    +   '<span class="lu-fm-flag">' + getFlag(result.team1) + '</span>'
    +   '<span class="lu-fm-name">' + displayName(result.team1) + '</span>'
    +   (t1P.formation ? '<span class="lu-fm-pill lu-fm-pill-base">' + t1P.formation + '</span>' : '')
    + '</div>'
    + '<div class="lu-fm-team lu-fm-team-r">'
    +   (t2P.formation ? '<span class="lu-fm-pill-away lu-fm-pill-base">' + t2P.formation + '</span>' : '')
    +   '<span class="lu-fm-name">' + displayName(result.team2) + '</span>'
    +   '<span class="lu-fm-flag">' + getFlag(result.team2) + '</span>'
    + '</div>'
    + '</div>';

  // Substitutions — card style with minute badge
  var subs1on  = t1A.filter(function(a){ return a.subbedIn; });
  var subs1off = t1A.filter(function(a){ return a.subbedOut || a.didSubOut; });
  var subs2on  = t2A.filter(function(a){ return a.subbedIn; });
  var subs2off = t2A.filter(function(a){ return a.subbedOut || a.didSubOut; });

  function subCard(aOn, aOff) {
    var nOn  = (aOn  && ((aOn.athlete  && (aOn.athlete.shortName  || aOn.athlete.displayName))  || '')) || '';
    var nOff = (aOff && ((aOff.athlete && (aOff.athlete.shortName || aOff.athlete.displayName)) || '')) || '';
    if (!nOn && !nOff) return '';
    var min  = subMins[nOn] || '';
    return '<div class="lu-sub-card">'
      + (min ? '<span class="lu-sub-min">' + min + '\'</span>' : '')
      + '<div class="lu-sub-names">'
      + (nOn  ? '<div class="lu-sub-on">&#8593; '  + nOn  + '</div>' : '')
      + (nOff ? '<div class="lu-sub-off">&#8595; ' + nOff + '</div>' : '')
      + '</div></div>';
  }

  var sr1 = subs1on.map(function(a,i){ return subCard(a, subs1off[i]); }).filter(Boolean).join('');
  var sr2 = subs2on.map(function(a,i){ return subCard(a, subs2off[i]); }).filter(Boolean).join('');

  var upArrow   = '<svg width="9" height="9" viewBox="0 0 24 24" fill="#34d488"><path d="M12 4l8 9h-5v7h-6v-7H4z"/></svg>';
  var downArrow = '<svg width="9" height="9" viewBox="0 0 24 24" fill="#f0726b"><path d="M12 20l8-9h-5V4h-6v7H4z"/></svg>';

  var subsHtml = (sr1 || sr2) ? '<div class="lu-bench-wrap">'
    + '<div class="lu-subs-header">'
    + '<span class="lu-bench-title" style="margin-bottom:0">Substitutions</span>'
    + '<span class="lu-subs-legend">'
    + '<span class="lu-subs-legend-item">' + upArrow + ' On</span>'
    + '<span class="lu-subs-legend-item">' + downArrow + ' Off</span>'
    + '</span></div>'
    + '<div class="lu-bench-cols">'
    + '<div>' + (sr1 || '') + '</div>'
    + '<div>' + (sr2 || '') + '</div>'
    + '</div></div>' : '';

  var benchHtml = (bench1.length || bench2.length) ? '<div class="lu-bench-wrap">'
    + '<div class="lu-bench-title">Bench</div>'
    + '<div class="lu-bench-cols">'
    + '<div>' + bench1.map(benchPill).join('') + '</div>'
    + '<div>' + bench2.map(benchPill).join('') + '</div>'
    + '</div></div>' : '';

  return fmHeader
    + '<div class="pitch-wrap">' + svg + '</div>'
    + subsHtml + benchHtml;
}

// SVG pitch — larger circles with jersey number + surname label

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
      var y = isHome ? 335 - t*(335-210) : 50 + t*(170-50);
      for (var j=0; j<cnt; j++) {
        if (idx >= list.length) break;
        out.push({ a:list[idx], x:(W/(cnt+1))*(j+1), y:y });
        idx++;
      }
    });
    return out;
  }

  // Draw player: circle with number + short surname below
  function draw(p, isHome) {
    var a = p.a, x = p.x, y = p.y;
    var fullName = (a.athlete && (a.athlete.shortName || a.athlete.displayName)) || '?';
    var surname  = fullName.split(' ').pop().slice(0, 8);
    var num      = a.jersey || '';
    var faded    = (a.subbedOut || a.didSubOut) ? ' opacity=".4"' : '';
    var fill     = isHome ? '#1a3a28' : '#1b2330';
    var stroke   = isHome ? '#20bd76' : '#6b7686';
    var sw       = isHome ? '1.5' : '1.2';
    return '<g' + faded + '>'
      + '<circle cx="' + x + '" cy="' + y + '" r="11" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>'
      + (num ? '<text x="' + x + '" y="' + (y+3.5) + '" text-anchor="middle" fill="rgba(255,255,255,.9)" font-size="8" font-weight="700" font-family="inherit">' + num + '</text>' : '')
      + '<text x="' + x + '" y="' + (y+22) + '" text-anchor="middle" fill="rgba(255,255,255,.78)" font-size="6.5" font-family="inherit">' + surname + '</text>'
      + '</g>';
  }

  var hp = calcPos(homeA, getRows(homeFm), true);
  var ap = calcPos(awayA, getRows(awayFm), false);

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">'
    // Pitch markings
    + '<rect x="14" y="8" width="' + (W-28) + '" height="' + (H-16) + '" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1"/>'
    + '<line x1="14" y1="' + half + '" x2="' + (W-14) + '" y2="' + half + '" stroke="rgba(255,255,255,.15)" stroke-width="1"/>'
    + '<circle cx="' + (W/2) + '" cy="' + half + '" r="28" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1"/>'
    + '<circle cx="' + (W/2) + '" cy="' + half + '" r="2" fill="rgba(255,255,255,.3)" stroke="none"/>'
    + '<rect x="' + (W/2-44) + '" y="8" width="88" height="46" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1"/>'
    + '<rect x="' + (W/2-44) + '" y="' + (H-54) + '" width="88" height="46" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1"/>'
    // Away players
    + ap.map(function(p){return draw(p,false);}).join('')
    // Home players (drawn on top)
    + hp.map(function(p){return draw(p,true);}).join('')
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
  { key:'yellowCards',     label:'Yellow Cards', inverse:true },
  { key:'wonCorners',      label:'Corners' },
  { key:'foulsCommitted',  label:'Fouls',         inverse:true },
  { key:'offsides',        label:'Offsides',      inverse:true },
];

function _tabStats(result, summary, sched) {
  if (!result || result.status === 'NS')
    return '<div class="md-empty">Stats available after the match starts.</div>';

  var boxTeams = (summary && summary.boxscore && summary.boxscore.teams) || [];
  var t1S = _findT(boxTeams, result.team1) || boxTeams[0] || {};
  var t2S = _findT(boxTeams, result.team2) || boxTeams[1] || {};
  var se1 = (result.stats && result.stats.t1) || {},
      se2 = (result.stats && result.stats.t2) || {};

  function getSt(td, key) {
    var found = (td.statistics||[]).filter(function(s){return s.name===key;})[0];
    if (!found) return null;
    var v = parseFloat(found.displayValue);
    return isNaN(v) ? null : v;
  }

  // Stats bars — green bar for home, dark for away
  var barIdx = 0;
  var rows = _STAT_DEFS.map(function(def) {
    var v1 = getSt(t1S, def.key); if (v1 === null) v1 = se1[def.key];
    var v2 = getSt(t2S, def.key); if (v2 === null) v2 = se2[def.key];
    if (v1 == null && v2 == null) return '';
    var a = parseFloat(v1)||0, b = parseFloat(v2)||0;
    var total = def.isPct ? 100 : (a+b||1);
    var pct1  = Math.round((a/total)*100);
    var d = def.fmt || function(v){return Math.round(v);};
    var aLeads = def.inverse ? (a < b) : (a > b);
    var bLeads = def.inverse ? (b < a) : (b > a);
    barIdx++;
    return '<div class="stat-row">'
      + '<span class="stat-val' + (aLeads ? ' lead' : '') + '">' + d(a) + '</span>'
      + '<div class="stat-mid">'
      +   '<div class="stat-bar">'
      +     '<div class="stat-bar-1" style="width:' + pct1 + '%"></div>'
      +     '<div class="stat-bar-2" style="width:' + (100-pct1) + '%"></div>'
      +   '</div>'
      +   '<span class="stat-label">' + def.label + '</span>'
      + '</div>'
      + '<span class="stat-val' + (bLeads ? ' lead-r' : '') + '">' + d(b) + '</span>'
      + '</div>';
  }).filter(Boolean).join('');

  // Team abbreviation helper
  var ABBR = {'England':'ENG','France':'FRA','Argentina':'ARG','Brazil':'BRA','Spain':'ESP','Germany':'GER','Netherlands':'NED','Portugal':'POR','United States':'USA','Mexico':'MEX','Uruguay':'URU','Colombia':'COL','Croatia':'CRO','Japan':'JPN','Senegal':'SEN','Morocco':'MAR','Ecuador':'ECU','Denmark':'DEN','Switzerland':'SUI','Belgium':'BEL','Poland':'POL','South Korea':'KOR','Australia':'AUS','Canada':'CAN'};
  function abbr(name){return ABBR[name]||(displayName(name).slice(0,3).toUpperCase());}

  var statsHtml = '';
  if (rows) {
    var legend = '<div class="stat-legend">'
      + '<span class="stat-legend-title">Match Stats</span>'
      + '<span class="stat-legend-teams">'
      + '<span class="stat-legend-team"><span class="stat-legend-dot" style="background:#20bd76"></span>' + abbr(result.team1) + '</span>'
      + '<span class="stat-legend-team"><span class="stat-legend-dot" style="background:#3a414c"></span>' + abbr(result.team2) + '</span>'
      + '</span></div>';
    statsHtml = legend + '<div class="match-stats-panel">' + rows + '</div>';
  }

  // Match leaders
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

  // MotM — show gold card if picked, otherwise show picker
  var motmKey = 'wc2026_motm_' + (sched ? sched.id : '');
  var saved   = localStorage.getItem(motmKey) || '';

  var bp   = (summary && summary.rosters) || (summary && summary.boxscore && summary.boxscore.players) || [];
  var t1P  = _findT(bp, result.team1) || bp[0];
  var t2P  = _findT(bp, result.team2) || bp[1];
  var t1PA = _getAth(t1P||{}).filter(function(a){return a.starter||a.subbedIn;});
  var t2PA = _getAth(t2P||{}).filter(function(a){return a.starter||a.subbedIn;});

  function ini(n){var p=n.trim().split(/\s+/);return(p[0][0]+(p[p.length-1][0]||'')).toUpperCase();}

  var motmHtml = '';
  if (saved) {
    // Show gold card for picked MotM
    var allPl = t1PA.concat(t2PA);
    var pickedA = allPl.filter(function(a){
      var n=(a.athlete&&(a.athlete.shortName||a.athlete.displayName))||'';
      return n===saved;
    })[0];
    var pickedTeam = t1PA.indexOf(pickedA)>=0 ? result.team1 : result.team2;
    motmHtml = '<div class="motm-card">'
      + '<div class="motm-avatar">' + ini(saved) + '</div>'
      + '<div class="motm-body">'
      + '<div class="motm-label">&#11088; Your Man of the Match</div>'
      + '<div class="motm-name">' + saved + '</div>'
      + '<div class="motm-sub">' + displayName(pickedTeam) + ' &middot; <span style="color:#34d488;cursor:pointer" onclick="pickMotM(\'' + saved.replace(/'/g,"\\'") + '\')">Change pick</span></div>'
      + '</div></div>';
  } else if (t1PA.length || t2PA.length) {
    function makeBtn(a) {
      var n = (a.athlete && (a.athlete.shortName||a.athlete.displayName)) || '';
      if (!n) return '';
      return '<button class="motm-pick-btn" onclick="pickMotM(\'' + n.replace(/'/g,"\\'") + '\')">' + n + '</button>';
    }
    var btns1 = t1PA.map(makeBtn).filter(Boolean).join('');
    var btns2 = t2PA.map(makeBtn).filter(Boolean).join('');
    if (btns1 || btns2) {
      motmHtml = '<div class="md-section">'
        + '<div class="md-section-title">&#127775; Pick your Man of the Match</div>'
        + '<div class="motm-picker-wrap">'
        + (btns1 ? '<div class="motm-team-label">' + getFlag(result.team1) + ' ' + displayName(result.team1) + '</div><div class="motm-options">' + btns1 + '</div>' : '')
        + (btns2 ? '<div class="motm-team-label motm-team-label-2">' + getFlag(result.team2) + ' ' + displayName(result.team2) + '</div><div class="motm-options">' + btns2 + '</div>' : '')
        + '</div></div>';
    }
  }

  return statsHtml + leadersHtml + motmHtml;
}

// ── Compatibility stubs ────────────────────────────────────────────────────────
function buildMDRichSections() { return ''; }
function buildMDBasicStats()   { return ''; }
function buildMDEnhancedStats(){ return ''; }
function buildMDPlayerStats()  { return ''; }
function buildMDSubs()         { return ''; }
function mdGetAthletes(t)      { return _getAth(t); }
