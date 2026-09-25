# B3 handoff — session result ownership and guard

The DB write boundary already defines `AddStudySessionWithXpResult`.
`StudySessionSaveResult` is only a type alias in the sessions UI. Use the DB
result type directly in the shared sessions surface and RPG Focus callback.
Retain the sessions entrypoint's `StudySessionSaveResult` export as a type alias
to the DB result for compatibility, without leaving its definition in a UI
component. Preserve the shared `StudySessionsSurface` and all save/XP/unlock
behavior.

Add the smallest architecture check that catches a return to feature-owned
imports for the B1/B2/B3 neutral contracts, while expressly allowing the
course-owned map/detail capabilities and intentional shared UI. Run Focus/save
outcome and architecture tests, typecheck, lint, format and circular checks.
Review ownership and runtime consumers before committing B3.
