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

  let w1 = '', w2 = '';
  if (isFT && score1 !== null) {
    if (score1 > score2)      { w1 = 'winner'; w2 = 'loser'; }
    else if (score2 > score1) { w1 = 'loser';  w2 = 'winner'; }
    else                      { w1 = 'draw';   w2 = 'draw'; }
  }

  const isMyT1 = isMyTeam(match.t1 || ''), isMyT2 = isMyTeam(match.t2 || '');
  const t1Name = match.t1 || match.slot1 || 'TBD', t2Name = match.t2 || match.slot2 || 'TBD';
  const t1Flag = match.t1 ? getFlag(match.t1) : '❓', t2Flag = match.t2 ? getFlag(match.t2) : '❓';
  const roundLabel = match.round ? match.round : (match.g ? `Grp ${match.g}` : 'R32');

  let statusHtml = '';
  if (isLive) {
    const clockStr = result?.clock ? ` ${result.clock}` : '';
    statusHtml = `<span class="live-badge sm"><span class="pulse-dot"></span>LIVE${clockStr}</span>`;
  } else if (isFT)  statusHtml = '<span class="ft-badge sm">FT</span>';
  else            statusHtml = `<span class="sched-time">${formatGameTime(match.date, match.time)} ${getTZAbbr()}</span>`;

  let centerHtml = '';
  if ((isLive || isFT) && score1 !== null) {
    centerHtml = `<div class="sched-score"><span class="${w1}">${score1}</span>–<span class="${w2}">${score2}</span></div>`;
  } else {
    centerHtml = '<div class="sched-score vs">vs</div>';
  }

  // Events: one line per team, flag-prefixed so attribution is clear
  let eventsRow = '';
  if ((isLive || isFT) && result?.events?.length) {
    const teamLine = (num, flag) => {
      const tid   = num === 1 ? result.tid1 : result.tid2;
      const goals = result.events.filter(e => e.g && e.tid === tid);
      const y     = result.events.filter(e => e.y && e.tid === tid).length;
      const r     = result.events.filter(e => e.r && e.tid === tid).length;
      if (!goals.length && !y && !r) return '';
      const gTxt  = goals.length ? '⚽ ' + goals.map(g => `${g.min} ${g.p}${g.og?' (OG)':''}`).join(' · ') : '';
      const cTxt  = '🟨'.repeat(y) + '🟥'.repeat(r);
      return `<div class="sched-ev-row">${flag} ${[gTxt, cTxt].filter(Boolean).join(' ')}</div>`;
    };
    const l1 = teamLine(1, t1Flag), l2 = teamLine(2, t2Flag);
    if (l1 || l2) eventsRow = `<div class="sched-events">${l1}${l2}</div>`;
  }

  return `<div class="schedule-row${isMyT1 || isMyT2 ? ' my-team-row' : ''}">
  <div class="sched-meta">
    <span class="sched-round">${roundLabel}</span>
    ${statusHtml}
  </div>
  <div class="sched-teams">
    <div class="sched-team ${w1}${isMyT1 ? ' my-t' : ''}">
      <span class="flag">${t1Flag}</span>
      <span class="sched-name">${displayName(t1Name)}</span>
      ${match.t1 ? `<span data-star-team="${match.t1}"></span>` : ''}
    </div>
    ${centerHtml}
    <div class="sched-team right ${w2}${isMyT2 ? ' my-t' : ''}">
      ${match.t2 ? `<span data-star-team="${match.t2}"></span>` : ''}
      <span class="sched-name r">${displayName(t2Name)}</span>
      <span class="flag">${t2Flag}</span>
    </div>
  </div>
  ${eventsRow}
  ${(isLive || isFT) && result?.stats ? `<div class="stats-toggle sched-stats${STATE.openStatsMatchId===match.id?' open':''}" onclick="toggleStats(${match.id})">${STATE.openStatsMatchId===match.id?'▲ Hide stats':'📊 Match stats'}</div>` : ''}
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
