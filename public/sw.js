const CACHE_NAME = "cocoon-shell-v2";
const APP_SHELL = [
  "/",
  "/app",
  "/manifest.webmanifest",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        }),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/app").then((response) => response || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    }),
  );
});

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event.data);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const hasVisibleClient = clients.some((client) => client.visibilityState === "visible");

      if (hasVisibleClient) {
        return Promise.resolve();
      }

      return self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/icons/icon-192.png",
        badge: payload.badge || "/icons/icon-192.png",
        tag: payload.tag || "cocoon-notification",
        data: { url: payload.url || "/app" },
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/app";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return Promise.resolve();
    }),
  );
});

function parsePushPayload(data) {
  const fallback = {
    title: "Cocoon",
    body: "There is new activity waiting for you.",
    url: "/app",
    tag: "cocoon-notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  if (!data) {
    return fallback;
  }

  try {
    return { ...fallback, ...data.json() };
  } catch {
    return { ...fallback, body: data.text() || fallback.body };
  }
}
