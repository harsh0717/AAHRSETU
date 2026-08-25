// ── AharSetu Enterprise PWA Service Worker & Mobile Push ──────────────────────
const CACHE_NAME = "aharsetu-v5.0-shell";

const PRECACHE_ASSETS = [
  "/",
  "/login",
  "/manifest.json",
  "/icon.svg",
  "/images/logo.png",
  "/images/food_login_bg.webp"
];

// Install: Pre-cache critical application shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Pre-caching some assets failed:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Prune outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-while-revalidate for static assets, Network-first for dynamic navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension URLs
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Static Assets (Images, Fonts, CSS, Scripts): Cache-First / Stale-While-Revalidate
  if (
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Page Navigations: Network-First with Cache Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match("/login");
          });
        })
    );
  }
});

// Handle Message Event from Client Window
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PUSH_NOTIFICATION") {
    const { title, body, url } = event.data;
    const options = {
      body: body || "New AharSetu Canteen Order update.",
      icon: "/images/logo.png",
      badge: "/images/logo.png",
      vibrate: [100, 50, 100],
      data: { url: url || "/vendor/orders/incoming" },
      actions: [
        { action: "open", title: "Open AharSetu" },
        { action: "close", title: "Dismiss" }
      ]
    };
    self.registration.showNotification(title || "AharSetu Notification", options);
  }
});

// Handle Web Push Event from Push Server
self.addEventListener("push", (event) => {
  let data = { title: "AharSetu Canteen Alert", body: "New order update received.", url: "/vendor/orders/incoming" };
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
    icon: "/images/logo.png",
    badge: "/images/logo.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/vendor/orders/incoming" },
    actions: [
      { action: "open", title: "View Order" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "AharSetu Order Alert", options)
  );
});

// Handle Notification Click Event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/vendor/orders/incoming";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
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
