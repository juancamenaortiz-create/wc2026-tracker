// TODAY.JS — Today tab renderer

const TODAY_STATE = { showUpcoming: false };

function toggleUpcoming() {
  TODAY_STATE.showUpcoming = !TODAY_STATE.showUpcoming;
  const c = document.getElementById('tab-content');
  if (c) renderToday(STATE.demoMode ? document.getElementById('tab-inner') || c : c);
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
  let displayDate = todayStr, isNextDay = false;
  let todayMatches = SCHEDULE.filter(m => m.date === todayStr);

  if (todayMatches.length === 0) {
    const futureDates = [...new Set(SCHEDULE.map(m => m.date))].filter(d => d >= todayStr).sort();
    if (futureDates.length > 0) { displayDate = futureDates[0]; todayMatches = SCHEDULE.filter(m => m.date === displayDate); isNextDay = true; }
    if (todayMatches.length === 0) {
      const futureKo = [...new Set(R32_MATCHES.map(m => m.date))].filter(d => d >= todayStr).sort();
      if (futureKo.length > 0) { displayDate = futureKo[0]; todayMatches = R32_MATCHES.filter(m => m.date === displayDate); isNextDay = displayDate !== todayStr; }
    }
  }

  const now = new Date();
  let played = 0, upcoming = 0, live = 0;
  todayMatches.forEach(m => {
    const res = m.g ? getMatchResult(m) : getKnockoutResult(m.id);
    if (res && res.status === 'FT') played++;
    else if (res && res.status === 'LIVE') live++;
    else upcoming++;
  });

  let html = '<div class="today-wrap"><div class="today-hdr">';
  if (isNextDay) html += `<div class="next-day-note">Next match day: ${formatDate(displayDate)}</div>`;
  html += `<div class="today-summary"><span class="summary-total">${todayMatches.length} match${todayMatches.length !== 1 ? 'es' : ''} ${isNextDay ? 'scheduled' : 'today'}</span>`;
  if (played > 0 || live > 0) {
    const parts = [];
    if (live > 0) parts.push(`<span class="live-text">${live} LIVE</span>`);
    if (played > 0) parts.push(`${played} played`);
    if (upcoming > 0) parts.push(`${upcoming} upcoming`);
    html += `<span class="summary-detail">${parts.join(' · ')}</span>`;
  }
  html += '</div></div>';

  if (STATE.myTeams.length > 0) {
    const myMatches = todayMatches.filter(m => STATE.myTeams.some(t => normName(t) === normName(m.t1) || normName(t) === normName(m.t2)));
    html += '<div class="section-label">⭐ My Teams</div>';
    if (myMatches.length > 0) { myMatches.forEach(m => { html += buildMatchCard(m, now); }); }
    else html += '<div class="my-teams-empty">No matches for your pinned teams today</div>';
    html += '<div class="section-label">All Matches</div>';
  }

  if (todayMatches.length === 0) {
    html += '<div class="empty-state">🏆<br>No matches scheduled yet.<br><span>Tournament starts June 11, 2026</span></div>';
  } else {
    todayMatches.forEach(m => { html += buildMatchCard(m, now); });
  }

  // ── Upcoming matches accordion ──────────────────────────────────────────
  const upcomingDays = getUpcomingDays(displayDate, 5);
  if (upcomingDays.length > 0) {
    const totalGames = upcomingDays.reduce((n, d) => n + d.matches.length, 0);
    const isOpen = TODAY_STATE.showUpcoming;
    html += `<div class="upcoming-toggle" onclick="toggleUpcoming()">
      <span>📅 Upcoming — ${totalGames} matches over next ${upcomingDays.length} days</span>
      <span class="upcoming-chevron">${isOpen ? '▲' : '▼'}</span>
    </div>`;
    if (isOpen) {
      upcomingDays.forEach(({ date, day, matches }) => {
        html += `<div class="upcoming-day-hdr">${day}, ${fmtShort(date)}</div>`;
        matches.forEach(m => {
          const starred = STATE.myTeams.some(t => normName(t)===normName(m.t1)||normName(t)===normName(m.t2));
          html += `<div class="upcoming-row${starred?' my-t':''}">
            <span class="upcoming-time">${formatGameTime(m.date, m.time)}</span>
            <span class="upcoming-grp">Grp ${m.g}</span>
            <span class="upcoming-teams-txt">${getFlag(m.t1)} ${displayName(m.t1)} <span class="upcoming-vs">vs</span> ${displayName(m.t2)} ${getFlag(m.t2)}</span>
          </div>`;
        });
      });
    }
  }

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-star-team]').forEach(slot => {
    const btn = starBtn(slot.dataset.starTeam, () => renderToday(container));
    slot.appendChild(btn);
  });
  startCountdowns(container);
}
  if (typeof twemoji !== 'undefined') twemoji.parse(container);


// Matches the artifact MatchCard exactly
function buildMatchCard(match, now) {
  const result   = match.g ? getMatchResult(match) : getKnockoutResult(match.id);
  const status   = result ? result.status : 'NS';
  const score1   = result ? result.score1 : null;
  const score2   = result ? result.score2 : null;
  const isLive   = status === 'LIVE';
  const isFT     = status === 'FT';
  const hasResult= isLive || isFT;

  const isDraw  = hasResult && score1 === score2;
  const t1Wins  = hasResult && score1 > score2;
  const t2Wins  = hasResult && score2 > score1;

  const kickoffUTC = parseGameTimeCT(match.date, match.time);
  const msUntil    = kickoffUTC - now;
  const countdown  = (!isFT && !isLive && msUntil > 0) ? formatCountdown(msUntil) : null;
  const isMyCard   = STATE.myTeams.some(t => normName(t) === normName(match.t1) || normName(t) === normName(match.t2));

  // Left column: FT badge / LIVE / time+CT, then GRP label
  let leftStatus = '', leftCls = 'ns-col';
  if (isFT) {
    leftCls = 'ft-col';
    leftStatus = '<span class="mc-ft">FT</span>';
  } else if (isLive) {
    leftCls = 'live-col';
    const clockStr = result?.clock ? ` ${result.clock}` : '';
    leftStatus = `<span class="mc-live"><span class="pulse-dot"></span>LIVE${clockStr}</span>`;
  } else {
    // Two-line time display matching artifact
    const t = match.time;
    const tzAbbr = getTZAbbr();
    leftStatus = `<span class="mc-time">${formatGameTime(match.date, t)}</span><span class="mc-tz">${tzAbbr}</span>`;
  }
  const grpLabel = match.g ? `GRP ${match.g}` : 'R32';

  // Team rows — winner gold + bold, loser 45% opacity
  const cls1 = !isDraw && t1Wins ? 'winner' : (!isDraw && t2Wins ? 'loser' : '');
  const cls2 = !isDraw && t2Wins ? 'winner' : (!isDraw && t1Wins ? 'loser' : '');
  const s1html = hasResult ? `<span class="mc-score">${score1}</span>` : '';
  const s2html = hasResult ? `<span class="mc-score">${score2}</span>` : '';

  // Goals and cards (only when result exists)
  const goals1 = hasResult ? matchGoalsHtml(result, 1) : '';
  const goals2 = hasResult ? matchGoalsHtml(result, 2) : '';
  const cards1 = hasResult ? matchCardsHtml(result, 1) : '';
  const cards2 = hasResult ? matchCardsHtml(result, 2) : '';
  const hasEvents1 = goals1 || cards1;
  const hasEvents2 = goals2 || cards2;

  return `<div class="mc-wrap${isMyCard ? ' my-team-card' : ''}">
  <div class="mc-left ${leftCls}">
    ${leftStatus}
    <span class="mc-grp">${grpLabel}</span>
  </div>
  <div class="mc-right">
    <div class="mc-team ${cls1}">
      <span class="mc-flag">${getFlag(match.t1)}</span>
      <span class="mc-name">${displayName(match.t1)}</span>
      <span data-star-team="${match.t1}"></span>
      ${s1html}
    </div>
    ${hasEvents1 ? `<div class="mc-events">${goals1}${cards1}</div>` : ''}
    <div class="mc-divider"></div>
    <div class="mc-team ${cls2}">
      <span class="mc-flag">${getFlag(match.t2)}</span>
      <span class="mc-name">${displayName(match.t2)}</span>
      <span data-star-team="${match.t2}"></span>
      ${s2html}
    </div>
    ${hasEvents2 ? `<div class="mc-events">${goals2}${cards2}</div>` : ''}
    <div class="mc-footer">
      <span class="mc-city">📍 ${match.city}</span>
      ${countdown ? `<span class="mc-countdown" data-kickoff="${kickoffUTC.getTime()}">${countdown}</span>` : ''}
    </div>
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
