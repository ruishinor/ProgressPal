# Epic C / C0 — migration-readiness contract

Status: **CONTRACT DEFINED; MIGRATION NOT AUTHORIZED**. This contract is the
entry gate for the persistence story (C6). No schema migration was written in
C0. Labels: [F] fact, [I] inference, [D] proposed decision, [O] owner decision,
[X] deferred.

## 1. Entry preconditions (all required before C6 implementation)

| ID    | Precondition                                                 | Why                                                                                                 |
| ----- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| MR-0a | Owner answers OD-1 to OD-5 (`C0_DECISIONS_AND_DEFERRALS.md`) | They decide which stores gain explicit programme ownership                                          |
| MR-0b | An accepted schema-change decision record exists             | [F] `AGENTS.md` forbids schema changes without an accepted decision                                 |
| MR-0c | C1–C5 accepted                                               | C1 oracles, C3 rule extraction and C5 scoped reads must exist so the migration changes storage only |
| MR-0d | A realistic schema-2 fixture set exists (see §4)             | [F] only a v1→v2 fixture and two envelope-1/schema-2 backup fixtures exist today                    |

## 2. Required properties

| ID    | Property                                                                                                                                                                                                                                                                                                                                                                                                                                      | Acceptance evidence                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| MR-1  | **Explicit ownership.** After upgrade every learner row resolves to exactly one programme or is declared learner-global (P-4).                                                                                                                                                                                                                                                                                                                | Invariant test over the migrated fixture; zero unresolved rows.           |
| MR-2  | **Enrolment / active state.** A legacy database becomes enrolled in and active on `cs50x-2026` if, and only if, it has CS50 catalogue rows or a completed onboarding. A fresh database follows the onboarding decision (OD-3).                                                                                                                                                                                                                | Upgrade tests for fresh, onboarded-empty and progressed databases.        |
| MR-3  | **Per-programme catalogue version.** Legacy `app_meta.seedVersion` maps to the `cs50x-2026` catalogue state; sync never silently downgrades (P2).                                                                                                                                                                                                                                                                                             | Red test from probe P2, then green.                                       |
| MR-4  | **Legacy compatibility.** No CS50 ID is re-keyed (P-2); the database name is unchanged (P-1); v2 rows remain byte-identical except explicitly added fields.                                                                                                                                                                                                                                                                                   | Before/after row diff over the fixture.                                   |
| MR-5  | **Idempotency.** Running the upgrade logic twice, or re-opening an upgraded database, writes nothing and changes no value.                                                                                                                                                                                                                                                                                                                    | Double-run test; write counter via `tests/db/accessProbe.ts`.             |
| MR-6  | **No duplicate XP or rewards.** The migration writes no `xp_transactions` or `achievement_unlocks`; award source keys are unchanged; post-upgrade saves award nothing already earned. Backup/restore rejects duplicate `(sourceType, sourceId)` (P5 gap).                                                                                                                                                                                     | Ledger equality + "save every completed item again" test awards 0 XP.     |
| MR-7  | **No progress crossover.** With a test-only second programme fixture, completion, recommendations, `course_required_completed`, reward labels and XP previews of each programme are unaffected by the other (P3).                                                                                                                                                                                                                             | Isolation tests in both directions.                                       |
| MR-8  | **Backup/export compatibility.** Export writes the new schema version. Import accepts the existing `v1.2.0-envelope1-schema2.json` and `v1.3.0-envelope1-schema2.json` fixtures through one pure, tested schema-2 → new-schema transform that applies the same rules as the database upgrade, followed by full invariant validation. [F] `parseBackupFile` currently requires an exact schema match, so this path must be added deliberately. | Fixture round trips; malformed/adversarial matrix still rejects.          |
| MR-9  | **Forward incompatibility is explicit.** A v1.3.0 app cannot read a new-schema backup; the learner-facing message stays the existing "different data version" rejection.                                                                                                                                                                                                                                                                      | Documented in the compatibility matrix; test in the old-format direction. |
| MR-10 | **Restore / recovery.** Restore of an old backup into an upgraded database is atomic and ends in the same state as upgrading that database in place. Reset still re-seeds and re-enrols correctly.                                                                                                                                                                                                                                            | Equivalence test: restore(old) == upgrade(old).                           |
| MR-11 | **Switching programmes.** Switching writes only enrolment/active state; it creates no progress, XP or unlocks and needs no re-seed of the other programme.                                                                                                                                                                                                                                                                                    | Write-probe test.                                                         |
| MR-12 | **Partial or malformed state fails closed.** The Dexie upgrade runs in the version-change transaction and aborts atomically on any error; the app then shows its existing error state and no half-migrated database is persisted. Rows the upgrade cannot attribute cause an abort, not a guess.                                                                                                                                              | Injected-failure tests (same pattern as the restore rollback tests).      |
| MR-13 | **Transaction and failure propagation.** Upgrade errors propagate to `AppStateProvider` initialization; nothing is swallowed. Multi-tab: [F] no explicit `versionchange`/`blocked` handling exists; Dexie's default closes older connections. The story must test an old-version tab open during upgrade and the old service-worker shell.                                                                                                    | E2E multi-tab test plus unit test of the error path.                      |
| MR-14 | **Coordination.** The upgrade open is a coordinated write (`openingDatabaseMayWrite` already treats an upgrade as a write). Read-only tabs must not attempt the upgrade.                                                                                                                                                                                                                                                                      | Existing coordination suites stay green; one added upgrade case.          |
| MR-15 | **Snapshot coverage.** Any added store is added to `allDataTables`, `DatabaseSnapshot`, `BackupDataSchema` and restore; the existing coverage check fails closed otherwise.                                                                                                                                                                                                                                                                   | Existing guard.                                                           |

## 3. Explicit non-goals

No cloud or Firebase persistence, no database rename, no re-keying, no second
programme's content, no change to existing XP amounts or achievement rules,
no UI redesign.

## 4. Fixtures required before implementation

- A schema-2 database fixture built by the current code (not hand-written)
  from the full bundled seed with: started/blocked/completed/submitted/accepted
  progress, long-form media events with resume points and skipped slices,
  study sessions (including a corrected assignment), every XP source type,
  at least one unlock of each achievement class, a backup audit row.
- The existing backup fixtures, unchanged.
- One malformed schema-2 fixture per MR-12 failure class.
- A test-only second programme fixture that obeys P-3, used only for
  isolation tests and never registered in production code.

## 5. Stop conditions for C6

Stop and return to the owner if: any CS50 row would need re-keying; any
existing fixture cannot be imported; ownership of an existing row cannot be
determined deterministically; an Epic A read-boundary guard would have to be
weakened rather than deliberately extended; or the migration would need a new
dependency.
