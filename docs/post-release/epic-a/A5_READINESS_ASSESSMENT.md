# A5 Readiness Assessment — Focus actual-route read boundary

Date: 2026-09-21  
Disposition: **PASS — ready_for_red only**  
Implementation authorization: **NO**  
A6 authorization: **NO**

## 1. Evidence identity and authority

This assessment uses the planning package as normative authority and `ProgressPal_A5_readiness_context_4a87e68a.zip` as the sole current-source evidentiary authority.

Exact source identity recorded by the readiness export:

- integration branch: `postrelease/01-read-architecture`
- A4 closure HEAD: `4a87e68a7fe043ac394a9a6694cf95058288d055`
- accepted A4 implementation: `1bcd1e20374d230cf7425aec91f96ad5c960a3b1`
- accepted A4 implementation tree: `a9c25fd7af7020dbb78402d1c699b8800a20b7b7`
- published `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- published tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`
- published deployment: `dpl_H2GkappEu6QPT9w6WYZDw57LdBrr`
- A5 branch created: false
- A5 production code modified: false
- Node: `v24.19.0`
- npm: `11.10.1`

No current-source fact below is reconstructed from historical chat memory.

## 2. Readiness verdict

A5 is ready for a RED-only phase.

The actual Focus ownership is now unambiguous, the A4 shell composition is compatible with A5, the current schema can support the required visible ledger without migration, and a valid mechanism RED can be designed without contaminating fixture or mutation setup.

The production defect to observe is narrower than “Focus does a broad snapshot.” The actual route does **not** call the exported `loadRpgFocusSessionSummary()` at runtime. Instead, the shared `StudySessionsSurface` bulk-materializes the complete `study_sessions` source array and then derives a second complete visible ledger projection. The complete visible ledger is legitimate product data; the hidden complete source-array materialization is the A5 read-boundary target.

A secondary architecture issue is that initial child data is assembled by independent repository reads rather than one explicit coherent Focus child transaction; selected `itemId` then performs a redundant second `course_items` lookup after the complete item catalogue was already loaded. These are separate RED roles and must not be conflated with the primary materialization RED.

## 3. Stop-rule evaluation

| Stop rule | Result | Evidence/disposition |
|---|---|---|
| exact current source unavailable | clear | exact A5 export is present and identifies `4a87e68a...` |
| actual Focus composition materially differs and is unreconciled | clear | post-A4 composition reconstructed below |
| visible ledger ownership ambiguous | clear | shared `StudySessionsSurface` owns and renders the complete ledger |
| schema/index migration appears necessary | clear | no migration is required for a complete ledger scan plus visible-row ordering |
| instrumentation interferes with mutation semantics | clear if contract followed | fixtures/mutations must use an uninstrumented writer; measured reader is separately opened and probed before open |
| RED targets unused helper | clear | primary RED targets actual `RpgShell` → `RpgFocusPage` → `StudySessionsSurface` path |
| lineage changed unexpectedly | clear | export identity matches required A4 closure lineage |
| lessons-learned controls cannot be satisfied | clear | controls are mechanically specified in the acceptance contract |

If any of these facts changes before RED is run, readiness must be re-evaluated.

## 4. Actual production call graph

### 4.1 Initial `/rpg/focus` load

```text
router
└─ RpgRouteShell
   └─ app-state ready boundary
      └─ RpgShell
         ├─ pathname is a non-Hub/non-Hero RPG child → loadMode = "hud"
         ├─ refreshHud()
         │  └─ loadRpgHudSummary()
         │     └─ getRpgHudReadData()
         │        └─ one accepted A4 readonly transaction
         │           stores: learner_profile, course_units, course_items,
         │                   progress_entries, content_assets, content_slices,
         │                   media_progress_events, resume_points, xp_transactions
         │           study_sessions: NOT TOUCHED
         └─ Outlet → RpgFocusPage
            └─ StudySessionsSurface variant="rpg"
               └─ useEffect(prefilledItemId, reloadToken)
                  └─ loadSessionsPageData(prefilledItemId)
                     ├─ listCourseUnits() → complete course_units toArray
                     ├─ listCourseItems() → complete course_items toArray
                     ├─ listStudySessions() → complete study_sessions toArray
                     │  ├─ schema parse into another complete array
                     │  └─ sortStudySessions() clones/sorts complete array ASC
                     ├─ buildSessionCatalog(units, items)
                     ├─ buildSessionLedgerRows(sessions, catalog)
                     │  ├─ clones complete sessions array
                     │  ├─ sorts startedAt DESC, then id DESC
                     │  └─ maps to complete visible SessionLedgerRow[]
                     └─ when itemId is present/nonblank:
                        └─ getCourseItem(itemId) → second course_items lookup
                           └─ locks unit and prefills selected item
```

The A4 HUD branch and Focus child branch are separate. The shell HUD does not materialize or scan `study_sessions` on Focus.

### 4.2 Visible-ledger ownership

`StudySessionsSurface` renders `ledgerRows` as the complete saved-session list (`Review saved sessions (N)`), newest first. The ledger is not filtered by selected `itemId`.

Therefore:

- complete visible ledger rows retained: O(`H_sessions`) — allowed;
- complete source `StudySession[]` materialized by `toArray()`: O(`H_sessions`) — hidden read-boundary work and the primary A5 target;
- additional complete-array parsing/sorting/cloning occurs before the visible projection — further evidence that the current route holds more complete-history representation than the UI requires.

The visible-ledger exception does not convert those hidden source arrays into visible product data.

### 4.3 Selected `itemId`

`itemId` comes from the query string. It does not narrow the ledger. It changes the entry form context:

- the item must exist;
- the selected item becomes the prefilled task;
- its unit becomes locked;
- a missing item fails the initial child load and displays the route error state.

Current source loads the complete item catalogue first and then calls `getCourseItem(itemId)` separately. A5 can resolve the selected item from the already coherent catalogue without a second query; that is the frozen target unless new evidence proves a separate lookup is required.

### 4.4 Initial-load failure and retry

A child-load failure sets the shared sessions surface to the error state. `Try again` increments `reloadToken`, which repeats `loadSessionsPageData()`.

The retry is a read path. It must not write.

The shell HUD owns its own A4 loading/error/retry behavior and remains a separate read composition.

### 4.5 Save path

```text
StudySessionsSurface manual/live save
└─ validate against in-memory SessionCatalog
   └─ runLocalMutation(..., { invalidateRoute: false })
      ├─ addStudySessionAndAwardXp(input)
      │  └─ explicit coordinated RW transaction over:
      │     study_sessions, xp_transactions, course_items, course_units,
      │     progress_entries, content_slices, media_progress_events,
      │     achievement_unlocks, app_meta, learner_profile
      │     ├─ save one session source event
      │     ├─ award study-session XP when existing rule qualifies
      │     ├─ evaluate achievements
      │     └─ calculate stored XP summary
      └─ AppState requestRefresh({ invalidateRoute: false })
         └─ stable app-state refresh; route subtree is not invalidated

successful result returns to StudySessionsSurface
├─ onProgressSaved(result)
│  └─ RpgFocusPage.handleProgressSaved(result)
│     └─ refreshProgressSummary(...)
│        └─ refreshHud() → exactly one accepted A4 HUD refresh
└─ refreshSessionHistory()
   └─ listStudySessions()
      └─ current baseline bulk-materializes full source session history again
```

The explicit save mutation is not passive A5 read evidence. In particular, the shared achievement evaluation may inspect accumulated source data during the mutation. A5 must not “fix” that mutation engine merely to make a passive-read probe look cleaner.

### 4.6 Post-save failures and retries

Two independent read refreshes can fail after a committed save:

1. session-ledger refresh;
2. A4 HUD/progression refresh.

Current behavior correctly treats the save as committed even if either read refresh fails.

- ledger failure exposes `Refresh session history`; retry is read-only;
- HUD/progression failure exposes `Refresh progress summary`; retry is read-only;
- neither retry may re-run `addStudySessionAndAwardXp()`;
- no second Hub/HUD refresh is permitted.

### 4.7 Discard

Discarding an in-progress live timer resets in-memory state through `discardLiveSession()`. It does not save a study session and must remain zero-write.

## 5. Current read/access composition after A4

### A4 shell branch on Focus

Accepted and frozen:

- one HUD logical read;
- one readonly transaction;
- nine stores;
- normal budget ≤10 logical operations;
- no `study_sessions` access;
- zero passive writes;
- accepted media/XP history handling remains unchanged.

### Focus child initial load

Current baseline source:

- `course_units`: complete read;
- `course_items`: complete read;
- `study_sessions`: complete `toArray()` source materialization;
- optional selected `itemId`: additional `course_items.get()`;
- no explicit transaction encloses the three initial child repository calls, so their coherence is not guaranteed by `Promise.all`.

### Focus child ledger refresh

Current baseline source:

- `study_sessions`: one complete `toArray()` source materialization;
- current catalogue is reused;
- no course catalogue reread.

## 6. Current schema and indexes

Relevant current indexes:

- `course_units`: `&id, courseId, [courseId+order], type, required`
- `course_items`: `&id, unitId, [unitId+order], type, required`
- `study_sessions`: `&id, unitId, itemId, mode, startedAt, endedAt`
- `xp_transactions`: `&id, sourceType, sourceId, awardedAt`

The visible Focus ledger intentionally contains every study session. A full O(`H_sessions`) scan is therefore legitimate. A5 does not need a new filter index to avoid the scan.

The published ledger order is `startedAt DESC`, then `id DESC`. The current schema has `startedAt` but not a composite `[startedAt+id]` index. This does **not** justify a migration: exact deterministic ordering can be applied to the retained visible ledger rows after streaming/projection. If implementation work later claims a composite index or schema version change is required, stop and make that a separate decision.

## 7. Unused broad Focus loader

`loadRpgFocusSessionSummary()` remains exported and calls the broad snapshot reader (`getDatabaseSnapshot()` via `readSnapshot()`). Current-source search finds production declarations/exports and tests, but no runtime route call from `RpgFocusPage` or `StudySessionsSurface`.

Disposition:

- its non-use is proved for the exact A4 closure source;
- it is not a valid sole RED target;
- A5 GREEN may remove it or narrow it deliberately so the exported surface no longer preserves a misleading broad-snapshot path;
- semantic tests using it must be updated deliberately, not used as scale evidence.

## 8. Exact RED mechanism to freeze

Primary RED role: **access mechanism** on the actual Focus route composition.

The baseline must fail because the actual Focus child path reaches `listStudySessions()` and DBCore observes `study_sessions` bulk query/toArray materialization of the complete source history (`materializedRows = H_sessions`) before the complete visible ledger is projected.

The same run must prove that:

- the actual UI still exposes exactly `H_sessions` visible ledger entries;
- the A4 shell branch performs its one HUD read and does not touch `study_sessions`;
- fixture setup was not measured;
- the probe was installed on the measured reader before that reader was opened;
- writes observed during passive initial load are zero.

That is an `architecture/access` RED. A semantic failure, invalid fixture, timeout, late probe installation, or broad helper failure is not valid A5 RED.

Separate tests must own separate roles:

- **transaction coherence:** prove the child read is one coherent readonly transaction over `course_units`, `course_items`, `study_sessions` and selected `itemId` does not create a fourth query;
- **route composition:** prove actual `RpgShell` → `RpgFocusPage` → `StudySessionsSurface` uses one A4 HUD read plus one child read contract;
- **scale/fan-out:** prove one session scan and constant logical query count at 1,000 and 10,000 session rows, while reporting O(H) scan and visible-row growth honestly;
- **semantic:** prove complete ledger values/order/labels and selected-item behavior without DBCore mutation instrumentation;
- **post-save/retry:** prove one committed save, one HUD refresh, one ledger refresh, committed-result preservation, and read-only retries;
- **passive-write:** prove initial load, navigation/reload, history refresh, and retries observe zero writes.

## 9. Harness design required before RED execution

1. Build fixtures with an uninstrumented writer database.
2. Seed from the real bundled course seed; do not invent course-unit/item expectations where source values exist.
3. Parse/validate every synthetic study session with the real `StudySessionSchema` before insertion. Required shape includes valid entity IDs, ISO timestamps, nonnegative finite duration, a valid session mode, `blockers`, and `endedAt >= startedAt`.
4. Close the fixture writer.
5. Obtain/create a separate reader for the same database.
6. Install `installDatabaseAccessProbe(reader)` **before** `reader.open()`.
7. Render the actual Focus production component composition after app-state startup is logically complete. It is acceptable to provide a stable mocked AppState coordination boundary so startup initialization is not measured; repository reads themselves must remain real.
8. Keep setup/mutation probes separate from passive read probes.
9. For 10,000-row scale evidence, use a deliberate timeout and record focused read duration separately from fixture construction and, where appropriate, from React DOM rendering cost.
10. Do not use `getDatabaseSnapshot()` inside measured scale/access evidence.

No currently documented failure class has recurred in this readiness analysis. If fixture contamination, late DBCore installation, unused-helper RED, or another registered failure class recurs during RED execution, label it `RECURRENCE` and stop normal patch-forward work.

## 10. Evidence metrics required

For each relevant Focus read, record:

- transaction count/mode/store set;
- logical query count and query count by store;
- `study_sessions` rows scanned;
- `study_sessions` source rows materialized;
- visible ledger rows retained/rendered;
- hidden retained session rows;
- catalogue rows retained where relevant;
- writes observed;
- focused read duration for scale cases.

Expected successful scale shape is not constant time:

- session rows scanned: O(`H_sessions`);
- visible ledger rows retained: exactly O(`H_sessions`);
- hidden source session rows materialized: 0;
- hidden complete session arrays retained: 0;
- session query count: constant (one per child read/refresh).

## 11. Readiness risks and boundaries

- Do not absorb the explicit save/achievement mutation engine into A5 merely because it can inspect history during a write.
- Do not redesign the Focus UI or paginate/truncate the complete ledger; the complete ledger is frozen visible product data for this story.
- Do not convert O(H) visible ledger work into a misleading “constant-time” claim.
- Do not reintroduce `study_sessions` into the A4 HUD.
- Do not turn selected `itemId` into a ledger filter.
- Do not weaken repository tooling because of `.kilo/worktrees/nova-carnation`; authoritative whole-repository validation remains isolated-clone work.
- Do not start A6.

## 12. Readiness conclusion

**PASS — A5 may proceed to RED-only work after the documentation-only readiness state is integrated.**

A5 is not authorized for production implementation until the baseline RED suite has been executed and the failure has been classified as the intended actual-route mechanism failure.
