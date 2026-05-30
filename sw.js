const METRION_CACHE = "metrion-pwa-v57-gallery";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./services.html",
  "./licensing.html",
  "./spatial-archive.html",
  "./styles.css",
  "./script.js",
  "./manifest.webmanifest",
  "./assets/logo.jpg",
  "./assets/logo-transparent.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/hero-display.jpg",
  "./assets/display-close.jpg",
  "./assets/sample-cards.jpg",
  "./assets/application-card.jpg",
  "./cases/test-series.html",
  "./cases/foreign-artist.html",
  "./cases/youth-creator.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(METRION_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== METRION_CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isVirtualGallery =
    url.pathname.endsWith("/virtual-gallery.html") ||
    url.pathname.endsWith("/virtual-gallery.js") ||
    url.pathname.includes("/assets/virtual-gallery-v57/");

  if (isVirtualGallery) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(METRION_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(METRION_CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
