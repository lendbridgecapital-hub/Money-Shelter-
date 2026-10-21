// Service Worker for Money Shelter & Lendbridge Capital
// Enables Device Push & System Notifications on Android, Windows, Mac, iOS PWA

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle click on system notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Support Web Push payload if server sends push event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Money Shelter Alert';
    const options = {
      body: data.message || data.body || 'You have a new update.',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data.id || 'general-alert',
      data: { url: data.url || '/dashboard' },
      vibrate: [200, 100, 200],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Money Shelter', {
        body: text,
        icon: '/logo.png',
      })
    );
  }
});
