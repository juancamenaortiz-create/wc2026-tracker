// ═══════════════════════════════════════════
// BRACKET.JS — Knockout bracket renderer
// ═══════════════════════════════════════════

// Layout constants
const CARD_W     = 174;
const CARD_H     = 76;
const R32_SLOT   = 90;   // vertical slot height for R32 (16 slots)
const COL_GAP    = 24;
const COL_STRIDE = CARD_W + COL_GAP;
const ROUNDS     = ['R32','R16','QF','SF','Final'];
const NUM_COLS   = 5;
const TOTAL_W    = NUM_COLS * COL_STRIDE;

// R32 match slot ordering (how they appear top-to-bottom in the bracket)
// Pairs: R32[0]+R32[1] → R16[0], R32[2]+R32[3] → R16[1], etc.
// Visual order from official bracket: left-top M74,M77,M73,M75 | left-bottom M83,M84,M81,M82
//                                     right-top M76,M78,M79,M80 | right-bottom M86,M88,M85,M87
const R32_ORDER = [74,77, 73,75, 83,84, 81,82, 76,78, 79,80, 86,88, 85,87];

function renderBracket(container) {
  const numR32 = 16;
  const slotR32 = R32_SLOT;
  const TOTAL_H = numR32 * slotR32 + 20;

  // Compute card positions for each round
  // Round 0: R32 (16 cards)
  // Round 1: R16 (8 cards), each spanning 2 R32 slots
  // Round 2: QF (4 cards)
  // Round 3: SF (2 cards)
  // Round 4: Final (1 card)

  // Helper: find KO_ROUNDS entry by match id
  const koById = (id) => KO_ROUNDS.find(r => r.id === id) || {};
  // R16 visual order (pairs 0-1, 2-3, 4-5, 6-7 feed into QF 0,1,2,3):
  //   left-top: M89(W74vsW77), M90(W73vsW75)  → QF M97
  //   left-bot: M93(W83vsW84), M94(W81vsW82)  → QF M98
  //   right-top: M91(W76vsW78), M92(W79vsW80) → QF M99
  //   right-bot: M95(W86vsW88), M96(W85vsW87) → QF M100
  const r16Info = [89, 90, 93, 94, 91, 92, 95, 96].map(id => ({matchId:id, ...koById(id)}));
  const roundCards = [
    buildR32Cards(slotR32),
    buildRoundCards(1, slotR32, 2,  r16Info),
    buildRoundCards(2, slotR32, 4,  [97,98,99,100].map(id => ({matchId:id, ...koById(id)}))),
    buildRoundCards(3, slotR32, 8,  [101,102].map(id => ({matchId:id, ...koById(id)}))),
    buildRoundCards(4, slotR32, 16, [104].map(id => ({matchId:id, ...koById(id)}))),
  ];

  // SVG lines
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
      const bx = r * COL_STRIDE + CARD_W;
      const by = b.midY;
      const nx = (r + 1) * COL_STRIDE;
      const ny = next.midY;
      const midX = ax + COL_GAP / 2;

      svgLines += `<polyline class="bracket-line"
        points="${ax},${ay} ${midX},${ay} ${midX},${by} ${bx},${by} ${midX},${by} ${midX},${ny} ${nx},${ny}"
        fill="none"/>`;
    }
  }

  // Build HTML cards
  let cardsHtml = '';
  ROUNDS.forEach((round, r) => {
    const colX = r * COL_STRIDE;
    cardsHtml += `<div class="bracket-col" style="left:${colX}px" data-round="${round}">
      <div class="round-label">${round}</div>`;
    roundCards[r].forEach(card => {
      cardsHtml += buildBracketCard(card, r);
    });
    cardsHtml += `</div>`;
  });

  // 3rd place match
  const thirdHtml = buildThirdPlaceCard();

  container.innerHTML = `
    <div class="bracket-scroll-wrap">
      <div class="bracket-wrap" style="width:${TOTAL_W}px;height:${TOTAL_H + 100}px">
        <svg class="bracket-svg" width="${TOTAL_W}" height="${TOTAL_H}"
          style="position:absolute;top:0;left:0;pointer-events:none">
          ${svgLines}
        </svg>
        ${cardsHtml}
      </div>
      ${thirdHtml}
    </div>`;
}
  if (typeof twemoji !== 'undefined') twemoji.parse(container);


function buildR32Cards(slotH) {
  return R32_ORDER.map((matchId, idx) => {
    const match = R32_MATCHES.find(m => m.id === matchId);
    const y = idx * slotH + (slotH - CARD_H) / 2;
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
    const y = idx * slotH + (slotH - CARD_H) / 2;
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
  // Delegate to the shared resolver in app.js
  return resolveKOSlot(slot);
}

function buildBracketCard(card, round) {
  // Use unified lookup: R32 results in groupMatches, R16+ in knockoutMatches
  const result = card.matchId ? getAnyMatchResult(card.matchId) : null;
  const status = result ? result.status : 'NS';
  const isLive = status === 'LIVE';
  const isFT   = status === 'FT';

  let t1 = card.t1, t2 = card.t2;
  if (card.matchId) { const [rt1, rt2] = getKOMatchTeams(card.matchId); t1 = rt1; t2 = rt2; }
  if (result && result.team1) t1 = result.team1;
  if (result && result.team2) t2 = result.team2;

  const label1 = t1 || card.slot1 || 'TBD';
  const label2 = t2 || card.slot2 || 'TBD';
  const flag1 = t1 ? getFlag(t1) : '❓';
  const flag2 = t2 ? getFlag(t2) : '❓';

  let score1 = result ? result.score1 : '';
  let score2 = result ? result.score2 : '';
  let w1 = '', w2 = '';
  if (isFT && score1 !== '' && score2 !== '') {
    if (score1 > score2)      { w1 = 'winner'; w2 = 'loser'; }
    else if (score2 > score1) { w1 = 'loser';  w2 = 'winner'; }
    else                       { w1 = 'draw';   w2 = 'draw'; }
  }

  const isMy1 = t1 ? isMyTeam(t1) : false;
  const isMy2 = t2 ? isMyTeam(t2) : false;

  // Status badge: show clock during LIVE, date otherwise
  let statusBadge = '';
  if (isLive) {
    const clockStr = result?.clock ? ` ${result.clock}` : '';
    statusBadge = `<span class="live-badge xs"><span class="pulse-dot"></span>LIVE${clockStr}</span>`;
  } else if (isFT) {
    statusBadge = `<span class="ft-badge xs">FT</span>`;
  } else {
    const dd = card.date ? (card.date.includes('-') ? formatPillDate(card.date) : card.date) : '';
    const dt = card.time && card.time !== 'TBD' ? card.time.replace(' CT', '') : '';
    const ds = [dd, dt].filter(Boolean).join(' · ');
    if (ds) statusBadge = `<span class="bracket-time">${ds}</span>`;
  }

  // Live game gets a glowing red outline
  const liveClass = isLive ? ' bc-live' : '';

  return `<div class="bracket-card${liveClass}" style="top:${card.y}px;width:${CARD_W}px">
    <div class="bc-status">${statusBadge}</div>
    <div class="bc-team ${w1} ${isMy1 ? 'my-t' : ''}">
      <span class="flag sm">${flag1}</span>
      <span class="bc-name">${displayName(label1)}</span>
      <span class="bc-score">${isFT || isLive ? score1 : ''}</span>
    </div>
    <div class="bc-divider"></div>
    <div class="bc-team ${w2} ${isMy2 ? 'my-t' : ''}">
      <span class="flag sm">${flag2}</span>
      <span class="bc-name">${displayName(label2)}</span>
      <span class="bc-score">${isFT || isLive ? score2 : ''}</span>
    </div>
  </div>`;
}

function buildThirdPlaceCard() {
  return `<div class="third-place-wrap">
    <div class="third-place-label">🥉 Third Place · Jul 18 · Miami</div>
    <div class="bracket-card third-place-card" style="width:${CARD_W}px">
      <div class="bc-status"><span class="bracket-time">Jul 18</span></div>
      <div class="bc-team">
        <span class="flag sm">❓</span>
        <span class="bc-name">SF1 Loser</span>
        <span class="bc-score"></span>
      </div>
      <div class="bc-divider"></div>
      <div class="bc-team">
        <span class="flag sm">❓</span>
        <span class="bc-name">SF2 Loser</span>
        <span class="bc-score"></span>
      </div>
    </div>
  </div>`;
}
