# B3 closure — session result ownership

Status: **PASS_READY_FOR_B4**.

The shared sessions surface and RPG Focus callback now type their saved result
directly as `AddStudySessionWithXpResult` from `lib/db`, where the write result
is defined. The `StudySessionSaveResult` alias remains exported from the
sessions entrypoint for compatibility, but no longer originates in a UI
component. The runtime callback and DB write code were not changed.

`sharedContracts.test.ts` checks feature source imports for the moved B1/B2/B3
symbols and permits the intentionally course-owned map/detail contracts and
shared UI capabilities. It complements the existing ESLint lib-layer boundary
and circular check; it does not attempt to prove full application semantics.

Evidence:

- Focused Vitest: 5 files, 29 tests passed, 0 failures, skips or retries.
  Includes Focus read behavior, save outcomes, sessions model and architecture.
- `npm run typecheck`, `npm run lint`, `npm run format:check`: passed.
- `npm run check:circular`: passed, 0 cycles in 216 analyzed modules.
- `git diff --check`: passed.

Source review found no result-shape copy, no changed callback payload and no
changed save, XP or unlock path. No UI, schema, route, network or dependency
change is in B3.
