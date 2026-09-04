// Cache-first service worker. After the first load the app never touches the
// network again, which is what makes it usable with no signal and guarantees
// nothing can ever inject an ad into it.

const CACHE = 'english-teach-v18';

const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/data.js',
  './js/sentences.js',
  './js/money.js',
  './js/quiz.js',
  './js/generated.js',
  './js/speech.js',
  './js/store.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Stale-while-revalidate: answer instantly from cache (so the app opens with
  // no signal at all), but quietly refresh in the background when there is a
  // connection, so a published update is picked up by the next launch.
  //
  // Every lookup goes through the CURRENT cache only. The global caches.match()
  // searches every cache generation, so an entry left over from an older CACHE
  // version would keep winning and the app would serve stale content forever.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        const sameOrigin = new URL(req.url).origin === self.location.origin;

        const network = fetch(req)
          .then((res) => {
            if (res && res.ok && sameOrigin) {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => hit || cache.match('./index.html'));

        return hit || network;
      })
    )
  );
});
