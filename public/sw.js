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
 *
 * Versioning contract: CACHE_VERSION is bumped by hand with the package
 * version, and tests/architecture/serviceWorker.test.ts fails certification if
 * they drift apart. Activation purges every earlier ProgressPal cache, so a
 * version bump is the wholesale-reset mechanism for a poisoned cache.
 *
 * Known accepted edge: the navigation handler refreshes the cached shell in
 * place. If a new deploy lands between a shell refresh and the old assets
 * being evicted, a tab killed at exactly the wrong moment can hold a new shell
 * referencing assets the old cache still has (or vice versa). The next online
 * load self-heals; the atomic alternative requires build-time asset stamping,
 * which was deliberately rejected to keep dist/sw.js identical to this source.
 */

const CACHE_PREFIX = 'progresspal-cache-';
const CACHE_VERSION = 'progresspal-cache-v1.3.0';
const SHELL_URL = '/index.html';
const STATIC_ASSET_URLS = ['/assets/character-profile.png'];

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
      await cache.addAll(['/', SHELL_URL, ...bootAssets, ...STATIC_ASSET_URLS]);

      // Only take over once the boot set is fully cached.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      // Purge ONLY ProgressPal-owned caches: keys under our prefix that are not
      // the current version. Legacy ProgressPal versions (e.g. the pre-1.3
      // 'progresspal-cache-v1') match the prefix and are cleaned up, while any
      // unrelated same-origin caches — belonging to other tooling or a future
      // sibling app — are left untouched.
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION,
          )
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
          const response = await fetch(request);

          if (response.ok) {
            // Refresh the cached shell with the fresh HTML. This lives in its
            // OWN nested try/catch: a rejected cache.put (e.g. storage pressure
            // or quota errors) must NOT fall into the offline catch below,
            // which would wrongly replace a fresh network response with the
            // stale cached shell.
            try {
              const cache = await caches.open(CACHE_VERSION);
              await cache.put(SHELL_URL, response.clone());
            } catch {
              // Shell refresh is best-effort; the fresh response still wins.
            }
          }

          return response;
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

  // Same-origin static files: cache-first for the exact resources discovered
  // and cached during install. Cache misses go to the network but are never
  // added opportunistically: a 200 HTML SPA rewrite must not be cached under
  // the requested script URL.
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

      return response;
    })(),
  );
});
