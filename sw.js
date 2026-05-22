// Service Worker — offline cache for diary blog
var CACHE = 'diary-v1';
var URLS = [
  '/xjjwri/',
  '/xjjwri/assets/css/main.css',
  '/xjjwri/assets/js/search.js',
  '/xjjwri/posts.json'
];

// Install: pre-cache core assets
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(URLS).catch(function () {});
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for assets, network-first for pages
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  // Skip non-GET and editor requests
  if (e.request.method !== 'GET') return;
  if (url.pathname.indexOf('/api/') !== -1) return;

  // Assets: cache-first
  if (url.pathname.match(/\.(css|js|svg|png|jpg|jpeg|gif|woff2?)$/)) {
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        return cached || fetch(e.request).then(function (res) {
          if (res.ok) {
            var clone = res.clone();
            caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
          }
          return res;
        });
      })
    );
    return;
  }

  // Pages: network-first, fall back to cache
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res.ok) {
        var clone = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
