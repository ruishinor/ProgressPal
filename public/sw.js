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
 * Builds can change without a package/cache-version bump. Refresh the boot set
 * from each successful navigation's exact HTML before replacing the offline
 * shell. Failed or interrupted asset caching leaves the previous shell usable;
 * older hashed assets remain until the next normal cache-version purge. This
 * requires neither build stamping nor access to learner data.
 */

const CACHE_PREFIX = 'progresspal-cache-';
const CACHE_VERSION = 'progresspal-cache-v1.3.0';
const SHELL_URL = '/index.html';
const STATIC_ASSET_URLS = ['/assets/character-profile.png'];
let latestNavigation = 0;
let pendingShellWrite = Promise.resolve();

/**
 * Extract every same-origin boot asset the supplied production HTML
 * references (entry script, stylesheet, and the modulepreload links Vite emits
 * for the static vendor chunks). Because the app has no lazy/dynamic route
 * chunks, this is the complete set needed to boot.
 */
async function discoverBootAssets(response) {
  if (!response.ok || getContentType(response) !== 'text/html') {
    throw new Error('Service worker did not receive an HTML app shell.');
  }

  const html = await response.text();
  const assetUrls = new Set();

  for (const match of html.matchAll(
    /\b(?:src|href)=["'](\/assets\/[A-Za-z0-9._-]+\.(?:js|css))["']/g,
  )) {
    assetUrls.add(match[1]);
  }

  if (
    ![...assetUrls].some((url) => url.endsWith('.js')) ||
    ![...assetUrls].some((url) => url.endsWith('.css'))
  ) {
    throw new Error('Service worker did not find a complete boot set.');
  }
  return Array.from(assetUrls);
}

function getContentType(response) {
  return response.headers
    .get('Content-Type')
    ?.split(';')[0]
    .trim()
    .toLowerCase();
}

function isValidBootAsset(response, assetUrl) {
  const contentType = getContentType(response);
  const validType = assetUrl.endsWith('.css')
    ? contentType === 'text/css'
    : contentType === 'text/javascript' ||
      contentType === 'application/javascript';

  return (
    response.status === 200 &&
    !response.redirected &&
    (!response.url ||
      response.url === new URL(assetUrl, self.location.origin).href) &&
    validType
  );
}

async function cacheBootAssets(cache, shellResponse) {
  const bootAssets = await discoverBootAssets(shellResponse);
  const missing = await Promise.all(
    bootAssets.map(async (assetUrl) => {
      const cached = await cache.match(assetUrl, { ignoreVary: true });
      if (cached && isValidBootAsset(cached, assetUrl)) {
        return null;
      }

      const response = await fetch(assetUrl, { cache: 'no-cache' });
      if (!isValidBootAsset(response, assetUrl)) {
        throw new Error('Service worker received an invalid boot asset.');
      }
      return { assetUrl, response };
    }),
  );

  // Validate every fetched asset before storing any. A failed put can leave
  // extra hashed assets, but callers never publish their shell until all puts
  // succeed. In particular, a 200 HTML rewrite cannot poison a JS/CSS entry.
  await Promise.all(
    missing.map((asset) =>
      asset === null ? undefined : cache.put(asset.assetUrl, asset.response),
    ),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const response = await fetch(SHELL_URL, { cache: 'no-cache' });
      await cacheBootAssets(cache, response.clone());
      await cache.addAll([...STATIC_ASSET_URLS]);
      await cache.put('/', response.clone());
      await cache.put(SHELL_URL, response);

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
    const navigation = ++latestNavigation;
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

          if (response.ok && navigation === latestNavigation) {
            // Refresh the cached shell with the fresh HTML. This lives in its
            // OWN nested try/catch: a rejected cache.put (e.g. storage pressure
            // or quota errors) must NOT fall into the offline catch below,
            // which would wrongly replace a fresh network response with the
            // stale cached shell.
            try {
              const cache = await caches.open(CACHE_VERSION);
              await cacheBootAssets(cache, response.clone());
              // Ignore older responses and serialize commits: an earlier
              // cache.put already in flight must finish before a newer write.
              const writeShell = () => {
                if (navigation === latestNavigation) {
                  return cache.put(SHELL_URL, response.clone());
                }
              };
              pendingShellWrite = pendingShellWrite.then(
                writeShell,
                writeShell,
              );
              await pendingShellWrite;
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
  // and cached during install or a validated navigation. Other cache misses go
  // to the network but are never added opportunistically: a 200 HTML SPA rewrite
  // must not be cached under the requested script URL.
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
