# Next-story handoff — A5 RED gate

Next story: **A5 — Focus actual-route read boundary**  
Status: **readiness PASS; ready_for_red only**  
Readiness baseline: `4a87e68a7fe043ac394a9a6694cf95058288d055`

Do not write A5 production code until the baseline RED below has been executed and classified as valid.

## Governing A5 documents

- `A5_READINESS_ASSESSMENT.md`
- `A5_ACCEPTANCE_CONTRACT.md`
- `A5_ADVERSARIAL_READINESS_REVIEW.md`
- updated `stories.yaml`
- updated `VALIDATION_READINESS.md`

## Actual runtime ownership to target

```text
/rpg/focus
└─ RpgShell
   ├─ one accepted A4 HUD read (no study_sessions)
   └─ RpgFocusPage
      └─ StudySessionsSurface
         ├─ initial catalogue + complete ledger read
         ├─ selected itemId context
         ├─ manual/live save
         ├─ post-save ledger refresh
         └─ read-only retry/discard behavior
```

The exported `loadRpgFocusSessionSummary()` is unused by this runtime path. Do not build RED around it.

## Baseline mechanism that RED must observe

Current actual child load reaches `listStudySessions()` → `studySessions.toArray()`.

That bulk-materializes the complete `StudySession[]`, which is then parsed/sorted and transformed into a separate complete visible `SessionLedgerRow[]`.

The ledger itself is allowed complete O(`H_sessions`) visible product data. The hidden complete source-array materialization is not.

The primary valid RED therefore proves all of the following in the same actual-route evidence:

- Focus successfully renders all expected ledger rows;
- DBCore observes `study_sessions` bulk source materialization equal to session-history size;
- the acceptance contract expects zero hidden source materialization;
- the shell performs one A4 HUD read and the HUD does not touch `study_sessions`;
- passive writes are zero;
- fixture setup is outside measurement;
- probe installation occurred before the measured reader opened.

Expected failure classification: `architecture/access`.

## Separate RED/evidence roles

Do not make one test prove everything.

- semantic: ledger order/content/selected-item behavior;
- access mechanism: hidden source materialization;
- transaction coherence: one child readonly transaction, three allowed stores;
- route composition: one HUD + one child contract;
- scale/fan-out: 1k/10k sessions, one session scan/query, visible O(H), hidden 0;
- mutation outcome: one save, existing XP/achievement semantics;
- post-save/retry: one HUD refresh + one ledger refresh, committed-result preservation;
- failure propagation: initial/ledger/HUD failures remain distinct;
- passive-write: load/refresh/retry/discard write zero rows.

## Fixture/instrumentation procedure

1. Start from the exact documentation-readiness parent after it is locally integrated.
2. Use an uninstrumented writer for seed + synthetic fixtures.
3. Use the bundled course seed for real unit/item context.
4. Validate each synthetic session with `StudySessionSchema` before insertion.
5. Close the writer.
6. Create/get the measured reader for the same DB.
7. Install the DBCore probe before reader open.
8. Render actual `RpgShell` + `RpgFocusPage` + `StudySessionsSurface` from an already-ready AppState boundary; do not mock repositories.
9. Keep `getDatabaseSnapshot()` and mutation setup out of measured access/scale evidence.
10. Record transaction/query/store/scanned/materialized/visible/hidden/write/duration metrics.

If a registered failure class recurs, mark `RECURRENCE` and stop normal repair-forward work.

## Target GREEN contract after valid RED

Production work, when later authorized by valid RED, must achieve:

- child initial stores: `course_units`, `course_items`, `study_sessions` only;
- one coherent readonly child transaction;
- ≤3 child logical queries total, ≤1/store;
- selected `itemId` resolved from the coherent catalogue with no extra DB query;
- one O(H) session scan;
- complete visible ledger retained;
- zero bulk-materialized hidden session source rows;
- zero second hidden complete session array;
- one read-only post-save ledger refresh;
- one accepted A4 HUD refresh;
- unchanged save/XP/achievement/discard/retry semantics;
- no schema/index change.

## Post-save call graph to preserve

```text
save
└─ runLocalMutation(invalidateRoute:false)
   ├─ addStudySessionAndAwardXp() explicit coordinated write
   └─ AppState stable refresh
      └─ result returned
         ├─ RpgFocusPage → exactly one refreshHud()
         └─ StudySessionsSurface → exactly one ledger refresh
```

A ledger or HUD refresh failure after this point is a read failure, not a failed save.

## Branching gate

After the readiness docs are locally integrated and exact identity is recorded, create the A5 story branch from that exact readiness commit. Suggested name:

`postrelease/a5-focus-read-boundary`

The first A5 story state on that branch is RED-only. Do not include production changes in the RED commit/candidate.

## Stop conditions

Stop before production implementation if:

- baseline does not fail for hidden actual-route session source materialization/coherence;
- fixture/schema or instrumentation is invalid;
- actual route ownership differs from this handoff;
- a schema/index migration appears necessary;
- the only RED is an unused broad helper;
- integration/remote lineage changed unexpectedly;
- A4 one-HUD composition cannot be preserved.

Do not start A6.
