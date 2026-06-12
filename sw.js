const METRION_CACHE = "metrion-pwa-20260612-logo-metrion-v1";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./services.html",
  "./licensing.html",
  "./spatial-archive.html",
  "./ar-artwork-card-changmao.html",
  "./ar-artwork-card-changmao-mindar.html",
  "./ar-artwork-card-changmao-scan-card.html",
  "./styles.css",
  "./script.js",
  "./pwa.js",
  "./agent.js",
  "./sw.js",
  "./manifest.webmanifest",
  "./assets/logo.jpg",
  "./assets/logo-transparent.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/hero-display.jpg",
  "./assets/display-close.jpg",
  "./assets/display-close-enhanced.jpg",
  "./assets/assistant-float-icon.png",
  "./assets/sample-cards.jpg",
  "./assets/application-card.jpg",
  "./assets/spatial-archive/daydream-info.jpg",
  "./assets/spatial-archive/daydream-live.png",
  "./assets/spatial-archive/daydream-mucha-vr-lite.glb",
  "./assets/ar-artwork-card/changmao-original.jpg",
  "./assets/ar-artwork-card/changmao-info.jpg",
  "./assets/ar-artwork-card/changmao-live.jpg",
  "./assets/mindar/mindar-image-aframe.prod.js",
  "./assets/mindar/mindar-image.prod.js",
  "./assets/mindar/controller-mGt1s8dJ.js",
  "./assets/mindar/ui-fBadYuor.js",
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
  const isSameOrigin = url.origin === self.location.origin;
  const isFreshPageAsset =
    event.request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".webmanifest");
  const isVirtualGallery =
    url.pathname.endsWith("/virtual-gallery.html") ||
    url.pathname.endsWith("/virtual-gallery.js") ||
    url.pathname.endsWith("/virtual-gallery-v106.js") ||
    url.pathname.includes("/assets/virtual-gallery-v57/") ||
    url.pathname.includes("/assets/virtual-gallery-v106/");
  const isSpatialArchive =
    url.pathname.endsWith("/spatial-archive.html") ||
    url.pathname.includes("/assets/spatial-archive/daydream-");
  const isArArtworkCard =
    url.pathname.endsWith("/ar-artwork-card-changmao.html") ||
    url.pathname.endsWith("/ar-artwork-card-changmao-mindar.html") ||
    url.pathname.endsWith("/ar-artwork-card-changmao-scan-card.html") ||
    url.pathname.includes("/assets/ar-artwork-card/") ||
    url.pathname.includes("/assets/mindar/");

  if (isSameOrigin && (isFreshPageAsset || isVirtualGallery || isSpatialArchive || isArArtworkCard)) {
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
