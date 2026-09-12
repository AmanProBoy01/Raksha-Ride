/* ==========================================================================
   Yatra Rakshaka - Service Worker (Network-First & Resilient Offline Cache)
   ========================================================================== */

const CACHE_NAME = 'yatra-rakshaka-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/leaflet.css',
  './assets/leaflet.js',
  './assets/driver.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Resilient caching: Individual asset try/catch so missing optional asset doesn't break PWA
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`PWA Cache item failed for ${asset}:`, err.message);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Cleaning old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Let real-time APIs bypass cache entirely
  if (request.url.includes('tile.openstreetmap.org') || 
      request.url.includes('overpass') || 
      request.url.includes('nominatim.openstreetmap.org')) {
    return;
  }

  // Network-First strategy for core HTML/JS/CSS to ensure users always receive latest updates
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
