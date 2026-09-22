/* 포코펫 서비스워커 — 앱 셸을 캐시해 오프라인에서도 열리게 한다. */
var CACHE = 'dogpet-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/game.css',
  './js/breeds.js',
  './js/dog.js',
  './js/data.js',
  './js/sound.js',
  './js/state.js',
  './js/minigames.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* 캐시 우선 — 게임 파일은 자주 바뀌지 않고, 오프라인이 중요하다.
   네트워크에서 새로 받으면 조용히 캐시를 갱신한다. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      var fresh = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || fresh;
    })
  );
});
