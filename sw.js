const CACHE_NAME = "story-app-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/src/css/styles.css",
  "/src/js/app.js",
  "/manifest.json",
];

// Cache assets when service worker installs
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Serve cached content when offline or network is slow
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return the cached content if found, otherwise fetch from network
      return cachedResponse || fetch(event.request);
    })
  );
});

// Update the cache when a new version of the service worker is installed
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
