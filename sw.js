/* Kultos : service worker (hors ligne).
   - pages : réseau d'abord (les mises à jour arrivent tout de suite), cache en secours
   - le reste (polices, icônes, manifest) : cache d'abord, rafraîchi en arrière-plan */
const CACHE = "iknow-v74";
const SHELL = ["./", "index.html", "manifest.json", "icon-32.png", "apple-touch-icon.png", "og-image.jpg"];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{}))))
      .then(()=>self.skipWaiting())
  );
});
self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then(r=>{ const cp = r.clone(); const isLanding = url.pathname.endsWith("presentation.html"); caches.open(CACHE).then(c=>c.put(isLanding ? req : "index.html", cp)); return r; })
        .catch(()=>caches.match(req).then(r=>r || caches.match("index.html")).then(r=>r || caches.match("./")))
    );
    return;
  }
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if(sameOrigin || fonts){
    e.respondWith(
      caches.match(req).then(hit=>{
        const net = fetch(req).then(r=>{
          if(r && (r.ok || r.type === "opaque")){ const cp = r.clone(); caches.open(CACHE).then(c=>c.put(req, cp)); }
          return r;
        }).catch(()=>hit);
        return hit || net;
      })
    );
  }
});
