// Cache dell'app per l'uso senza connessione. Cambia VERSION a ogni rilascio.
const VERSION = "forza-v13";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "jszip.min.js", "scheda-coach.xlsx"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Pagina: prima la rete (così gli aggiornamenti arrivano), poi la cache.
  if (req.mode === "navigate") {
    // no-cache: chiede sempre al server se la pagina è cambiata, anche se GitHub dice di tenerla 10 minuti.
    e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return r;
    }).catch(() => caches.match("index.html")));
    return;
  }
  // Font e file statici: prima la cache, poi la rete (e li salva).
  if (url.origin === location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r;
    })));
  }
});
