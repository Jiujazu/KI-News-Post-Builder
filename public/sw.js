const CACHE_NAME = 'ki-news-v4';
const ASSETS = [
  './',
  './index.html',
  './FestivoLC-Basic.otf',
  './logo.png',
  './manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Skip Firebase/Google API requests — let them go directly to network
  var url = e.request.url;
  if (url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('firebaseio.com') !== -1 ||
      url.indexOf('firebasestorage.app') !== -1 ||
      url.indexOf('accounts.google.com') !== -1 ||
      url.indexOf('cdn.jsdelivr.net') !== -1) {
    return;
  }
  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        var fetched = fetch(e.request).then(function(response) {
          if (response.ok) cache.put(e.request, response.clone());
          return response;
        }).catch(function() {
          if (cached) return cached;
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
        return cached || fetched;
      });
    })
  );
});
