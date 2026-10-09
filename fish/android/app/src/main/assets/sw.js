// fish/sw.js —— 离线缓存（PWA）
const VERSION = 'v5';
const CACHE = `lake-fishing-${VERSION}`;

// 仅缓存 mobile/ 自身路径下的资源；CDN 资源走网络
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './src/main.js',
  './src/state.js',
  './src/util.js',
  './src/data.js',
  './src/audio.js',
  './src/scene.js',
  './src/game.js',
  './src/ui.js',
  './src/savecode.js',
  './src/slots.js',
  './src/validate.js',
  './vendor/three.module.min.js',
  './vendor/OrbitControls.js',
  './vendor/Reflector.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 缓存优先：相同 origin 用 cache，其他（CDN）走网络
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // CDN：直通
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit)
    )
  );
});