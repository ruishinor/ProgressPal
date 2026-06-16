# Module Checklist

## Current Module

Module: 15 - Insights
Status: complete

Objective:

- Replace the `/insights` placeholder with a truthful, read-only, derived-only
  local insights surface that describes how locally recorded effort has
  accumulated over time, built only from existing stores and read models.
- Trend the immutable ledgers (`study_sessions`, `media_progress_events`,
  `xp_transactions`, `achievement_unlocks`); treat `progress_entries` as a
  current snapshot only, never a reconstructed history.
- Keep insights pure-read: opening or reloading `/insights` mutates no store,
  awards no XP, and unlocks no achievements.

Expected files changed:

- src/features/insights/model.ts (new)
- src/features/insights/routes/InsightsPage.tsx
- src/styles/design-system.css
- tests/features/insightsModel.test.ts (new)
- tests/app/App.test.tsx
- e2e/insights.spec.ts (new)
- docs/modules/module-15-plan.md (new)
- PROJECT_STATE.md
- DECISIONS.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- TEST_PLAN.md

Forbidden files / work for Module 15:

- No Dexie schema-version bump, store rename, index change, or seeded-ID churn.
- No new persistent insights state and no insights cache; all values are derived.
- No XP awarded, no achievements unlocked, and no source-store mutation from
  insights reads.
- No charts: no Recharts, no first-party SVG charts in this version.
- No new dependencies (Recharts and date-fns stay unimported).
- No forecasts, coaching, recommendations, motivational interpretation, or
  gamified streak branding.
- No new read/write repository surfaces.
- No new XP rules, new achievements, or changes to achievement definitions.
- No backup/import/export/reset, settings changes, sync, auth, analytics, or
  external APIs.
- No global design-system refactor of the dark-theme card variants.

Acceptance criteria:

- `/insights` renders all derived sections after onboarding with truthful empty
  states for a fresh learner.
- Opening and reloading `/insights` yields full-snapshot equality (no mutation)
  across every store returned by `getDatabaseSnapshot()`.
- "Watched minutes logged" sums `media_progress_events.watchedSeconds` (logged
  effort, overlaps included), floors partial minutes, and is never presented as
  unique watched coverage.
- Sessions and media events are attributed whole to the local day/week of their
  `startedAt` / `createdAt`, never split across a boundary; active days derive
  only from positive-duration study sessions.
- Recorded completion awards count exact XP-engine `sourceType` values, with
  item-completion and `week_completed` (unit) awards counted separately; a test
  fails loudly if the engine and the Insights classification diverge.
- The insights surface is accessible (axe) in dark theme and uses no
  non-dark-theme-safe card variant (`.card--accent`, `.card--subtle`,
  `.card--danger`, `.state-card`).
- The production build keeps every chunk under the 600 kB warning budget without
  raising the threshold.
- Dexie schema stays version 2 and the migration fixture stays green.
- Triple-Zero achieved with lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.

Tests added/updated:

- `tests/features/insightsModel.test.ts` (pure model: weekly buckets, whole
  attribution, floored watched minutes, overlap-not-deduplicated, active days,
  mode breakdown, completion-award classification with an XP-engine divergence
  guard, achievement timeline order, course snapshot, empty states)
- `tests/app/App.test.tsx` (insights render plus full-snapshot no-mutation across
  every store)
- `e2e/insights.spec.ts` (insights + axe coverage in dark theme, real
  saved-activity flow, reload leaves ledgers unchanged, and a guard against
  non-dark-theme-safe card variants)

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

- Module 15 is read-only and additive: no Dexie schema, store, index, or
  seeded-ID change, and no new repository surface. It only reads existing stores
  through existing helpers and renders derived views.

Rollback plan:

- Remove `src/features/insights/model.ts`, restore the placeholder
  `InsightsPage.tsx`, and drop the additive insights CSS in `design-system.css`.
- Remove `tests/features/insightsModel.test.ts` and `e2e/insights.spec.ts`, and
  revert the Insights describe block added to `tests/app/App.test.tsx`.
- Reset Module 15 documentation and validation records to the Module 14 state.

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
| 16     | Settings, backup, import, reset       | not started |
| 17     | Offline hardening                     | not started |
| 18     | Accessibility and UX hardening        | not started |
| 19     | Security and privacy review           | not started |
| 20     | Final CS50 project packaging          | not started |
