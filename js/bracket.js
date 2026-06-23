
// ═══════════════════════════════════════════
// BRACKET.JS — Knockout bracket renderer (redesign)
// ═══════════════════════════════════════════

// Layout constants
const CARD_W     = 130;
const CARD_H     = 58;
const R32_SLOT   = 82;   // vertical slot height for R32 (16 slots)
const COL_GAP    = 26;
const COL_STRIDE = CARD_W + COL_GAP;
const ROUNDS     = ['R32','R16','QF','SF','Final'];
const NUM_COLS   = 5;
const TOTAL_W    = NUM_COLS * COL_STRIDE;
const LABEL_H    = 38;   // vertical offset so round labels never overlap first card

// R32 match slot ordering (how they appear top-to-bottom in the bracket)
const R32_ORDER = [74,77, 73,75, 83,84, 81,82, 76,78, 79,80, 86,88, 85,87];

function renderBracket(container) {
  const numR32 = 16;
  const slotR32 = R32_SLOT;
  const TOTAL_H = numR32 * slotR32 + LABEL_H + 16;

  const koById = (id) => KO_ROUNDS.find(r => r.id === id) || {};
  const r16Info = [89, 90, 93, 94, 91, 92, 95, 96].map(id => ({matchId:id, ...koById(id)}));
  const roundCards = [
    buildR32Cards(slotR32),
    buildRoundCards(1, slotR32, 2,  r16Info),
    buildRoundCards(2, slotR32, 4,  [97,98,99,100].map(id => ({matchId:id, ...koById(id)}))),
    buildRoundCards(3, slotR32, 8,  [101,102].map(id => ({matchId:id, ...koById(id)}))),
    buildRoundCards(4, slotR32, 16, [104].map(id => ({matchId:id, ...koById(id)}))),
  ];

  // SVG connector lines
  let svgLines = '';
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < roundCards[r].length; i += 2) {
      const a = roundCards[r][i];
      const b = roundCards[r][i + 1];
      if (!a || !b) continue;
      const next = roundCards[r + 1][Math.floor(i / 2)];
      if (!next) continue;

      const ax = r * COL_STRIDE + CARD_W;
      const ay = a.midY;
      const by = b.midY;
      const nx = (r + 1) * COL_STRIDE;
      const ny = next.midY;
      const midX = ax + COL_GAP / 2;

      svgLines += `<polyline class="bracket-line"
        points="${ax},${ay} ${midX},${ay} ${midX},${by} ${ax},${by} ${midX},${by} ${midX},${ny} ${nx},${ny}"
        fill="none"/>`;
    }
  }

  // Build HTML cards + round labels (with representative round date)
  let cardsHtml = '';
  ROUNDS.forEach((round, r) => {
    const colX = r * COL_STRIDE;
    const roundDate = roundLabelDate(roundCards[r]);
    cardsHtml += `<div class="bracket-col" style="left:${colX}px" data-round="${round}">
      <div class="round-label">${round}${roundDate ? `<span class="round-date"> · ${roundDate}</span>` : ''}</div>`;
    roundCards[r].forEach(card => {
      cardsHtml += buildBracketCard(card, r);
    });
    cardsHtml += `</div>`;
  });

  const thirdHtml = buildThirdPlaceCard();

  container.innerHTML = `
    <div class="brk-top">
      <h2 class="brk-title">Knockout</h2>
      <span class="brk-hint">Swipe to explore
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </span>
    </div>
    <div class="bracket-scroll-wrap">
      <div class="bracket-wrap" style="width:${TOTAL_W}px;height:${TOTAL_H + 90}px">
        <svg class="bracket-svg" width="${TOTAL_W}" height="${TOTAL_H}"
          style="position:absolute;top:0;left:0;pointer-events:none">
          ${svgLines}
        </svg>
        ${cardsHtml}
      </div>
      <div class="bracket-edge-fade"></div>
    </div>
    ${thirdHtml}`;
  if (typeof twemoji !== 'undefined') twemoji.parse(container);
}

// Earliest valid date among a round's cards → "Jul 1"
function roundLabelDate(cards) {
  const dates = cards.map(c => c.date).filter(d => d && d.includes('-')).sort();
  return dates.length ? formatPillDate(dates[0]) : '';
}

function buildR32Cards(slotH) {
  return R32_ORDER.map((matchId, idx) => {
    const match = R32_MATCHES.find(m => m.id === matchId);
    const y = idx * slotH + (slotH - CARD_H) / 2 + LABEL_H;
    return {
      matchId,
      slot1: match ? match.slot1 : '?',
      slot2: match ? match.slot2 : '?',
      t1: null, t2: null,
      y, midY: y + CARD_H / 2,
      date: match ? match.date : '',
      city: match ? match.city : '',
      time: match ? match.time : '',
    };
  });
}

function buildRoundCards(round, slotR32, slotsPerCard, infos = []) {
  const slotH = slotR32 * slotsPerCard;
  const count = 16 / slotsPerCard;
  return Array.from({ length: count }, (_, idx) => {
    const y = idx * slotH + (slotH - CARD_H) / 2 + LABEL_H;
    const info = infos[idx] || {};
    return {
      matchId: info.matchId || null,
      slot1: info.slot1 || 'TBD', slot2: info.slot2 || 'TBD',
      t1: null, t2: null,
      y, midY: y + CARD_H / 2,
      date: info.date || '', city: info.city || '', time: info.time || '',
    };
  });
}

function getR32Team(slot) {
  return resolveKOSlot(slot);
}

// One team row inside a bracket card
function bcTeamRow(team, slotLabel, opts) {
  const { state, isMy, score, showScore } = opts;
  const hasTeam = !!team;
  const label = hasTeam ? displayName(team) : (slotLabel || 'TBD');
  const badge = hasTeam
    ? `<span class="bc-badge">${getFlag(team)}</span>`
    : `<span class="bc-badge empty"></span>`;
  const nameCls = `bc-name${hasTeam ? ' team-link' : ' tbd'}`;
  const onClick = hasTeam ? `onclick="openTeamProfile('${team}')"` : '';
  const scoreHtml = showScore && score !== '' && score != null
    ? `<span class="bc-score">${score}</span>` : '';
  return `<div class="bc-team ${state} ${isMy ? 'my-t' : ''}">
    ${badge}
    <span class="${nameCls}" ${onClick}>${label}</span>
    ${scoreHtml}
  </div>`;
}

function buildBracketCard(card, round) {
  const result = card.matchId ? getAnyMatchResult(card.matchId) : null;
  const status = result ? result.status : 'NS';
  const isLive = status === 'LIVE';
  const isFT   = status === 'FT';

  let t1 = card.t1, t2 = card.t2;
  if (card.matchId) { const [rt1, rt2] = getKOMatchTeams(card.matchId); t1 = rt1; t2 = rt2; }
  if (result && result.team1) t1 = result.team1;
  if (result && result.team2) t2 = result.team2;

  let score1 = result ? result.score1 : '';
  let score2 = result ? result.score2 : '';
  const isPSO = !!(result?.substatus === 'PSO');

  // winner / loser state per row
  let s1 = '', s2 = '';
  if (isFT && score1 !== '' && score2 !== '') {
    const pen1 = result?.penScore1 ?? 0, pen2 = result?.penScore2 ?? 0;
    if (isPSO ? pen1 > pen2 : score1 > score2) { s1 = 'winner'; s2 = 'loser'; }
    else if (isPSO ? pen2 > pen1 : score2 > score1) { s1 = 'loser'; s2 = 'winner'; }
  }

  const isMy1 = t1 ? isMyTeam(t1) : false;
  const isMy2 = t2 ? isMyTeam(t2) : false;
  const showScore = isFT || isLive;

  // Card-level classes
  const liveClass = isLive ? ' bc-live' : '';
  const tbdClass  = (!t1 && !t2) ? ' bc-tbd' : '';

  // Optional small corner flag for live / penalties
  let corner = '';
  if (isLive) {
    const clk = result?.clock ? ` ${result.clock}` : '';
    const lbl = result?.substatus === 'ET' ? 'ET' : result?.substatus === 'PSO' ? 'PSO' : 'LIVE';
    corner = `<span class="bc-corner live"><span class="pulse-dot"></span>${lbl}${clk}</span>`;
  } else if (isFT && isPSO && result?.penScore1 != null) {
    corner = `<span class="bc-corner pso">${result.penScore1}–${result.penScore2}p</span>`;
  } else if (isFT && result?.substatus) {
    corner = `<span class="bc-corner ft">${result.substatus}</span>`;
  }

  return `<div class="bracket-card${liveClass}${tbdClass}" style="top:${card.y}px;width:${CARD_W}px">
    ${corner}
    ${bcTeamRow(t1, card.slot1, { state: s1, isMy: isMy1, score: score1, showScore })}
    <div class="bc-divider"></div>
    ${bcTeamRow(t2, card.slot2, { state: s2, isMy: isMy2, score: score2, showScore })}
  </div>`;
}

function buildThirdPlaceCard() {
  return `<div class="third-place-wrap">
    <div class="third-place-label">Third Place · Jul 18 · Miami</div>
    <div class="bracket-card third-place-card" style="width:${CARD_W + 20}px">
      <div class="bc-team">
        <span class="bc-badge empty"></span>
        <span class="bc-name tbd">SF1 Loser</span>
      </div>
      <div class="bc-divider"></div>
      <div class="bc-team">
        <span class="bc-badge empty"></span>
        <span class="bc-name tbd">SF2 Loser</span>
      </div>
    </div>
  </div>`;
}
