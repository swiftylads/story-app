const CACHE_NAME = "dicoding-story-v1";
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
        // Cache critical files first (CSS)
        const criticalFiles = [
          "/src/css/styles.css",
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css",
        ];

        // Cache critical files dengan error handling
        return Promise.all(
          criticalFiles.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Critical file failed to cache ${url}:`, err);
              // Jangan fail install jika CSS gagal
              return null;
            })
          )
        ).then(() => {
          // Cache remaining files
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
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Handle CSS files with special strategy
  if (event.request.url.includes(".css")) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          // Serve from cache but update in background
          fetch(event.request)
            .then((fetchResponse) => {
              if (fetchResponse && fetchResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, fetchResponse.clone());
                });
              }
            })
            .catch(() => {}); // Silent fail for background update

          return response;
        }

        // Not in cache, fetch from network
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
            // Return basic CSS fallback for critical styling
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

  // Regular fetch handling untuk file lainnya
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

// Push notification event
// Push notification event
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

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
  };

  // Parse data dari server
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        title: pushData.title || "Dicoding Stories",
        body: pushData.options?.body || notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        vibrate: notificationData.vibrate,
        data: notificationData.data,
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
    })
  );
});
