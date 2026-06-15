# Module Checklist

## Current Module

Module: 14 - Dashboard
Status: complete

Objective:

- Replace the `/dashboard` placeholder with a truthful, read-only, derived-only
  local dashboard built from existing source-of-truth stores and existing read
  models.
- Surface where the learner is in CS50, what to continue next, XP/level,
  achievement status, recent explicit-save activity, blocked items, resume
  long-form, and a study-session summary, with truthful empty states.
- Keep the dashboard pure-read: opening or reloading `/dashboard` mutates no
  store, awards no XP, and unlocks no achievements.

Expected files changed:

- src/features/dashboard/model.ts (new)
- src/features/dashboard/routes/DashboardPage.tsx
- src/styles/design-system.css
- vite.config.ts
- src/lib/db/repositories.ts
- tests/features/dashboardModel.test.ts (new)
- tests/app/App.test.tsx
- tests/db/repositories.test.ts
- e2e/dashboard.spec.ts
- docs/modules/module-14-plan.md
- PROJECT_STATE.md
- DECISIONS.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- TEST_PLAN.md

Forbidden files / work for Module 14:

- No Dexie schema-version bump, store rename, index change, or seeded-ID churn.
- No new persistent dashboard state; all dashboard values are derived.
- No XP awarded, no achievements unlocked, and no source-store mutation from
  dashboard reads.
- No Module 15 Insights, charts, trends, forecasts, streak analytics, or
  coaching.
- No backup/import/export/reset, sync, auth, analytics, or external APIs.
- No new XP rules, new achievements, or changes to achievement definitions.
- No global design-system refactor of the dark-theme card variants.

Acceptance criteria:

- `/dashboard` renders all derived sections after onboarding with truthful empty
  states for a fresh learner.
- Opening and reloading `/dashboard` yields full-store equality (no mutation)
  across xp_transactions, achievement_unlocks, progress_entries, study_sessions,
  media_progress_events, content_assets, content_slices, resume_points,
  learner_profile, app_meta, course_units, and course_items.
- The dashboard is accessible (axe) in both the normal and blocked-item states
  and uses no known non-dark-theme-safe card variant.
- The production build keeps every chunk under the 600 kB warning budget without
  raising the threshold.
- Dexie schema stays version 2 and the migration fixture stays green.
- Triple-Zero achieved with lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.

Tests added/updated:

- `tests/features/dashboardModel.test.ts` (pure model behavior and empty states)
- `tests/app/App.test.tsx` (dashboard render plus full-snapshot no-mutation)
- `tests/db/repositories.test.ts` (derived-slice sync idempotency)
- `e2e/dashboard.spec.ts` (dashboard + axe coverage, blocked-item state, and a
  guard against non-dark-theme-safe card variants)

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

- Module 14 keeps the existing version-2 Dexie schema, store names, indexes, and
  singleton IDs intact.
- The only persistence change is a Module 09 bug fix: the derived long-form slice
  sync is now idempotent, so a repeated app bootstrap no longer churns
  `content_slices.updatedAt` for unwatched assets. Frozen-after-media and
  deliberate seed-replan behavior are preserved.

Rollback plan:

- Remove `src/features/dashboard/model.ts`, restore the placeholder
  `DashboardPage.tsx`, drop the additive dashboard CSS, and revert the
  `vite.config.ts` manual-chunks block and the slice-sync idempotency guard in
  `repositories.ts`.
- Remove the Module 14 tests and restore the prior `App.test.tsx`,
  `repositories.test.ts`, and `e2e/dashboard.spec.ts` content.
- Reset Module 14 documentation and validation records to the Module 13 state.

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
| 15     | Insights                              | not started |
| 16     | Settings, backup, import, reset       | not started |
| 17     | Offline hardening                     | not started |
| 18     | Accessibility and UX hardening        | not started |
| 19     | Security and privacy review           | not started |
| 20     | Final CS50 project packaging          | not started |
