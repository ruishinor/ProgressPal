# A5 Acceptance Contract — Focus actual-route read boundary

Date: 2026-09-21  
Status: **frozen for RED**  
Source baseline: A4 closure `4a87e68a7fe043ac394a9a6694cf95058288d055`  
Story state: `ready_for_red`

This contract governs A5 only. It does not authorize production edits until valid RED is proved.

## 1. Production path under contract

Actual runtime path:

`/rpg/focus` → `RpgRouteShell` → `RpgShell` → `RpgFocusPage` → shared `StudySessionsSurface`.

The shell owns one accepted A4 HUD read. The shared sessions surface owns the complete Focus catalogue/session ledger read and save/retry behavior.

`loadRpgFocusSessionSummary()` is not the runtime owner and cannot serve as the sole RED target.

## 2. Scope

A5 may change only what is necessary to establish the actual Focus read/application boundary and remove/narrow the unused broad Focus read-model surface.

In scope:

- Focus child initial data read;
- complete visible study-session ledger projection;
- selected `itemId` resolution;
- Focus ledger refresh after save/correction;
- interaction with the accepted A4 `refreshHud()` composition;
- read failure/retry behavior;
- Focus access tests/harness/evidence;
- deliberate removal or narrowing of the unused broad Focus loader/export/tests.

Out of scope:

- A6 Badges;
- UI redesign, ledger pagination or truncation;
- schema/database-version migration;
- XP or achievement rule redesign;
- redesign of the shared explicit save mutation engine;
- A1–A4 rewrites without a proved regression;
- remote push, merge or deployment.

## 3. Frozen A4 shell contract on Focus

On initial Focus load and each Focus progress-summary refresh:

- the shell uses `loadRpgHudSummary()` / `getRpgHudReadData()`;
- one readonly A4 HUD transaction is allowed;
- allowed A4 HUD stores are exactly:
  - `learner_profile`
  - `course_units`
  - `course_items`
  - `progress_entries`
  - `content_assets`
  - `content_slices`
  - `media_progress_events`
  - `resume_points`
  - `xp_transactions`
- `study_sessions` is forbidden in the HUD read;
- accepted normal HUD logical-query budget remains ≤10;
- accepted A4 source-history materialization rules remain unchanged;
- passive HUD reads write zero rows.

A5 must not replace this with a Hub read or add a second HUD read.

## 4. Focus child initial-read contract

The Focus child needs:

- the complete selectable course-unit catalogue;
- the complete selectable course-item catalogue;
- the complete visible study-session ledger.

Allowed Focus child stores:

- `course_units`
- `course_items`
- `study_sessions`

Forbidden child stores include every other persisted store. In particular, the child read must not reach `getDatabaseSnapshot()` or inherit XP/progress/achievement/media stores.

Target logical query budget:

- `course_units`: ≤1
- `course_items`: ≤1
- `study_sessions`: ≤1
- total Focus child initial-read queries: ≤3

Selected `itemId` must resolve from the already-read coherent catalogue and must not add a second `course_items` query.

Transaction expectation:

- exactly one Focus child readonly transaction over `course_units`, `course_items`, `study_sessions`;
- the shell A4 HUD transaction remains separate;
- query ordering within the child transaction is not a public contract, but the returned catalogue + ledger must represent one coherent IndexedDB read snapshot.

## 5. Visible-ledger exception and hidden-history rule

The complete session ledger is visible product data.

For a database containing `H_sessions` valid study sessions:

- source session rows scanned: `H_sessions` is allowed and expected;
- visible ledger rows retained: exactly `H_sessions` is allowed and expected;
- source session rows bulk-materialized as a hidden complete array: **0**;
- second hidden complete session array: **0**;
- hidden retained session-history rows after projection: **0**;
- session logical query count: **1**.

A cursor/stream may still be O(`H_sessions`) work. A5 must report that honestly.

The contract forbids using the visible-ledger exception to justify:

- `study_sessions.toArray()` followed by a separate complete visible projection;
- duplicate complete-ledger reads by parent/child helpers;
- shell/HUD session materialization;
- a second hidden full array for sorting or aggregation when ordering can be performed on the retained visible projection.

## 6. Ledger semantic invariants

The visible ledger must preserve the published behavior of the current shared sessions surface:

- every saved study session is represented once;
- newest first by `startedAt DESC`;
- deterministic tie-break by `id DESC`;
- unit and item titles resolve from the course catalogue, with existing ID fallback semantics preserved;
- mode label, duration label, blocker summary and notes preview preserve existing helper behavior;
- notes preview semantics remain unchanged;
- saving a study session does not mark a course item complete;
- the ledger remains complete product data even if its RPG disclosure is initially collapsed.

Expected values should come from the bundled seed and existing format/build helpers, not invented literals.

## 7. Selected `itemId` invariants

When `?itemId=<id>` is present and valid:

- the selected item is prefilled;
- its unit is locked for the entry form;
- the complete ledger is still shown; it is not filtered to the selected item;
- no extra database query is required beyond the one complete `course_items` read.

When the selected item cannot be resolved from the coherent catalogue:

- initial Focus child load fails with the existing route-level error behavior;
- no partial/incorrect locked selection is published;
- retry is read-only.

Changing `itemId` must continue to reset/reinitialize the page state as current behavior requires and must not cause a duplicate committed save.

## 8. Save and XP invariants

A5 does not redesign `addStudySessionAndAwardXp()`.

Preserve:

- one committed `study_sessions` row per valid save;
- existing save idempotency/rapid-click protections;
- current study-session XP rule: qualifying sessions at the existing `>= 25` minute threshold award the existing 10 XP transaction once per session source;
- existing achievement unlock semantics;
- save-result `xpSummary`, awarded transactions and unlocked achievements remain the authoritative immediate feedback payload;
- save failure preserves the draft and does not publish a false saved result.

The explicit coordinated save transaction may access accumulated source data as required by the existing mutation engine. That mutation access is not the passive Focus read boundary and must be measured separately if tested.

## 9. Post-save composition

After a successful Focus save:

1. `runLocalMutation(..., { invalidateRoute: false })` completes the mutation and AppState stable refresh without invalidating the route subtree.
2. The Focus page consumes the returned save result immediately.
3. Exactly one A4 `refreshHud()` request refreshes progression/next-quest feedback.
4. Exactly one Focus ledger refresh reads `study_sessions` and rebuilds the complete visible ledger using the existing catalogue.
5. No Hub read is introduced.
6. No second HUD refresh is introduced.
7. The ledger refresh does not reread the complete course catalogue in the normal post-save path.

Focus ledger-refresh access contract:

- allowed store: `study_sessions` only;
- readonly;
- ≤1 logical query;
- O(`H_sessions`) rows scanned allowed;
- source rows bulk-materialized: 0;
- visible rows retained: exactly `H_sessions`;
- writes: 0.

Session-assignment correction may perform its explicit mutation, then must use the same read-only ledger-refresh contract.

## 10. Discard contract

Discarding an in-progress live session:

- resets in-memory live-session state;
- writes zero database rows;
- does not award XP;
- does not create a study session;
- does not require a ledger or HUD refresh solely because of discard.

## 11. Failure and retry semantics

### Initial Focus child load failure

- show the existing route-level sessions error state;
- `Try again` repeats the child read;
- retry performs zero writes;
- no save is inferred or replayed.

### Ledger refresh failure after committed save

- keep the save committed;
- keep authoritative save feedback visible;
- do not roll back XP/achievement/session state;
- expose the existing session-history refresh retry;
- retry is read-only and must not create another session or XP transaction.

### HUD/progression refresh failure after committed save

- keep the save committed;
- preserve save-time XP/achievement feedback;
- expose the existing progress-summary refresh retry;
- retry calls the A4 HUD read only;
- retry performs zero writes and no additional save.

Failure layers must be classified independently (`environment / fixture / instrumentation / semantic / architecture / scale / composition / mutation / script / release / unresolved`).

## 12. Scale/fan-out contract

Required evidence dimensions: 1,000 and 10,000 valid study-session rows, with the bundled catalogue held constant.

At both scales:

- Focus child query count is constant;
- session query count is one;
- session scan count grows linearly with `H_sessions`;
- visible ledger rows grow linearly with `H_sessions`;
- hidden source session materialization remains zero;
- hidden retained complete session history remains zero;
- passive writes remain zero;
- focused read duration is recorded, not used to claim constant time.

Large-fixture creation time and React rendering time must not be reported as database read duration. Use a deliberate timeout for the known-expensive synthetic case.

## 13. Zero-passive-write contract

The following must observe `writesObserved = 0` when measured as reads:

- initial Focus load after AppState is ready;
- selected-item navigation/reload;
- initial-load retry;
- ledger refresh;
- ledger-refresh retry;
- A4 HUD refresh;
- progress-summary retry;
- discard.

Fixture construction, initialization repair/seed work, explicit save and correction mutations are not passive-read evidence and must not be mixed into this measurement.

## 14. Schema/index contract

A5 must preserve database schema version 2 and current store definitions.

Relevant current indexes are sufficient:

- `course_units`: primary key plus course/order indexes;
- `course_items`: primary key plus unit/order indexes;
- `study_sessions`: primary key plus `unitId`, `itemId`, `mode`, `startedAt`, `endedAt` indexes.

No schema/index migration is authorized by this contract.

If a proposed implementation cannot satisfy ledger semantics without a new composite index, stop A5 implementation and raise a separate schema decision instead of silently migrating.

## 15. Unused broad Focus read model

Current exact source proves `loadRpgFocusSessionSummary()` is exported/tested but not invoked by the production Focus route.

By A5 acceptance it must be either:

- removed with its obsolete export/test surface; or
- narrowed to a contract that no longer performs an all-store snapshot.

This cleanup is subordinate to actual-route correctness. It cannot establish RED or GREEN by itself.

## 16. Exact RED contract

The first accepted RED must invoke the actual Focus component composition with real repository access.

Required mechanism:

1. Create/seed/extend the database using an uninstrumented writer.
2. Validate every synthetic session against `StudySessionSchema` before insertion.
3. Close the writer.
4. Create/get a separate measured reader for the same database.
5. Install the DBCore access probe **before opening the measured reader**.
6. Render the actual `RpgShell` → `RpgFocusPage` → `StudySessionsSurface` composition from an already-ready AppState boundary; repository access itself must not be mocked.
7. Observe successful visible ledger rendering.
8. Observe the baseline `study_sessions` bulk query/toArray with `materializedRows = H_sessions`.
9. Assert the contract requires `materializedRows = 0`, while visible ledger rows still equal `H_sessions`.
10. Confirm `writesObserved = 0` and that the shell HUD did not touch `study_sessions`.

Expected baseline classification: **architecture/access RED** caused by hidden complete session-source materialization on the actual route.

Do not accept as RED:

- failure of `loadRpgFocusSessionSummary()` alone;
- invalid fixture/schema failure;
- probe installed after database open;
- fixture writes observed by the read probe;
- timeout before the target assertion;
- mocked repository behavior that never reaches the actual database;
- semantic copy mismatch unrelated to the access mechanism.

## 17. Test-role matrix

| Test                                       | Primary role          |                                                  DBCore read probe? | Mutation/setup inside measured probe? |
| ------------------------------------------ | --------------------- | ------------------------------------------------------------------: | ------------------------------------: |
| complete ledger values/order               | semantic              |                                                                  no |                                    no |
| actual route hidden source materialization | access mechanism      |                                                                 yes |                                    no |
| one HUD + one Focus child read             | route composition     |                                           only if needed for stores |                                    no |
| 1k/10k history growth                      | scale/fan-out         |                                                                 yes |                                    no |
| one child transaction                      | transaction coherence |                                                                 yes |                                    no |
| manual/live save semantics                 | mutation outcome      |                                                       no by default |      explicit mutation is the subject |
| one HUD + one ledger refresh after save    | post-save/retry       | composition instrumentation; DBCore only on read branch if isolated |          mutation measured separately |
| failed ledger/HUD refresh retries          | failure propagation   |                               no unless read access is the property |                                    no |
| passive route/retry/discard writes         | passive-write         |                                                                 yes |                                    no |

## 18. Acceptance boundary

A5 cannot move beyond `ready_for_red` until a valid baseline RED has been observed for the mechanism above.

A5 cannot be accepted until focused GREEN evidence, A1–A4 regressions, repository-native gates, isolated whole-repository validation, and exact-commit release validation satisfy the governing operating model.

No push, remote merge, deployment or A6 start is authorized by this contract.
