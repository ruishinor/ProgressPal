# ProgressPal CS50 Edition

An offline-only, single-user, local-first learning companion that helps one
learner track their CS50 progress in small, persistent, gamified steps.

> **Not affiliated with CS50.** This is an independent student project for
> tracking CS50x progress; it is not affiliated with, endorsed by, or maintained
> by CS50, Harvard, or edX.

Everything you enter stays in your own browser on your own device. There is no
account, no server, and no network call for your data.

**Video demo:** _to be recorded — the walkthrough and a ~3-minute narration
script live in [docs/DEMO.md](docs/DEMO.md)._

---

## What it is

ProgressPal CS50 Edition is the focused, CS50-only result of an earlier, broader
life-tracking concept that was deliberately scoped down (see `DECISIONS.md`
D-0001 and `ROADMAP.md`). It answers four questions for one self-directed CS50
learner with uneven energy and focus:

- What is done?
- What is next?
- How is effort accumulating?
- Where do I resume?

It runs entirely in the browser, stores progress locally in IndexedDB, and keeps
working offline after the first successful load.

## Features

Every feature below maps to a real route in the app
(`src/app/router/routeDefinitions.ts`):

- **Onboarding / profile** (`/onboarding`, `/`) — create a first-run local
  profile (display name, avatar, study targets, theme and reduced-motion
  preferences). The home route is the saved-profile summary.
- **Course map** (`/course`) — a read-only view of the bundled CS50x catalog
  (weeks/units and items) with honest required-progress rollups.
- **Content detail** (`/course/:itemId`) — log item status, confidence, notes,
  and evidence. Long-form material uses **partial-progress tracking**: watched
  ranges, interval union, resume points, and slice timelines instead of a single
  binary checkbox. Manual `m:ss` / `h:mm:ss` timestamp entry is supported, and
  partial watched history cannot be silently overridden to "completed".
- **Study sessions** (`/sessions`) — an append-only ledger of study effort with
  a live timer (in-memory only) and manual entry, plus session notes and
  blockers.
- **XP and levels** — a deterministic, idempotent, ledger-based XP engine.
  Levels are derived from an immutable XP transaction ledger, so reloading never
  double-counts.
- **Achievements** (`/achievements`) — code-defined achievements unlocked from
  local progress on explicit save (no passive or duplicated unlocks).
- **Dashboard** (`/dashboard`) — a read-only operational summary derived from the
  stored data; opening it mutates nothing.
- **Insights** (`/insights`) — read-only trends over the immutable ledgers
  (active days, logged effort, achievement timeline), with no streak branding and
  no remote analytics.
- **Settings, backup, and recovery** (`/settings`) — edit the local profile;
  **export** a full local backup as a JSON file; **import** (replace-all, after
  strict validation); and **reset** (clear all local data and re-create a fresh
  profile and seeded catalog). Backup import is also reachable from onboarding for
  recovery.
- **Offline support** — a production-only service worker caches the app shell and
  its hashed boot assets, so after one successful online load the app starts and
  navigates offline.
- **Accessibility** — dark-theme contrast hardening, focus-visible handling, and
  in-app reduced-motion support, with computed-style end-to-end checks.

### Not included (by design)

This is an MVP with a deliberately locked scope. It has **no** login, cloud sync,
backend, external APIs, analytics/telemetry, AI tutoring, or social/leaderboard
features, and it tracks a single course family (CS50 / CS50x). Charts are a
retained-but-deferred idea: `recharts` and `date-fns` are declared in
`package.json` and reserved for that future work, but no chart feature ships today
(see `DECISIONS.md` D-0041). See `ROADMAP.md` for the full scope lock.

## Tech stack

- **Build / UI:** Vite, React, TypeScript, React Router.
- **Persistence:** Dexie over IndexedDB (schema version 2, with a legacy
  version-1 migration fixture).
- **Validation:** Zod schemas for domain types and backup envelopes.
- **Course data:** a bundled, locally editable CS50x 2026 seed catalog
  (`src/seed/`), loaded at startup.
- **Testing:** Vitest (unit/integration) and Playwright (end-to-end, including a
  dedicated production-preview offline project), with axe-core accessibility
  checks.
- **Quality:** ESLint and Prettier, plus a circular-dependency check (`dpdm`).

### Project layout

- `src/app/` — route composition, router, providers, app shell.
- `src/features/` — feature folders: `profile`, `course`, `progress`, `sessions`,
  `xp`, `achievements`, `dashboard`, `insights`, `settings`.
- `src/lib/` — `db` (Dexie + repositories), `domain` (constants/schemas/types),
  `backup`, `progress`, `xp`, `achievements`, `appState`, `pwa`, `time`,
  `validation`.
- `src/seed/` — the bundled CS50x catalog and its parser.
- `src/styles/` — design tokens and stylesheets.
- `public/sw.js` — the production-only service worker.
- `tests/` — Vitest unit/integration tests; `e2e/` — Playwright specs.

## Getting started

### Prerequisites

- A current Node.js LTS and npm.
- A modern browser with IndexedDB and service-worker support.

### Install

```bash
npm install
npx playwright install chromium   # one-time, only needed to run the E2E tests
```

### Run in development

```bash
npm run dev
```

Vite serves the app locally (default `http://localhost:5173`) with hot reload.
The service worker is production-only and does not register in dev.

### Build and preview a production bundle

```bash
npm run build
npm run preview
```

`npm run preview` serves the built app (default `http://localhost:4173`). Load it
once online, then you can reload or reopen it offline.

## Testing and validation

Individual checks:

```bash
npm run lint           # ESLint, zero warnings allowed
npm run format:check   # Prettier formatting check
npm run typecheck      # tsc -b
npm run build          # production build
npm run test           # Vitest unit/integration suite
npm run test:e2e       # Playwright end-to-end suite (needs Chromium installed)
npm run check:circular # circular-dependency check
npm run audit          # npm audit --audit-level=moderate
```

### Known validation caveat

`npm run validate` chains all of the above. In this project's environment the
bare command can **hang on Playwright's web-server teardown after the tests have
already reported OK**. The validation history therefore uses a **managed-server
method**: the dev and production-preview servers are started explicitly and
reused by Playwright, so Playwright never owns (and never hangs tearing down) the
servers. When you see a "Triple-Zero" / clean-pass claim in `VALIDATION_LOG.md`,
it was produced with that managed-server method, and the log says so explicitly
rather than claiming the bare `npm run validate` command passed. See
`VALIDATION_LOG.md` for the exact commands and the most recent results.

## Privacy and security boundary

ProgressPal is local-only: the app does not transmit your data off the device.
**Local-only does not mean encrypted, tamper-proof, certified, or safe against
device access.** IndexedDB data is stored unencrypted, and anyone with access to
your device or browser profile can read or change it. Exported backup files are
ordinary personal files once they leave the app — handle them accordingly.

This project makes **no claim** of production-grade security, regulatory or GDPR
compliance, encryption at rest, or deployment readiness. For the full, honest
treatment see [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Limitations and known caveats

- Bundled `estimatedMinutes` values are local planning estimates, not official
  CS50 durations, so long-form watched-time percentages are only as good as that
  planning data.
- Study sessions are append-only: there is no edit, delete, or repair UI yet, and
  an unfinished live timer is intentionally lost on reload rather than written as
  a phantom record.
- Once a long-form asset has saved media events, its derived slice plan is frozen;
  later seed-estimate edits can make planned minutes diverge from the frozen plan.
- Import is replace-all only (no merge); selective export is not implemented.
- A registered service worker persists in a real browser beyond file deletion;
  future lazy-loaded route chunks would need to revisit install-time asset
  discovery (see `PROJECT_STATE.md` and `DECISIONS.md` D-0039).

## CS50 final-project notes

ProgressPal CS50 Edition is submitted as a CS50x final project. It is an original
single-author project; the bundled CS50x catalog is course-structure reference
data, not CS50 course content. The accompanying demo walkthrough and the
~3-minute video narration script are in [docs/DEMO.md](docs/DEMO.md).

## Repository map

- `ROADMAP.md` — product scope lock, MVP boundary, and the module delivery
  sequence.
- `PROJECT_STATE.md` — current state, schema/seed versions, known risks, and the
  "do not change" invariants per module.
- `MODULE_CHECKLIST.md` — per-module objective, expected files, and status.
- `DECISIONS.md` — the decision log (`D-0001` onward).
- `TEST_PLAN.md` — the test strategy and coverage map.
- `VALIDATION_LOG.md` — the validation history (commands, results, retrospectives).
- `SECURITY.md` / `PRIVACY.md` — the security baseline and the local-only privacy
  boundary.
- `docs/modules/` — per-module plans; `docs/decisions/` — architecture decision
  records; `docs/DEMO.md` — the demo walkthrough and video script.
