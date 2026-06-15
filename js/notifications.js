// ═══════════════════════════════════════════
// NOTIFICATIONS.JS — Goal / kickoff / FT alerts
// ═══════════════════════════════════════════

// Paste your VAPID public key here after running: npx web-push generate-vapid-keys
// Leave empty to disable server-side push (local SW notifications only)
const VAPID_PUBLIC_KEY = '';

// Standard helper: converts VAPID URL-safe base64 → Uint8Array for pushManager.subscribe
function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const str = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(str, c => c.charCodeAt(0));
}

// Previous match snapshot — compared on every ESPN fetch to detect changes
let _prevSnapshot = {}; // matchId → { score1, score2, status }

// ── Public API ───────────────────────────────────────────────────────────────

function notifSupported() {
  return 'Notification' in window;
}

function notifPermission() {
  return notifSupported() ? Notification.permission : 'denied';
}

function notifMode() {
  // 'off' | 'all' | 'myteams'
  try { return localStorage.getItem('wc2026_notif') || 'off'; } catch(e) { return 'off'; }
}

function setNotifMode(mode) {
  try { localStorage.setItem('wc2026_notif', mode); } catch(e) {}
}

function notifActive() {
  return notifPermission() === 'granted' && notifMode() !== 'off';
}

// Request permission and enable. Returns true if granted.
async function enableNotifications(mode = 'all') {
  if (!notifSupported()) {
    showToast('Notifications not supported in this browser');
    return false;
  }
  let perm = notifPermission();
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    showToast('Notifications blocked — enable in browser settings');
    return false;
  }
  setNotifMode(mode);

  // Register Service Worker
  const swReg = await registerSW();

  // Subscribe to Web Push (sends notifications even when app is closed)
  if (swReg && VAPID_PUBLIC_KEY) {
    try {
      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), action: 'subscribe' }),
      });
      showToast('Notifications enabled ✓ (works when app is closed)');
    } catch(e) {
      console.warn('Web Push subscription failed:', e.message);
      showToast('Notifications enabled ✓');
    }
  } else {
    showToast('Notifications enabled ✓');
  }
  return true;
}

async function disableNotifications() {
  setNotifMode('off');
  // Unsubscribe from Web Push server-side
  if ('serviceWorker' in navigator) {
    try {
      const swReg = await navigator.serviceWorker.getRegistration('/');
      if (swReg) {
        const sub = await swReg.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub.toJSON(), action: 'unsubscribe' }),
          });
          await sub.unsubscribe();
        }
      }
    } catch(e) { console.warn('Push unsubscribe error:', e.message); }
  }
  showToast('Notifications off');
}

// Register the service worker and return the registration (needed for pushManager)
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // Reuse existing registration if available
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    // Wait for the SW to become active before returning
    // (pushManager.subscribe requires an active SW)
    if (reg.installing || reg.waiting) {
      await new Promise(resolve => {
        const sw = reg.installing || reg.waiting;
        if (!sw) { resolve(); return; }
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve();
        });
        setTimeout(resolve, 3000); // safety timeout
      });
    }
    return reg; // ← THIS is what was missing
  } catch(e) {
    console.warn('SW registration failed:', e.message);
    return null;
  }
}

// ── Notification sender ───────────────────────────────────────────────────────

function sendNotif(title, body, tag) {
  if (!notifActive()) return;
  // Use SW for backgrounded delivery, fall back to direct Notification
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'NOTIFY', title, body, tag });
  } else {
    try { new Notification(title, { body, tag, icon: '/favicon.ico' }); } catch(e) {}
  }
}

// ── Change detection ──────────────────────────────────────────────────────────

// Call this ONCE on app start to set the baseline (so we don't notify for old events)
function initNotifSnapshot() {
  _prevSnapshot = {};
  const all = [
    ...(STATE.results.groupMatches   || []),
    ...(STATE.results.knockoutMatches || []),
  ];
  all.forEach(r => {
    _prevSnapshot[r.matchId] = {
      score1: parseInt(r.score1) || 0,
      score2: parseInt(r.score2) || 0,
      status: r.status,
    };
  });
}

// Returns "Müller 34'" for the most recent goal by a given team id
function lastScorer(result, tid) {
  const goals = (result.events || []).filter(e => e.g && e.tid === tid);
  if (!goals.length) return '';
  const last = goals[goals.length - 1];
  return [(last.p || ''), (last.min || ''), (last.og ? '(OG)' : '')].filter(Boolean).join(' ');
}

// Call after each ESPN fetch with the FRESH (pre-merge) result list
function checkForChanges(freshGroupMatches, freshKnockoutMatches) {
  if (!notifActive()) return;

  const fresh = [...(freshGroupMatches || []), ...(freshKnockoutMatches || [])];

  fresh.forEach(result => {
    const id   = result.matchId;
    const prev = _prevSnapshot[id];
    const s1   = parseInt(result.score1) || 0;
    const s2   = parseInt(result.score2) || 0;
    const st   = result.status; // 'LIVE' | 'FT' | 'NS'

    // Look up schedule entry for display names + group
    const sched = SCHEDULE.find(m => m.id === id) || R32_MATCHES.find(m => m.id === id);

    // Filter by My Teams preference
    if (notifMode() === 'myteams' && sched) {
      const involves = STATE.myTeams.some(t =>
        normName(t) === normName(sched.t1) || normName(t) === normName(sched.t2)
      );
      if (!involves) { _prevSnapshot[id] = { score1: s1, score2: s2, status: st }; return; }
    }

    const t1    = sched ? displayName(sched.t1) : result.team1 || '?';
    const t2    = sched ? displayName(sched.t2) : result.team2 || '?';
    const score = `${s1}–${s2}`;

    if (!prev) {
      // Match newly appeared in ESPN feed
      if (st === 'LIVE') {
        sendNotif(`🟢 ${t1} vs ${t2}`, '', `kick-${id}`);
      }
    } else {
      // Kickoff: was not LIVE, now LIVE
      if (prev.status !== 'LIVE' && st === 'LIVE') {
        sendNotif(`🟢 ${t1} vs ${t2}`, '', `kick-${id}`);
      }

      // Full time
      if (prev.status === 'LIVE' && st === 'FT') {
        const sub = result.substatus;
        const psoStr = sub === 'PSO' && result.penScore1 !== null
          ? ` (${result.penScore1}–${result.penScore2} pens)` : '';
        const aetStr = sub === 'AET' ? ' AET' : '';
        sendNotif(`🏁 ${t1} ${score} ${t2}${aetStr}${psoStr}`, '', `ft-${id}`);
      }

      // Goals (only when LIVE, check each team separately)
      if (st === 'LIVE') {
        if (s1 > prev.score1) {
          const scorer = lastScorer(result, result.tid1);
          sendNotif(`⚽ ${t1} ${score} ${t2}`, scorer, `goal-${id}-${s1}-${s2}`);
        } else if (s2 > prev.score2) {
          const scorer = lastScorer(result, result.tid2);
          sendNotif(`⚽ ${t1} ${score} ${t2}`, scorer, `goal-${id}-${s1}-${s2}`);
        }
      }
    }

    // Update snapshot
    _prevSnapshot[id] = { score1: s1, score2: s2, status: st };
  });
}

// ── Settings UI helpers ───────────────────────────────────────────────────────

function renderNotifSetting() {
  const row = document.getElementById('notif-setting-row');
  if (!row) return;

  const supported = notifSupported();
  const perm      = notifPermission();
  const mode      = notifMode();

  if (!supported) {
    row.querySelector('.notif-ctrl').innerHTML =
      `<span style="font-size:11px;color:var(--muted)">Not supported</span>`;
    return;
  }

  if (perm === 'denied') {
    row.querySelector('.notif-ctrl').innerHTML =
      `<span style="font-size:11px;color:var(--red)">Blocked in browser settings</span>`;
    return;
  }

  if (mode === 'off' || perm !== 'granted') {
    row.querySelector('.notif-ctrl').innerHTML = `
      <button class="modal-btn" onclick="enableNotifications('all').then(renderNotifSetting)">Enable</button>`;
    return;
  }

  // Enabled — show mode toggle + off button
  row.querySelector('.notif-ctrl').innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <select class="modal-select" style="font-size:11px;padding:4px 8px"
        onchange="setNotifMode(this.value);renderNotifSetting()">
        <option value="all"     ${mode==='all'     ?'selected':''}>All games</option>
        <option value="myteams" ${mode==='myteams' ?'selected':''}>My teams only</option>
      </select>
      <button class="modal-btn danger" onclick="disableNotifications();renderNotifSetting()">Off</button>
    </div>`;
}

// Init: register SW on load (safe, no-op if already registered)
document.addEventListener('DOMContentLoaded', () => {
  registerSW();
  // Set baseline snapshot a moment after cached results are loaded
  setTimeout(initNotifSnapshot, 1500);
});
