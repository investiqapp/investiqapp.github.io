/* ============================================================
   InvestIQ - Service Worker
   ============================================================ */

const CACHE_NAME = 'investiq-v1';
const ASSETS = [
  '/', '/index.html', '/css/styles.css',
  '/js/db.js', '/js/stocks.js', '/js/auth.js', '/js/portfolio.js',
  '/js/charts.js', '/js/education.js', '/js/pwa.js', '/js/app.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co') || e.request.url.includes('twelvedata.com')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.status === 200) { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); }
      return r;
    }).catch(() => caches.match(e.request).then(c => c || (e.request.headers.get('accept')?.includes('text/html') ? caches.match('/index.html') : new Response('Offline', { status: 503 }))))
  );
});
