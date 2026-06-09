/**
 * Self-destructing service worker.
 *
 * The app no longer uses a service worker, but earlier versions registered one
 * (lib/pwa/register-sw.ts → "/sw.js"). A stale registered SW keeps serving old
 * cached assets and breaks newly-added routes (e.g. /admin/*) with perpetual
 * loading. This script replaces that old SW: on activation it deletes every
 * cache, unregisters itself, and reloads open tabs so they pick up fresh code.
 * If no SW is registered, this file is simply never used — harmless.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch (_) {
        /* ignore */
      }
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        try {
          client.navigate(client.url);
        } catch (_) {
          /* ignore */
        }
      });
    })()
  );
});

// Pass-through fetch: never serve from cache (no interception of new routes).
self.addEventListener('fetch', () => {});
