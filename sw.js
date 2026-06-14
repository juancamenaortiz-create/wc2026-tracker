// sw.js — WC 2026 Tracker Service Worker
// Enables notifications when the app is backgrounded on iOS/Android PWA

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Main thread sends NOTIFY messages here so notifications work while backgrounded
self.addEventListener('message', event => {
  if (event.data?.type !== 'NOTIFY') return;
  const { title, body, tag, icon } = event.data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,          // prevents duplicate notifications with same tag
      icon: icon || '/favicon.ico',
      renotify: true,
      requireInteraction: false,
      silent: false,
    })
  );
});

// Tapping a notification brings the app to the foreground
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url && 'focus' in c) { c.focus(); return; }
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
