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
        // Cache files one by one to avoid failures
        return Promise.allSettled(
          urlsToCache.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn(`Failed to cache ${url}:`, err);
              return null;
            });
          })
        );
      })
      .then(() => {
        console.log("All files cached successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Cache installation failed:", error);
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
  if (
    !event.request.url.startsWith(self.location.origin) &&
    !event.request.url.startsWith("https://cdnjs.cloudflare.com")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          // Check if we received a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If both cache and network fail, return offline page
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});

// Push notification event
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  const options = {
    body: event.data
      ? event.data.text()
      : "Ada cerita baru di Dicoding Stories!",
    icon: "/manifest.json",
    badge: "/manifest.json",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification("Dicoding Stories", options)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});
