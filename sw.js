/* Timber Tycoon service worker (v2.9): makes the game installable and playable offline.
   Network-first for EVERYTHING (index.html, css, js, assets): a new GitHub Pages deploy is picked up on the next load;
   the cache is only a fallback when the network is unavailable. Release snapshots (releases/…) are never touched. */
const CACHE='timber-tycoon-v2.14';
const CORE=['./','index.html','css/style.css','manifest.webmanifest','assets/icon-192.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('timber-tycoon-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url); if(u.origin!==location.origin) return;
  const scope=new URL(self.registration.scope); const rel=u.pathname.slice(scope.pathname.length);
  if(!u.pathname.startsWith(scope.pathname)||rel.startsWith('releases/')||rel==='sw.js') return;
  e.respondWith(fetch(r).then(res=>{if(res&&res.ok&&res.type==='basic'){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp)).catch(()=>{});}return res;})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):undefined)).then(m=>m||Response.error())));
});
