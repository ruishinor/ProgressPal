# Implementation Plan - Module 12: XP Engine

This plan describes the design and step-by-step execution for implementing the XP engine in ProgressPal CS50 Edition.

## User Review Required

> [!IMPORTANT]
>
> - The Dexie schema version remains **version 2**. No database migrations or store changes are performed.
> - The existing `xp_transactions` store is reused exactly as-is.
> - XP transactions are immutable. `totalXp`, `level`, and `xpToNextLevel` are derived values only and are never stored as authoritative fields.
> - Achievements, dashboard metrics, and insights remain deferred until later modules. This module is engine-first.

## Proposed Changes

We will implement the XP Engine in five sequential phases:

### Phase 1: Pure XP Engine and Tests Only

Create the core mathematical logic for XP, levels, and source evaluation as pure functions under `src/lib/xp/`.

#### [NEW] [completion.ts](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/lib/completion.ts)

A shared file defining completion semantics for course items, extracted from the existing course-map/unit-completion logic and reused by both the XP engine and the course map model.

Required behavior:

- Preserve the current course-map completion behavior exactly.
- Do not invent a new terminal-completion set.
- If the extracted current behavior is equivalent to accepted/completed/submitted, document that after inspection.
- Add regression tests proving course-map unit completion is unchanged after extraction.
- Required week-completion XP must use this same shared helper.

#### [NEW] [engine.ts](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/lib/xp/engine.ts)

The core XP logic containing:

- Level calculation: `level = floor(sqrt(totalXp / 100)) + 1`
- XP to next level, current level floor, next level ceiling.
- Evaluation of progress milestones (`evaluateProgressXp`).
- Evaluation of media coverage blocks (`getCrossedBlocks`).
- Deterministic XP transaction IDs must be collision-resistant. If a raw sourceType/sourceId violates `entityIdSchema`, we construct a canonical key and hash it with a deterministic hash helper. Do not use lossy sanitization.

#### [NEW] [xpEngine.test.ts](file:///c:/00%20DEV/In%20Progress/ProgressPal/tests/lib/xpEngine.test.ts)

Unit tests for the XP engine verifying:

- All required boundaries (0, 99, 100, 399, 400, 900, 1600 XP).
- Monotonicity across a broad range of values.
- Clean stop and media coverage block calculation logic.
- Problem set started, submitted, and accepted milestones.
- Unit completion and final project combined milestone rules.
- Verification that different source IDs cannot collapse into the same transaction ID.

---

### Phase 2: Repository Read Helpers and XP-Aware Wrappers

Integrate the pure engine into `src/lib/db/repositories.ts` and add public repository APIs.

#### [MODIFY] [repositories.ts](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/lib/db/repositories.ts)

- Implement `listXpTransactions()`.
- Implement `getXpSummary()`.
- Implement XP-aware wrapper `upsertProgressAndAwardXp()`.
- Implement XP-aware wrapper `logMediaProgressAndAwardXp()`.
- Implement XP-aware wrapper `addStudySessionAndAwardXp()`.
- Ensure duplicate prevention: check existing transactions by `sourceId`/`sourceType` before calling `addXpTransaction()`.
- Derived values only: ensure level is never saved in the database.
- Use one Dexie transaction for each wrapper. If a wrapper cannot be fully atomic due to a real Dexie limitation, stop and document the reason, then add a regression test proving duplicate-safe rerun behavior.

#### [MODIFY] [index.ts](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/lib/db/index.ts)

Export the new repository APIs and return types.

#### [MODIFY] [repositories.test.ts](file:///c:/00%20DEV/In%20Progress/ProgressPal/tests/db/repositories.test.ts)

Add test cases for:

- Repository read APIs (`listXpTransactions`, `getXpSummary`).
- ID deduplication and atomicity of wrappers.
- Safe skips when identical sourceType + sourceId pairs already exist.
- Verification that level and total XP are derived and not persisted.

---

### Phase 3: Route Integration for Existing Explicit Save Flows

Switch the user routes from writing to the source-event stores directly to calling the new XP-aware repository wrappers.

#### [MODIFY] [ContentDetailPage.tsx](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/features/course/routes/ContentDetailPage.tsx)

- Call `upsertProgressAndAwardXp` instead of `upsertProgress`.
- Call `logMediaProgressAndAwardXp` instead of `logMediaProgress`.

#### [MODIFY] [SessionsPage.tsx](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/features/sessions/routes/SessionsPage.tsx)

- Call `addStudySessionAndAwardXp` instead of `addStudySession`.

---

### Phase 4: Minimal Copy/Doc Updates

Update placeholder screens and shell navigation status/metadata so they stop claiming XP is deferred.

#### [MODIFY] [HomePage.tsx](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/app/routes/HomePage.tsx)

Remove text saying XP is deferred; update sessions card to state they now award XP.

#### [MODIFY] [AppShell.tsx](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/app/shell/AppShell.tsx)

Update footer/header summaries stating that XP is live but achievements/insights remain deferred.

#### [MODIFY] [AchievementsPage.tsx](file:///c:/00%20DEV/In%20Progress/ProgressPal/src/features/achievements/routes/AchievementsPage.tsx)

Update copy saying achievements page is waiting for achievement engine (removing references to the XP engine).

---

### Phase 5: Full Validation and Adversarial Checks

Verify the entire system using the baseline validation and a new E2E test file.

#### [NEW] [xp.spec.ts](file:///c:/00%20DEV/In%20Progress/ProgressPal/e2e/xp.spec.ts)

Playwright E2E test verifying:

- Saving a study session (>25 mins) awards XP.
- Overlapping media watched ranges do not duplicate focused-minute XP.
- Problem set started, submitted, and accepted milestones award XP correctly.
- Reloading the app does not duplicate XP or cause additional transactions.

#### [MODIFY] [PROJECT_STATE.md](file:///c:/00%20DEV/In%20Progress/ProgressPal/PROJECT_STATE.md)

#### [MODIFY] [MODULE_CHECKLIST.md](file:///c:/00%20DEV/In%20Progress/ProgressPal/MODULE_CHECKLIST.md)

#### [MODIFY] [VALIDATION_LOG.md](file:///c:/00%20DEV/In%20Progress/ProgressPal/VALIDATION_LOG.md)

#### [MODIFY] [CHANGELOG.md](file:///c:/00%20DEV/In%20Progress/ProgressPal/CHANGELOG.md)

#### [MODIFY] [DECISIONS.md](file:///c:/00%20DEV/In%20Progress/ProgressPal/DECISIONS.md)

#### [MODIFY] [SECURITY.md](file:///c:/00%20DEV/In%20Progress/ProgressPal/SECURITY.md)

#### [MODIFY] [TEST_PLAN.md](file:///c:/00%20DEV/In%20Progress/ProgressPal/TEST_PLAN.md)

## Verification Plan

### Automated Tests

- Run `npm run test` (Vitest unit tests) proving:
  - Idempotency (duplicate evaluation does not duplicate XP).
  - No passive XP (no XP for app-open, reload, or navigation).
  - No source-store mutations during XP calculation.
  - Level is derived only (never stored as authoritative state).
  - No XP revocation or negative XP.
- Run `npm run test:e2e` (Playwright E2E tests)
- Run `npm run validate` (entire lint, format, typecheck, build, test, E2E test, circular-dependency checks, and dependency audit)

### Manual Verification

- Verify browser console output on routes with explicit saves.
