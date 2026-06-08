const CACHE = 'medisync-v2';
const base = self.location.pathname.replace('/sw.js', '');

const SHELL = [
  base + '/css/tailwind.css',
  base + '/js/config.js',
  base + '/js/api.js',
  base + '/js/sw-register.js',
  base + '/manifest.json',
  base + '/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (url.includes('onrender.com')) return;
  if (url.includes('googleapis.com')) return;
  if (url.includes('googleusercontent.com')) return;
  if (url.includes('fonts.g')) return;

  // HTML pages: network-first so updates are always reflected immediately
  const isHTML = e.request.headers.get('accept')?.includes('text/html') || url.endsWith('.html') || url.endsWith('/');
  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets (CSS, JS, images): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
