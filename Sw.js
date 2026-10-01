/**
 * sw.js — Service Worker: ทำให้เกมเปิดเล่นออฟไลน์ได้
 * แก้ไฟล์เกมแล้วให้เปลี่ยนเลข VERSION เพื่อล้างแคชเก่า
 */
const VERSION = 'v1';
const CACHE = 'bubble-woods-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './config.js',
  './storage.js',
  './sound.js',
  './grid.js',
  './ui.js',
  './game.js',
  './main.js',
  './pwa.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
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

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  // stale-while-revalidate: ตอบจากแคชทันที แล้วอัปเดตแคชเบื้องหลัง
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
        return cached || network;
      })
    )
  );
});
