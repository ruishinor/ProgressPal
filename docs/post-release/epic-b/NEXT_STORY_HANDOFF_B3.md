# B3 handoff — session result ownership and guard

> **Historical record.** This describes the state at the time it was written. The live state, baseline and next steps are in [`docs/CURRENT_STATE.md`](../../CURRENT_STATE.md). Retained unchanged as evidence.

The DB write boundary already defines `AddStudySessionWithXpResult`.
`StudySessionSaveResult` is only a type alias in the sessions UI. Source the
alias from a neutral lib contract and retain the sessions entrypoint export
for compatibility, without leaving its definition in a UI component. Preserve
the RPG UI guard against direct DB imports and the shared
`StudySessionsSurface` save/XP/unlock behavior. This boundary was established
by the B4 full-suite finding after the first B3 commit.

Add the smallest architecture check that catches a return to feature-owned
imports for the B1/B2/B3 neutral contracts, while expressly allowing the
course-owned map/detail capabilities and intentional shared UI. Run Focus/save
outcome and architecture tests, typecheck, lint, format and circular checks.
Review ownership and runtime consumers before committing B3.
