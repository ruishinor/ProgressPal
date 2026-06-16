# Test Plan

## Module 00 Scope

- Validation is document-only.
- No unit, integration, end-to-end, accessibility, build, or dependency-audit tooling exists yet by design.
- Triple-Zero for Module 00 means three consecutive clean manual review passes with zero errors, zero warnings, and zero unresolved scope contradictions.

## Module 00 Validation Protocol

### Pass checks

- Confirm all required Module 00 files exist.
- Confirm no unresolved placeholder markers remain.
- Confirm removed features are explicitly listed.
- Confirm retained MVP features are explicitly listed.
- Confirm the natural endpoint is stated as offline CS50 MVP.
- Confirm no Module 00 document reintroduces cloud, social, or external API dependence.
- Confirm the product can be explained in one sentence.
- Confirm no app scaffold files were created.

### Commands for Module 00

```powershell
rg -n "(?i)todo|tbd|fixme|xxx" ROADMAP.md PROJECT_STATE.md MODULE_CHECKLIST.md VALIDATION_LOG.md CHANGELOG.md SECURITY.md DECISIONS.md docs
rg -n "leaderbo[a]rd" ROADMAP.md PROJECT_STATE.md MODULE_CHECKLIST.md VALIDATION_LOG.md CHANGELOG.md SECURITY.md DECISIONS.md TEST_PLAN.md docs
rg -n "cloud|social|external APIs?|analytics|authentication" ROADMAP.md docs/decisions/000-scope-reset.md DECISIONS.md SECURITY.md
Get-ChildItem -Recurse | Select-Object FullName
```

## Module 01 Scope

- Validation covers the scaffold, route shell, installed dependencies, and first smoke tests.
- Triple-Zero for Module 01 means three consecutive clean runs of the full Module 01 suite with zero errors, zero warnings, and zero audit findings at the configured threshold.

## Module 01 Validation Protocol

### Pass checks

- Confirm `package.json`, `package-lock.json`, Vite/TypeScript/ESLint/Prettier/Playwright configs, `src/`, and `e2e/` exist.
- Confirm the baseline routes render placeholders for `/`, `/dashboard`, `/course`, `/achievements`, `/insights`, and `/settings`.
- Confirm unknown routes show a not-found page.
- Confirm the app shell has keyboard-reachable navigation and a skip link.
- Confirm the dashboard placeholder loads without console warnings or accessibility violations.
- Confirm clearing local storage does not break reload.
- Confirm already-loaded client-side navigation still works after the browser context goes offline.
- Confirm no Module 02+ domain logic, persistence, or seed data has been introduced.

### Commands for Module 01

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm audit --audit-level=moderate
```

### Setup note

- If Playwright browsers are missing, run `npx playwright install chromium` before `npm run test:e2e`.

## Module 02 Scope

- Validation covers folder structure, alias imports, route composition, boundary enforcement, and circular-dependency analysis.
- Triple-Zero for Module 02 means three consecutive clean runs of the full suite with zero errors, zero warnings, and zero audit findings.

## Module 02 Validation Protocol

### Pass checks

- Confirm `src/app`, `src/components`, `src/features`, `src/lib`, `src/seed`, and `tests` exist with the planned subfolders.
- Confirm baseline routes still render placeholders for `/`, `/dashboard`, `/course`, `/achievements`, `/insights`, and `/settings`.
- Confirm the route catalog and primary navigation stay aligned.
- Confirm the app layer imports features through public entrypoints instead of deep feature file paths.
- Confirm shared components and shared library code do not depend on app composition or routed features, except the dedicated testing helper layer.
- Confirm no circular dependencies are present.
- Confirm no Module 03+ domain logic, seed payloads, or persistence implementation has been introduced.

### Commands for Module 02

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 03 Scope

- Validation covers shared domain types, constants, runtime schemas, and module-boundary enforcement that keeps persistence and seed payloads deferred.
- Triple-Zero for Module 03 means three consecutive clean runs of the full suite with zero errors, zero warnings, and zero audit findings.

## Module 03 Validation Protocol

### Pass checks

- Confirm `src/lib/domain` exports the domain constants, schemas, and inferred types through a public entrypoint.
- Confirm runtime parsing rejects duplicate unit IDs, duplicate item IDs, invalid item types, missing final-project coverage, and all-optional course seeds.
- Confirm persisted-entity schemas reject malformed long-form assets, invalid URLs, invalid slice transitions, invalid media-event ranges, duplicate study days, and reversed study-session timestamps.
- Confirm `src/lib/db` remains placeholder-only and `src/seed` still contains no payload files.
- Confirm the baseline routes and existing E2E smoke coverage still pass unchanged.

### Commands for Module 03

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 04 Scope

- Validation covers the Dexie persistence layer, singleton initialization,
  repository behavior, migration safety, and the boundary that still keeps
  bundled seed payloads deferred.
- Triple-Zero for Module 04 means three consecutive clean runs of the full
  suite with zero errors, zero warnings, and zero audit findings.

## Module 04 Validation Protocol

### Pass checks

- Confirm `src/lib/db` exposes the versioned Dexie schema, migration logic,
  initialization helpers, and repository functions through
  `src/lib/db/index.ts`.
- Confirm fresh database initialization creates one `app_meta` record and one
  `learner_profile` record with valid runtime shape.
- Confirm interrupted initialization is repaired without duplicating singleton
  records.
- Confirm course-catalog sync inserts missing units and items idempotently
  without duplicating IDs or overwriting existing rows.
- Confirm repository functions reject invalid learner-profile and progress
  writes.
- Confirm the legacy version-one fixture migrates to the current schema without
  losing course, progress, or study-session records.
- Confirm `src/seed` still contains no bundled payload files beyond its
  placeholder README.
- Confirm the baseline routes, existing dashboard accessibility checks, and the
  new IndexedDB reload-persistence E2E coverage all pass.

### Commands for Module 04

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 05 Scope

- Validation covers the bundled CS50x seed payload, startup seeding,
  non-destructive seed re-sync behavior, and the new `src/seed` boundary.
- Triple-Zero for Module 05 means three consecutive clean runs of the full
  suite with zero errors, zero warnings, and zero audit findings.

## Module 05 Validation Protocol

### Pass checks

- Confirm `src/seed/index.ts` exposes the bundled course seed through one
  public entrypoint and that the payload validates successfully at import time.
- Confirm the bundled payload includes the expected week, AI, additional
  practice, and final-project units with stable IDs and explicit ordering.
- Confirm the course-seed schema rejects payloads that omit database-required
  fields such as `sourceYear`, `required`, `estimatedMinutes`, or `order`.
- Confirm fresh database initialization with the bundled seed creates singleton
  records, seeds the expected unit and item counts, and records the bundled
  `seedVersion`.
- Confirm re-syncing a newer seed version updates seed-managed course catalog
  rows without duplicating records or mutating learner progress.
- Confirm `src/seed` contains only the README, bundled payload, and public
  entrypoint.
- Confirm the baseline routes, existing dashboard accessibility checks, and the
  updated IndexedDB startup-seeding E2E coverage all pass.

### Commands for Module 05

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 06 Scope

- Validation covers the reusable UI foundation: shell layout, component
  primitives, tokenized styling, form accessibility wiring, progress honesty,
  restrained motion, and placeholder-route integration.
- Triple-Zero for Module 06 means three consecutive clean runs of the full
  suite with zero errors, zero warnings, zero accessibility violations in the
  tested flows, and zero dependency-audit findings.

## Module 06 Validation Protocol

### Pass checks

- Confirm `src/components/layout/AppShell.tsx` and the required
  `src/components/ui/` primitives exist with explicit TypeScript props.
- Confirm `src/styles/` now exposes token, base, and design-system layers
  instead of route-specific placeholder-only CSS.
- Confirm `/` acts as a bounded foundation preview rather than a fake product
  screen.
- Confirm `/dashboard`, `/course`, `/achievements`, `/insights`, and
  `/settings` still render truthful placeholders through the shared primitives.
- Confirm buttons expose readable disabled and loading states.
- Confirm progress bars clamp invalid values and do not overstate completion.
- Confirm form controls have labels, descriptions, and invalid-state wiring.
- Confirm keyboard navigation, dialog escape handling, local toast rendering,
  and reduced-motion behavior pass in Playwright.
- Confirm no Module 07+ workflow logic, backend integration, or persistence
  schema changes were introduced.

### Commands for Module 06

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 07 Scope

- Validation covers first-run routing, learner-profile persistence, avatar
  config validation, local theme and reduced-motion application, settings
  editing, and legacy-profile compatibility.
- Triple-Zero for Module 07 means three consecutive clean runs of the full
  suite with zero errors, zero warnings, zero accessibility violations in the
  tested flows, and zero dependency-audit findings.

## Module 07 Validation Protocol

### Pass checks

- Confirm `/onboarding` exists and redirects unfinished learners there from
  other routes.
- Confirm the learner can save display name, avatar config, study days, weekly
  target, theme, and reduced-motion preferences locally.
- Confirm onboarding completion is tracked through `app_meta` rather than only
  through learner-profile existence.
- Confirm saved theme and reduced-motion preferences apply again after reload.
- Confirm the settings route edits the same local profile without creating a
  second learner record.
- Confirm legacy default-profile records still open onboarding, while
  customized legacy profiles can be treated as complete safely.
- Confirm unknown routes and offline route traversal still work after
  onboarding completes.
- Confirm no Module 08+ course, progress-engine, XP, achievement, or
  backup/reset logic was introduced.

### Commands for Module 07

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 08 Scope

- Validation covers seeded course-map rendering, ordered unit and item
  presentation, progress rollups, read-only route discipline, and onboarding
  compatibility.
- Triple-Zero for Module 08 means three consecutive clean runs of the full
  suite with zero errors, zero warnings, zero accessibility violations in the
  tested flows, and zero dependency-audit findings.

## Module 08 Validation Protocol

### Pass checks

- Confirm `/course` renders the seeded units and items in stable order after
  onboarding.
- Confirm course and unit rollups treat missing progress as not started, never
  inflate required completion with optional items, and surface blocked status
  clearly.
- Confirm completed, submitted, and accepted required-item states count toward
  required completion.
- Confirm the route stays read-only and introduces no item-detail, slice,
  session, XP, achievement, dashboard-metric, or backup/reset logic.
- Confirm the home route no longer claims the course map is still deferred.
- Confirm app-route and Playwright coverage verify persisted course-map
  rollups after reload.
- Confirm onboarding gating and the rest of the baseline routes still behave
  correctly.

### Commands for Module 08

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 09 Scope

- Validation covers derived long-form assets and slices, immutable
  media-progress logging, interval-union watched-time rollups, resume points,
  read-only course-map long-form summaries, and backwards-compatible handling
  of pre-existing completed item progress.
- Triple-Zero for Module 09 means three consecutive clean runs of the full
  suite with zero errors, zero warnings, zero accessibility violations in the
  tested flows, and zero dependency-audit findings.

## Module 09 Validation Protocol

### Pass checks

- Confirm eligible seeded lecture, section, shorts, and reading items derive
  stable local `content_assets` and deterministic `content_slices`.
- Confirm slice generation rejects zero and negative durations and produces the
  expected tail slice for uneven totals.
- Confirm exact duplicate media-event ranges for the same asset are rejected.
- Confirm watched totals use interval union rather than naive range addition.
- Confirm logging one slice does not falsely complete the parent course item.
- Confirm completing every generated slice can resolve the parent item to
  `completed`.
- Confirm binary-only completed item progress still appears complete when no
  slice events exist yet.
- Confirm `/course` remains read-only while surfacing watched-time and resume
  summaries for persisted long-form progress.
- Confirm onboarding gating and the rest of the baseline routes still behave
  correctly.

### Commands for Module 09

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 10 Scope

- Validation covers the content-detail route, item-level local save controls,
  manual watched-range logging, timestamp parsing, long-form slice detail
  projection, and the course-map links into the new detail screen.
- Triple-Zero for Module 10 means three consecutive clean runs of the full
  suite with zero errors, zero warnings, zero accessibility violations in the
  tested flows, and zero dependency-audit findings.

## Module 10 Validation Protocol

### Pass checks

- Confirm `/course/:itemId` exists and can be opened from the seeded course-map
  rows after onboarding.
- Confirm the detail route shows unit context, item metadata, current saved
  status, notes, evidence, and a route back to `/course`.
- Confirm non-long-form items can save allowed local progress states without
  introducing session, XP, achievement, or dashboard logic.
- Confirm long-form items show slice-level detail, watched summaries, and a
  working watched-range logging form backed by the existing immutable media
  event surface.
- Confirm manual timestamp input rejects malformed `m:ss` and `h:mm:ss`
  values, reversed ranges, duplicate exact ranges, and ranges beyond the saved
  asset duration.
- Confirm partial saved long-form media history cannot be manually overridden
  to `completed` or `skipped_optional` from the detail form.
- Confirm persisted detail-route changes still appear after reload on both the
  detail route and the `/course` map.
- Confirm onboarding gating and the rest of the baseline routes still behave
  correctly.

### Commands for Module 10

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 11 Scope

- Validation covers the `/sessions` route, item-bound live and manual
  study-session logging, append-only ledger behavior, discard and
  reload-mid-session absence, and the guarantee that non-session stores remain
  unchanged.
- Triple-Zero for Module 11 means three consecutive clean runs of the full
  suite with zero errors, zero warnings, zero accessibility violations in the
  tested flows, and zero dependency-audit findings.

## Module 11 Validation Protocol

### Pass checks

- Confirm `/sessions` exists in the central route catalog and primary
  navigation.
- Confirm a live session can start, pause, resume, finish, and save exactly
  one row once active time reaches at least 60 seconds.
- Confirm live-session discard and reload-mid-session write nothing.
- Confirm manual entry rejects missing mode, missing item, missing unit,
  unknown item, item-unit mismatch, future start, zero minutes, and durations
  above 720.
- Confirm every saved session references one existing item and the matching
  unit because the current schema requires both fields.
- Confirm `/course/:itemId` exposes only the one permitted link into the
  sessions route.
- Confirm session saves do not mutate `progress_entries`,
  `media_progress_events`, `content_slices`, `resume_points`,
  `xp_transactions`, `achievement_unlocks`, or `backups`.
- Confirm the Dexie schema remains at version 2 and the migration fixture
  still passes unchanged.

### Commands for Module 11

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 12 Scope

- Validation covers the XP Engine math, repository read helpers, XP-aware database wrappers, route integration, E2E tests, and the guarantee that level/XP totals are derived on-the-fly and never persisted.
- Triple-Zero for Module 12 means three consecutive clean runs of the full suite with zero errors, zero warnings, zero accessibility violations in the tested flows, and zero dependency-audit findings.

## Module 12 Validation Protocol

### Pass checks

- Confirm the XP Engine correctly computes the square-root level curve `level = Math.floor(Math.sqrt(totalXp / 100)) + 1` and `xpToNextLevel` at boundaries (0, 99, 100, 399, 400, 900, 1600).
- Confirm XP level math guarantees monotonicity over a broad range of values.
- Confirm transaction IDs are derived deterministically and prevent collisions/duplicates.
- Confirm XP transaction ledger is immutable, and level is never stored in Dexie.
- Confirm progress milestone awards (started, submitted, accepted) and long-form media focus/slice completions award XP correctly.
- Confirm study session saves of >=25 minutes award +10 XP.
- Confirm the Dexie schema remains at version 2.
- Confirm reloading the app does not duplicate XP or cause additional transactions.

### Commands for Module 12

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 13 Scope

- Validation covers the pure achievement engine and its rule types, code-only
  definition validation, deterministic and idempotent unlock persistence, the
  guarantee that evaluation runs only on explicit saves and writes no XP, the
  read-only `/achievements` page, and the deferral of recovery and reflection
  achievements.
- Triple-Zero for Module 13 means three consecutive clean runs of the full suite
  with zero errors, zero warnings, zero accessibility violations in the tested
  flows, and zero dependency-audit findings.

## Module 13 Validation Protocol

### Pass checks

- Confirm `src/lib/achievements` exposes validated code-only definitions and a
  pure `evaluateAchievements` engine with no Dexie or database import.
- Confirm each rule type unlocks only when its criteria are met and produces a
  deterministic `triggerSourceId` and a stable `unlock-<achievementId>` id.
- Confirm an explicit save unlocks the expected achievement exactly once and
  that re-saving or reloading never duplicates the unlock.
- Confirm achievement evaluation writes zero `xp_transactions` and mutates no
  source-of-truth store.
- Confirm reads (`listAchievementUnlocks`, `getAchievementsView`, and opening
  `/achievements`) never create unlocks.
- Confirm an explicit save unlocks achievements already satisfied by accumulated
  history, while a passive read never does.
- Confirm the `/achievements` page lists locked and unlocked achievements from
  code definitions plus persisted unlocks, using text labels and not color
  alone, and stays read-only.
- Confirm every achievement shows `0 XP`, and recovery and reflection
  achievements remain absent (deferred).
- Confirm the Dexie schema stays at version 2 and the migration fixture still
  passes unchanged.

### Commands for Module 13

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 14 Scope

- Validation covers the pure dashboard model and its derived sections, the
  read-only `/dashboard` route, the guarantee that opening or reloading the
  dashboard mutates no store and awards no XP and unlocks no achievement, the
  manual vendor chunk split that keeps every built chunk under the 600 kB
  warning budget, the idempotent derived-slice sync, and the dashboard's
  accessibility in its normal and blocked-item states.
- Triple-Zero for Module 14 means three consecutive clean runs of the full suite
  with zero errors, zero warnings, zero accessibility violations in the tested
  dashboard flows, and zero dependency-audit findings.

## Module 14 Validation Protocol

### Pass checks

- Confirm `src/features/dashboard/model.ts` is a pure builder with no Dexie or
  IO and derives every value from existing stores and read models.
- Confirm `/dashboard` renders all sections after onboarding with truthful empty
  states for a fresh learner.
- Confirm full-store equality before and after dashboard render and reload
  across `xp_transactions`, `achievement_unlocks`, `progress_entries`,
  `study_sessions`, `media_progress_events`, `content_assets`, `content_slices`,
  `resume_points`, `learner_profile`, `app_meta`, `course_units`, and
  `course_items`.
- Confirm dashboard reads award no XP and unlock no achievements.
- Confirm a repeated app bootstrap leaves unchanged derived `content_slices`
  byte-for-byte (idempotent sync), while a real seed-plan change still rewrites.
- Confirm the dashboard is accessible (axe) in the normal and blocked-item
  states and renders no `.card--accent`, `.card--danger`, or `.state-card`
  surface.
- Confirm the production build keeps every chunk under 600 kB without raising
  the warning threshold.
- Confirm the Dexie schema stays at version 2 and the migration fixture passes
  unchanged.

### Commands for Module 14

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 15 Scope

- Validation covers the pure insights model and its derived sections, the
  read-only `/insights` route, the guarantee that opening or reloading insights
  mutates no store and awards no XP and unlocks no achievement, the local
  day/week bucketing rules, the honest watched-minutes-logged and
  completion-award semantics, and the insights surface's accessibility in dark
  theme.
- Triple-Zero for Module 15 means three consecutive clean runs of the full suite
  with zero errors, zero warnings, zero accessibility violations in the tested
  insights flow, and zero dependency-audit findings.

## Module 15 Validation Protocol

### Pass checks

- Confirm `src/features/insights/model.ts` is a pure builder with no Dexie or IO
  and derives every value from existing stores and read models.
- Confirm `/insights` renders all sections after onboarding with truthful empty
  states for a fresh learner.
- Confirm full-snapshot equality before and after insights render and reload
  across every store returned by `getDatabaseSnapshot()`.
- Confirm "watched minutes logged" sums `media_progress_events.watchedSeconds`
  (overlaps included), floors partial minutes (a 90-second week is 1 minute, not
  2), and is never presented as unique coverage.
- Confirm sessions and media events are attributed whole to the local day/week of
  their `startedAt` / `createdAt` and are never split across a boundary, and that
  active days derive only from positive-duration study sessions.
- Confirm recorded completion awards count exact XP-engine `sourceType` values
  with item-completion and `week_completed` (unit) awards separated, and that the
  divergence guard fails loudly if the engine and the model classification
  disagree.
- Confirm the insights surface is accessible (axe) in dark theme and renders no
  `.card--accent`, `.card--subtle`, `.card--danger`, or `.state-card` surface.
- Confirm the production build keeps every chunk under 600 kB without raising the
  warning threshold, with no new dependency imported.
- Confirm the Dexie schema stays at version 2 and the migration fixture passes
  unchanged.

### Commands for Module 15

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Module 16 Scope

- Validation covers the pure backup envelope (build, parse, validate, summarize)
  and its rejections, the new replace-all restore / reset / audit repository
  surfaces, the shared import control, the `/settings` data-control UI, the
  onboarding recovery entry point, and the real export → reset → onboarding →
  import recovery loop.
- Triple-Zero for Module 16 means three consecutive clean runs of the full suite
  with zero errors, zero warnings, zero accessibility violations on the tested
  data-control/reset surface, and zero dependency-audit findings.

## Module 16 Validation Protocol

### Pass checks

- Confirm `src/lib/backup/envelope.ts` is pure (no Dexie/UI/app imports) and that
  `parseBackupFile` rejects malformed JSON, oversized input, wrong format/format
  version, mismatched schema version, unknown top-level and nested fields,
  malformed rows, and per-store duplicate IDs, while allowing the same id across
  unrelated stores.
- Confirm export serializes the full snapshot first, then appends exactly one
  `export` audit record and mutates no non-`backups` store.
- Confirm replace-all restore yields equality on the 13 non-`backups` stores
  against the backup data, with `backups` equal to the backup's rows plus exactly
  one `import` record, and that it does not duplicate XP, achievements, or
  sessions.
- Confirm an invalid restore payload writes nothing (validation before any
  mutation) and that reset clears every store, including `backups`, then
  re-bootstraps a fresh default profile and seeded catalog.
- Confirm opening or reloading `/settings` mutates no store, and that reset is
  gated by the exact typed `RESET` phrase.
- Confirm backup import stays reachable on the onboarding screen after a reset and
  that the full recovery loop restores state that persists across a reload.
- Confirm the data-control/reset surface is accessible (axe) in dark theme,
  renders no `.card--accent`, `.card--subtle`, `.card--danger`, or `.state-card`
  surface, and that an injected `<script>` note never executes (no dialog).
- Confirm the Dexie schema stays at version 2, no new dependency is imported, and
  every chunk stays under the 600 kB warning budget.

### Commands for Module 16

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm audit --audit-level=moderate
```

## Future Validation Strategy

### Module 02 and later

- Expand package scripts and checks as features arrive.
- Run three consecutive clean validation passes for each completed module.

### Validation layers to enforce once scaffolded

- Static validation: lint, formatting, typecheck, build.
- Unit validation: domain logic, persistence helpers, XP rules, achievement rules.
- Integration validation: migrations, import/export, resume logic, duplicate-prevention logic.
- End-to-end validation: onboarding, progress logging, long-form slice flow, dashboard updates, backup and restore, offline flow.
- Accessibility validation: keyboard navigation, labels, landmarks, motion reduction, contrast-sensitive flows.
- Security validation: dependency audit, remote-call checks, safe rendering checks, malicious import handling.

## Required High-Value Scenario

- Fresh user creates a profile.
- Week 0 lecture is set to 120 minutes.
- User logs 0:00 to 20:00 with stop reason `reached_limit`.
- App records 20 / 120 minutes, about 16.7 percent progress, a 20:00 resume point, partial XP, and no false full completion.
- Data survives reload and offline mode.
