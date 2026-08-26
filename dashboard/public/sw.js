// Minimal service worker — no offline caching, it exists purely to satisfy Chrome's
// PWA installability check on Android (a registered SW with a fetch handler is
// required there for "Add to Home screen" / "Install app" to appear; Safari on iOS
// has no such requirement, which is why the manifest alone was enough to be missed).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough — every request just goes to the network as normal.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
