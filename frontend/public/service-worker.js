const CACHE_NAME = 'budget-tool-v3';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS_TO_CACHE).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const { pathname } = new URL(event.request.url);
  const isNavigation =
    event.request.mode === 'navigate' ||
    pathname === '/' || pathname === '/index.html';

  // Network-first for API and for navigation/HTML, so new deploys and fresh
  // data are always picked up (falls back to cache when offline).
  if (pathname.startsWith('/api/') || isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ offline: true }), {
                status: 503,
                headers: new Headers({ 'Content-Type': 'application/json' }),
              })
          )
        )
    );
    return;
  }

  // Cache-first for hashed static assets (immutable).
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
