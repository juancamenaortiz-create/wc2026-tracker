// SCHEDULE.JS — Full schedule tab renderer (card-grouped, mockup layout)

const SCHEDULE_STATE = { view: 'date', filter: 'all', scrollToToday: false };

function schedSortKey(m) {
  const t = getMatchTime(m);
  const ms = (m.date && t) ? parseGameTimeCT(m.date, t).getTime()
           : (m.date ? new Date(m.date + 'T23:59:59').getTime() : Infinity);
  return isNaN(ms) ? Infinity : ms;
}

function renderSchedule(container) {
  const allMatches = [
    ...SCHEDULE.map(m => ({ ...m, isKnockout: false })),
    ...R32_MATCHES.map(m => ({ ...m, round: 'R32', isKnockout: true })),
    ...KO_ROUNDS.map(m => ({ ...m, isKnockout: true })),
  ];
  const viewMode = SCHEDULE_STATE.view;

  let html = `<div class="sched-top">
    <h2 class="sched-title">Schedule</h2>
    <div class="sched-seg">
      <button class="sched-seg-btn${viewMode === 'date' ? ' active' : ''}" onclick="setScheduleView('date')">By date</button>
      <button class="sched-seg-btn${viewMode === 'group' ? ' active' : ''}" onclick="setScheduleView('group')">By group</button>
    </div>
  </div>
  <div class="schedule-wrap">`;

  let sortedDates = [];

  if (viewMode === 'group') {
    const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    let any = false;
    groups.forEach(g => {
      const ms = allMatches.filter(m => m.g === g).sort((a,b) => schedSortKey(a) - schedSortKey(b));
      if (!ms.length) return;
      any = true;
      html += buildSchedCard(`Group ${g}`, `${ms.length} games`, ms, null);
    });
    const ko = allMatches.filter(m => m.isKnockout).sort((a,b) => schedSortKey(a) - schedSortKey(b));
    if (ko.length) { any = true; html += buildSchedCard('Knockout stage', `${ko.length} games`, ko, null); }
    if (!any) html += '<div class="empty-state">No matches found</div>';
  } else {
    const byDate = {};
    allMatches.forEach(m => { (byDate[m.date] = byDate[m.date] || []).push(m); });
    sortedDates = Object.keys(byDate).sort();
    if (!sortedDates.length) {
      html += '<div class="empty-state">No matches found</div>';
    } else {
      sortedDates.forEach(date => {
        const ms = byDate[date].sort((a,b) => schedSortKey(a) - schedSortKey(b));
        const d = new Date(date + 'T12:00:00');
        const title = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        html += buildSchedCard(title, `${ms.length} game${ms.length !== 1 ? 's' : ''}`, ms, date);
      });
    }
  }

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-star-team]').forEach(slot => {
    const btn = starBtn(slot.dataset.starTeam, () => renderSchedule(container));
    slot.appendChild(btn);
  });

  // Auto-scroll to today's card — only on a fresh tab open (set by navigateTo),
  // never on background refreshes or view changes.
  if (SCHEDULE_STATE.scrollToToday && viewMode === 'date') {
    SCHEDULE_STATE.scrollToToday = false;
    scrollScheduleToToday(sortedDates);
  }
}

function buildSchedCard(title, countLabel, matches, dateId) {
  const rows = matches.map(buildScheduleRow).join('');
  const idAttr = dateId ? ` id="sched-date-${dateId}"` : '';
  return `<div class="sched-card"${idAttr}>
    <div class="sched-card-hdr">
      <span class="sched-card-title">${title}</span>
      <span class="sched-card-count">${countLabel}</span>
    </div>
    ${rows}
  </div>`;
}

// Finds today's date card (or the nearest upcoming one, or the last past one)
// and scrolls the tab container to it without using scrollIntoView.
function scrollScheduleToToday(sortedDates) {
  if (!sortedDates || !sortedDates.length) return;
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const target = sortedDates.find(d => d === todayStr)
              || sortedDates.find(d => d > todayStr)
              || sortedDates[sortedDates.length - 1];
  const el = document.getElementById(`sched-date-${target}`);
  const scroller = document.getElementById('tab-content');
  if (!el || !scroller) return;
  // Defer until layout is fully settled after innerHTML write,
  // and account for the sticky sched-top header's actual height.
  setTimeout(() => {
    const stickyHdr = scroller.querySelector('.sched-top');
    const hdrH = stickyHdr ? stickyHdr.offsetHeight : 72;
    const elTop = el.getBoundingClientRect().top;
    const scrollerTop = scroller.getBoundingClientRect().top;
    scroller.scrollTop = Math.max(0, elTop - scrollerTop + scroller.scrollTop - hdrH - 8);
  }, 60);
}

function buildScheduleRow(match) {
  const result = match.isKnockout ? getKnockoutResult(match.id) : getMatchResult(match);
  const status = result ? result.status : 'NS';
  const score1 = result ? result.score1 : null;
  const score2 = result ? result.score2 : null;
  const isLive = status === 'LIVE', isFT = status === 'FT', isDelayed = status === 'DELAYED';
  const isPSO = !!(result?.substatus === 'PSO');

  let w1 = '', w2 = '';
  if (isFT && score1 !== null) {
    const pen1 = result?.penScore1 ?? 0, pen2 = result?.penScore2 ?? 0;
    if (isPSO ? pen1 > pen2 : score1 > score2)      { w1 = 'winner'; w2 = 'loser'; }
    else if (isPSO ? pen2 > pen1 : score2 > score1) { w1 = 'loser';  w2 = 'winner'; }
    else                                            { w1 = 'draw';   w2 = 'draw'; }
  }

  const isMy1 = isMyTeam(match.t1 || ''), isMy2 = isMyTeam(match.t2 || '');
  const t1Name = match.t1 || match.slot1 || 'TBD';
  const t2Name = match.t2 || match.slot2 || 'TBD';
  const badge = (team) => team
    ? `<span class="srow-badge">${getFlag(team)}</span>`
    : `<span class="srow-badge srow-badge-tbd">?</span>`;

  // ── Status cell (left column) ──
  // In group view, stack a compact date label above the time/status
  const showDate = SCHEDULE_STATE.view === 'group' && match.date;

  let mainStatus;
  if (isLive) {
    mainStatus = (result?.substatus === 'HT')
      ? '<span class="srow-live">HT</span>'
      : `<span class="srow-live"><span class="pulse-dot"></span>${result?.clock || 'LIVE'}</span>`;
  } else if (isFT) {
    mainStatus = `<span class="srow-ft">FT</span>`;
  } else if (isDelayed) {
    mainStatus = '<span class="srow-delay">DELAYED</span>';
  } else {
    const kickoff = (match.date && getMatchTime(match)) ? parseGameTimeCT(match.date, getMatchTime(match)) : null;
    const sinceKick = kickoff ? Date.now() - kickoff.getTime() : -1;
    const overdue = sinceKick > 300000 && sinceKick < 4 * 60 * 60 * 1000; // only flag near kickoff
    mainStatus = overdue
      ? '<span class="srow-live"><span class="pulse-dot"></span>LIVE?</span>'
      : `<span class="srow-time">${formatGameTime(match.date, getMatchTime(match))}</span>`;
  }

  const statusCell = showDate
    ? `<div class="srow-timecol"><span class="srow-date">${formatPillDate(match.date)}</span>${mainStatus}</div>`
    : mainStatus;

  // ── Score cell (right column) ──
  let scoreCell;
  if ((isLive || isFT) && score1 !== null) {
    const pen = (isFT && isPSO && result?.penScore1 != null)
      ? `<span class="srow-pen">${result.penScore1}–${result.penScore2}p</span>` : '';
    scoreCell = `<div class="srow-scores"><span class="${w1}">${score1}</span><span class="${w2}">${score2}</span>${pen}</div>`;
  } else {
    scoreCell = '<div class="srow-dash">–</div>';
  }

  const clickable = isLive || isFT;
  const delayBar = isDelayed ? `<div class="srow-delay-bar">${result?.substatus || 'Match delayed'}</div>` : '';
  return `<div class="srow${isMy1 || isMy2 ? ' my-t' : ''}${clickable ? ' srow-click' : ''}"${clickable ? ` onclick="openMatchDetail(${match.id})"` : ''}>
    <div class="srow-status">${statusCell}</div>
    <div class="srow-teams">
      <div class="srow-team ${w1}">${badge(match.t1)}<span class="srow-name">${displayName(t1Name)}</span>${isMy1 ? '<span class="srow-star">★</span>' : '<span data-star-team="' + (match.t1 || '') + '"></span>'}</div>
      <div class="srow-team ${w2}">${badge(match.t2)}<span class="srow-name">${displayName(t2Name)}</span>${isMy2 ? '<span class="srow-star">★</span>' : '<span data-star-team="' + (match.t2 || '') + '"></span>'}</div>
    </div>
    ${scoreCell}
    ${delayBar}
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
