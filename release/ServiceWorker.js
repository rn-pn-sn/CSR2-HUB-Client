const BUILD_TIMESTAMP = String(1769610780614);
const effectiveTimestamp = BUILD_TIMESTAMP || String(Date.now());
const cacheName = "ABS-CSR2-HUB-Web-" + effectiveTimestamp;

const contentToCache = [
  "Build/release.loader.js",
  "Build/release.framework.js.unityweb",
  "Build/release.data.unityweb",
  "Build/release.wasm.unityweb"
];

function shouldCacheUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return path.endsWith('.bundle') || path.endsWith('.data');
  } catch (err) {
    return false;
  }
}

self.addEventListener('install', function (e) {
  console.log('[Service Worker] Install, timestamp:', effectiveTimestamp);
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const toCache = contentToCache;
    console.log('[Service Worker] Caching initial resources:', toCache);
    try {
      await cache.addAll(toCache);
    } catch (err) {
      console.warn('[Service Worker] Some resources failed to cache on install', err);
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  console.log('[Service Worker] Activate');
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(async key => {
      if (key !== cacheName) {
        console.log('[Service Worker] Deleting old cache:', key);
        await caches.delete(key);
      }
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const reqUrl = e.request.url;

  if (!shouldCacheUrl(reqUrl)) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(e.request);
    if (cached) {
      console.log('[Service Worker] Serving from cache:', reqUrl);
      return cached;
    }
    try {
      const response = await fetch(e.request);
      if (response && response.ok) {
        await cache.put(e.request, response.clone());
        console.log('[Service Worker] Cached new resource:', reqUrl);
      }
      return response;
    } catch (err) {
      console.error('[Service Worker] Fetch failed for', reqUrl, err);
      return new Response('Network error', { status: 408, statusText: 'Network error' });
    }
  })());
});
