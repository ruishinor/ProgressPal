# Epic B / B0 — contract and story freeze

Status: **PASS_READY_FOR_B1**. B0 contains no production-code change.

The shipped baseline was established by a local fast-forward of clean `master`
to the already fetched `origin/master`. `git rev-parse HEAD` returned
`d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3` and
`git rev-parse 'HEAD^{tree}'` returned
`434f231404d02fe717a8aae93ceb4d323d845858`; the worktree was clean.
Implementation starts on `cx/epic-b-shared-contracts` from that commit.

| Story / move                                                            | Current owner and all runtime consumers                                                   | Semantic authority / target                                                                                                | Frozen behavior and oracle                                                                                                                                                                        | Direction and cycle risk                                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| B1: `formatMinutes`                                                     | course/model; course UI/detail, dashboard, insights, RPG shell/hero/home/map/module       | Generic quantity display; `lib/time`                                                                                       | Exact round/clamp/string behavior, including its difference from `formatDurationMinutes` (floor). `courseModel.test.ts` has 45/60/95 minute cases; add direct boundary cases for moved formatter. | Feature consumers point to lib. `lib/time` imports no feature.                                                         |
| B1: `CourseStatusVariant`, `getItemStatusLabel`, `getItemStatusVariant` | course/model; course/detail, dashboard, RPG model/resource                                | `ProgressStatus` presentation; `lib/progress`                                                                              | Exact labels and variant precedence, optional/blocked/submitted/accepted behavior. Existing course, dashboard and RPG model tests; add direct status matrix.                                      | Course and RPG point to lib; no reverse feature edge.                                                                  |
| B2: `CourseLongFormProgress` alias and two long-form map builders       | progress/model; course, dashboard, insights, RPG; alias is exactly `LongFormProgressView` | Existing `lib/progress` engine; use `LongFormProgressView` and move builders to `lib/progress`                             | Sorting, first asset per item, aggregate/legacy equivalence and partial completion. `progressModel.test.ts`, `courseModel.test.ts`, RPG read-boundary tests. No missing semantic oracle.          | Removes feature-to-feature progress dependency; new code uses only lib/domain and lib/progress. Check dpdm after move. |
| B3: `StudySessionSaveResult`                                            | alias defined by sessions UI, consumed by sessions UI and RPG Focus                       | Existing `AddStudySessionWithXpResult` in `lib/db`; remove UI ownership, retain compatibility alias at sessions entrypoint | Callback payload, XP and unlock behavior unchanged. Existing RPG Focus/save-outcome tests; typecheck confirms callback contract.                                                                  | RPG imports DB result type; UI sharing remains via sessions entrypoint. `lib/db` never imports features.               |

The course map builder/types and course detail builder/form rules remain in
course. They are shared course capabilities, with embedded item/unit labels and
`problem_set` workflow semantics. Their cross-feature imports are intentional.
CS50 links and achievement-category labels are deferred to Epic C. B0 rejects
moving these into a generic B module merely to lower import counts.

Acceptance sequence: B1 targeted tests, typecheck, lint, format and circular
check; B2 the same plus course/dashboard/insights/RPG model tests; B3 the same
plus Focus/save outcome tests; B4 aggregate unit, E2E, build/bundle, circular,
lint/format/typecheck and audit where reachable. No story passes from a symbol
search alone. At each boundary inspect the diff for logic copies, source
ownership, import direction and frozen product surfaces.

Adversarial checks: the two minute formatters are intentionally different;
course item/unit labels and form status rules carry CS50-shaped semantics;
long-form map ordering and legacy completion could silently drift; the session
result alias must not change the write payload. No schema, persistence format,
UI, route, XP rule, achievement rule, service worker or runtime network change
is required. No dependency is required.
