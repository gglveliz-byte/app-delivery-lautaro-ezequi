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
        
        // Solo cachear respuestas GET
        if (event.request.method !== 'GET') {
          return response;
        }
        
        // Solo cachear respuestas basic y cors
        if (response.type !== 'basic' && response.type !== 'cors') {
          return response;
        }

        // Intentar clonar y cachear, pero no fallar si no se puede
        try {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {
              // Ignorar errores de cache
            });
          });
        } catch (e) {
          // Si no se puede clonar, simplemente retornar la respuesta
        }
        
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
