self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// لا نكاش API حتى لا نعرض بيانات قديمة
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
