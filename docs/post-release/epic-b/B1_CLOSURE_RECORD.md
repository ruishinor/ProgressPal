# B1 closure — neutral formatting and status presentation

Status: **PASS_READY_FOR_B2**.

`formatMinutes` moved unchanged from course/model to `lib/time`. The existing
`formatDurationMinutes` remains floor-based; the moved formatter rounds.
`CourseStatusVariant`, `getItemStatusLabel` and `getItemStatusVariant` moved
unchanged to `lib/progress/statusPresentation`. Course/model retains re-exports
for existing import contracts; live consumers import from neutral owners.

Evidence:

- Focused Vitest: 6 files, 81 tests passed, 0 failures; includes direct
  rounding/clamping and status matrix, course/detail/dashboard/insights/RPG
  models.
- RPG architecture Vitest: 1 file, 3 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed, 0 warnings, after excluding the unrelated nested
  `.kilo/worktrees/**` checkout in ESLint config. The first lint invocation
  failed during parser initialization with two TSConfigRootDir candidates;
  it did not report product-code failures. Classification: environment.
- `npm run format:check`: passed after formatting one edited import block.
- `npm run check:circular`: passed, 0 cycles in 214 analyzed modules.
- `git diff --check`: passed.

Diff review found a single implementation of each moved function, no reverse
feature import, no changed status/string branch and no UI, DB, schema, route,
XP, achievement, network or dependency change. B1 did not modify course map
or detail/form semantics. No test was skipped or retried in the reported
focused runs.
