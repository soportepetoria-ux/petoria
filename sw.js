const CACHE='petoria-v1-0-first-start-1';
const STATIC=[
  './','index.html','app.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png',
  'contrato-compraventa.jpg','contrato-cria.jpg','preview-libretacanina.jpg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET') return;

  const url=new URL(req.url);
  const isAppCode=req.mode==='navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/app.js');

  if(isAppCode){
    event.respondWith(
      fetch(req,{cache:'no-store'}).then(resp => {
        const copy=resp.clone();
        caches.open(CACHE).then(cache => cache.put(req,copy));
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      const copy=resp.clone();
      caches.open(CACHE).then(cache => cache.put(req,copy));
      return resp;
    }))
  );
});
