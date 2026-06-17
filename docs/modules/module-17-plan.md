# Module 17 Plan — Offline Hardening

> Status: **Module 17 complete and validated.** Sections 1–11 record the approved
> plan; section 12 is the verified end-of-module handoff. Read the handoff for the
> as-built outcome.

## Summary

- Module 17 delivers **real cold-start offline** for ProgressPal: after one
  successful online production load, the learner can reload the tab or reopen the
  app with no network and it still boots to their saved local data.
- It ships a **dependency-free, production-only service worker** (`public/sw.js`)
  that caches the app shell and the build's hashed boot assets during install,
  then serves them from cache when the network is unavailable.
- No new dependency, no manifest/installability, no schema change, no route-level
  lazy loading, no update-notification UI. The existing dev-based E2E suite is
  unchanged; a dedicated production-preview Playwright project proves the offline
  behavior against the real build.

## 1. The gap this closes

Before Module 17 the offline-only claim held only **in-session**: all JS is
statically imported (manual vendor chunks, D-0036), so client-side navigation
survives going offline once the tab has loaded. But there was no service worker
and no app-shell cache, so a **cold start while offline** (reloading offline, or
reopening offline) had nothing to serve `index.html` + the built assets. The
browser HTTP cache is not a guarantee. Separately, the Playwright suite ran only
against the Vite dev server, so shipped offline behavior was unverified.

## 2. Offline / cache strategy (as built)

A classic (non-module) service worker at `public/sw.js`, copied verbatim by Vite
to the dist root (`/sw.js`, scope `/`):

- **`install` — install-time discovery (the one-load guarantee).** Open a
  versioned cache (`progresspal-cache-v1`); `fetch('/index.html', { cache:
'no-cache' })`; parse **every** `/assets/*.js` and `/assets/*.css` reference out
  of the HTML (entry `<script src>`, `<link rel="stylesheet" href>`, and every
  `<link rel="modulepreload" href>` Vite emits for the static vendor chunks,
  including the rolldown runtime); then `cache.addAll(['/', '/index.html',
...bootAssets])`. This does **not** rely on intercepting the first (uncontrolled)
  load's requests — it proactively re-fetches and caches the current build's boot
  set, which is why **one** online load is enough.
- **Fail closed.** `self.skipWaiting()` runs only after `addAll` resolves, inside
  the same `waitUntil`. If the shell or any boot asset fails to cache, `addAll`
  rejects, install fails, and the worker is discarded rather than activating as a
  half-populated (broken) offline shell; install retries on the next online load.
- **`activate`.** Delete any cache whose name ≠ the current version, then
  `clients.claim()`.
- **`fetch` (same-origin GET only).** Navigation requests: network-first, falling
  back to the cached `/index.html` so any route cold-starts offline (the client
  router then resolves it). Other same-origin assets: cache-first with runtime
  population. Cross-origin and non-GET requests fall through untouched. Cache
  matches use `ignoreVary` (and `ignoreSearch`) so a precached asset is served even
  though the runtime request carries headers the install-time fetch did not — in
  particular the CORS `Origin` header on crossorigin module scripts, which
  otherwise makes the match honor the response `Vary` header and intermittently
  miss offline.
- **Local-first preserved.** The worker caches only static same-origin app assets;
  it never touches IndexedDB/Dexie. Learner data continues to live only in
  IndexedDB.

### Why parsing `index.html` is complete

The app uses static `manualChunks` (react/router/zod/dexie/vendor, D-0036) and has
**no route-level lazy/dynamic imports**. Vite therefore references every boot
chunk directly in `index.html` (entry script, stylesheet, modulepreload vendor
links), and there is no custom Vite `base`, so all are `/assets/*`. Extracting all
`/assets/*.{js,css}` tokens from the served HTML yields the full boot set — so
install-time discovery (not a generated asset manifest) is sufficient and adds
zero build-config surface. Forward risk: if a later module adds lazy route chunks,
install-time discovery must be revisited.

## 3. Registration

A tiny helper `registerServiceWorker()` (`src/lib/pwa/`) called from `main.tsx`,
guarded by `import.meta.env.PROD && 'serviceWorker' in navigator`, registered on
`window`'s `load` event. The Vite dev server and jsdom unit tests never register a
worker, so the existing dev-based E2E suite and unit suite are untouched.

## 4. Files

- New: `public/sw.js`, `src/lib/pwa/registerServiceWorker.ts`,
  `src/lib/pwa/index.ts`, `e2e/offline.spec.ts`,
  `tests/lib/registerServiceWorker.test.ts`, this plan.
- Edited: `src/main.tsx` (register call), `eslint.config.js` (serviceworker-globals
  override for `public/sw.js`), `playwright.config.ts` (preview webServer + offline
  project).
- Not changed: `index.html` (no manifest), `vite.config.ts`, `package.json`, and
  all locked engine/domain/seed/db-schema files.

## 5. Data / schema and dependency impact

None. Dexie stays version 2 and the migration fixture stays green. No store, index,
or seeded-ID change. No new dependency (native `caches`, `fetch`,
`ServiceWorkerGlobalScope`).

## 6. Tests

- `tests/lib/registerServiceWorker.test.ts` (unit): no-ops outside production and
  when unsupported; registers `/sw.js` on `load` in production when supported. The
  SW caching logic itself is verified by the production-preview E2E, the only
  faithful environment (jsdom has no real Cache Storage / `ServiceWorkerGlobalScope`).
- `e2e/offline.spec.ts` (dedicated `offline` Playwright project, production build):
  it relies on Playwright's per-test context isolation for a clean pre-state and
  keeps an `afterEach` that unregisters all service workers and clears caches and
  `localStorage` (an in-page `beforeEach` pre-clean was removed because it churned
  SW registration). The cold-start test: one online load → wait for the SW to
  actually control the page → read the served `index.html`, extract every
  `/assets/*.{js,css}` reference, and assert (via Cache Storage) the versioned cache
  holds `/index.html` and **every** referenced boot asset → go offline (no second
  online load) → reload boots the dashboard → persisted profile visible offline →
  offline navigation to a not-yet-visited route. A second test proves the Module 16
  reset → onboarding-import recovery still works with the SW active.

## 7. Validation

`npm run validate` (lint, format:check, typecheck, build, test, test:e2e incl. the
offline project, check:circular, audit). Three consecutive clean passes required;
every chunk under the 600 kB budget; 0 audit findings; no circular dependencies.

## 8. Playwright project layout

`playwright.config.ts` keeps the existing `chromium` project on the Vite dev server
(`testIgnore` the offline spec) and adds an `offline` project whose `webServer`
builds then serves dist via `vite preview` on an isolated port (`127.0.0.1:4180`,
a secure context, so the SW registers without HTTPS), with `testMatch` limited to
`offline.spec.ts`. No broad Playwright migration; the existing 17 specs run
unchanged against dev.

## 9. Stop conditions (none triggered)

Cold-start offline needing a new dependency/manifest/lazy-routes/update-UI/schema
change; SW destabilizing the dev suite or unit tests; irreducibly flaky offline
E2E; SW breaking the Module 16 recovery loop; any locked engine/domain/seed/schema
edit; a chunk over 600 kB; or validation unable to reach three clean passes.

## 10. Risks and mitigations

- **Boot JS missing from cache after one load** → solved by install-time discovery;
  proven by the E2E cache-contents assertion + offline cold-start boot.
- **HTML-parse fragility / atomicity** → broad `/assets/*.{js,css}` match across
  `src`/`href`; atomic `cache.addAll` (fail closed). Forward risk: lazy route
  chunks would need revisiting.
- **Offline cold-boot timing under load** → the offline-boot assertions use a
  generous explicit timeout; the boot itself does no network (verified zero failed
  requests).
- **SW registering in the wrong environment** → `import.meta.env.PROD` +
  feature-detection guard; `/sw.js` only exists in the production build.
- **Stale assets across builds** → content-hashed filenames + versioned cache +
  activate cleanup; bump `progresspal-cache-vN` when SW logic changes.

## 11. Rollback

Delete `public/sw.js`, `src/lib/pwa/**`, `e2e/offline.spec.ts`,
`tests/lib/registerServiceWorker.test.ts`; revert `src/main.tsx`,
`eslint.config.js`, `playwright.config.ts`; reset Module 17 docs to the Module 16
state. Browser-persistence caveat: a service worker already registered in a real
browser outlives file deletion; for this local single-user app, clearing site data
(or a one-line self-unregistering tombstone `sw.js`) is the clean kill if ever
needed. Not implemented now.

## 12. End-of-module handoff (verified)

- Current module complete/incomplete: **complete.**
- Changed files:
  - New: `public/sw.js`, `src/lib/pwa/registerServiceWorker.ts`,
    `src/lib/pwa/index.ts`, `e2e/offline.spec.ts`,
    `tests/lib/registerServiceWorker.test.ts`, this plan.
  - Edited: `src/main.tsx`, `eslint.config.js`, `playwright.config.ts`.
  - Docs: `PROJECT_STATE.md`, `DECISIONS.md` (D-0039), `MODULE_CHECKLIST.md`,
    `CHANGELOG.md`, `TEST_PLAN.md`, `VALIDATION_LOG.md`.
- Validation status: **three consecutive clean `npm run validate` passes** (each:
  lint, format:check, typecheck, build with every chunk under the 600 kB warning
  budget, 191 unit tests, 19 E2E tests across the `chromium` and `offline`
  projects, no circular dependencies, 0 audit vulnerabilities).
- Confirmations: Dexie schema stayed version 2; no new dependency; no manifest; the
  SW registers only in production; the existing dev-based E2E suite and unit suite
  run unchanged; cold-start offline after **one** online production load is proven,
  including a Cache-Storage assertion that the hashed boot JS/CSS was cached after
  that single load; Module 16 reset → onboarding-import recovery is not regressed
  under the active SW; no engine/domain/seed edits.
- Known risks (deferred): a future module that introduces lazy route chunks must
  revisit install-time discovery; manifest/installability and an update-notification
  flow remain out of scope; a registered SW persists in a real browser beyond file
  deletion (clean-kill noted in section 11).
- Next module: **Module 18 - Accessibility and UX hardening (not started).**
