# Epic B / B4 — aggregate closure

Disposition: **READY_FOR_OWNER_REVIEW** as a local candidate on
`cx/epic-b-shared-contracts`. No push, PR, merge, tag, version change,
deployment or production mutation occurred. This record does not claim a
published release or a `verify:release` certification pass.

## Baseline and ownership result

B0 established clean shipped `master` at
`d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3`, tree
`434f231404d02fe717a8aae93ceb4d323d845858`. The verified RPG baseline
was 19 non-RPG feature imports in 13 files to 11 module paths. The final
source has 10 such imports in 7 files to 9 module paths; this reduction is a
consequence of ownership moves, not the acceptance criterion.

- B1: `formatMinutes` is owned by `lib/time`; status labels, variants and
  `CourseStatusVariant` are owned by `lib/progress`. Exact course-model
  re-exports preserve old internal import contracts.
- B2: long-form map builders and shared ordering helpers are owned by
  `lib/progress`, using its existing `LongFormProgressView`. The progress
  feature keeps compatibility exports and its course alias. Slice-detail and
  stop-reason presentation remain in the progress feature.
- B3: one neutral `lib/sessions` type alias points to the DB-owned save result.
  RPG Focus and the shared sessions surface use it; the sessions feature
  retains its compatibility export. The existing RPG UI prohibition on direct
  DB imports remains enforced.

The shared ProfileAvatar, AchievementsSurface, StudySessionsSurface,
InsightsSurface and SettingsSurface remain intentional cross-feature UI.
`buildCourseMap`, its view types, course-detail view/form/status rules remain
course-owned because they embed course item/unit labels or `problem_set`
workflow rules. CS50 links and programme-shaped achievement category labels
remain for Epic C. No second implementation of a moved builder or result shape
was added.

## Aggregate validation

Final code candidate (after B3 correction):

| Gate                             | Outcome                                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                   | PASS, 0 warnings.                                                                                                                                                     |
| `npm run format:check`           | PASS.                                                                                                                                                                 |
| `npm run typecheck`              | PASS.                                                                                                                                                                 |
| `npm run build`                  | PASS, 258 modules transformed. The managed E2E command rebuilt the same final production assets after the type-only B3 correction.                                    |
| `npm run check:bundle`           | PASS, 0 violations; largest JS chunk 386,204 raw bytes against 500,000 budget.                                                                                        |
| `npm test`                       | PASS, 71 files / 717 tests, 0 failed, skipped or retried in final run.                                                                                                |
| `npm run test:e2e`               | PASS, 74/74 tests in final managed run, 0 skips or retries. Includes Classic/RPG flows, accessibility, visual captures, offline, storage coordination, backup and XP. |
| `npm run check:circular`         | PASS, 0 cycles in 217 analyzed modules.                                                                                                                               |
| `npm run audit`                  | PASS, 0 vulnerabilities reported at moderate threshold.                                                                                                               |
| `git diff --check master...HEAD` | PASS before this documentation commit.                                                                                                                                |

Earlier attempts and classifications:

1. The first B4 `npm test` run had 716 passes and one architecture failure:
   RPG Focus imported a DB type directly. Classification: **architecture / B3
   implementation**. A neutral `lib/sessions` type alias resolved it without
   weakening the existing test. Focused corrective tests passed 27/27, and
   the full suite then passed 717/717.
2. The first managed E2E run passed 62 tests and failed 12 historical visual
   capture specs with `EPERM` on writes under `artifacts/`. Classification:
   **environment / sandbox filesystem**. A unique write probe succeeded
   outside the sandbox. Prior captures were preserved in
   `artifacts/epic-b-visual-review-before-validation.zip`; the unchanged
   standard E2E command then passed 74/74 with write access. No visual test
   assertion or product code was weakened.
3. B1's first lint attempt failed because an existing nested `.kilo/worktrees`
   checkout created two parser root candidates. Classification:
   **environment / tooling**. ESLint excludes that nested worktree; the normal
   `npm run lint` gate then passed. One edited import block needed Prettier.

Playwright emitted `NO_COLOR`/`FORCE_COLOR` environment warnings in both E2E
runs; they did not alter test results. No final test skips or retries were
reported. The pre-existing hard-reload RPG preparation flash and service-worker
console rejection were not investigated or changed in Epic B. The final run
did not include a separate manual pixel comparison of visual captures; Epic B
made no CSS, asset or UI layout change.

## Diff boundary and owner effort

All tracked changes are in `docs/post-release/epic-b/`, `eslint.config.js`,
the feature modules that consume or formerly owned the contracts, the neutral
`src/lib/progress/`, `src/lib/sessions/`, and `src/lib/time/` modules, and three
focused test files. `git diff --name-only master...HEAD` is the exact path
inventory. No database schema, persisted entity, seed, route, style, asset,
package/lockfile, service worker, XP/achievement engine, backup format or
network boundary changed.

Owner-effort count during execution: **0 clarification or debugging requests**.
Owner review is the next decision. Publication remains separate and
unauthorized. The B3 corrective commit records a process lesson: focused
checks for a cross-layer type move must include the existing architecture
guard for the destination UI, even when the import is type-only. The B4 E2E
retry was for a proven write-access difference, not a repeated product test
guess.
