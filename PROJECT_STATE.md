# Project State

Current module: Module 15 - Insights (complete)
Last completed module: Module 15 - Insights (complete)
Current branch: master
Last committed module: Module 14 - Dashboard (commit e2e4b8e). The Module 15
working tree is implemented and validated but not yet committed; it passed three
consecutive clean `npm run validate` runs.
Schema version: Dexie persistence schema version 2 with a legacy version-1
migration fixture
Seed data version: bundled CS50x 2026 payload loaded at startup with
`dataVersion` 20260611 and `sourceCheckedDate` 2026-06-11

Known blockers:

- None.

Known risks:

- Git is now initialized (branch `master`); branch and commit traceability are
  available, so Module 14 can be committed per phase.
- The project brief remains internally inconsistent about both module numbering
  and field details. The repo sequence treats Module 07 as onboarding/profile
  and Module 08 as course map even though the older detailed brief still
  numbers different work as Modules 07 and 08.
- README.md and PRIVACY.md are still absent and remain deferred until later
  modules.
- Full cold-start offline behavior is not implemented yet. Module 01 verified
  only in-session offline navigation after the app had already loaded.
- Bundled `estimatedMinutes` values remain local planning estimates, not
  official CS50 durations. Module 09 now derives long-form asset timing from
  those estimates, so watched-time percentages are only as strong as the local
  planning data behind them.
- The TypeScript alias configuration currently relies on
  `ignoreDeprecations: "6.0"` because the compiler still requires `baseUrl` for
  the chosen path-mapping style. Revisit before TypeScript 7.
- Local IndexedDB now persists user profile, notes, and progress data on-device
  with no encryption or export/reset UI yet. Device compromise and unsafe local
  tampering are now concrete risks rather than future-only concerns.
- Onboarding completion now depends on `app_meta.onboardingCompletedAt`, with a
  fallback that treats non-default legacy profiles as complete. Future profile
  migrations must preserve both the explicit metadata stamp and the default
  bootstrap comparison rules.
- Seed sync now updates seed-managed `course_units` and `course_items` in place
  when the bundled catalog changes, but it does not delete rows removed from a
  future seed revision. Catalog removals still require a deliberate migration
  strategy.
- Module 09 derives exactly one local primary long-form asset for each eligible
  long-form course item because the seed still lacks explicit asset-level
  metadata. Later modules may need to replace that derivation with real asset
  data carefully.
- Once a long-form asset has saved media events, its generated slice plan is
  intentionally frozen. Later seed-estimate edits will still update the parent
  `course_items` row, so planned item minutes and slice counts can diverge for
  already-started material.
- Module 14 Phase 3b made the derived long-form slice sync idempotent: a
  repeated app bootstrap no longer churns `content_slices.updatedAt` for
  unwatched assets whose derived plan is unchanged (previously every mount
  delete+reinserted those rows). A semantic slice-plan change before any media
  history still rewrites intentionally, and the frozen-after-media rule is
  preserved. This is what lets the Module 14 dashboard no-mutation test assert
  strict full-store equality across render and reload.
- The Vite chunk warning threshold stays at 600 kB. Module 14 exposed that the
  app had been shipping as a single eager JS chunk just under that budget, so
  wiring the dashboard pushed it to ~611 kB. Module 14 Phase 2b split stable
  third-party deps into manual vendor chunks (`react`, `router`, `zod`, `dexie`,
  `vendor`) so no chunk exceeds 600 kB; the largest is now `react` at ~190 kB.
  This did not reduce total shipped JS (~611 kB minified across chunks); it
  resolved the per-chunk warning and improved cache separation. See
  DECISIONS.md D-0036. True initial-load reduction (route-level lazy loading)
  remains deferred pending an offline-safe route-prefetch strategy, because lazy
  route chunks fetched on navigation could break in-session offline navigation.
- Dark-theme overrides are still missing for `.card--subtle`, `.card--accent`,
  and `.card--danger` (their backgrounds are hardcoded light values). Module 14
  avoided the failing nested `EmptyState` (`.state-card`) combination by using a
  plain `card__description` paragraph for the dashboard empty states, but the
  broader design-system contrast issue (e.g. a `.card--danger` card or a
  standalone `EmptyState` in dark theme) remains deferred to Module 18
  (accessibility and UX hardening). Module 15 insights likewise avoids those
  variants (plain cards, semantic tables, token CSS bars). Do not broaden this
  fix inside Module 15 unless it becomes necessary.
- The content-detail route now accepts manual `m:ss` and `h:mm:ss` timestamp
  input for long-form logging. Invalid ranges are rejected, but the product
  still lacks later backup or repair flows if a learner enters low-quality
  notes or misleading manual status text.
- Item-level editing is now live for status, confidence, notes, and evidence,
  but there is still no delete, undo history, or session-level audit UI. Later
  modules need to preserve traceability without turning this into a destructive
  reset surface.
- Long-form items with partial saved media history now block manual
  `completed` or `skipped_optional` overrides from the detail route. That keeps
  watched-time claims honest, but it also means some historical inconsistent
  data would need deliberate repair rather than a casual UI toggle.
- Study sessions now persist local effort notes and blockers, but they remain
  append-only with no edit, delete, or user-facing repair flow yet.
- Unfinished live sessions are deliberately represented by absence. Reloading
  or closing a running timer loses the in-memory draft instead of writing a
  phantom row.
- The current `StudySessionSchema` requires both `unitId` and `itemId`, so
  Module 11 cannot support general-study or unit-only saved sessions without a
  later deliberate schema change.

Last Triple-Zero pass: 2026-06-16 - Module 15 full validation pass 3 of 3
Next module: Module 16 - Settings, backup, import, reset (not started)

Do not change:

- Offline-only, single-user, CS50-only scope.
- No cloud sync, no external APIs, no analytics, no authentication.
- Preserve the Module 01 scaffold scripts, baseline routes, and
  placeholder-shell clarity until real domain features replace placeholders.
- Preserve the Module 02 route catalog, feature entrypoints, and
  import-boundary rules unless a later decision replaces them deliberately.
- Preserve the Module 03 shared domain constants, schemas, and inferred types
  unless a later compatibility decision changes them deliberately.
- Preserve the Module 04 store names, singleton IDs, repository contracts, and
  migration fixture unless a later schema decision changes them deliberately.
- Preserve the Module 05 seed IDs, unit ordering, required flags, and
  `dataVersion` discipline unless a later compatibility decision changes them
  deliberately.
- Preserve the Module 06 token names, shared component contracts, reduced-motion
  defaults, and truthful placeholder boundaries unless a later module changes
  them deliberately with regression coverage.
- Preserve the Module 07 onboarding route, `app_meta.onboardingCompletedAt`
  behavior, supported avatar-config keys and values, and local theme or motion
  application unless a later compatibility decision changes them deliberately.
- Preserve the Module 08 read-only course-map boundary, required-item rollup
  semantics, and stable use of seeded unit or item IDs unless a later
  compatibility decision changes them deliberately.
- Preserve the Module 09 derived long-form asset IDs, immutable
  `media_progress_events`, resume-point contract, and frozen-after-progress
  slice-plan rule unless a later compatibility decision changes them
  deliberately.
- Preserve the Module 10 `/course/:itemId` route shape, item-row entry links,
  manual timestamp parsing rules, and the rule that partial long-form event
  history cannot be manually overridden to `completed` or `skipped_optional`
  from the detail screen.
- Preserve the Module 11 `/sessions` route, append-only session ledger,
  in-memory-only live timer rule, and the requirement that every saved session
  references one existing item whose `unitId` matches the saved `unitId`.
- Preserve the Module 12 XP Engine Math, derived level formulas, immutable transaction ledger, derived-only level totals, and collision-resistant transaction IDs.
- Preserve the Module 13 code-only achievement definitions, the pure
  evaluator's deterministic rule and trigger-source-id derivation, the
  explicit-save-only evaluation rule (no passive unlocks), the immutable
  `achievement_unlocks` records, zero achievement XP, and the deferred status of
  the `achievement_definitions` store plus recovery and reflection categories.
- Preserve the Module 14 read-only, derived-only dashboard: opening or reloading
  `/dashboard` mutates no store, awards no XP, and unlocks no achievement, and it
  uses no non-dark-theme-safe card variant.
- Preserve the Module 15 read-only, derived-only insights surface: opening or
  reloading `/insights` mutates no store, awards no XP, and unlocks no
  achievement; it trends only the immutable ledgers, treats `progress_entries` as
  a current snapshot only, labels watched minutes as logged effort (not unique
  coverage), keeps day/week buckets device-local with whole-event attribution,
  uses neutral active-day wording (no streak branding), and adds no charts, no
  new dependencies, and no new repository surface. Keep the completion-award
  `sourceType` classification aligned with the XP engine via its divergence test.
- Do not introduce backup/import/export/reset UI before its assigned module.
- Preserve future backwards compatibility now that persistence exists.

Backwards compatibility fixtures:

- `tests/db/migrations.test.ts` seeds a legacy version-1 Dexie database and
  verifies that the current version-2 schema migrates it without data loss.
- `tests/db/repositories.test.ts` verifies that a newer seed version can update
  seed-managed catalog rows without mutating learner progress data and that
  onboarding-complete profile writes preserve the singleton record shape.
- `tests/features/profileModel.test.ts` verifies the legacy-profile fallback
  that prevents customized older local profiles from being forced back through
  onboarding.
- `tests/features/courseModel.test.ts` verifies ordered course-map rollups,
  optional-item handling, blocked-state surfacing, and required-progress
  semantics.
- `tests/features/courseDetailModel.test.ts` verifies allowed item-detail
  status options, evidence requirements, and the guard against deceptive
  long-form completion overrides.
- `tests/lib/progressEngine.test.ts` verifies slice generation, range union,
  watched-time projection, and legacy-complete compatibility for long-form
  progress.
- `tests/features/progressModel.test.ts` verifies overlap-safe long-form item
  summaries, slice-level detail projection, and no-progress slice planning.
- `tests/lib/time.test.ts` verifies the manual timestamp format and parse
  helpers used by the content-detail logging form.
- `tests/features/sessionsModel.test.ts` verifies live-session transitions,
  whole-minute duration rules, item-bound validation, discard behavior, and
  deterministic ledger projection.
- `tests/architecture/sessionsFeature.test.ts` verifies that the sessions
  feature does not import XP or progress-engine write surfaces.
- `tests/architecture/achievementsFeature.test.ts` verifies that the pure
  achievement engine imports no Dexie/database layer and that the achievements
  page imports no evaluation or write APIs.
- `tests/lib/achievementsEngine.test.ts` verifies each achievement rule type,
  deterministic trigger-source-id derivation, stable unlock-id derivation, and
  re-evaluation idempotency.
- `tests/db/repositories.test.ts` verifies that achievement unlocks persist once
  without duplication on re-save, that evaluation writes zero `xp_transactions`
  and mutates no source store, that reads never create unlocks, and that an
  explicit save unlocks accumulated history while a passive read does not.

Current repo inventory:

- Planning and state documents from Module 00 remain in place.
- Module 01 scaffold files remain in place, including
  Vite/TypeScript/ESLint/Prettier/Playwright configs, `src/`, `e2e/`, and the
  module plan documents under `docs/modules/`.
- Module 02 adds `tests/`, route composition under `src/app/`, feature
  entrypoints under `src/features/`, shared helpers under `src/lib/testing/`,
  and placeholder directories for future modules.
- Module 03 adds `src/lib/domain/` with shared constants, Zod schemas, inferred
  types, and a `parseCourseSeed` helper.
- Module 04 provides the versioned Dexie database, startup initialization, and
  repository functions exposed through `src/lib/db/index.ts`.
- Module 05 adds `src/seed/cs50x-2026.json` plus `src/seed/index.ts`, giving
  the app a validated, locally editable bundled CS50x course catalog.
- Module 06 adds `src/components/layout/AppShell.tsx`, a reusable
  `src/components/ui/` design-system surface, and tokenized styling split
  across `src/styles/tokens.css`, `src/styles/base.css`, and
  `src/styles/design-system.css`.
- Module 07 adds `src/lib/appState/` plus `src/lib/profile.ts`, giving the app
  a shared local-state provider for onboarding, learner preferences, and shell
  theme or motion application.
- Module 08 adds `src/features/course/model.ts`, summary and unit-card
  components, and a `listProgressEntries` repository surface so `/course` can
  render honest local rollups from the seeded catalog without mutating data.
- Module 09 adds `src/lib/progress/` plus `src/features/progress/model.ts`,
  derived long-form assets and slices, immutable media-event logging,
  resume-point persistence, and read-only course-map watched-time summaries.
- Module 10 adds `src/features/course/routes/ContentDetailPage.tsx`,
  detail-route view models, unit or item lookup helpers, manual timestamp
  parsing helpers, and item-level local save forms for progress and long-form
  watched ranges.
- Module 11 adds `src/features/sessions/`, `/sessions` route wiring,
  `listStudySessions()`, live and manual session flows, session ledger UI, and
  E2E coverage for save, discard, and reload-mid-session behavior.
- Module 12 adds `src/lib/xp/engine.ts` pure XP calculations, repository orchestration
  (`listXpTransactions()`, `getXpSummary()`, and XP-aware database wrappers), route
  integration (toast feedback for earned XP), and Playwright E2E tests for XP and reload safety.
- Module 13 adds `src/lib/achievements/` pure code-only definitions and a
  deterministic evaluator, repository orchestration (`listAchievementUnlocks()`,
  `getAchievementsView()`, and achievement evaluation folded into the three
  XP-aware wrappers), a real read-only `/achievements` page with status and
  category filters under `src/features/achievements/`, and Playwright E2E tests
  for explicit-save unlocking and reload-no-duplicate behavior.
- Module 14 adds `src/features/dashboard/model.ts` plus a real read-only
  `/dashboard` route derived from existing stores and read models, a manual
  vendor chunk split in `vite.config.ts`, and an idempotent derived-slice sync in
  `repositories.ts`.
- Module 15 adds `src/features/insights/model.ts` plus a real read-only
  `/insights` route that trends the immutable ledgers as semantic tables with
  decorative token CSS bars, replacing the placeholder, with additive insights
  styles in `design-system.css`. It adds no schema change, no new dependency, and
  no new repository surface.
- The `/onboarding` route now creates the first-run local learner profile,
  `/` acts as the saved-profile summary, and `/course` now renders the seeded
  CS50 catalog instead of a placeholder while `/course/:itemId` now owns the
  actual item write surface.
- `src/features/profile/` now owns the avatar preview, profile form, and
  onboarding route, and `src/features/settings/routes/SettingsPage.tsx` now
  exposes live local profile editing instead of a pure placeholder.
- Validation coverage now includes profile-model unit tests, avatar-config
  schema checks, onboarding repository coverage, course-map rollup tests,
  long-form slice-engine and repository coverage, content-detail route model
  and timestamp helper tests, app-route gating checks, XP engine and level math
  unit tests, XP database wrapper integration tests, achievement engine rule and
  idempotency unit tests, achievement repository integration tests, an
  achievement engine architecture boundary test, and Playwright E2E flows for
  onboarding creation, course-map reload persistence, content-detail watched
  range logging, study session and progress milestone XP awards, achievement
  unlock on explicit save with reload-no-duplicate, stored preference
  application, not-found routing, and offline navigation after setup. Module 14
  added dashboard-model unit tests, a full-snapshot dashboard no-mutation test,
  derived-slice idempotency coverage, and dashboard + axe E2E coverage. Module 15
  adds insights-model unit tests (weekly buckets, whole attribution, floored
  watched minutes, overlap-not-deduplicated, active days, mode breakdown, an
  XP-engine completion `sourceType` divergence guard, achievement timeline, and
  empty states), a full-snapshot insights no-mutation test across every store,
  and an insights + axe E2E flow in dark theme.
