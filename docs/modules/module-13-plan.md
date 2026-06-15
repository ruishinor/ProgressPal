# Module 13 Plan

## Summary

- Module 13 adds a deterministic, idempotent achievement engine that unlocks
  achievements from existing source-of-truth data with no duplication, no
  source-store mutation, and no passive (open/reload/navigation) unlocks.
- Achievement definitions are a code-only source of truth validated at module
  load. The `achievement_definitions` Dexie store is treated as deferred
  persistence and is never read from or written to in this module.
- Every Module 13 achievement carries `xpReward: 0`. The engine writes no
  `achievement_unlock` XP transactions. Achievement-XP values are not invented.
- Achievement evaluation happens only inside the existing explicit-save flows
  (the three XP-aware repository wrappers). History-based unlocking on an
  explicit save is accepted by design, documented, and tested.
- `recovery` (including `returned-after-gap`) and `reflection` achievements are
  deferred because the current stores have no honest, derivable source.
- Dexie schema stays version 2. No schema bump, no seed change, no passive
  backfill, no dashboard/insights/backup work.

## 1. Step 0 hard gate (completed first)

- Before any Module 13 code, `npm run validate` was failing only at
  `format:check` on two Module 12 markdown docs
  (`implementation_plan_update_post_M12.md`, `walkthrough_M12.md`).
- Resolved with `prettier --write` on those two files (format-only, no content
  change), then a full `npm run validate` confirmed a clean pass before any
  Module 13 implementation began.

## 2. Current state audit after Module 12

- Dexie is schema version 2. The `achievement_definitions` and
  `achievement_unlocks` stores already exist; `achievement_unlocks` has a
  `&achievementId` unique index that enforces at most one unlock per
  achievement at the database level.
- The domain layer already defines `AchievementDefinitionSchema`,
  `AchievementUnlockSchema`, `AchievementCategorySchema`, and inferred types.
- The XP engine is the pattern to mirror: a pure module (`src/lib/xp/engine.ts`)
  plus repository orchestration with check-before-insert idempotency inside one
  Dexie transaction and an injectable `now` clock.
- `/achievements` was a placeholder route; `getDatabaseSnapshot()` already reads
  both achievement stores.

## 3. Design decisions (locked at approval)

1. Dexie schema stays version 2. Stores reused as-is. No migration.
2. Achievement definitions are code-only (`src/lib/achievements/definitions.ts`),
   parsed against `AchievementDefinitionSchema` at module load. The
   `achievement_definitions` store stays unused/deferred. The Achievements page
   renders from validated code definitions plus persisted `achievement_unlocks`.
3. Achievement XP is 0 for every Module 13 achievement. The engine writes no
   `xp_transactions` for unlocks.
4. Unlocks are persisted to `achievement_unlocks` and are immutable once written.
5. Evaluation happens only on explicit save flows, by extending the three
   XP-aware wrappers so one save atomically writes the source event, awards
   source-event XP, and evaluates achievements in the same Dexie transaction. No
   evaluation on startup, reload, navigation, route-load, or the `/achievements`
   page read.
6. History-based evaluation is accepted by design: an explicit save runs the
   evaluator against all accumulated local source data, so a save can unlock
   achievements already satisfied by earlier activity. This is distinct from the
   forbidden passive startup backfill and is documented and tested.

## 4. Achievement rule model

The pure engine supports these deterministic rule types (config shape in
parentheses):

- `first_item_completed` (`{}`)
- `unit_required_completed` (`{ unitId }`)
- `course_required_completed` (`{}`)
- `item_completed` (`{ itemId }`)
- `items_all_completed` (`{ itemIds: string[] }`)
- `problem_set_status_count` (`{ statuses: string[]; minCount }`)
- `content_slice_completed_count` (`{ minCount }`)
- `media_clean_stop` (`{ minWatchedSeconds; stopReasons: string[] }`)
- `study_session_duration_count` (`{ minMinutes; minCount }`)
- `study_session_mode_count` (`{ mode; minCount }`)

Completion semantics reuse `isItemComplete` / `completeStatuses` from
`src/lib/completion.ts` — the same helper the XP engine uses. No new terminal
status set is invented.

## 5. Initial achievement set (grounded in real seed IDs, all xpReward 0)

`first-step`, `first-slice`, `scratch-initiate` (week-0), `pointer-survivor`
(week-4), `data-structure-builder` (week-5), `python-shift` (week-6),
`query-builder` (week-7), `browser-builder` (week-8), `flask-route-maker`
(week-9), `course-complete`, `pset-chain`, `clean-stop`, `three-deep-sessions`,
`bug-hunter`, `final-project-mvp` (final-project-build), `final-project-shipped`
(final-project-readme + final-project-video-demo).

Categories covered: `course_progress`, `problem_sets`, `consistency`,
`debugging`, `final_project`.

### Deferred categories (documented, not faked)

- `recovery` — `returned-after-gap` and "Blocker Cleared" depend on
  status-transition history and contestable time-gap semantics that the
  current-state stores do not provide. Deferred to a later module.
- `reflection` — the seed has no `reflection`/`notes` item type with derivable
  source data. Deferred.

## 6. Idempotency strategy

- Deterministic unlock id: `deriveAchievementUnlockId(achievementId)` →
  `unlock-<achievementId>` (kebab-case ids satisfy the entity-id pattern), with
  a `simpleHash` fallback for any future id shape.
- The pure evaluator returns, for each satisfied achievement, a stable
  `triggerSourceId` derived from the qualifying source data via deterministic
  sort — never from wall-clock or insertion order.
- Persistence guard mirrors XP: inside the transaction, for each satisfied
  achievement, check `achievement_unlocks.where('achievementId').equals(id)`
  and insert only if absent. The `&achievementId` unique index is the backstop.
- `unlockedAt` uses the injected `now` clock and is written once. Re-running the
  evaluator over identical data inserts nothing new.

## 7. File-level implementation scope

- New pure modules (no Dexie):
  - `src/lib/achievements/definitions.ts`
  - `src/lib/achievements/engine.ts`
  - `src/lib/achievements/index.ts`
- Repository orchestration (`src/lib/db/repositories.ts`, `src/lib/db/index.ts`):
  - `listAchievementUnlocks()` and `getAchievementsView()` read APIs.
  - Internal `evaluateAndUnlockAchievements(database, now)` that reads the
    source stores, runs the pure evaluator, and inserts only new unlocks. Writes
    no `xp_transactions`.
  - Extend the three `*AndAwardXp` wrappers to call it in the same atomic
    transaction and add `unlockedAchievements` to their result types.
- UI:
  - `src/features/achievements/routes/AchievementsPage.tsx` — real badge grid
    (locked/unlocked, text labels not color-only, unlock date, XP reward,
    criteria) using `getAchievementsView()`, with status and category filters.
    Read-only; no writes from this page.
  - `src/features/achievements/model.ts` — category labels, filter helpers, and
    deterministic unlock-date formatting.
  - Light truthful copy touch-ups in `src/app/shell/AppShell.tsx` and
    `src/app/routes/HomePage.tsx`.
- Styling: additive achievement grid/card/filter rules in
  `src/styles/design-system.css`.

## 8. Files forbidden to change

- `src/lib/db/database.ts`, `src/lib/db/constants.ts`
- `src/lib/domain/schemas.ts`, `src/lib/domain/types.ts`
- `src/seed/cs50x-2026.json`
- `tests/db/migrations.test.ts`
- `src/features/dashboard/**`, `src/features/insights/**`
- `src/lib/xp/engine.ts` (the locked Module 12 engine)
- Any code that writes achievement XP transactions or syncs definitions into
  `achievement_definitions`.

## 9. Acceptance criteria

- Saving a qualifying source event unlocks the expected achievement exactly
  once; re-saving or reloading does not duplicate it.
- Achievement evaluation writes zero `xp_transactions` and mutates no source
  store.
- Reads (`listAchievementUnlocks`, `getAchievementsView`, and opening
  `/achievements`) never create unlocks.
- An explicit save unlocks achievements already satisfied by accumulated
  history (history-based), but a passive read never does.
- The `/achievements` page lists locked and unlocked achievements from code
  definitions plus persisted unlocks, with text labels and not color alone.
- Dexie schema stays version 2; the migration fixture stays green.
- `recovery` and `reflection` achievements remain deferred.

## 10. Test plan

- `tests/lib/achievementsEngine.test.ts` — one case per rule type
  (satisfied/not-satisfied), deterministic `triggerSourceId`, stable unlock-id
  derivation, and re-evaluation idempotency.
- `tests/db/repositories.test.ts` (extended) — unlocks persist once and never
  duplicate on re-save; achievement evaluation writes zero `xp_transactions` and
  leaves source stores unmutated; reads never create unlocks; history-based
  unlock fires on an explicit (even unrelated) save but never on a passive read.
- `tests/app/App.test.tsx` (extended) — the achievements route renders unlocked
  and locked states; opening the route creates no unlocks.
- `tests/architecture/achievementsFeature.test.ts` — the pure engine has no
  Dexie/database imports; the page imports no evaluation or write APIs.
- `e2e/achievements.spec.ts` — an explicit save unlocks an achievement, it lists
  on `/achievements`, and reload does not duplicate it.
- Validation commands: `npm run lint`, `npm run format:check`,
  `npm run typecheck`, `npm run build`, `npm run test`, `npm run test:e2e`,
  `npm run check:circular`, `npm audit --audit-level=moderate`.
- Triple-Zero requirement: three consecutive clean full-suite passes after the
  final Module 13 code and docs are in place.

## 11. Adversarial review cases

- Re-save the same qualifying source event and confirm one unlock row only.
- Open `/achievements`, navigate, and reload repeatedly with no new source
  writes and confirm `achievement_unlocks` stays unchanged.
- Persist a completed item with the plain (non-evaluating) writer, then confirm
  reads create no unlock and the next explicit save unlocks it (history-based).
- Confirm a debugging study session that earns no source XP still unlocks
  `bug-hunter` while leaving `xp_transactions` empty.
- Confirm completing only one of the two final-project-shipped items does not
  unlock the combined achievement.

## 12. Rollback plan

- Remove Module 13 code paths only. Do not attempt data or schema rollback.
- Remove `src/lib/achievements/**`, the achievements page model and UI changes,
  the additive CSS, the repository read APIs, and the achievement-evaluation
  call plus `unlockedAchievements` results from the three wrappers.
- Restore the placeholder `/achievements` page and the prior shell/home copy.
- Keep the pre-existing `achievement_unlocks` store intact; leaving already
  written unlock rows in place is safer than destructive rollback.
