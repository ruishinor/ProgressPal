# B3 closure — session result ownership

Status: **PASS_READY_FOR_B4**.

The shared sessions surface and RPG Focus callback use
`StudySessionSaveResult` from neutral `lib/sessions`. That type re-exports the
existing `AddStudySessionWithXpResult` from `lib/db`, where the write result is
defined. The sessions entrypoint retains its type export for compatibility;
the alias no longer originates in a UI component. The runtime callback and DB
write code were not changed.

`sharedContracts.test.ts` checks feature source imports for the moved B1/B2/B3
symbols and permits the intentionally course-owned map/detail contracts and
shared UI capabilities. It complements the existing ESLint lib-layer boundary
and circular check; it does not attempt to prove full application semantics.

Evidence:

- Initial focused Vitest: 5 files, 29 tests passed, 0 failures, skips or
  retries. This set omitted `rpgFeature.test.ts` and did not detect the
  type-only DB import from RPG Focus.
- `npm run typecheck`, `npm run lint`, `npm run format:check`: passed.
- `npm run check:circular`: passed, 0 cycles in 216 analyzed modules.
- `git diff --check`: passed.

The B4 full run then failed its RPG UI architecture test: 70 files and 716
tests passed, one test failed on `RpgFocusPage.tsx` importing `@/lib/db`.
Classification: architecture, caused by B3. The run was stopped after this
result. The correction put one type alias in `lib/sessions` and kept the
existing guard intact. Corrective test and aggregate evidence are recorded in
the B4 closure record; the original focused B3 result alone is insufficient.

Source review found no result-shape copy, no changed callback payload and no
changed save, XP or unlock path. No UI, schema, route, network or dependency
change is in B3.
