// AI Preview section — panel only (no button). Button is in buildPreviewToggle.
function buildPreviewSection(matchId) {
  const p = STATE.aiPreviews[matchId];
  if (!p) return '';
  if (p.loading) return '<div class="preview-loading"><span class="preview-spin">⟳</span> Generating\u2026</div>';
  if (!p.open) return '';
  if (p.data) {
    const m = SCHEDULE.find(x => x.id === matchId)
           || (typeof R32_MATCHES !== 'undefined' && R32_MATCHES.find(x => x.id === matchId));
    return buildDetailedPreview(p.data, m);
  }
  if (p.text) return '<div class="preview-panel"><div class="pv-hed"><span class="pv-hed-lbl">AI Preview</span></div><div class="pv-body"><p class="pv-txt">' + p.text + '</p></div></div>';
  return '';
}

// Toggle button — "AI Preview ›" when closed, "Hide Preview ↑" when open.
// Shown in the mc-foot-preview row for all non-delayed matches.
function buildPreviewToggle(matchId) {
  const p = STATE.aiPreviews[matchId];
  if (p && p.loading) return ''; // spinner shown above instead
  const hasData = p && (p.data || p.text);
  if (!hasData) {
    // Not yet fetched (or fetch failed silently) — show fetch trigger
    if (p && !p.data && !p.text && !p.loading) {
      return '<button class="preview-btn preview-retry" onclick="delete STATE.aiPreviews[' + matchId + ']; toggleMatchPreview(' + matchId + ')">Retry Preview &rsaquo;</button>';
    }
    return '<button class="preview-btn" onclick="toggleMatchPreview(' + matchId + ')">AI Preview &rsaquo;</button>';
  }
  const isOpen = !!p.open;
  return '<button class="preview-btn' + (isOpen ? ' preview-open' : '') + '" onclick="toggleMatchPreview(' + matchId + ')">'
    + (isOpen ? 'Hide Preview \u2191' : 'AI Preview &rsaquo;')
    + '</button>';
}

function buildDetailedPreview(d, match) {
  const h2h = d.h2h || {};
  const t1  = match ? displayName(match.t1) : (d.team1 && d.team1.name ? d.team1.name : '');
  const t2  = match ? displayName(match.t2) : (d.team2 && d.team2.name ? d.team2.name : '');

  // Wrap a labelled section block; skip entirely when inner is empty
  function blk(label, inner) {
    return inner ? '<div class="pv-blk"><span class="pv-lbl">' + label + '</span>' + inner + '</div>' : '';
  }

  var stakesHtml = d.stakes
    ? '<p class="pv-txt">' + d.stakes + '</p>' : '';

  var formRows = '';
  if (d.form) {
    if (d.form.team1) formRows += '<div class="pv-formrow"><span class="pv-formteam">' + t1 + '</span><span class="pv-formtxt">' + d.form.team1 + '</span></div>';
    if (d.form.team2) formRows += '<div class="pv-formrow"><span class="pv-formteam">' + t2 + '</span><span class="pv-formtxt">' + d.form.team2 + '</span></div>';
  }
  var formHtml = formRows ? '<div class="pv-formrows">' + formRows + '</div>' : '';

  var tactHtml = d.tactical_battle
    ? '<p class="pv-txt">' + d.tactical_battle + '</p>' : '';

  var duelHtml = '';
  if (d.key_duel) {
    duelHtml = '<div class="pv-duel"><span class="pv-duel-p">' + d.key_duel.player1 + '</span><span class="pv-duel-vs">vs</span><span class="pv-duel-p">' + d.key_duel.player2 + '</span></div>';
    if (d.key_duel.why) duelHtml += '<p class="pv-txt">' + d.key_duel.why + '</p>';
  }

  var h2hHtml = '';
  if (h2h.summary) {
    h2hHtml = '<p class="pv-txt">' + h2h.summary + '</p>';
    if (h2h.edge) h2hHtml += '<p class="pv-edge">' + h2h.edge + '</p>';
  }

  var xfHtml = d.x_factor
    ? '<p class="pv-txt">' + d.x_factor + '</p>' : '';

  var predHtml = '';
  if (d.prediction) {
    predHtml = '<div class="pv-pred">'
      + '<div class="pv-pred-top"><span class="pv-lbl">Prediction</span><span class="pv-pred-score">' + (d.prediction.score || '') + '</span></div>'
      + (d.prediction.reasoning ? '<p class="pv-txt">' + d.prediction.reasoning + '</p>' : '')
      + '</div>';
  }

  return '<div class="preview-panel">'
    + '<div class="pv-hed"><span class="pv-hed-lbl">AI Preview</span></div>'
    + '<div class="pv-body">'
    + blk('Stakes', stakesHtml)
    + blk('Tournament Form', formHtml)
    + blk('Tactical Battle', tactHtml)
    + blk('Key Duel', duelHtml)
    + blk('Head to Head', h2hHtml)
    + blk('X Factor', xfHtml)
    + predHtml
    + '</div></div>';
}



const TODAY_STATE = { showUpcoming: false, selectedDate: null };

function toggleUpcoming() {
  TODAY_STATE.showUpcoming = !TODAY_STATE.showUpcoming;
  const c = document.getElementById('tab-content');
  if (c) renderToday(STATE.demoMode ? document.getElementById('tab-inner') || c : c);
}

// ── Date strip helpers ──────────────────────────────────────────────────
function getAllMatchDates() {
  const ko = [
    ...(typeof R32_MATCHES !== 'undefined' ? R32_MATCHES : []),
    ...(typeof KO_ROUNDS   !== 'undefined' ? KO_ROUNDS   : []),
  ];
  return [...new Set([...SCHEDULE, ...ko].map(m => m.date))].filter(Boolean).sort();
}

// Readable label for an unresolved KO slot ("1st-A" → "1st Grp A")
function _koSlotLabel(slot) {
  if (!slot) return 'TBD';
  const g = slot.match(/^(1st|2nd)-([A-L])$/);
  if (g) return g[1] + ' Grp ' + g[2];
  if (/^3rd-/.test(slot)) return 'Best 3rd';
  return 'TBD';
}

function matchesForDate(date) {
  const group = SCHEDULE.filter(m => m.date === date);
  const ko = [
    ...(typeof R32_MATCHES !== 'undefined' ? R32_MATCHES : []),
    ...(typeof KO_ROUNDS   !== 'undefined' ? KO_ROUNDS   : []),
  ].filter(m => m.date === date).map(m => {
    const teams = getKOMatchTeams(m.id);
    const t1 = teams[0] || _koSlotLabel(m.slot1);
    const t2 = teams[1] || _koSlotLabel(m.slot2);
    return Object.assign({}, m, { t1: t1, t2: t2 });
  });
  return [...group, ...ko];
}

function selectTodayDate(date) {
  TODAY_STATE.selectedDate = date;
  const c = document.getElementById('tab-content');
  if (c) {
    _triggerTabAnim(c);
    renderToday(STATE.demoMode ? document.getElementById('tab-inner') || c : c);
  }
}

function getUpcomingDays(afterDate, numDays) {
  const dates = [...new Set(SCHEDULE.map(m => m.date))]
    .filter(d => d > afterDate).sort().slice(0, numDays);
  return dates.map(date => ({
    date,
    day: SCHEDULE.find(m => m.date === date)?.day || '',
    matches: SCHEDULE.filter(m => m.date === date),
  }));
}

function fmtShort(d) {
  const [,mo,day] = d.split('-').map(Number);
  return ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][mo] + ' ' + day;
}

function renderToday(container) {
  const todayStr = getTodayCT();
  const allDates = getAllMatchDates();

  // Anchor: today if it's a match day, otherwise the next upcoming match day
  let anchor = allDates.includes(todayStr)
    ? todayStr
    : (allDates.find(d => d >= todayStr) || allDates[allDates.length - 1] || todayStr);

  let selectedDate = TODAY_STATE.selectedDate;
  if (!selectedDate || !allDates.includes(selectedDate)) selectedDate = anchor;
  const viewingToday = selectedDate === todayStr;

  let dayMatches = matchesForDate(selectedDate);

  // ── Midnight carryover: keep late-night games visible for up to 3h after kickoff ──
  if (viewingToday) {
    const yesterdayCT = new Date(Date.now() - 5*60*60*1000 - 86400000)
      .toISOString().split('T')[0];
    SCHEDULE.forEach(m => {
      if (m.date !== yesterdayCT) return;
      if (dayMatches.some(x => x.id === m.id)) return;
      const kickoff = parseGameTimeCT(m.date, getMatchTime(m));
      const msSince = Date.now() - kickoff.getTime();
      if (msSince > 0 && msSince < 3 * 60 * 60 * 1000) dayMatches = [m, ...dayMatches];
    });
  }

  const now = new Date();
  let played = 0, upcoming = 0, live = 0;
  dayMatches.forEach(m => {
    const res = m.g ? getMatchResult(m) : getKnockoutResult(m.id);
    if (res && res.status === 'FT') played++;
    else if (res && res.status === 'LIVE') live++;
    else upcoming++;
  });

  let html = '<div class="today-wrap">';

  // ── Date strip ──
  html += '<div class="today-datestrip" id="today-datestrip">';
  allDates.forEach(date => {
    const sel = date === selectedDate;
    let label;
    if (date === todayStr) {
      label = 'Today';
    } else {
      const m0 = matchesForDate(date)[0];
      const dayNum = Number(date.split('-')[2]);
      const wd = (m0 && m0.day) ? m0.day
        : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date + 'T12:00:00Z').getUTCDay()];
      label = `${wd} ${dayNum}`;
    }
    html += `<button class="dchip${sel ? ' active' : ''}${date === todayStr ? ' is-today' : ''}" onclick="selectTodayDate('${date}')">${label}</button>`;
  });
  html += '</div>';

  // ── Summary line ──
  const n = dayMatches.length;
  html += '<div class="today-summary">';
  html += `<span class="summary-total">${n} match${n !== 1 ? 'es' : ''}</span>`;
  if (live > 0) {
    html += `<span class="summary-dot-sep">·</span><span class="summary-live"><span class="summary-live-dot"></span>${live} live now</span>`;
  } else if (n > 0) {
    const bits = [];
    if (upcoming > 0) bits.push(`${upcoming} upcoming`);
    if (played > 0) bits.push(`${played} played`);
    if (bits.length) html += `<span class="summary-dot-sep">·</span><span class="summary-detail">${bits.join(' · ')}</span>`;
  }
  html += '</div>';

  // ── Match cards ──
  if (n === 0) {
    html += '<div class="empty-state">🏆<br>No matches on this day.</div>';
  } else {
    dayMatches.forEach(m => { html += buildMatchCard(m, now); });
  }

  html += '</div>';
  container.innerHTML = html;

  // Bring the selected day into view in the strip (centered)
  const strip = container.querySelector('#today-datestrip');
  if (strip) {
    const act = strip.querySelector('.dchip.active');
    if (act) strip.scrollLeft = Math.max(0, act.offsetLeft - strip.clientWidth / 2 + act.offsetWidth / 2);
  }

  container.querySelectorAll('[data-star-team]').forEach(slot => {
    const btn = starBtn(slot.dataset.starTeam, () => renderToday(container));
    slot.appendChild(btn);
  });
  startCountdowns(container);
}

// Matches the artifact MatchCard exactly
function buildMatchCard(match, now) {
  const result   = match.g ? getMatchResult(match) : getKnockoutResult(match.id);
  const status   = result ? result.status : 'NS';
  const score1   = result ? result.score1 : null;
  const score2   = result ? result.score2 : null;
  const isLive    = status === 'LIVE';
  const isFT      = status === 'FT';
  const isDelayed = status === 'DELAYED';
  const hasResult = isLive || isFT;

  const isPSO   = !!(result?.substatus === 'PSO');
  const isDraw  = hasResult && !isPSO && score1 === score2;
  const t1Wins  = hasResult && (isPSO ? (result.penScore1 ?? 0) > (result.penScore2 ?? 0) : score1 > score2);
  const t2Wins  = hasResult && (isPSO ? (result.penScore2 ?? 0) > (result.penScore1 ?? 0) : score2 > score1);

  const kickoffUTC = parseGameTimeCT(match.date, getMatchTime(match));
  const msUntil    = kickoffUTC - now;
  const countdown  = (!isFT && !isLive && !isDelayed && msUntil > 0) ? formatCountdown(msUntil) : null;
  const isMyCard   = STATE.myTeams.some(t => normName(t) === normName(match.t1) || normName(t) === normName(match.t2));

  // Top-right status: FT / HT / LIVE clock / DELAYED / kickoff time / overdue
  let statusHtml = '';
  if (isFT) {
    const sub = result?.substatus;
    statusHtml = `<span class="mc-status-ft">FT${sub ? ' ' + sub : ''}</span>`;
  } else if (isLive) {
    if (result?.substatus === 'HT') {
      statusHtml = '<span class="mc-status-ht">HT</span>';
    } else {
      const clockStr = result?.clock ? result.clock : 'LIVE';
      statusHtml = `<span class="mc-status-live"><span class="pulse-dot"></span>${clockStr}</span>`;
    }
  } else if (isDelayed) {
    statusHtml = '<span class="mc-status-delay">DELAYED</span>';
  } else {
    const t = getMatchTime(match);
    const tzAbbr = getTZAbbr();
    const isOverdue = msUntil < -300000; // 5+ min past kickoff, still no result
    if (isOverdue) {
      statusHtml = `<span class="mc-status-live"><span class="pulse-dot" style="background:var(--amber)"></span>LIVE?</span>`;
    } else {
      statusHtml = `<span class="mc-status-time">${formatGameTime(match.date, t)} <span class="mc-status-tz">${tzAbbr}</span></span>`;
    }
  }
  const grpLabel = match.g ? `GROUP ${match.g}` : (match.round || 'KO');
  const isLiveCard = isLive || (!hasResult && !isDelayed && msUntil < -300000);

  // Team rows — winner gold + bold, loser 45% opacity
  const cls1 = !isDraw && t1Wins ? 'winner' : (!isDraw && t2Wins ? 'loser' : '');
  const cls2 = !isDraw && t2Wins ? 'winner' : (!isDraw && t1Wins ? 'loser' : '');
  const s1html = hasResult ? `<span class="mc-score">${score1}</span>` : '';
  const s2html = hasResult ? `<span class="mc-score">${score2}</span>` : '';

  // Preview panel (shown for all matches when data is available + open)
  const pvPanel  = !isDelayed ? buildPreviewSection(match.id) : '';
  // Toggle button shown in footer for all non-delayed matches
  const pvToggle = !isDelayed ? buildPreviewToggle(match.id) : '';

  return `<div class="mc-card${isMyCard ? ' my-team-card' : ''}${isLiveCard ? ' mc-card-live' : ''}${isDelayed ? ' mc-card-delayed' : ''}">
  <div class="mc-top">
    <span class="mc-grp-pill">${grpLabel}</span>
    ${statusHtml}
  </div>
  <div class="mc-team ${cls1}">
    <span class="mc-flag">${getFlag(match.t1)}</span>
    <span class="mc-name team-link" onclick="openTeamProfile('${match.t1}')">${displayName(match.t1)}</span>
    <span data-star-team="${match.t1}"></span>
    ${s1html}
  </div>
  <div class="mc-team ${cls2}">
    <span class="mc-flag">${getFlag(match.t2)}</span>
    <span class="mc-name team-link" onclick="openTeamProfile('${match.t2}')">${displayName(match.t2)}</span>
    <span data-star-team="${match.t2}"></span>
    ${s2html}
  </div>
  ${isFT && isPSO && result.penScore1 !== null ? `<div class="mc-pso-score">Pens · ${result.penScore1}–${result.penScore2}</div>` : ''}
  ${isDelayed ? `<div class="mc-delay-note">${delayReason}</div>` : ''}
  ${pvPanel}
  <div class="mc-foot">
    <div class="mc-foot-row">
      ${pvToggle || '<span></span>'}
      ${hasResult ? `<span class="mc-detail-link" onclick="openMatchDetail(${match.id})">Match Centre &rsaquo;</span>` : ''}
      ${countdown ? `<span class="mc-countdown" data-kickoff="${kickoffUTC.getTime()}">${countdown}</span>` : ''}
      ${(!hasResult && !isDelayed && msUntil < -300000) ? '<span class="mc-espn-wait">⚡ Awaiting ESPN\u2026</span>' : ''}
    </div>
    <span class="mc-city">${match.city}</span>
  </div>
</div>`;
}

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

let countdownInterval = null;
function startCountdowns(container) {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const now = Date.now();
    container.querySelectorAll('[data-kickoff]').forEach(el => {
      const ms = parseInt(el.dataset.kickoff) - now;
      if (ms <= 0) el.remove();
      else el.textContent = formatCountdown(ms);
    });
  }, 30000);
}
