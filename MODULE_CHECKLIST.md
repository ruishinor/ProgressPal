# Module Checklist

## Current Module

Module: 13 - Achievement engine
Status: complete

Objective:

- Add a deterministic, idempotent achievement engine that unlocks achievements
  from existing source-of-truth data with no duplication and no source-store
  mutation.
- Keep achievement definitions code-only and validated; leave the
  `achievement_definitions` Dexie store unused/deferred.
- Evaluate achievements only inside the existing explicit-save wrappers, in the
  same atomic transaction, and persist only `achievement_unlocks`.
- Replace the placeholder `/achievements` route with a real read-only
  locked/unlocked listing.

Expected files to change:

- src/lib/achievements/\*\* (new)
- src/lib/db/repositories.ts
- src/lib/db/index.ts
- src/features/achievements/routes/AchievementsPage.tsx
- src/features/achievements/model.ts (new)
- src/app/routes/HomePage.tsx
- src/app/shell/AppShell.tsx
- src/styles/design-system.css
- tests/lib/achievementsEngine.test.ts (new)
- tests/db/repositories.test.ts
- tests/app/App.test.tsx
- tests/architecture/achievementsFeature.test.ts (new)
- e2e/achievements.spec.ts (new)
- implementation_plan_update_post_M12.md (Prettier format-only)
- walkthrough_M12.md (Prettier format-only)
- docs/modules/module-13-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

Forbidden files / work for Module 13:

- No schema-version bump, store rename, index change, or seeded-ID churn.
- No achievement XP: every definition has `xpReward: 0` and evaluation writes no
  `xp_transactions`.
- No syncing definitions into `achievement_definitions`; that store stays
  deferred.
- No evaluation on app open, reload, navigation, route-load, or the
  `/achievements` page read; no passive startup backfill.
- No source-store mutation from achievement evaluation.
- No `returned-after-gap`, recovery, or reflection achievements.
- No Module 14+ work: no dashboard metrics, insights, charts, backup, import,
  export, or reset.

Acceptance criteria:

- Saving a qualifying source event unlocks the expected achievement exactly
  once; re-saving or reloading does not duplicate it.
- Achievement evaluation writes zero `xp_transactions` and mutates no source
  store.
- Reads (`listAchievementUnlocks`, `getAchievementsView`, and opening
  `/achievements`) never create unlocks.
- An explicit save unlocks achievements already satisfied by accumulated
  history; a passive read never does.
- `/achievements` lists locked and unlocked achievements from code definitions
  plus persisted unlocks, with text labels and not color alone, and stays
  read-only.
- The pure engine has no Dexie/database import.
- Dexie schema remains version 2 and the migration fixture stays green.
- Triple-Zero achieved with lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.

Tests added:

- `tests/lib/achievementsEngine.test.ts`
- `tests/db/repositories.test.ts` expanded for unlock persistence/idempotency,
  zero-XP-on-unlock, source-store immutability, no-passive-unlock reads, and
  history-based unlock on explicit save
- `tests/app/App.test.tsx` updated for achievements render and no-unlock-on-open
- `tests/architecture/achievementsFeature.test.ts`
- `e2e/achievements.spec.ts`

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

- Module 13 keeps the existing version-2 Dexie schema, store names, indexes, and
  singleton IDs intact.
- Only `achievement_unlocks` receives new rows; unlocks are immutable and guarded
  by the `&achievementId` unique index.
- The `achievement_definitions` store remains untouched/deferred.
- Achievement evaluation never mutates source stores or the XP ledger.

Rollback plan:

- Remove `src/lib/achievements/`, the achievements page model and UI changes,
  the additive CSS, the repository read APIs, and the achievement-evaluation
  call plus `unlockedAchievements` results from the three XP-aware wrappers.
- Restore the placeholder `/achievements` page and the prior shell/home copy.
- Keep the pre-existing `achievement_unlocks` store and any written rows intact.
- Reset Module 13 documentation and validation records to the Module 12 state.

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
| 14     | Dashboard                             | not started |
| 15     | Insights                              | not started |
| 16     | Settings, backup, import, reset       | not started |
| 17     | Offline hardening                     | not started |
| 18     | Accessibility and UX hardening        | not started |
| 19     | Security and privacy review           | not started |
| 20     | Final CS50 project packaging          | not started |
