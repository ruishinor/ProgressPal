# A7 aggregate acceptance contract and coverage

Frozen before A7 production edits on 2026-09-25. Authority: the owner's overnight
goal and SPEC AC-01 through AC-13; no new product behavior is authorized.

Readiness baseline: clean `postrelease/01-read-architecture`, A6 closure
`bb6c3e052bdeeba3734e96dfc2f657e26c0b2e7e`, tree
`00af8b4b80c8c125f650152785e955eb733e206b`. A6 implementation
`d7c591e6c2fc15475f375007705b717b203b00dd` passed its fresh native exact-commit
release gate (673 unit/integration, 74 E2E, 21 commands, zero warnings/retries/skips).

## Acceptance matrix (criteria frozen)

| Criterion                  | Required observable evidence                                                                                                                          | Planned evidence                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| AC-01 values and errors    | Published builder equivalence, missing IDs, current reward/media state, fallback and errors; actual Focus/Badges behavior                             | Existing A1–A6 suites; A7 malformed-row and projection-error cases                                     |
| AC-02 passive behavior     | All 14 stores equal before/after every actual covered route; zero writes                                                                              | A7 actual-route matrix with independent fixture writer and DBCore probe                                |
| AC-03 actual path          | Hub, Map, Module, Resource, Focus, Badges, Hero render through real route and shell                                                                   | A7 actual-route matrix; no loader mocks                                                                |
| AC-04 stores               | Exact logical-read store sets, no backups/app_meta/persisted definitions, query budgets                                                               | A7 actual-route transaction/operation assertions plus existing probe calibration                       |
| AC-05 memory               | Zero hidden full history source arrays; Focus returned ledger is the documented exception; top-five/matched rewards and media interval state explicit | A1–A6 scale/source review and A7 probe assertions                                                      |
| AC-06 scans                | Report 1k/10k scans for every touched append-only store; disclose O(H) behavior                                                                       | Existing A1–A6 scale evidence, extended A4 HUD/Hero evidence where absent                              |
| AC-07 fan-out              | Constant queries for 1x/10x history and catalogue, no per-item/asset N+1                                                                              | Existing Map/Module/Resource suites plus A7 Hub/Hero/HUD catalogue and history checks                  |
| AC-08 coherence            | One readonly transaction per logical read; barrier prevents hybrid committed state                                                                    | Existing Map/Module/Resource/Badges barriers plus A7 Hub/Hero/HUD barrier cases                        |
| AC-09 baseline/scale       | Retained valid published-path RED; candidate 1k/10k fixtures include all three histories                                                              | A1 closure RED and current A1–A6 regression results; no redundant published-baseline rerun             |
| AC-10 backups              | All-store export/restore round trip, reset atomicity, failure rollback and compatibility                                                              | Existing repositories, backup, backupCompatibility and E2E suites; snapshot remains legitimate         |
| AC-11 mutation consistency | Resource and Focus save summaries equal subsequent Hub/Badges; once-only XP/unlocks, committed progress and no passive compensation                   | A7 post-save read assertions plus existing saveOutcomes/repository suites                              |
| AC-12 freeze               | No schema/index/version/migration, backup format, rule, UI/copy/nav, service worker or dependency changes                                             | Exact aggregate diff against accepted baseline and production allowlist review                         |
| AC-13 validation           | Exact bytes, Node 24/npm 11, clean native release with tracked review hash                                                                            | Isolated candidate gates, byte-verified apply, implementation commit, fresh exact-commit release clone |

## Route contracts

Map/Module use eight course-state stores and at most eight operations; Resource
uses those stores and at most nine operations. HUD adds learner_profile and is
bounded by ten operations. Hub adds study_sessions to the HUD stores and is
bounded by eleven; Hero additionally includes achievement_unlocks and is bounded
by eleven. Focus child reads exactly course_items/course_units/study_sessions
with three operations. Badges child reads exactly achievement_unlocks and
xp_transactions with two operations. Hub supplies its shell state; Hero has no
extra HUD read. The other five routes retain one separate HUD read. Separate
logical readers are not asserted to share a transaction.

## Readiness findings and repair boundary

OBSERVED: earlier streaming callbacks parse rows inside Dexie `.each`; A6's
malformed-tail test established that this installed Dexie version can swallow
callback exceptions. INFERRED until A7 RED: earlier reads could return partial
summaries/ledgers on malformed rows. Test real database reads before editing.
If confirmed, repair only propagation at affected passive cursor boundaries;
preserve queries, scanned rows, state retention, and all valid-data semantics.
Do not reopen accepted feature design or globally ban snapshots.

Acceptance is local only. Remote CI, push, PR, merge, tags and deployment are
outside the owner's authorization. Stop after A7 acceptance and documentation
closure; Epic B is not started.

## Executed candidate evidence

AC-01 through AC-12: candidate checks PASS. Full isolated validation PASS;
AC-13 remains pending exact-byte apply and fresh exact-commit release
certification. This record does not itself accept the story.

- A7 baseline RED: 17 expected failures and one passing A6 Badges control.
  Each corrupted row first passed the real scoped reader while valid; the same
  invalid data failed the completeness reader. Failure mechanism was swallowed
  callback errors, not a symbol/loader mock or arbitrary timing threshold.
- Corrected error and actual-route tests: 25/25. Preservation plus expanded A4
  history tests: 13/13. Coupled A1–A7/probe/repository/backup/save-outcome run:
  209/209 tests in 15 files, zero skips/retries.
- Preflight formatter, lint, typecheck, production build, bundle and circular
  checks PASS. Native release utility tests 10/10 and bundle utility tests 2/2.
  Dependency audit: zero vulnerabilities.
- Full isolated unit/integration: 706/706 tests across 69 files (253.70 s).
  Production E2E: 74/74 (4.4 min), covering offline startup, backup/export/reset/
  restore, local storage coordination, accessibility, responsive routes and
  real Resource/Focus saves. No test retry or skip was used.
- The retained published A1 RED was inspected again, including actual 1k/10k
  broad-store and history-materialization failures. Original log:
  `C:\Users\alex_\AppData\Local\ProgressPal\evidence\A1-20260920-225049-RED-baseline.log`;
  SHA256 `7ECC875FC69851539F325AE1B586294027C5978050870834610F7B8410F83693`.

### Actual route composition

Measured with real route components, real shell and real IndexedDB access.
Fixture initialization is outside measurement. Every row below has zero writes,
zero forbidden-store accesses and all 14 stores equal before/after rendering.

| Route    | Transactions | Total queries including HUD |          Child queries | Hidden full-history materialization |
| -------- | -----------: | --------------------------: | ---------------------: | ----------------------------------: |
| Hub      |            1 |                          11 | 11 (also supplies HUD) |                                   0 |
| Map      |            2 |                          18 |                      8 |                                   0 |
| Module   |            2 |                          18 |                      8 |                                   0 |
| Resource |            2 |                          19 |                      9 |                                   0 |
| Focus    |            2 |                          13 |                      3 |     0; full visible ledger retained |
| Badges   |            2 |                          12 |                      2 |                                   0 |
| Hero     |            1 |                          11 |      11 (no extra HUD) |                                   0 |

### Remaining A4 scale and coherence gaps closed

Each fixture contains the stated count in all three append-only stores. Values
below are observed cursor visits, not a claim of constant-time work. Hidden
source materialization and writes were zero throughout.

| Surface | History count | Queries | Media scanned | Sessions scanned | XP scanned | Read ms (this run) |
| ------- | ------------: | ------: | ------------: | ---------------: | ---------: | -----------------: |
| HUD     |         1,000 |      10 |         1,000 |                0 |      1,000 |                 27 |
| HUD     |        10,000 |      10 |        10,000 |                0 |     10,000 |                288 |
| Hub     |         1,000 |      11 |         1,000 |            1,000 |      1,000 |                 46 |
| Hub     |        10,000 |      11 |        10,000 |           10,000 |     10,000 |                361 |
| Hero    |         1,000 |      11 |         1,000 |            1,000 |      1,000 |                 42 |
| Hero    |        10,000 |      11 |        10,000 |           10,000 |     10,000 |                459 |

Catalogue expansion covers units, items, assets and slices, including 68 to 680
items and 31 to 310 assets. HUD/Hub/Hero query counts remain 10/11/11 at both sizes;
results equal published builders. New barriers pause the actual readers after
catalogue/profile reads and before the media cursor, then attempt an atomic
profile/XP update. The writer is blocked until read release; complete before and
after summaries match the corresponding committed snapshots. Existing
Map/Module/Resource/Badges barriers remain green.

Resource and Focus saves each produce XP and unlocks. Subsequent Badges returns
the exact saved XP summary; Hub returns the same total/level/next-level XP and
matches the published snapshot builder. Resource shows committed progress;
Focus contributes the committed session totals. Repeated saves create no new
XP/unlocks; intervening reads leave every store unchanged.

### Scope and residual limitations

A7 production changes only `src/lib/db/repositories.ts`: one private error guard
and eleven affected passive cursor call sites. Predicates, logical transactions,
valid-row calculations and retention bounds are preserved. The A6 cursor remains
unchanged. No mutation implementation is changed.

Aggregate source review against the published baseline confirms schema/indexes,
domain schemas, backup format, achievement definitions/rules, styles, assets,
navigation configuration, service worker and package/lockfile bytes unchanged.
Earlier accepted XP/progress changes expose existing preview/aggregate logic;
they do not change award thresholds or amounts. Settings export and restore's
final invariant check retain full snapshots. The exported broad Badge loader is
unused by production routes; it is deferred, not misrepresented as a narrowed
boundary.

Allowed scans remain O(H); exact disjoint media interval state can grow with
history. Focus retains its full visible ledger. Synthetic data and local
fake-indexeddb/browser evidence do not certify remote hosting or real learner
datasets. No remote validation or publication has been performed.

### Failures and retrospective

The first cursor guard used a native async wrapper. Direct error cases passed,
but all seven real routes exposed premature Dexie commits. A one-route
discriminator passed with exact baseline source; preserving Dexie's own promise
chain corrected the candidate (one production correction round). This is why
actual composition and coherence cannot be replaced by direct loader tests.

A test-only Resource property typo was caught by typecheck and corrected to the
inspected `progressStatus` contract. Native command/path mistakes were corrected
at the command layer; no wrapper was added. A read-only aggregate historical diff
used the authoritative checkout when the disposable clone lacked an old object.
The approval reviewer temporarily exhausted usage during branch creation; after
fresh usage showed availability, the same escalation succeeded. No approval
check was bypassed. Failed diagnostic evidence is retained externally; filtered
diagnostic tests are not counted as clean gate passes.

The installed Vitest automatically selects its agent reporter, which suppresses
successful-test console evidence. Source inspection identified this behavior;
the existing evidence flags plus the native verbose reporter capture the actual
metrics. This reporting issue did not invalidate assertions or justify a source
change. Future evidence runs should specify the reporter before a long run.

External run evidence directory:
`C:\Users\alex_\AppData\Local\Temp\progresspal-codex-overnight-20260924`.
Relevant records: `a7-baseline-red.log`, `a7-routes.log`,
`a7-route-baseline-discriminator.log`, `a7-corrected-focus.log`,
`a7-preservation.log`, `a7-coupled.log`, `a7-measured-evidence.json`, `run.log`.
