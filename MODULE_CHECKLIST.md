# Module Checklist

## Current Module

Module: 17 - Offline hardening
Status: complete

Objective:

- Give ProgressPal real cold-start offline support: after one successful online
  production load, reloading the tab or reopening the app with no network still
  boots to saved local data (not a browser "can't reach this page" error).
- Ship a dependency-free, production-only service worker that caches the app shell
  and the build's hashed boot assets during install, then serves them from cache
  offline. Prove it against the production build without destabilizing the existing
  dev-based E2E suite.

Expected files changed:

- public/sw.js (new)
- src/lib/pwa/registerServiceWorker.ts (new)
- src/lib/pwa/index.ts (new)
- src/main.tsx
- eslint.config.js
- playwright.config.ts
- e2e/offline.spec.ts (new)
- tests/lib/registerServiceWorker.test.ts (new)
- docs/modules/module-17-plan.md (new)
- PROJECT_STATE.md
- DECISIONS.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- TEST_PLAN.md

Forbidden files / work for Module 17:

- No new dependencies (no `vite-plugin-pwa`, no Workbox); use native `caches`,
  `fetch`, and `ServiceWorkerGlobalScope`.
- No `manifest.webmanifest`, app icons, install prompt, or PWA installability.
- No route-level lazy loading / code-splitting changes.
- No Dexie schema/store/index change; no seed change.
- No update-notification UI.
- No "cache everything" behavior — same-origin app shell + built assets only.
- No switch of the existing dev-based E2E suite to preview; no broad Playwright
  migration.
- No edits to locked engines (`src/lib/xp/engine.ts`, `src/lib/achievements/**`,
  `src/lib/progress/engine.ts`), `src/lib/domain/**`, `src/seed/**`, or the Dexie
  schema in `src/lib/db/database.ts`.
- No Module 18/19/20 work.

Acceptance criteria:

- After one online production load, the app boots offline on cold start (reload
  offline reaches the dashboard with its boot JS/CSS), proven in
  `e2e/offline.spec.ts` against the production build, including a Cache-Storage
  assertion that the hashed boot JS/CSS was cached after that single load. The bar
  is not weakened to two online loads.
- The service worker fails closed: a partial cache never becomes the active offline
  shell.
- Offline navigation resolves for not-yet-visited routes; persisted IndexedDB
  state is visible offline.
- Module 16 reset/onboarding-import recovery is not regressed under the SW.
- The SW registers only in production; the dev-based E2E suite and unit suite run
  unchanged.
- No new dependency, no manifest, no schema change (Dexie stays version 2,
  migration fixture green); every chunk under the 600 kB warning budget.
- Triple-Zero achieved with lint, format check, typecheck, build, unit test, E2E
  test, circular-dependency analysis, and dependency audit.

Tests added/updated:

- `tests/lib/registerServiceWorker.test.ts` (registration guard)
- `e2e/offline.spec.ts` (production-preview cold-start offline + Cache-Storage
  assertion + Module 16 recovery under the SW)

Validation commands:

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run check:circular`
- `npm audit --audit-level=moderate`

Data compatibility risk:

- None. No Dexie schema, store, index, or seeded-ID change (stays version 2). The
  service worker caches only static same-origin app assets and never touches
  IndexedDB. The registration helper and Playwright project are additive.

Rollback plan:

- Delete `public/sw.js`, `src/lib/pwa/`, `e2e/offline.spec.ts`, and
  `tests/lib/registerServiceWorker.test.ts`.
- Revert `src/main.tsx`, `eslint.config.js`, and `playwright.config.ts`.
- Reset Module 17 documentation and validation records to the Module 16 state.
- Browser-persistence caveat: a registered SW outlives file deletion; clear site
  data or ship a one-line self-unregistering tombstone `sw.js` for a clean kill.

## Module Status

| Module | Name                                  | Status      |
| ------ | ------------------------------------- | ----------- |
| 00     | Repository inspection and state setup | complete    |
| 01     | Scaffold                              | complete    |
| 02     | Architecture and folders              | complete    |
| 03     | Domain types                          | complete    |
| 04     | Local database                        | complete    |
| 05     | CS50 seed data                        | complete    |
| 06     | Design system                         | complete    |
| 07     | Onboarding and profile                | complete    |
| 08     | Course map                            | complete    |
| 09     | Long-form progression engine          | complete    |
| 10     | Content detail screen                 | complete    |
| 11     | Study session logging                 | complete    |
| 12     | XP engine                             | complete    |
| 13     | Achievement engine                    | complete    |
| 14     | Dashboard                             | complete    |
| 15     | Insights                              | complete    |
| 16     | Settings, backup, import, reset       | complete    |
| 17     | Offline hardening                     | complete    |
| 18     | Accessibility and UX hardening        | not started |
| 19     | Security and privacy review           | not started |
| 20     | Final CS50 project packaging          | not started |
