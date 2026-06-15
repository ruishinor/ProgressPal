# Module 12 Plan

## Summary

- Module 12 adds a deterministic, idempotent XP engine on top of the existing `xp_transactions` store only.
- The authoritative level curve is `level = floor(sqrt(totalXp / 100)) + 1` from `PROJECT-BRIEF.md`.
- Threshold tables, configurable level curves, achievements, dashboard metrics, and insights are explicitly out of scope.
- XP awards must happen from real saved source events only. No app-open, reload, navigation, or other passive behavior may create XP.
- Module 12 should stay engine-first: no new route, no transaction viewer screen, and no schema or seed changes.

## 1. Current State Audit After Module 11

- Dexie is still schema version `2`, and `xp_transactions` already exists in the database definition.
- `xp_transactions` is currently a passive store with one raw append API, `addXpTransaction()`, plus snapshot coverage. There is no list helper, no dedupe helper, no total XP summary, and no level calculation surface.
- `study_sessions` are append-only and item-bound. `media_progress_events` are immutable and overlap-safe. `progress_entries` are mutable upserts keyed by `itemId`.
- Current user-facing copy still says XP is deferred.
- There is a production-vs-test mismatch for final-project milestones: the bundled seed uses `final-project-build`, `final-project-video-demo`, `final-project-readme`, `final-project-submit50`, and `final-project-gradebook-check`, while several simplified tests still use `final-project-plan`. Module 12 must follow the bundled seed for production rules and use dedicated XP test fixtures where needed.

## 2. Existing XP Schema and Repository Surface

- `XpTransactionSchema` already exists and must remain unchanged: `id`, `sourceType`, `sourceId`, `xp`, `reason`, `awardedAt`, `createdAt`, `updatedAt`.
- The `xp_transactions` store already exists with indexes `&id, sourceType, sourceId, awardedAt`. No store rename, index change, or schema bump is allowed.
- `src/lib/db/repositories.ts` already exposes `AddXpTransactionInput` and `addXpTransaction()`. It sorts XP transactions in snapshots by `awardedAt`, then `id`.
- Module 12 should add public read and orchestration surfaces without changing the schema:
  - `listXpTransactions()`
  - `getXpSummary()`
  - `upsertProgressAndAwardXp()`
  - `logMediaProgressAndAwardXp()`
  - `addStudySessionAndAwardXp()`
- Module 12 should add pure XP logic under shared library code, not embed rule logic directly in route components.

## 3. XP Source Events Allowed in Module 12

- `study_session_25_minutes`: one saved `study_session` with `durationMinutes >= 25` awards `+10` once per session.
- `media_unique_10_minutes`: each newly crossed 10-minute block of unique watched/read coverage on one long-form asset awards `+4`. Use interval union across all saved events for that asset and award by block index, not raw event minutes.
- `content_slice_completed`: each slice that becomes fully covered awards `+10` once per `sliceId`.
- `media_clean_stop`: one `media_progress_event` awards `+5` when `watchedSeconds >= 900` and `stoppedBecause` is `reached_limit` or `completed_slice`.
- `problem_set_started`: one `problem_set` item awards `+20` once when its saved progress first reaches any meaningful non-default state.
- `problem_set_submitted`: one `problem_set` item awards `+75` once when saved status reaches `submitted` or `accepted`.
- `problem_set_accepted`: one `problem_set` item awards `+125` once when saved status reaches `accepted`.
- Completion bonuses for item types with explicit brief values:
  - `lecture_completed`: `+40`
  - `section_completed`: `+20`
  - `shorts_completed`: `+15`
  - `practice_completed`: `+30`
  - `notes_completed`: `+15`
  - `reflection_completed`: `+15`
- `week_completed`: one required `course_unit` of type `week` awards `+150` once when every required item is in the existing terminal completion set already used by course rollups.
- `final_project_build_completed`: `final-project-build` completed awards `+250`.
- `final_project_readme_demo_completed`: award `+200` once when both `final-project-readme` and `final-project-video-demo` are terminal-complete.

## 4. XP Source Events Explicitly Deferred

- No XP for app open, reload, navigation, route visits, or any passive shell behavior.
- No XP for generic item `started` states outside the explicit `problem_set_started` rule.
- No XP for blocker naming or blocker resolution in Module 12. There is no immutable blocker-resolution source model yet.
- No XP for note creation bonuses in Module 12. Current note surfaces are mutable and not event-sourced enough for once-per-asset or once-per-day rules.
- No XP for resuming a previous long-form item in Module 12. The app has a mutable resume point, not an immutable resume event.
- No review-specific XP or review caps in Module 12.
- No reading-completion bonus in Module 12. The brief gives focused-minute XP for reading effort but no explicit separate reading-complete XP value.
- No lab-specific XP in Module 12. The real bundled seed does not currently use `lab`, and no explicit lab reward value is settled.
- No final-project planning bonus in Module 12. The production seed has no `final-project-plan` item.
- No XP for `final-project-submit50` or `final-project-gradebook-check`. They are administrative completion steps, not meaningful progress sources for the first XP engine.
- No week-completion XP for units of type `special` or `final_project`.
- No achievements, dashboard rollups, insights, charts, backup, import, reset, or recovery-day logic.

## 5. Duplicate-Prevention Strategy

- Duplicate prevention is based on canonical `{sourceType, sourceId}` pairs, not on `xp` amount or human-readable `reason`.
- Every rule must produce one deterministic `sourceId`:
  - session award: `study-session-id` based
  - unique 10-minute award: `assetId + blockIndex`
  - slice award: `sliceId`
  - clean stop: `mediaProgressEvent.id`
  - progress milestone award: `itemId + milestone`
  - week completion: `unitId`
  - final project README/demo: one fixed combined source id
- Every transaction `id` must also be deterministic from `sourceType + sourceId`, so a second write attempt fails safe instead of creating a second ledger row.
- Repository orchestration must still query existing XP transactions first and skip already-awarded pairs before calling `addXpTransaction()`.
- Module 12 must not run a startup or route-load backfill that writes XP on app open. Awards happen only after explicit source writes.

## 6. Level Formula Implementation

- `totalXp` is `sum(xp_transactions.xp)`.
- `level` is `floor(sqrt(totalXp / 100)) + 1`.
- `xpToNextLevel` is `100 * level^2 - totalXp`.
- The current level floor is `100 * (level - 1)^2`.
- Level, next threshold, and XP-to-next must be derived every time from the immutable ledger. They are never stored in Dexie and never written into `app_meta`, `learner_profile`, or any source-event store.
- Module 12 must add a decision record that resolves the `PROJECT-BRIEF.md` vs `WORKFLOW.md` conflict in favor of the square-root curve and defers threshold tables.
- Required math tests:
  - `0 XP -> level 1`
  - `99 XP -> level 1`
  - `100 XP -> level 2`
  - `399 XP -> level 2`
  - `400 XP -> level 3`
  - `900 XP -> level 4`
  - `1600 XP -> level 5`
  - monotonicity across a broad XP range
  - level is never persisted as source of truth

## 7. File-Level Implementation Scope

- New shared XP engine under `src/lib/xp/**` for rule constants, deterministic source id builders, transaction derivation, and summary math.
- Add a small shared completion-status helper under `src/lib/**` so the XP engine and `src/features/course/model.ts` reuse the same terminal completion semantics for week-completion rules instead of drifting.
- Extend `src/lib/db/repositories.ts` and `src/lib/db/index.ts` with:
  - `listXpTransactions()`
  - `getXpSummary()`
  - XP-aware wrappers for progress, media, and session saves
- Route integrations only where source events are already saved:
  - `src/features/course/routes/ContentDetailPage.tsx`
  - `src/features/sessions/routes/SessionsPage.tsx`
- Keep UI changes minimal and truthful:
  - `src/app/routes/HomePage.tsx`
  - `src/app/shell/AppShell.tsx`
  - `src/features/achievements/routes/AchievementsPage.tsx`
- Update `src/features/xp/README.md` and add a small feature-facing read model only if needed for later consumers. Do not add a new XP route.
- Test scope:
  - new pure XP engine tests
  - repository integration tests
  - app-flow tests
  - a dedicated XP E2E spec
  - dedicated XP fixtures instead of mutating the shared production seed to add a missing planning milestone
- Documentation scope:
  - `docs/modules/module-12-plan.md`
  - `PROJECT_STATE.md`
  - `MODULE_CHECKLIST.md`
  - `VALIDATION_LOG.md`
  - `CHANGELOG.md`
  - `DECISIONS.md`
  - `SECURITY.md`
  - `TEST_PLAN.md`

## 8. Files Forbidden to Change

- `src/lib/db/database.ts`
- `src/lib/db/constants.ts`
- `src/lib/domain/schemas.ts`
- `src/lib/domain/types.ts`
- `src/seed/cs50x-2026.json`
- `tests/db/migrations.test.ts`
- `src/features/dashboard/**`
- `src/features/insights/**`
- Any achievement-definition or achievement-unlock implementation files beyond truthful placeholder copy
- Any code that stores authoritative level or total XP state outside derived read helpers

## 9. Acceptance Criteria

- Saving a qualifying session, media event, or progress milestone appends only the missing `xp_transactions` rows that correspond to that real source event.
- Re-saving, reloading, or re-evaluating the same source event does not duplicate XP.
- Overlapping media ranges do not over-award focused-minute XP.
- Completing a problem set through `completed -> submitted -> accepted` cannot farm duplicate milestone XP by toggling statuses.
- `totalXp`, `level`, and `xpToNextLevel` are derived from the immutable ledger and are never persisted as authoritative fields.
- No app-open, reload, navigation, or passive shell behavior writes XP.
- XP calculation writes only `xp_transactions`; it does not mutate `study_sessions`, `progress_entries`, `media_progress_events`, `content_slices`, or `resume_points`.
- Dexie schema stays at version `2`, the existing migration fixture stays green, and the existing `xp_transactions` store is reused unchanged.
- Module 12 does not implement achievements, dashboard metrics, insights, charts, or threshold-table level curves.

## 10. Test Plan

- Pure XP engine tests in a new `tests/lib/xpEngine.test.ts`:
  - level boundary tests from the user’s required list
  - `xpToNextLevel` inverse math
  - monotonicity over a broad numeric range
  - deterministic source id and transaction id generation
  - focused-minute block awarding from interval union
  - clean-stop qualification at `14:59` vs `15:00`
  - week-completion and final-project combined-milestone derivation
- Repository tests in `tests/db/repositories.test.ts`:
  - `listXpTransactions()` sort order
  - `getXpSummary()` derived output
  - `addStudySessionAndAwardXp()` writes one session plus one XP row only when qualifying
  - `logMediaProgressAndAwardXp()` adds media XP without touching source stores beyond the existing media write contract
  - `upsertProgressAndAwardXp()` adds milestone XP once and prevents exploit loops
  - reload or second evaluation with unchanged data adds zero new XP rows
  - level is never stored in snapshots or schema-managed rows
- App tests in `tests/app/App.test.tsx`:
  - content-detail save paths and session save paths now increase `xp_transactions` when rules qualify
  - home or shell copy is truthful about XP being live while achievements and dashboard metrics remain deferred
- E2E tests in a new `e2e/xp.spec.ts`:
  - save one qualifying study session and verify one XP transaction appears
  - log overlapping long-form media ranges and verify no duplicate focused-minute award
  - mark one problem set through submission and acceptance and verify one transaction per milestone
  - reload after awarded XP and verify the ledger count stays unchanged
- Validation commands:
  - `npm run lint`
  - `npm run format:check`
  - `npm run typecheck`
  - `npm run build`
  - `npm run test`
  - `npm run test:e2e`
  - `npm run check:circular`
  - `npm audit --audit-level=moderate`
- Triple-Zero requirement remains three consecutive clean full-suite passes after the final Module 12 code and docs are in place.

## 11. Adversarial Review Cases

- Spam the save button on a qualifying study session and confirm one XP row only.
- Save the same exact media range twice and confirm focused-minute and clean-stop XP do not duplicate.
- Save overlapping media ranges that cross the same 10-minute boundary and confirm only new union coverage earns XP.
- Complete, uncomplete, and re-complete a problem set and confirm the started, submitted, and accepted milestones cannot be farmed.
- Complete `final-project-readme` without `final-project-video-demo` and confirm the combined `+200` award does not fire early.
- Complete `final-project-submit50` or `final-project-gradebook-check` and confirm no admin-only XP is added.
- Open the app, navigate routes, and reload repeatedly with no new source writes and confirm `xp_transactions` stays unchanged.
- Manually corrupt one stored XP transaction in a test database and confirm repository read surfaces still validate stored shape instead of silently trusting bad data.

## 12. Rollback Plan

- Remove Module 12 code paths only. Do not attempt an automatic data rollback or schema rollback.
- Remove the new XP engine library, repository wrappers, route integrations, tests, and documentation updates.
- Restore content-detail and sessions routes to their Module 11 source-write-only save paths.
- Keep the pre-existing `xp_transactions` store intact. It existed before Module 12, so leaving already-written XP rows in place is safer than adding destructive rollback behavior.
- If a semantic cleanup is ever required, handle it manually in development or through a later reset/import module, not through Module 12 code.
