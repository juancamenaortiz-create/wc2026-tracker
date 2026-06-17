// AI Preview section — shown on upcoming (NS) match cards
function buildPreviewSection(matchId) {
  const p = STATE.aiPreviews[matchId];
  if (!p) {
    return `<button class="preview-btn" onclick="fetchMatchPreview(${matchId})">🤖 AI Preview</button>`;
  }
  if (p.loading) {
    return `<div class="preview-loading"><span class="preview-spin">⟳</span> Generating preview…</div>`;
  }
  if (p.data) return buildDetailedPreview(p.data);
  if (p.text) return `<div class="preview-panel"><span class="pv-label">🤖 AI Preview</span><p class="pv-text">${p.text}</p></div>`;
  return `<button class="preview-btn preview-retry" onclick="delete STATE.aiPreviews[${matchId}]; fetchMatchPreview(${matchId})">⟳ Retry Preview</button>`;
}

function buildDetailedPreview(d) {
  const teamBlock = (t) => {
    if (!t) return '';
    const players = (t.players||[]).map(pl =>
      `<li><strong>${pl.name}</strong> — ${pl.reason}</li>`
    ).join('');
    return `<div class="pv-team">
      <div class="pv-team-hdr">
        <span class="pv-flag">${getFlag(t.name)}</span>
        <span class="pv-tname">${displayName(t.name)}</span>
        ${t.ranking ? `<span class="pv-rank">FIFA #${t.ranking}</span>` : ''}
        ${t.role ? `<span class="pv-role">${t.role}</span>` : ''}
      </div>
      ${t.form    ? `<p class="pv-form">${t.form}</p>` : ''}
      ${t.tactics ? `<div class="pv-row"><span class="pv-ico">⚙️</span><span class="pv-row-body"><span class="pv-row-lbl">Tactics</span> ${t.tactics}</span></div>` : ''}
      ${players   ? `<div class="pv-row"><span class="pv-ico">⭐</span><span class="pv-row-body"><span class="pv-row-lbl">Watch</span><ul class="pv-players">${players}</ul></span></div>` : ''}
      ${t.history ? `<div class="pv-row"><span class="pv-ico">🏆</span><span class="pv-row-body"><span class="pv-row-lbl">History</span> ${t.history}</span></div>` : ''}
    </div>`;
  };
  return `<div class="preview-panel">
    <div class="pv-header"><span class="pv-label">🤖 AI Preview</span></div>
    ${teamBlock(d.team1)}
    <div class="pv-vs-divider">vs</div>
    ${teamBlock(d.team2)}
    ${d.h2h && d.h2h.totalMeetings ? `<div class="pv-row pv-h2h-row">
      <span class="pv-ico">📋</span>
      <span class="pv-row-body">
        <span class="pv-row-lbl">Head to Head</span>
        ${d.h2h.totalMeetings} meetings · ${d.h2h.winsTeam1}W ${d.h2h.draws}D ${d.h2h.winsTeam2}W
        ${d.h2h.lastMeeting ? `<br><span class="pv-h2h-last">${d.h2h.lastMeeting}</span>` : ''}
      </span>
    </div>` : ''}
    ${d.context ? `<div class="pv-context"><span class="pv-ico">📊</span><span class="pv-row-body"><span class="pv-row-lbl">Context</span> ${d.context}</span></div>` : ''}
  </div>`;
}



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

  // ── Midnight carryover: keep late-night games visible after CT midnight ──
  // Any match that kicked off within the last 3 hours belongs on Today
  // even if its scheduled date is now "yesterday" in CT terms.
  // Example: 11 PM CDT kicks off at T=0; at 00:05 CDT (65 min later) it
  // should still appear here, not vanish because the date flipped.
  const yesterdayCT = new Date(Date.now() - 5*60*60*1000 - 86400000)
    .toISOString().split('T')[0];
  SCHEDULE.forEach(m => {
    if (m.date !== yesterdayCT) return;
    if (todayMatches.some(x => x.id === m.id)) return; // already included
    const kickoff = parseGameTimeCT(m.date, m.time);
    const msSince = Date.now() - kickoff.getTime();
    // Within 3 hours of kickoff = could still be in first/second half or extra time
    if (msSince > 0 && msSince < 3 * 60 * 60 * 1000) {
      todayMatches = [m, ...todayMatches]; // prepend so it appears first
    }
  });

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

  const isPSO   = !!(result?.substatus === 'PSO');
  const isDraw  = hasResult && !isPSO && score1 === score2;
  const t1Wins  = hasResult && (isPSO ? (result.penScore1 ?? 0) > (result.penScore2 ?? 0) : score1 > score2);
  const t2Wins  = hasResult && (isPSO ? (result.penScore2 ?? 0) > (result.penScore1 ?? 0) : score2 > score1);

  const kickoffUTC = parseGameTimeCT(match.date, match.time);
  const msUntil    = kickoffUTC - now;
  const countdown  = (!isFT && !isLive && msUntil > 0) ? formatCountdown(msUntil) : null;
  const isMyCard   = STATE.myTeams.some(t => normName(t) === normName(match.t1) || normName(t) === normName(match.t2));

  // Left column: FT badge / LIVE / time+CT, then GRP label
  let leftStatus = '', leftCls = 'ns-col';
  if (isFT) {
    leftCls = 'ft-col';
    const sub = result?.substatus;
    leftStatus = `<span class="mc-ft">FT</span>${sub ? `<span class="mc-sub">${sub}</span>` : ''}`;
  } else if (isLive) {
    if (result?.substatus === 'HT') {
      leftCls = 'ht-col';
      leftStatus = '<span class="mc-ht">HT</span>';
    } else {
      leftCls = 'live-col';
      const clockStr = result?.clock ? ` ${result.clock}` : '';
      leftStatus = `<span class="mc-live"><span class="pulse-dot"></span>LIVE${clockStr}</span>`;
    }
  } else {
    // Two-line time display — or "overdue" if kickoff has passed with no ESPN data yet
    const t = match.time;
    const tzAbbr = getTZAbbr();
    const isOverdue = msUntil < -300000; // 5+ min past kickoff, still no result
    if (isOverdue) {
      leftCls = 'overdue-col';
      leftStatus = `<span class="mc-overdue"><span class="pulse-dot" style="background:var(--amber)"></span>LIVE?</span>`;
    } else {
      leftStatus = `<span class="mc-time">${formatGameTime(match.date, t)}</span><span class="mc-tz">${tzAbbr}</span>`;
    }
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
      <span class="mc-name team-link" onclick="openTeamProfile('${match.t1}')">${displayName(match.t1)}</span>
      <span data-star-team="${match.t1}"></span>
      ${s1html}
    </div>
    <div class="mc-divider"></div>
    ${isFT && isPSO && result.penScore1 !== null ? `<div class="mc-pso-score">Pens · ${result.penScore1}–${result.penScore2}</div>` : ''}
    <div class="mc-team ${cls2}">
      <span class="mc-flag">${getFlag(match.t2)}</span>
      <span class="mc-name team-link" onclick="openTeamProfile('${match.t2}')">${displayName(match.t2)}</span>
      <span data-star-team="${match.t2}"></span>
      ${s2html}
    </div>
    ${hasResult ? `<button class="md-trigger-btn" onclick="openMatchDetail(${match.id})">📋 Match Details</button>` : ''}
    ${(!hasResult && msUntil >= -300000) ? buildPreviewSection(match.id) : ''}
    <div class="mc-footer">
      <span class="mc-city">📍 ${match.city}</span>
      ${countdown ? `<span class="mc-countdown" data-kickoff="${kickoffUTC.getTime()}">${countdown}</span>` : ''}
      ${(!hasResult && msUntil < -300000) ? '<span class="mc-espn-wait">⚡ Awaiting ESPN…</span>' : ''}
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
