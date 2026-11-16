const CACHE_NAME = 'nti-static-v3';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/icons/favicon-32.png',
  '/icons/favicon-64.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/assets/aistudio/image_e1d79dfc.png'
];

const STATIC_EXT_RE = /\.(?:js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|webmanifest)$/i;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only handle same-origin http/https requests
  if (url.origin !== self.location.origin) return;

  // Never intercept or cache dynamic APIs, health checks, or WebSockets
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname === '/health' ||
    request.headers.get('upgrade') === 'websocket'
  ) {
    return;
  }

  // Navigation requests (HTML shell): network-first with cached index fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/index.html', networkResponse.clone()).catch(() => undefined);
          }
          return networkResponse;
        } catch {
          const cached =
            (await caches.match('/index.html')) ||
            (await caches.match('/'));
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Only cache static assets (JS, CSS, images, icons, fonts, manifest)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    STATIC_EXT_RE.test(url.pathname);

  if (!isStaticAsset) return;

  // Stale-while-revalidate for static assets
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      const networkPromise = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            cache.put(request, response.clone()).catch(() => undefined);
          }
          return response;
        })
        .catch(() => undefined);

      if (cached) {
        event.waitUntil(networkPromise);
        return cached;
      }

      const networkResponse = await networkPromise;
      return networkResponse || Response.error();
    })()
  );
});
