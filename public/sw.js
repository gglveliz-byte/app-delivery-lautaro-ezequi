const CACHE_NAME = 'yallega-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip API calls, SSE endpoints, and navigation requests (HTML pages)
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/events/') ||
      event.request.mode === 'navigate' ||
      event.request.headers.get('accept')?.includes('text/html')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        if (event.request.method === 'HEAD' || response.type === 'opaque') {
          return response;
        }
        if (response.type !== 'basic' && response.type !== 'cors') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
