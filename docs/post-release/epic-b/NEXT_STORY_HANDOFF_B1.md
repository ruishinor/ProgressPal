# B1 handoff — neutral formatting and status presentation

> **Historical record.** This describes the state at the time it was written. The live state, baseline and next steps are in [`docs/CURRENT_STATE.md`](../../CURRENT_STATE.md). Retained unchanged as evidence.

Start from B0 commit on `cx/epic-b-shared-contracts`. Move the exact
`formatMinutes` implementation to `lib/time`; do not substitute the existing
`formatDurationMinutes`, which floors where `formatMinutes` rounds. Move
`CourseStatusVariant`, `getItemStatusLabel` and `getItemStatusVariant` to
`lib/progress`. Migrate real consumers to neutral imports while preserving the
old course-model exports for compatibility. Leave course item/unit labels and
course map logic in course.

Add direct tests for minute boundaries and status precedence. Run focused
course/dashboard/RPG model tests, typecheck, lint, format check and circular
check. Inspect the diff for copied logic and reverse feature imports. Commit
only after the B1 contract passes; then continue to B2.
