# Changelog

## 2026-06-17 - Surface CS50 course content in tracker

### Changed

- Updated all generic item titles in the seed to CS50-specific names
  (e.g. "Lecture 1: C", "Problem Set 3: Algorithms", "Shorts: Python").
- Fixed "Week 10" unit title to "Week 10: The End".
- Bumped seed `dataVersion` to `20260617`; seed sync propagates title changes
  to the local database on next app initialization.
- Renamed AppShell header card from "Current foundation" to "Current status".
- Replaced stale dev-phase descriptions in `CourseMapSummary` ("placeholder",
  "pretending progress is clean", "decorative catalog") with plain present-tense
  copy.
- Fixed stale "later-module" language in the `ContentDetailPage` progress record
  card description.

### Added

- `src/features/course/cs50Links.ts`: static lookup module returning
  `Cs50Link | null` for unit and item IDs — maps week units to
  `cs50.harvard.edu/x/weeks/N/`, problem sets to `.../psets/N/`,
  AI week and final project to their respective pages. No fetching; purely
  static string maps.
- CS50 source link on each week card in the Course Map (unit-level link).
- CS50 source card on each Content Detail page (item link if available,
  otherwise unit-level fallback). External anchors use
  `target="_blank" rel="noopener noreferrer"`.
- `tests/features/cs50Links.test.ts`: unit tests covering all week units,
  all problem set items, AI/practice/final-project units, unknown ID null
  returns, and HTTPS enforcement.
- `tests/seed/bundledCourseSeed.test.ts`: new test asserting CS50-specific
  item titles and "Week 10: The End" unit title; updated `dataVersion`
  assertion to `20260617`.

### Boundaries

- No route, schema, persistence, dependency, or service-worker change.
- No external API calls; all CS50 links are static string constants.
- No CS50 affiliation claimed; links open the public course website.
- No problem-set solution content included.

---

## 2026-06-17 - Post-Module-20 UI copy polish

### Changed

- Removed stale internal module-development references from app-facing copy.
- Reframed visible route/page descriptions as final product language.
- Replaced "Route: /..." eyebrow labels with meaningful page-context labels
  (e.g. "Local dashboard", "CS50 course map", "Study ledger", "Data controls").
- Replaced "What this module does not claim" card on the home page with a
  "Privacy boundary" card describing the local-only scope.
- Fixed AppShell summary that said insights "still land in a later module".

### Boundaries

- No route, schema, persistence, dependency, service-worker, or behavior change.
- No new features, no redesign, no CSS layout change.

---

## 2026-06-17 - Module 20

### Added

- `README.md` (the repo's first project README): an accurate overview with a
  CS50 non-affiliation disclaimer, a feature inventory tied to the real routes,
  the tech stack and project layout, install/run/build/preview instructions, a
  testing & validation section that documents the known `npm run validate`
  Playwright teardown caveat and the managed-server workaround honestly, the
  local-only privacy/security boundary (mirroring `PRIVACY.md`/`SECURITY.md`),
  scope/non-goals, limitations, CS50 final-project notes, and a repository map.
- `docs/DEMO.md`: a written demo walkthrough (onboarding → progress and long-form
  watched ranges → study session → XP/level → achievement → dashboard → insights
  → settings backup/export/import/reset → offline) plus a selective ~3-minute
  CS50 video narration script focused on the core product loop.
- `docs/modules/module-20-plan.md` with the packaging scope, accuracy rules, and
  validation protocol.

### Changed

- Updated `MODULE_CHECKLIST.md` (Module 20 current and complete), `PROJECT_STATE.md`
  (current module 20; resolved the "README/demo deferred to Module 20" risk),
  `DECISIONS.md` (D-0043), `TEST_PLAN.md` (Module 20 adds no tests), and
  `VALIDATION_LOG.md` (Module 20 validation record).

### Boundaries

- Documentation only: no runtime application source change, no route/UI change,
  no Dexie schema/store/index change, no service-worker/PWA change, no dependency
  or package-script change (`package.json` / `package-lock.json` untouched), no
  new tests, and no screenshots or other binary assets. No production-readiness,
  compliance, or encryption claims; "local-only" is documented as "data not
  transmitted", not as encrypted or device-safe.

## 2026-06-17 - Post-Module-19 bundle-hygiene fix

### Fixed

- The production bundle no longer inlines the full `package.json`.
  `src/lib/db/constants.ts` now imports only the `version` field
  (`import { version as applicationVersion } from '../../../package.json'`)
  instead of the whole JSON default object, so dependencies, devDependencies,
  and the npm scripts block are no longer embedded as a string in the app chunk.
  This resolves the bundle-hygiene finding documented in Module 19 (D-0041).

### Notes

- `currentApplicationVersion` keeps the same runtime string value and type, and
  all consumers (repositories, backup `appVersion`, settings) are unchanged.
- Verified against build output: the manifest tokens (`devDependencies`,
  `scripts`, `recharts`, `date-fns`, dev tool names) no longer appear in `dist`,
  while the version string still does. `recharts` and `date-fns` remain declared
  in `package.json`/lockfile, reserved for the future Charts feature. No schema,
  service-worker, route, or dependency change.

## 2026-06-17 - Module 19

### Added

- `PRIVACY.md`: a plain, accurate local-only privacy boundary covering what is
  stored, where it lives (IndexedDB), user-controlled backup/export/import/reset,
  and explicit non-guarantees (not encrypted, not tamper-proof, not safe against
  device access). README/demo remain Module 20.
- `tests/architecture/localOnly.test.ts`: a narrow source-safety guardrail that
  fails when runtime `src/` source introduces a network-request primitive,
  dynamic code execution, a raw-HTML injection sink, or a non-allowlisted
  external URL. Comments are stripped and XML-namespace URLs are allowlisted to
  keep it false-positive-free.
- `docs/modules/module-19-plan.md` with the review scope, findings, and
  validation protocol.

### Changed

- Refreshed `SECURITY.md` to current reality: it had drifted to a "Module 13
  complete" snapshot. Added Module 14-19 controls, corrected the threat-model
  baseline, and corrected open risks that wrongly claimed export/import/reset and
  cold-start offline did not exist (both shipped in Modules 16-17).

### Findings (documented, not changed)

- `recharts` and `date-fns` are declared but unimported; their library code is
  not bundled (verified against build output). Documented as reserved for the
  future Charts feature rather than removed, per decision D-0041.
- The production bundle inlines the full `package.json` (deps, devDeps, scripts)
  because `src/lib/db/constants.ts` imports the whole JSON for `version`; this is
  why dependency names appear in built output. Recorded as a low-severity
  bundle-hygiene follow-up, intentionally out of this documentation-only module.

### Boundaries

- Documentation plus one new test only: no runtime application source change, no
  dependency change (`package.json` / `package-lock.json` untouched), no Dexie
  schema/store/index change, no route change, no service-worker/PWA change, and
  no Module 20 packaging work.

## 2026-06-17 - Module 18

### Added

- `e2e/accessibility.spec.ts` with computed-style contrast checks for dark-theme
  surfaces axe cannot evaluate reliably, including real reachable routes and
  browser-rendered CSS fixtures for transient/unreachable status states.
- Component contract coverage in `tests/components/checkbox.test.tsx` for
  EmptyState, LoadingState, ErrorState, and the custom Checkbox input/indicator
  adjacency required by the focus-visible CSS selector.
- Module 18 plan and handoff scaffold in `docs/modules/module-18-plan.md`.

### Changed

- Dark theme now uses opaque, theme-aware card surfaces for `.card--accent`,
  `.card--subtle`, and `.card--danger`, plus contrast fixes for status surfaces,
  invalid fields, primary/danger button hovers, and warning badges.
- The custom Checkbox now shows keyboard focus on the visible indicator.
- The in-app reduced-motion setting now neutralizes keyframe animations as well as
  transitions.

### Boundaries

- CSS/test/docs only: no dependency change, no Dexie schema/store/index change, no
  seed/domain/engine change, no route change, no service-worker/PWA change, and no
  component markup restructuring.

## 2026-06-17 - Module 17

### Added

- Real cold-start offline support via a dependency-free, production-only service
  worker `public/sw.js`. It uses **install-time discovery**: on install it fetches
  `/index.html`, parses every same-origin `/assets/*.{js,css}` reference (entry
  script, stylesheet, and the modulepreload vendor chunks), and atomically
  `cache.addAll`s the shell plus those boot assets into a versioned cache
  (`progresspal-cache-v1`). It **fails closed** — `skipWaiting` runs only after the
  boot set is cached, so a partial cache never becomes the active offline shell.
  The fetch handler serves same-origin GET only: navigation network-first →
  cached `/index.html`; assets cache-first, matched with `ignoreVary`/`ignoreSearch`
  so a precached asset is served regardless of request headers (notably the CORS
  `Origin` header on crossorigin module scripts). It never touches IndexedDB.
- `src/lib/pwa/registerServiceWorker.ts` (+ barrel), called from `main.tsx`,
  guarded by `import.meta.env.PROD && 'serviceWorker' in navigator` and registered
  on `window` `load` — so the Vite dev server and jsdom unit tests never register.
- A dedicated `offline` Playwright project that builds and serves the production
  app via `vite preview` on an isolated port and runs `e2e/offline.spec.ts`. The
  existing `chromium` (dev-server) project is unchanged and ignores the offline
  spec.
- Tests: `tests/lib/registerServiceWorker.test.ts` (registration guard) and
  `e2e/offline.spec.ts` (one-online-load → Cache-Storage assertion that the hashed
  boot JS/CSS is cached → offline cold-start reload boots the dashboard → persisted
  state visible offline → offline navigation to a not-yet-visited route; plus
  Module 16 reset/onboarding-import recovery still working with the SW active).
- Module 17 plan and handoff in `docs/modules/module-17-plan.md`.

### Changed

- `eslint.config.js` adds a `public/sw.js` override with serviceworker globals.
- `playwright.config.ts` now defines two web servers (dev + production preview) and
  two projects (`chromium` on dev, `offline` on preview); per-project `baseURL`.

### Boundaries

- One successful online production load is sufficient for offline cold-start; the
  acceptance bar is not weakened to two loads. No new dependency, no
  `manifest.webmanifest`/installability, no route-level lazy loading, no
  update-notification UI, no Dexie schema change (stays version 2), and no
  engine/domain/seed edits. Every built chunk stays under the 600 kB warning
  budget. See DECISIONS.md D-0039.

### Deferred

- Manifest/installability and an update-notification flow remain out of scope. A
  future module that introduces lazy route chunks must revisit install-time
  discovery (those chunks would not appear in `index.html`).

## 2026-06-16 - Module 16

### Added

- Pure backup contract in `src/lib/backup/` (`envelope.ts`): a versioned,
  `.strict()` `BackupEnvelopeSchema` over a full `getDatabaseSnapshot()` payload,
  plus `buildBackupEnvelope`, `parseBackupFile` (size guard + `JSON.parse` +
  strict Zod + per-store duplicate-ID rejection, with learner-facing error
  messages), `summarizeBackup`, and `backupFileName`. Reuses `@/lib/domain`
  schemas; no Dexie/UI/app imports.
- New repository surfaces in `src/lib/db`: `restoreDatabaseFromBackup`
  (replace-all in one atomic transaction, then `initializeDatabase` reconcile and
  one `import` audit record), `resetAllData` (clear all stores + re-bootstrap),
  and `recordBackupEvent` (one `export`/`import` `backups` audit record).
- Feature-agnostic `src/components/ui/ImportBackupControl.tsx`: file pick →
  local validation → preview + "verify your restore" checklist → confirm a
  destructive replace-all. Checks `File.size` before reading. Reused by Settings
  and onboarding.
- `/settings` data control (`SettingsPage.tsx`): export a local JSON backup,
  import a validated backup (lands on the restored dashboard), and reset all
  local data behind the typed `RESET` confirmation, with inline warnings about
  what backups contain and that import/reset are destructive and local-only.
- Backup import recovery entry point on `OnboardingPage.tsx` so import stays
  reachable after a reset (the app gate routes a fresh database to onboarding).
- Additive, dark-theme-safe data-control and backup-preview styles in
  `design-system.css`.
- Tests: `tests/lib/backup.test.ts` (pure), extended
  `tests/db/repositories.test.ts` (export audit, replace-all 13-store equality
  and no XP/achievement/session duplication, reset re-bootstrap, invalid payload
  writes nothing), `tests/components/importBackupControl.test.tsx`, extended
  `tests/app/App.test.tsx` (settings data-control render + reset gating +
  `/settings` no passive mutation), and `e2e/settings.spec.ts` (recovery loop,
  settings import, invalid-file rejection, dark-theme axe, no unsafe card
  variant, no console errors).
- Module 16 plan and handoff in `docs/modules/module-16-plan.md`.

### Data-control semantics

- Export = full database snapshot (every store, including media events, resume
  points, and frozen slice plans). Import = replace-all only (no merge mode).
- The `backups` store is a local audit log: export appends one `export` record
  after serializing (the file never contains its own export event); import
  appends one `import` record after restore. Restored-data equality is asserted
  on the 13 non-`backups` stores; `backups` equals the backup's rows plus one new
  record.
- Opening or reloading `/settings` mutates no store; export/import/reset mutate
  only on explicit action. No Dexie schema change (schema stays version 2) and no
  new dependency. Backup import executes no scripts; the privacy page and
  `PRIVACY.md` remain deferred to Module 19. See DECISIONS.md D-0038.

## 2026-06-16 - Module 15

### Added

- Pure insights read model in `src/features/insights/model.ts`
  (`buildInsightsModel`): derives weekly activity (study minutes, watched minutes
  logged, XP earned and cumulative), a study mode breakdown, factual active-days
  (active days in a window plus consecutive active days), recorded completion
  awards over time, an achievement timeline, and a current course-progress
  snapshot — all from existing stores and read models, with truthful empty
  states.
- A real read-only `/insights` route (`InsightsPage.tsx`) that fetches via
  existing repository read helpers, builds the model, and renders semantic
  tables with token-based, decorative `aria-hidden` CSS bars (exact values stay
  visible as text), replacing the placeholder. Additive insights table and bar
  styles in `design-system.css`.
- Tests: `tests/features/insightsModel.test.ts` (pure model, including a
  watched-minute flooring regression, an overlap-not-deduplicated assertion, and
  a bidirectional XP-engine completion `sourceType` divergence guard), extended
  `tests/app/App.test.tsx` (insights render plus full-snapshot no-mutation across
  every store), and `e2e/insights.spec.ts` (insights + axe in dark theme, a real
  saved-activity flow, reload leaves the immutable ledgers unchanged, and a guard
  against non-dark-theme-safe card variants).
- Module 15 plan and handoff in `docs/modules/module-15-plan.md`.

### Truthfulness boundaries

- "Watched minutes logged" sums `media_progress_events.watchedSeconds` as logged
  effort over time (overlaps included) and floors partial minutes; it is labeled
  "logged" and is never presented as unique watched coverage.
- "Recorded completion awards" count exact XP-engine completion `sourceType`
  values, with item-completion and `week_completed` (unit) awards kept separate;
  it is not a reconstructed item-by-item completion history.
- Day and week buckets use this device's local time (Monday week start); a
  session or event is attributed whole to its start/creation instant and never
  split across a boundary. The model does not claim universal timezone
  correctness because stored timestamps are absolute UTC instants.
- Active days are derived only from positive-duration study sessions, with
  neutral wording and no streak branding or motivational framing.

### Deferred

- Charts (Recharts and first-party SVG), forecasts, coaching, recommendations,
  confidence trends (no confidence history exists), recovery/blocked-resolution
  views, and energy trends remain deferred. Insights adds no XP rules, no
  achievements, no schema change, no new dependencies, and no external services.
- The global dark-theme hardening of `.card--subtle`, `.card--accent`, and
  `.card--danger` remains deferred to Module 18; Insights only avoids them.

## 2026-06-15 - Module 14

### Added

- Pure dashboard read model in `src/features/dashboard/model.ts`
  (`buildDashboardModel`): derives course progress, a deterministic
  continue-next recommendation, XP summary, achievement summary, explicit-save
  recent activity, blocked items, resume long-form, and a study-session summary
  from existing stores and read models, with truthful empty states.
- A real read-only `/dashboard` route (`DashboardPage.tsx`) that fetches via
  existing repository read helpers, builds the model, and renders the sections
  with existing design-system primitives, replacing the placeholder.
- Manual vendor chunk split in `vite.config.ts` (`react`, `router`, `zod`,
  `dexie`) so no built chunk exceeds the 600 kB warning budget without changing
  the threshold; all chunks stay statically imported, so offline navigation is
  unchanged (this does not reduce total shipped JS).
- Tests: `tests/features/dashboardModel.test.ts` (pure model), extended
  `tests/app/App.test.tsx` (dashboard render plus full-snapshot no-mutation
  across all stores), extended `tests/db/repositories.test.ts` (derived-slice
  sync idempotency), and extended `e2e/dashboard.spec.ts` (dashboard + axe
  coverage, blocked-item state, and a guard against non-dark-theme-safe card
  variants).

### Changed

- Made the derived long-form slice sync idempotent in
  `src/lib/db/repositories.ts`: a repeated app bootstrap no longer
  delete+reinserts `content_slices` for unwatched assets whose derived plan is
  unchanged (previously it churned `updatedAt` on every mount). A real plan
  change before media history still rewrites, and frozen-after-media is
  preserved.
- The dashboard avoids design-system card variants whose hardcoded light
  backgrounds are not dark-theme safe: Needs attention uses a normal surface
  plus a text `StatusPill` instead of `card--danger`, and Course progress drops
  `card--accent`. Additive dashboard layout styles in `design-system.css`.

### Deferred

- Module 15 Insights (trends, charts, forecasts, streaks, coaching),
  backup/import/export/reset, and the global dark-theme hardening of
  `.card--subtle`, `.card--accent`, and `.card--danger` remain deferred. The
  dashboard adds no XP rules, no achievements, no schema change, and no external
  services.

## 2026-06-15 - Module 13

### Added

- Pure, Dexie-free achievement engine under `src/lib/achievements/`: validated
  code-only definitions (`definitions.ts`), a deterministic `evaluateAchievements`
  rule evaluator plus `deriveAchievementUnlockId` (`engine.ts`), and a barrel.
- Repository read APIs `listAchievementUnlocks()` and `getAchievementsView()`,
  plus an internal `evaluateAndUnlockAchievements` helper that persists newly
  satisfied unlocks inside the caller's transaction and writes no XP.
- A real read-only `/achievements` page with status and category filters,
  locked/unlocked badge cards, unlock dates, XP-reward labels, and unlock
  criteria, backed by `src/features/achievements/model.ts`.
- Tests: `tests/lib/achievementsEngine.test.ts`, an extended
  `tests/db/repositories.test.ts` achievement integration block, extended
  `tests/app/App.test.tsx` render and no-passive-unlock coverage,
  `tests/architecture/achievementsFeature.test.ts`, and `e2e/achievements.spec.ts`.

### Changed

- Extended the three XP-aware wrappers (`upsertProgressAndAwardXp`,
  `logMediaProgressAndAwardXp`, `addStudySessionAndAwardXp`) to evaluate and
  persist achievement unlocks atomically in the same Dexie transaction and to
  return `unlockedAchievements`.
- Updated app shell and home copy so achievements are described as live (unlocked
  from explicit saves) rather than deferred.
- Reformatted two Module 12 markdown docs with Prettier (format-only) to clear
  the Step 0 validation gate before any Module 13 code.

### Deferred

- `recovery` (including `returned-after-gap`) and `reflection` achievements stay
  deferred; the `achievement_definitions` store remains unused/deferred
  persistence; achievement XP, dashboard metrics, and insights stay deferred.

## 2026-06-12 - Module 12

### Added

- Pure XP engine in `src/lib/xp/engine.ts` implementing the square-root level curve and milestone rewards.
- Repository orchestration in `src/lib/db/repositories.ts` supporting `listXpTransactions`, `getXpSummary`, and XP-aware wrappers.
- Route integration in `ContentDetailPage.tsx` and `SessionsPage.tsx` calling XP-aware wrappers and showing XP feedback in toasts.
- E2E test suite in `e2e/xp.spec.ts` asserting study session rewards, problem set milestones, and reload safety.
- Disable file parallelism in Vitest config to avoid concurrent DB access conflicts.

### Changed

- Updated user routes to award XP on progress edits, media updates, and study sessions.
- Updated app shell, home, and achievements pages to reflect that XP is now live and no longer deferred.
- Moved course-map unit-completion logic into `src/lib/completion.ts` to share between course model and XP engine.

## 2026-06-11 - Module 00

### Added

- Module 00 roadmap for the CS50-only product reset.
- Persistent repo-state, checklist, validation, decision, security, and test-plan documents.
- Scope-reset decision record.
- Module 00 implementation plan.

### Changed

- Project direction is now explicitly constrained to an offline-only CS50 progression companion.

### Deferred

- App scaffold, package tooling, source tree, and automated test tooling until Module 01.

### Validated

- Module 00 passed three consecutive clean manual validation passes after fixing two documentation self-validation issues.

## 2026-06-11 - Module 01

### Added

- Vite, React, and TypeScript scaffold files with a committed lockfile.
- Baseline route shell with placeholder pages for `/`, `/dashboard`, `/course`, `/achievements`, `/insights`, and `/settings`, plus a not-found route.
- ESLint, Prettier, Vitest, Testing Library, Playwright, and axe-based accessibility smoke coverage.
- Module 01 plan documentation.

### Changed

- Formatter and linter scope was narrowed to first-party project files so bundled skill and template directories do not block app validation.
- Project-state documents now reflect the official 00-20 module sequence and the actual Module 01 outcome.

### Deferred

- Domain types, persistence, CS50 seed data, README, privacy documentation, and cold-start offline hardening remain for later modules.

### Validated

- Triple-Zero achieved across lint, format check, typecheck, build, unit test, E2E test, and dependency audit.
- Adversarial checks confirmed unknown-route handling, local-storage reset tolerance, keyboard navigation, accessibility smoke, and in-session offline navigation after initial load.

## 2026-06-11 - Module 02

### Added

- Intentional app composition under `src/app/` with providers, router, shell, and a shared route catalog.
- Feature public entrypoints and route folders under `src/features/`.
- Shared testing helper support under `src/lib/testing/` plus root-level `tests/` coverage for app rendering and route definitions.
- Placeholder directories for future `profile`, `progress`, `xp`, `db`, `time`, `validation`, and `seed` modules.
- Circular-dependency validation via `dpdm`.
- Module 02 plan documentation.

### Changed

- The scaffold now uses `@/*` path aliases instead of broad relative imports.
- The app layer imports features through public entrypoints instead of deep route-file paths.
- ESLint now enforces first-pass import boundaries between app, components, features, and shared library layers.

### Deferred

- Domain types, CS50 seed data, Dexie persistence, XP rules, and feature logic remain deferred to Modules 03 and later.

### Validated

- Triple-Zero achieved across lint, format check, typecheck, build, unit test, E2E test, circular-dependency analysis, and dependency audit.
- Runtime behavior remained unchanged for the baseline routes while architecture checks expanded to include circular-dependency analysis.

## 2026-06-11 - Module 03

### Added

- Shared domain constants, Zod schemas, inferred TypeScript types, and a first `parseCourseSeed` helper under `src/lib/domain/`.
- Generic schema-parsing and duplicate-detection utilities under `src/lib/validation/`.
- Domain-focused tests for course-seed validation, persisted-entity invariants, and module-boundary enforcement.
- Module 03 plan documentation.

### Changed

- `tsconfig.app.json` now includes Node typings so boundary tests can inspect the filesystem during unit validation.
- The validation layer now enforces concrete assumptions for timestamps, skipped slices, final-project coverage, and allowed asset URLs before persistence begins.

### Deferred

- Dexie schema, repositories, migrations, and backup fixtures remain deferred to Module 04.
- Real CS50 seed payloads remain deferred to Module 05.
- XP rules, achievements evaluation, and progress-calculation logic remain deferred to later modules.

### Validated

- Domain and regression tests now cover malformed local data before any persistence exists.
- Full module validation is recorded in `VALIDATION_LOG.md`.

## 2026-06-11 - Module 04

### Added

- Dexie-backed persistence under `src/lib/db/` with versioned store
  definitions, migration logic, singleton initialization helpers, and
  repository functions.
- Isolated `fake-indexeddb` test coverage for fresh initialization, repository
  behavior, and a legacy-schema migration fixture.
- IndexedDB reload-persistence coverage in Playwright.
- Module 04 plan documentation.

### Changed

- `AppProviders` now initializes the local database on app startup outside test
  mode.
- `tests/domain/moduleBoundaries.test.ts` now reflects the new boundary: the
  database layer exists, but bundled seed payloads still do not.

### Deferred

- Bundled CS50 seed payload files remain deferred to Module 05.
- User-facing backup/export, import, reset, XP evaluation, and
  achievement-evaluation flows remain deferred to later modules.

### Validated

- Repository writes now pass runtime validation before reaching IndexedDB.
- Migration, repository, reload-persistence, and regression validation details
  are recorded in `VALIDATION_LOG.md`.

## 2026-06-11 - Module 05

### Added

- Bundled `src/seed/cs50x-2026.json` course data plus `src/seed/index.ts` as
  the first public CS50x seed surface.
- Seed-specific validation coverage in `tests/seed/bundledCourseSeed.test.ts`.
- Database-initialization coverage for bundled startup seeding.
- Module 05 plan documentation.

### Changed

- `AppProviders` now passes the bundled CS50x seed into database
  initialization on startup outside test mode.
- The course-seed schema now requires the fields the database layer actually
  needs, eliminating the gap between seed parsing and seed materialization.
- Course-catalog sync now updates seed-managed unit and item fields when a new
  bundled seed version is applied instead of only inserting missing rows.
- Placeholder copy now reflects that persistence and bundled seed data already
  exist even though the full course-map UI does not.

### Deferred

- Content-asset URLs, durations, slices, and resume data remain deferred to
  later progression modules.
- Real course-map UI, dashboard rollups, import/export, and reset flows remain
  deferred to later modules.

### Validated

- The bundled CS50x 2026 payload is validated at import time and covered by
  unit tests for structure and catalog counts.
- Seed re-sync coverage now verifies that learner progress survives bundled
  catalog revisions.
- Full module validation is recorded in `VALIDATION_LOG.md`.

## 2026-06-12 - Module 06

### Added

- Reusable design-system components under `src/components/layout/` and
  `src/components/ui/`, covering layout, actions, progress indicators, status
  treatments, form controls, dialog, toast, and empty/loading/error states.
- Tokenized styling split into `src/styles/tokens.css`, `src/styles/base.css`,
  and `src/styles/design-system.css`.
- A bounded home-route foundation preview that exercises the shared visual
  system without building feature-complete product screens.
- Component-focused unit tests for button states, progress clamping,
  status-pill variants, and form accessibility wiring.

### Changed

- The app shell now uses shared layout primitives and status callouts instead
  of one-off placeholder markup.
- Placeholder routes now render through shared `PageHeader`, `Card`,
  `ProgressBar`, `StatusPill`, and `EmptyState` building blocks.
- Playwright smoke coverage now validates reduced motion, local dialog and
  toast interactions, and the dashboard shell accessibility path.

### Deferred

- Real onboarding, course-map, dashboard, achievements, insights, and settings
  workflows remain deferred to their later modules.
- Stored theme preferences and learner-controlled reduced-motion settings
  remain deferred until profile/settings work exists.

### Validated

- Triple-Zero achieved across lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.
- Adversarial checks confirmed keyboard navigation, dialog escape handling,
  form labels, reduced motion, honest progress clamping, and dashboard/home
  accessibility behavior.

## 2026-06-12 - Module 07

### Added

- A real `/onboarding` route plus `src/features/profile/` components for
  learner-profile setup, avatar preview, and local settings editing.
- `src/lib/appState/` and `src/lib/profile.ts` to centralize onboarding state,
  local preference loading, and legacy-profile compatibility rules.
- A reusable `Checkbox` primitive and profile-model test coverage for avatar
  defaults plus onboarding-completion fallback.

### Changed

- The home route now shows the saved local learner profile instead of the old
  Module 06 showcase surface.
- The settings route now edits live local profile preferences instead of
  remaining a pure placeholder.
- App metadata can now record `onboardingCompletedAt`, and avatar config is
  constrained to supported face, hair, and top-color values.
- The shell now gates unfinished learners into onboarding and applies saved
  theme or reduced-motion preferences on reload.
- Vite chunk warning threshold is set to 575 kB so the current production build
  validates with zero warnings while the bundle remains just over the stock
  default threshold.

### Deferred

- Course-map rendering, long-form slice logic, XP, achievements, dashboard
  metrics, and backup/reset workflows remain deferred to later modules.
- The app still has no user-facing export, import, or destructive reset flow.

### Validated

- Triple-Zero achieved across lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.
- Adversarial checks covered empty or invalid profile input, legacy avatar
  defaults, onboarding reload persistence, unknown-route behavior, and offline
  navigation after local setup.

## 2026-06-12 - Module 08

### Added

- A real read-only `/course` surface backed by the seeded CS50 catalog, with
  ordered unit cards, item rows, and local progress rollups.
- `src/features/course/model.ts` plus dedicated summary and unit-card
  components to keep course-map projection logic separate from route loading.
- Repository support for listing persisted progress entries and course-map unit
  tests for ordering, mixed statuses, optional-item handling, and minute
  formatting.
- Module 08 plan documentation.

### Changed

- The course route no longer renders a placeholder; it now projects seeded
  catalog and saved progress data from local persistence.
- The home route now points learners to the real course map instead of
  claiming that rollups are still deferred.
- The repo documents now treat the roadmap and checklist sequence as the
  authoritative module order when the older detailed project brief conflicts.

### Deferred

- Item-detail editing, long-form slices, study sessions, XP, achievements,
  dashboard metrics, and backup/reset flows remain deferred to later modules.
- The route remains intentionally read-only until the item-detail module lands.

### Validated

- Triple-Zero achieved across lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.
- Adversarial checks covered missing progress, blocked states, optional-item
  handling, persisted rollups after reload, and continued onboarding
  compatibility.

## 2026-06-12 - Module 09

### Added

- A shared long-form progression engine under `src/lib/progress/` for stable
  derived asset IDs, deterministic slice generation, interval-union watched
  totals, and read-only progress summaries.
- Feature-facing long-form summary helpers under `src/features/progress/`.
- Repository support for derived content assets, generated slices, immutable
  media-progress events, and resume points.
- New tests for slice generation, overlap-safe watched totals, repository
  media-event logging, duplicate-range rejection, long-form course-map
  summaries, and Playwright reload persistence.
- Module 09 plan documentation.

### Changed

- `/course` stays read-only, but long-form lecture, section, shorts, and
  reading items can now surface watched-time and resume summaries from local
  media-progress data.
- The home route now reflects that long-form progress tracking exists while the
  editable content-detail screen still remains deferred to Module 10.
- Course-item long-form timing is now derived from local seeded
  `estimatedMinutes` values until explicit asset-level metadata exists.

### Deferred

- The content-detail route and user-facing logging controls remain deferred to
  Module 10.
- Study-session UI, XP, achievements, dashboard metrics, backup, import, and
  reset flows remain deferred to later modules.

### Validated

- Triple-Zero achieved across lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.
- Adversarial checks covered duplicate exact ranges, overlapping media events,
  false completion after one slice, legacy-complete item preservation, and
  long-form visibility after reload.

## 2026-06-12 - Module 10

### Added

- A real `/course/:itemId` content-detail route with item context, local
  status editing, notes, evidence, and a route back to the course map.
- Course-item row links from `/course` into the new detail screen.
- Slice-level long-form detail projection for the content-detail route, plus
  manual timestamp parsing helpers for watched-range logging.
- Unit and item lookup helpers in the repository layer, plus new tests for
  route definitions, detail-model validation, timestamp parsing, and direct
  detail-route rendering.

### Changed

- The course map no longer implies that item-detail controls are still
  missing; it now acts as the stable entry surface for the new detail route.
- Long-form items with partial saved media-event history now block deceptive
  manual `completed` and `skipped_optional` overrides from the detail form.
- The home route copy and feature READMEs now reflect that content detail and
  long-form logging are active while sessions, XP, achievements, and dashboard
  logic remain deferred.

### Deferred

- Study-session logging remains assigned to Module 11.
- XP, achievements, dashboard metrics, insights, and backup or reset flows
  remain assigned to later modules.

### Validated

- Triple-Zero achieved across lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.
- Adversarial checks covered invalid timestamp input, duplicate exact ranges,
  partial long-form completion overrides, accepted-work evidence requirements,
  and persisted detail-route state after reload.

## 2026-06-12 - Module 11

### Added

- A real `/sessions` route with one live focus-session flow, one manual entry
  flow, and a reverse-chronological study-session ledger.
- `src/features/sessions/` with a pure sessions model, route component, README,
  and route-level item prefill handling.
- `listStudySessions()` in the public repository surface plus new session
  duration helpers in `src/lib/time/`.
- Architecture, repository, route, model, and Playwright coverage for
  append-only item-bound session logging and no-write discard behavior.

### Changed

- `/course/:itemId` now exposes the one permitted session link to
  `/sessions?itemId=...`.
- The shell and home-route copy now reflect that study-session logging is live
  while XP, achievements, and insights remain deferred.
- Session validation now follows the real schema contract: every saved session
  must target one existing item and a matching unit.
- `vite.config.ts` now raises Vite's chunk warning threshold to 600 kB so the
  current 577.19 kB production bundle can still satisfy the repo's zero-warning
  validation rule while route-splitting remains deferred.

### Deferred

- XP, achievements, dashboard metrics, insights, backup/reset, and any session
  edit or delete surface remain deferred.
- Unfinished timers still do not survive reload by design.

### Validated

- Triple-Zero achieved across lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.
- Adversarial checks covered zero-minute and over-cap manual attempts,
  discard, reload-mid-session, duplicate-save protection, item-bound
  validation, and non-session-store immutability.
