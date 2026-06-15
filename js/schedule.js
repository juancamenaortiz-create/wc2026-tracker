// SCHEDULE.JS — Full schedule tab renderer

const SCHEDULE_STATE = { view: 'date', filter: 'all' };

function renderSchedule(container) {
  const allMatches = [
    ...SCHEDULE.map(m => ({ ...m, isKnockout: false })),
    ...R32_MATCHES.map(m => ({ ...m, round: 'R32', isKnockout: true })),
    ...KO_ROUNDS.map(m => ({ ...m, isKnockout: true })),
  ];

  const dates  = [...new Set(allMatches.map(m => m.date))].sort();
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L','Knockout'];
  const { view: viewMode, filter: filterKey } = SCHEDULE_STATE;

  let filtered = allMatches;
  if (filterKey !== 'all') {
    if (viewMode === 'date') filtered = allMatches.filter(m => m.date === filterKey);
    else if (filterKey === 'Knockout') filtered = allMatches.filter(m => m.isKnockout);
    else filtered = allMatches.filter(m => m.g === filterKey);
  }

  const byDate = {};
  filtered.forEach(m => { if (!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m); });
  const pills = viewMode === 'date' ? ['all', ...dates] : ['all', ...groups];

  // Artifact-style active pill: crimson gradient, no border, shadow
  const pillsHtml = pills.map(p => {
    const label = p === 'all' ? 'All Groups' : viewMode === 'date' ? formatPillDate(p) : p === 'Knockout' ? 'Knockout' : `Grp ${p}`;
    return `<button class="pill${filterKey === p ? ' active' : ''}" onclick="setScheduleFilter('${p}')">${label}</button>`;
  }).join('');

  let html = `<div class="sched-header">
    <div class="sched-view-tabs">
      <button class="sched-tab-btn${viewMode === 'date' ? ' active' : ''}" onclick="setScheduleView('date')">By Date</button>
      <button class="sched-tab-btn${viewMode === 'group' ? ' active' : ''}" onclick="setScheduleView('group')">By Group</button>
    </div>
    <div class="pills-wrap">${pillsHtml}</div>
  </div>
  <div class="schedule-wrap">`;

  if (filtered.length === 0) {
    html += '<div class="empty-state">No matches found</div>';
  } else {
    Object.keys(byDate).sort().forEach(date => {
      // Date header matching artifact DateHeader exactly
      const d = new Date(date + 'T12:00:00');
      const day  = d.toLocaleDateString('en-US', { weekday: 'long' });
      const mon  = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      html += `<div class="date-hdr"><span class="date-hdr-day">${day}, </span><span class="date-hdr-date">${mon}</span></div>`;
      byDate[date].forEach(match => { html += buildScheduleRow(match); });
    });
  }

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-star-team]').forEach(slot => {
    const btn = starBtn(slot.dataset.starTeam, () => renderSchedule(container));
    slot.appendChild(btn);
  });
}
  if (typeof twemoji !== 'undefined') twemoji.parse(container);


function buildScheduleRow(match) {
  const result = match.isKnockout ? getKnockoutResult(match.id) : getMatchResult(match);
  const status = result ? result.status : 'NS';
  const score1 = result ? result.score1 : null;
  const score2 = result ? result.score2 : null;
  const isLive = status === 'LIVE', isFT = status === 'FT';

  const isPSO = !!(result?.substatus === 'PSO');
  let w1 = '', w2 = '';
  if (isFT && score1 !== null) {
    const pen1 = result?.penScore1 ?? 0, pen2 = result?.penScore2 ?? 0;
    if (isPSO ? pen1 > pen2 : score1 > score2)      { w1 = 'winner'; w2 = 'loser'; }
    else if (isPSO ? pen2 > pen1 : score2 > score1) { w1 = 'loser';  w2 = 'winner'; }
    else                      { w1 = 'draw';   w2 = 'draw'; }
  }

  const isMyT1 = isMyTeam(match.t1 || ''), isMyT2 = isMyTeam(match.t2 || '');
  const t1Name = match.t1 || match.slot1 || 'TBD', t2Name = match.t2 || match.slot2 || 'TBD';
  const t1Flag = match.t1 ? getFlag(match.t1) : '❓', t2Flag = match.t2 ? getFlag(match.t2) : '❓';
  const roundLabel = match.round ? match.round : (match.g ? `Grp ${match.g}` : 'R32');

  let statusHtml = '';
  if (isLive) {
    const sub = result?.substatus || '';
    if (sub === 'HT') {
      statusHtml = '<span class="ht-badge">HT</span>';
    } else {
      const clockStr = result?.clock ? ` ${result.clock}` : '';
      statusHtml = `<span class="live-badge sm"><span class="pulse-dot"></span>LIVE${clockStr}</span>`;
    }
  } else if (isFT)  statusHtml = '<span class="ft-badge sm">FT</span>';
  else {
    const kickoff = match.date && match.time ? parseGameTimeCT(match.date, match.time) : null;
    const overdue  = kickoff && (Date.now() - kickoff.getTime() > 300000);
    statusHtml = overdue
      ? `<span class="sched-overdue">⏱ LIVE?</span>`
      : `<span class="sched-time">${formatGameTime(match.date, match.time)} ${getTZAbbr()}</span>`;
  }

  let centerHtml = '';
  if ((isLive || isFT) && score1 !== null) {
    const sub = result?.substatus || '';
    const penLine = isFT && isPSO && result?.penScore1 !== null
      ? `<div class="row-pso">${result.penScore1}–${result.penScore2}p</div>` : '';
    centerHtml = `<div class="sched-score-wrap"><div class="sched-score"><span class="${w1}">${score1}</span>–<span class="${w2}">${score2}</span>${sub?`<span class="row-sub">${sub}</span>`:''}</div>${penLine}</div>`;
  } else {
    centerHtml = '<div class="sched-score vs">vs</div>';
  }

  return `<div class="schedule-row${isMyT1 || isMyT2 ? ' my-team-row' : ''}">
  <div class="sched-meta">
    <span class="sched-round">${roundLabel}</span>
    ${statusHtml}
  </div>
  <div class="sched-teams">
    <div class="sched-team ${w1}${isMyT1 ? ' my-t' : ''}">
      <span class="flag">${t1Flag}</span>
      <span class="sched-name${match.t1?' team-link':''}" ${match.t1?`onclick="openTeamProfile('${match.t1}')"`:''}>${displayName(t1Name)}</span>
      ${match.t1 ? `<span data-star-team="${match.t1}"></span>` : ''}
    </div>
    ${centerHtml}
    <div class="sched-team right ${w2}${isMyT2 ? ' my-t' : ''}">
      ${match.t2 ? `<span data-star-team="${match.t2}"></span>` : ''}
      <span class="sched-name r${match.t2?' team-link':''}" ${match.t2?`onclick="openTeamProfile('${match.t2}')"`:''}>${displayName(t2Name)}</span>
      <span class="flag">${t2Flag}</span>
    </div>
  </div>
  ${(isLive || isFT) && (result?.stats || result?.events?.length) ? `<div class="stats-toggle sched-stats${STATE.openStatsMatchId===match.id?' open':''}" onclick="toggleStats(${match.id})">${STATE.openStatsMatchId===match.id?'▲ Hide summary':'📊 Match Summary'}</div>` : ''}
  ${STATE.openStatsMatchId===match.id ? buildStatsPanel(result) : ''}
  <div class="sched-city">📍 ${match.city}</div>
</div>`;
}

function setScheduleView(view) {
  SCHEDULE_STATE.view = view; SCHEDULE_STATE.filter = 'all';
  const c = document.getElementById('tab-content');
  if (c) renderSchedule(STATE.demoMode ? document.getElementById('tab-inner') || c : c);
}
function setScheduleFilter(filter) {
  SCHEDULE_STATE.filter = filter;
  const c = document.getElementById('tab-content');
  if (c) renderSchedule(STATE.demoMode ? document.getElementById('tab-inner') || c : c);
}
function formatPillDate(dateStr) {
  const [y,mo,d] = dateStr.split('-').map(Number);
  return new Date(y, mo-1, d).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
