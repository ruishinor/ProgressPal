/*
 * ProgressPal CS50 Edition — offline service worker (Module 17).
 *
 * Dependency-free, production-only. It makes the app cold-start offline after a
 * single successful online production load by caching the app shell and the
 * build's hashed boot assets during install ("install-time discovery"), then
 * serving them from cache when the network is unavailable.
 *
 * Local-first is preserved: this worker only caches static, same-origin app
 * assets. It never touches IndexedDB / Dexie — learner data lives only there.
 */

const CACHE_VERSION = 'progresspal-cache-v1';
const SHELL_URL = '/index.html';

/**
 * Fetch the production index.html and extract every same-origin boot asset it
 * references (entry script, stylesheet, and the modulepreload links Vite emits
 * for the static vendor chunks). Because the app has no lazy/dynamic route
 * chunks, this is the complete set needed to boot.
 */
async function discoverBootAssets() {
  const response = await fetch(SHELL_URL, { cache: 'no-cache' });

  if (!response.ok) {
    throw new Error('Service worker could not fetch the app shell.');
  }

  const html = await response.text();
  const assetUrls = new Set();

  for (const match of html.matchAll(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)) {
    assetUrls.add(match[0]);
  }

  return Array.from(assetUrls);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const bootAssets = await discoverBootAssets();

      // Atomic: if the shell or any boot asset fails to cache, addAll rejects,
      // install fails, and this worker is discarded instead of activating as a
      // half-populated (broken) offline shell. Install retries on the next load.
      await cache.addAll(['/', SHELL_URL, ...bootAssets]);

      // Only take over once the boot set is fully cached.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigations: network-first so an online app always gets fresh HTML, falling
  // back to the cached shell so any route cold-starts offline (the client-side
  // router then resolves the actual route).
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          // ignoreVary/ignoreSearch so a precached shell is served regardless of
          // request headers (e.g. a CORS `Origin`) or query strings.
          const cachedShell = await cache.match(SHELL_URL, {
            ignoreSearch: true,
            ignoreVary: true,
          });

          if (cachedShell) {
            return cachedShell;
          }

          throw new Error('Offline and no cached shell is available.');
        }
      })(),
    );
    return;
  }

  // Same-origin assets: cache-first with runtime population. After install-time
  // discovery the boot assets are already cached; this also covers anything
  // fetched later. Hashed filenames make stale assets a non-issue.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // ignoreVary so a precached hashed asset is served even though the runtime
      // request carries headers the install-time fetch did not (notably a CORS
      // `Origin` header on crossorigin module scripts, which otherwise makes the
      // match honor the response `Vary` header and intermittently miss offline).
      const cached = await cache.match(request, { ignoreVary: true });

      if (cached) {
        return cached;
      }

      const response = await fetch(request);

      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    })(),
  );
});
