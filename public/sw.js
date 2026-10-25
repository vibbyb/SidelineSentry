// SidelineSentry Service Worker for offline app shell caching

const CACHE_NAME = 'sidelinesentry-v5';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const indexUrl = new URL('./index.html', self.registration.scope);
      const scopeRoot = new URL('./', self.registration.scope);

      const urlsToCache = new Set([
        scopeRoot.href,
        indexUrl.href
      ]);

      try {
        let response = await fetch(indexUrl.href, { cache: 'no-cache' });
        if (!response.ok) {
          response = await fetch(scopeRoot.href, { cache: 'no-cache' });
        }

        if (response.ok) {
          const htmlText = await response.text();

          // Extract script src
          const scriptRegex = /<script\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
          let match;
          while ((match = scriptRegex.exec(htmlText)) !== null) {
            try {
              const resolved = new URL(match[1], indexUrl);
              if (resolved.origin === self.location.origin) {
                urlsToCache.add(resolved.href);
              }
            } catch (_) {}
          }

          // Extract link href (styles, icons, manifest)
          const linkRegex = /<link\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
          while ((match = linkRegex.exec(htmlText)) !== null) {
            try {
              const resolved = new URL(match[1], indexUrl);
              if (resolved.origin === self.location.origin) {
                urlsToCache.add(resolved.href);
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('[SW] Could not fetch/parse index.html during install:', err);
      }

      // Precache extracted assets along with index.html
      const urlList = Array.from(urlsToCache);
      try {
        await cache.addAll(urlList);
      } catch (err) {
        // Fallback to individual puts if any single resource fails
        await Promise.all(
          urlList.map(async (u) => {
            try {
              const res = await fetch(u, { cache: 'no-cache' });
              if (res.ok) await cache.put(u, res);
            } catch (_) {}
          })
        );
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Handle navigation requests (HTML document)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            const indexCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
              cache.put(new URL('./index.html', self.registration.scope).href, indexCopy);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const indexUrl = new URL('./index.html', self.registration.scope);
          const scopeRoot = new URL('./', self.registration.scope);
          return (
            (await caches.match(event.request)) ||
            (await caches.match(indexUrl.href)) ||
            (await caches.match(scopeRoot.href)) ||
            new Response('Offline - Service Unavailable', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          );
        })
    );
    return;
  }

  // Handle static assets (scripts, styles, icons, fonts)
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let cached = await cache.match(event.request);
      if (!cached) {
        cached = await cache.match(event.request.url);
      }
      if (!cached) {
        cached = await cache.match(url.pathname);
      }
      if (cached) {
        return cached;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        return new Response('Asset not available offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});
