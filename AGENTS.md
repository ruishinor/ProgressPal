# AGENTS.md — ProgressPal CS50 Edition

Guidance for AI coding agents working in this repository. Read this before making any change.

## Project overview

ProgressPal is a **local-first, single-user, browser-based CS50x study tracker**. The released **v1.3.0** engine (`progresspal-cs50-edition`) is frozen. Optional same-origin RPG product-completion work C0-C5 and final owner-review corrections are frozen by owner instruction at `freeze/rpg-product-completion-2026-09-16`; evidence is tracked in `docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md`. Classic remains the default. Do not restart historical release remediation, C0-C5, or further product work without a new owner instruction.

Product boundary (do not cross it):

- Local-first: the browser IndexedDB database is the only source of truth. No backend, no accounts, no cloud sync, no analytics, no telemetry.
- No runtime external course-data fetching, no embedded external course content, no remote assets or scripts.
- CS50x-focused study companion; not affiliated with Harvard, CS50, edX, or OpenCourseWare. Never add CS50/Harvard branding.
- User data can be lost when browser storage is cleared — backup export/import is the mitigation, not sync.

The frozen completion branch is `rpg/product-completion`; `master` is the default branch. Release and freeze tags, including `v1.3.0-local-first-proof` and `freeze/rpg-product-completion-2026-09-16`, are immutable records. On 2026-09-16 the owner authorized committing, tagging, freezing, and pushing this completion branch and tag. That instruction does not authorize a PR, merge, deployment, package-version change, or RPG default promotion; those remain separate owner decisions.

## Tech stack

- **Vite 8** + `@vitejs/plugin-react`, **React 19**, **react-router-dom 7**, **TypeScript 6** (strict).
- **Dexie 4** (IndexedDB) for persistence, **Zod 4** for runtime validation, **date-fns**, **recharts**.
- Plain CSS with design tokens (`src/styles/`); no CSS framework, UI library, or state manager — do not add one.
- **Vitest 4** + jsdom + Testing Library + fake-indexeddb for unit/integration tests.
- **Playwright** (+ `@axe-core/playwright`) for E2E and accessibility tests.
- ESLint 10 (flat config) + typescript-eslint + Prettier 3; dpdm for circular-dependency checks.
- Toolchain is pinned: **Node 24** (`.nvmrc`, `engines`), **npm 11.10.1** (`packageManager`). Install with `npm ci` only.

## Repository layout

```
src/
  main.tsx            # Entry: renders <App/>, registers the service worker
  app/                # Composition root: providers, router, route pages, shells
    router/routeDefinitions.ts  # All route paths and primary-nav config
  components/         # Shared, feature-agnostic UI primitives (ui/, layout/, placeholder/)
  features/           # Feature modules: achievements, course, dashboard, insights,
                      # profile, progress, rpg, sessions, settings, xp
                      # Each has an index.ts public entrypoint, model.ts, routes/, components/
  lib/                # Layer-independent code: db, domain (Zod schemas), storage,
                      # backup, xp, progress, achievements, validation, time, routing,
                      # appState, pwa, testing
  seed/               # Bundled CS50x 2026 course catalog (cs50x-2026.json) + parser
  styles/             # Global CSS: tokens.css, design-system.css, rpg-*.css
tests/                # Vitest suites mirroring src (app, architecture, components,
                      # db, domain, features, fixtures, lib, seed)
e2e/                  # Playwright specs (accessibility, offline, per-surface)
scripts/              # Release gate, E2E runner, bundle-budget scripts (*.mjs)
public/               # Static assets incl. sw.js (hand-written offline service worker)
docs/                 # Controlling docs: remediation, rpg-v2, ci.md, storage-safety.md
```

Routes: classic tracker routes (`/`, `/onboarding`, `/dashboard`, `/course`, `/course/:itemId`, `/sessions`, `/achievements`, `/insights`, `/settings`) plus same-origin RPG shell routes (`/rpg`, `/rpg/map`, `/rpg/week/:unitId`, `/rpg/resource/:itemId`, `/rpg/focus`, `/rpg/hero`, `/rpg/badges`, `/rpg/log`, `/rpg/settings`), all defined in `src/app/router/routeDefinitions.ts` with path helpers in `src/lib/routing/rpgRoutePaths.ts`.

Path alias: `@/*` → `src/*` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### Layer rules (enforced by ESLint `no-restricted-imports`)

- `src/app/**` may import features **only through their public entrypoint** (`@/features/<name>`), never deep paths (`@/features/*/*`).
- `src/components/**` must not import from `@/app/*` or `@/features/*` — shared components stay feature-agnostic.
- `src/features/**` must not import from `@/app/*`.
- `src/lib/**` must not import from `@/app/*`, `@/components/*`, or `@/features/*` (exception: `src/lib/testing/**`).

## Build and dev commands

```bash
npm ci                  # install exact locked dependencies (Node 24, npm 11)
npm run dev             # Vite dev server
npm run build           # production build to dist/
npm run preview         # preview the production build
npm run lint            # eslint . --max-warnings 0 (warnings fail)
npm run format          # prettier --write .
npm run format:check    # prettier --check .
npm run typecheck       # tsc -b (project references: app + node configs)
npm test                # Vitest unit/integration tests (serial, see below)
npm run test:e2e        # managed Playwright run (build + preview + test)
npm run check:circular  # dpdm circular-dependency check (fails on cycles)
npm run check:bundle    # bundle budget: 500 kB raw per chunk, no prod source maps
npm run audit           # npm audit --audit-level=moderate
npm run verify:release  # full immutable release gate (see below)
npm run validate        # alias of verify:release
```

The ordinary validation gate before considering work done:

```bash
npm run lint && npm run format:check && npm run typecheck && npm run build && \
npm test && npm run test:e2e && npm run check:circular && npm run audit
```

## Testing instructions

### Unit / integration (Vitest)

- Tests live in `src/**/*.test.{ts,tsx}` and `tests/**/*.test.{ts,tsx}`; `tests/` mirrors the `src/` layout. `tests/architecture/` contains boundary/guard tests (module boundaries, local-only, route definitions) — keep them passing when moving code.
- `npm test` runs `vitest run --maxWorkers=1 --no-file-parallelism`. Serial execution is **deliberate** (an inherited unconstrained Vitest process model leaked workers on Windows); do not "fix" it by enabling parallelism.
- `vitest.setup.ts` installs `fake-indexeddb`, jest-dom matchers, `matchMedia`/`scrollTo` mocks, and a fresh fake Web Locks manager (`navigator.locks`) before each test; it cleans up the DOM and deletes the shared database after each test. IndexedDB reads are given a 5 s Testing Library timeout.
- E2E needs browsers installed once: `npx playwright install chromium`.

### E2E (Playwright)

- `npm run test:e2e` runs `scripts/run-e2e.mjs`: it builds the app, starts a Vite preview on `127.0.0.1:42183`, verifies the served document, runs Playwright with `playwright.managed.config.ts`, and always tears down its own process tree. It refuses to reuse an existing server — free port 42183 first if a run fails to start.
- Specs live in `e2e/`; `offline.spec.ts` runs in a separate `offline` project, `accessibility.spec.ts` uses axe-core. Traces, screenshots, and videos are retained on failure only.
- Tests must use synthetic data only — never real learner data, tokens, or private backups (failure traces can expose rendered data).

### Release gate (`npm run verify:release`)

This is a certification gate, not a fast feedback loop. It requires a **clean git worktree**, Node 24, npm 11, matching package/lockfile versions, and these env vars:

```powershell
$env:RELEASE_MODULE = '<module-name>'
$env:RELEASE_PASS = '1'
$env:RELEASE_REVIEW_FILE = '<tracked-review-evidence.json>'  # e.g. docs/remediation/module-3-release-review.json
npm run verify:release
```

It runs `npm ci`, lint, format check, typecheck, build, bundle budget, unit tests, E2E, circular check, and `npm audit`, failing on any warning, skipped test, retried test, non-zero exit, or worktree change. Evidence JSON (with build checksums) is written to gitignored `artifacts/release-evidence/`. Do not run it mid-development; use the targeted commands above instead.

### CI (`.github/workflows/test.yml`)

One workflow, "Release validation": one `Final candidate` job on `ubuntu-latest`, checking out the triggering SHA and running `npm run verify:release` once. Together with one clean local final gate, this implements D-0075. There is no sharding, retry, or deployment stage (deliberate omissions — see `docs/ci.md`). If `npm audit` cannot reach its endpoint, the pass fails; record the outage honestly, never relabel it a clean pass.

## Code style guidelines

- TypeScript strict mode with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`; ES2022 target, ESM everywhere (`"type": "module"`).
- Prettier: LF line endings, single quotes, trailing commas (`prettier.config.cjs`); `.gitattributes` enforces `eol=lf`.
- ESLint flat config (`eslint.config.js`): recommended JS + typescript-eslint, `react-hooks`, and `react-refresh/only-export-components` (constant exports allowed). `--max-warnings 0` means warnings fail.
- Follow existing project patterns: feature modules expose a single `index.ts` entrypoint; read models and engines live in `src/lib/` or `features/*/model.ts`; domain schemas are Zod-based in `src/lib/domain/` (generic parsing helpers in `src/lib/validation/`).
- Vite `manualChunks` splits `storage-safety`, `backup`, `router`, `react`, `zod`, `dexie`, and `vendor` chunks to keep each raw chunk under the 500 kB budget. Preserve static imports — no lazy/dynamic route chunks (the offline service worker relies on install-time discovery of all boot assets).
- Several folders carry their own `README.md` describing scope and boundaries (`src/lib/db/`, `src/seed/`, `src/features/*/`) — read and respect them when editing there.

### Operating standard (from CONTRIBUTING.md)

> No bias. No bullshit. No overbuild.

Do not add features, files, dependencies, abstractions, assets, or refactors that the current accepted module did not ask for. Ask first: does this need to be here, is it required by the source-of-truth roadmap / an accepted decision / a failing test, and can it be done with existing code?

**Forbidden without an accepted decision:** backend, authentication, cloud sync, analytics, AI tutor, schema changes, new XP rules, fake RPG mechanics, embedded external course content, runtime course-data fetching, remote assets, CS50/Harvard branding, convenience dependencies, and broad unrelated refactors.

Use the current completion document's rolling status and concern-scoped commits for final review corrections. The older per-module handoff template under `docs/rpg-v2/modules/` remains historical guidance for that module process; it does not require a new handoff per visual fix. Scope and architecture discipline still apply.

## Security considerations

The security model is "local-only" (see `SECURITY.md`, `PRIVACY.md`, `docs/storage-safety.md`):

- All user data lives in IndexedDB via Dexie (`src/lib/db/database.ts`, schema v2). No cookies or web storage for learner data; no server copy of anything.
- Cross-tab write safety lives in `src/lib/storage/`: a BroadcastChannel/storage-event coordination protocol makes extra tabs read-only; it is same-browser-profile coordination, not distributed locking, and adds no IndexedDB tables.
- `public/sw.js` is a dependency-free, production-only offline service worker. It caches only same-origin static build assets and never touches IndexedDB. Keep it that way.
- Production source maps are forbidden (enforced by `npm run check:bundle`).
- `npm run audit` (moderate+) is part of the release gate — do not add dependencies with known vulnerabilities, and do not add dependencies for convenience at all.
- Watch for and report: unintended network requests, data-loss paths, backup/export/import failures, XSS/HTML injection, weakening of the local-only guard.

## Deployment

Static SPA hosting on Vercel (`vercel.json` rewrites every path to `/index.html`). There is intentionally **no deployment workflow in CI** and no deployment credentials in the repo.

## Key documentation

Read these when their area comes up:

- `README.md` — product position, release freeze status, development setup.
- `CONTRIBUTING.md` — operating standard, module discipline, Scope Discipline Check, forbidden list.
- `docs/ci.md` — release pipeline contract and troubleshooting.
- `docs/storage-safety.md` — cross-tab coordination and persistent-storage policy.
- `docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md` — current RPG completion authority and rolling evidence, subject to the latest owner instructions.
- `docs/remediation/3-1-v1-3-release-remediation.md` — historical v1.3 release remediation; do not reopen it as the current work queue.
- `docs/rpg-v2/` — RPG v2 source-of-truth set (roadmap, decisions, migration contract, validation log, risk register). RPG v2 module handoffs live in `docs/rpg-v2/modules/`.
- `docs/archive/engine-v1/` — historical v1 engine records only; not active guidance.
