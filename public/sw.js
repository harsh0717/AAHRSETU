// ── AharSetu Enterprise Service Worker & Mobile Web Push ──────────────────────
const CACHE_NAME = 'aharsetu-v3.6-shell';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Message Event from Client Window
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
    const { title, body, url } = event.data;
    const options = {
      body: body || 'New AharSetu Canteen Order update.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: { url: url || '/vendor/orders/incoming' },
      actions: [
        { action: 'open', title: 'Open AharSetu' },
        { action: 'close', title: 'Dismiss' }
      ]
    };
    self.registration.showNotification(title || 'AharSetu Notification', options);
  }
});

// Handle Web Push Event from Push Server
self.addEventListener('push', (event) => {
  let data = { title: 'AharSetu Canteen Alert', body: 'New order update received.', url: '/vendor/orders/incoming' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/vendor/orders/incoming' },
    actions: [
      { action: 'open', title: 'View Order' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AharSetu Order Alert', options)
  );
});

// Handle Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/vendor/orders/incoming';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
