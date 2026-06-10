// TODAY.JS — Today tab renderer

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
    leftStatus = '<span class="mc-live"><span class="pulse-dot"></span>LIVE</span>';
  } else {
    // Two-line time display matching artifact
    const t = match.time;
    leftStatus = `<span class="mc-time">${t}</span><span class="mc-tz">CT</span>`;
  }
  const grpLabel = match.g ? `GRP ${match.g}` : 'R32';

  // Team rows — winner gold + bold, loser 45% opacity
  const cls1 = !isDraw && t1Wins ? 'winner' : (!isDraw && t2Wins ? 'loser' : '');
  const cls2 = !isDraw && t2Wins ? 'winner' : (!isDraw && t1Wins ? 'loser' : '');
  const s1html = hasResult ? `<span class="mc-score">${score1}</span>` : '';
  const s2html = hasResult ? `<span class="mc-score">${score2}</span>` : '';

  return `<div class="mc-wrap${isMyCard ? ' my-team-card' : ''}">
  <div class="mc-left ${leftCls}">
    ${leftStatus}
    <span class="mc-grp">${grpLabel}</span>
  </div>
  <div class="mc-right">
    <div class="mc-team ${cls1}">
      <span class="mc-flag">${getFlag(match.t1)}</span>
      <span class="mc-name">${match.t1}</span>
      <span data-star-team="${match.t1}"></span>
      ${s1html}
    </div>
    <div class="mc-divider"></div>
    <div class="mc-team ${cls2}">
      <span class="mc-flag">${getFlag(match.t2)}</span>
      <span class="mc-name">${match.t2}</span>
      <span data-star-team="${match.t2}"></span>
      ${s2html}
    </div>
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
