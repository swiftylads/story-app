const CACHE_NAME = "dicoding-story-v2";
const urlsToCache = [
  "/",
  "/index.html",
  "/src/css/styles.css",
  "/src/js/app.js",
  "/src/js/config.js",
  "/src/js/router.js",
  "/src/js/models/auth.js",
  "/src/js/models/story.js",
  "/src/js/presenters/auth.js",
  "/src/js/presenters/story.js",
  "/src/js/views/auth.js",
  "/src/js/views/story.js",
  "/src/js/views/ui.js",
  "/manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js",
];

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");

        const criticalFiles = [
          "/src/css/styles.css",
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css",
        ];

        return Promise.all(
          criticalFiles.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Critical file failed to cache ${url}:`, err);
              return null;
            })
          )
        ).then(() => {
          const remainingFiles = urlsToCache.filter(
            (url) => !criticalFiles.includes(url)
          );
          return Promise.allSettled(
            remainingFiles.map((url) => cache.add(url).catch((err) => null))
          );
        });
      })
      .then(() => {
        console.log("Cache installation completed");
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.url.includes(".css")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          fetch(event.request)
            .then((fetchResponse) => {
              if (fetchResponse && fetchResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, fetchResponse.clone());
                });
              }
            })
            .catch(() => {});

          return response;
        }

        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            if (event.request.url.includes("styles.css")) {
              return new Response(
                `
                  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                  .page { display: none; }
                  .page.active { display: block; }
                  .loading { text-align: center; padding: 20px; }
                `,
                {
                  headers: { "Content-Type": "text/css" },
                }
              );
            }
            throw new Error("CSS not available");
          });
      })
    );
    return;
  }

  if (
    event.request.url.startsWith(self.location.origin) ||
    event.request.url.startsWith("https://cdnjs.cloudflare.com")
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return (
          response ||
          fetch(event.request)
            .then((response) => {
              if (
                response &&
                response.status === 200 &&
                response.type === "basic"
              ) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return response;
            })
            .catch(() => {
              if (event.request.destination === "document") {
                return caches.match("/index.html");
              }
            })
        );
      })
    );
  }
});

self.addEventListener("push", (event) => {
  console.log("Push notification received from server:", event);

  let notificationData = {
    title: "Dicoding Stories",
    body: "Ada update baru di Dicoding Stories!",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: "/#home",
    },
    actions: [
      {
        action: "open",
        title: "Buka App",
        icon: "/favicon.ico",
      },
    ],
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log("Received push data:", pushData);

      notificationData = {
        title: pushData.title || "Dicoding Stories",
        body: pushData.options?.body || notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        vibrate: notificationData.vibrate,
        data: {
          ...notificationData.data,
          ...pushData.data,
        },
        actions: notificationData.actions,
      };
    } catch (e) {
      console.error("Error parsing push data:", e);

      try {
        notificationData.body = event.data.text();
      } catch (textError) {
        console.error("Error getting text from push data:", textError);
      }
    }
  }

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: true,
      tag: "dicoding-story",
    })
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  // Handle action clicks
  if (event.action === "open" || !event.action) {
    const url = event.notification.data?.url || "/#home";

    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.focus();
              client.postMessage({
                type: "NAVIGATE",
                url: url,
              });
              return;
            }
          }

          return clients.openWindow(url);
        })
    );
  }
});

self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
