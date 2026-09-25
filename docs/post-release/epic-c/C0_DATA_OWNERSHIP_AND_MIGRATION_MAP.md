# Epic C / C0 — data ownership and migration map

Status: **C0 reconciled against Bootstrap v7.0. Analysis and acceptance
contract only. No schema change or migration is authorized.** Labels as in
`C0_PROGRAMME_ASSUMPTION_INVENTORY.md`. Probe IDs refer to
`C0_EVIDENCE_PROBES.md`.

This is the canonical C0 record for persisted ownership, catalogue/version
state and migration acceptance. It consolidates the original Cowork
`C0_PERSISTENCE_OWNERSHIP_ANALYSIS.md` and
`C0_MIGRATION_READINESS_CONTRACT.md`.

## 1. Current persistence contract

[F] One IndexedDB database, `progresspal-cs50-edition`, Dexie schema version 2
(`src/lib/db/database.ts`), 14 stores. One migration exists (v1 → v2:
`study_sessions.blockers` default, `app_meta` repair). Backup envelope format 1
requires `schemaVersion === 2` exactly (`src/lib/backup/envelope.ts`
`parseBackupFile`, `assertBackupDataInvariants`). Snapshot, restore and reset
enumerate all tables and fail closed if a table is not covered
(`getDatabaseSnapshot`, `allDataTables`).

[F] Restore clears every table, bulk-adds the backup rows, then re-runs
`initializeDatabase` (bundled seed sync) inside the same destructive
coordinated transaction (`repositories.ts` `restoreDatabaseFromBackup`).

## 2. Catalogue and version state today

- [F] The bundled seed is the only catalogue source. Every production caller
  of `initializeDatabase`/`resetAllData` passes `bundledCourseSeed`.
- [F] Sync is additive: new/changed units and items are written; removed seed
  rows are never deleted; title/order/required/type/`courseId` are updated in
  place (`courseUnitNeedsUpdate` compares `courseId`).
- [F] `app_meta.seedVersion` is set to the synced seed's `dataVersion` whenever
  it differs, with no monotonic check (`repositories.ts:1480-1520`).
- [F] Derived long-form assets keep their original duration, slice size and
  estimate once media history exists; slices are re-planned only without
  history.
- [P] P2: syncing a second schema-valid seed that reuses `week-0` rewrites the
  CS50 unit row (`courseId` → `other-programme`, title → "Module 0") and sets
  `seedVersion` 20260617 → 1. No error.

Classification of P2: **demonstrated mechanism of a latent risk**, reachable
only when a second catalogue is synced. It is not a current product defect.
The probe observed the unit row and `app_meta`; it did not examine learner
rows, so C0 makes no claim about learner-data loss from a collision.

## 3. Store-by-store ownership map

"Programme relationship today" states what is already derivable. "Explicit
ownership required?" states whether multi-programme support needs a stored
programme field, and which owner decision controls it. Nothing in this table
is authorized for implementation by C0.

| Store                     | Key / unique index                                  | Current authority                                  | Programme relationship today                    | Explicit ownership required?                                                    | Intended future ownership (proposal)                                               |
| ------------------------- | --------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `app_meta`                | `&id` = `app-meta`                                  | device singleton; single `seedVersion`             | none                                            | Yes for catalogue version: a single scalar cannot hold per-programme state (P2) | Device singleton keeps schema/app version; catalogue version becomes per programme |
| `learner_profile`         | `&id` = `learner-profile`                           | learner singleton                                  | none                                            | Only if OD-4 makes targets per programme                                        | Learner-global unless OD-4 decides otherwise                                       |
| `course_units`            | `&id`; `courseId`, `[courseId+order]`               | materialized programme catalogue                   | **explicit** `courseId`                         | Already explicit; collision safety needed (P2)                                  | Unchanged shape; sync rejects cross-programme ID collisions                        |
| `course_items`            | `&id`; `unitId`                                     | materialized programme catalogue                   | derived via `unitId`                            | No, if unit IDs are unique across programmes                                    | Derived through unit                                                               |
| `content_assets`          | `&id` = `${itemId}-asset`                           | derived catalogue, frozen after media history      | derived via `itemId`                            | No, if item IDs are unique                                                      | Derived through item                                                               |
| `content_slices`          | `&id` = `${assetId}-slice-n`                        | hybrid: derived plan + learner status              | derived via `itemId`/`assetId`                  | No, if item IDs are unique                                                      | Derived through item                                                               |
| `media_progress_events`   | `&id` (random)                                      | learner events                                     | derived via `itemId`/`assetId`                  | No                                                                              | Derived through item                                                               |
| `resume_points`           | `&id` = `resume-${assetId}`, `&assetId`             | learner                                            | derived via asset                               | No                                                                              | Derived through asset                                                              |
| `progress_entries`        | `&id`, `&itemId`                                    | learner                                            | derived via `itemId`                            | No, if item IDs are unique                                                      | Derived through item                                                               |
| `study_sessions`          | `&id` (random)                                      | learner                                            | derived via required `unitId` + `itemId`        | No for attribution (derivable); read scope of history/insights is OD-4          | Derived through item; read scope [U] until OD-4                                    |
| `xp_transactions`         | `&id` = `xp-${sourceType}-${sourceId}`              | learner ledger; dedupe by `(sourceType, sourceId)` | **not generally derivable** (opaque `sourceId`) | Depends on OD-1 (XP/level scope)                                                | [U] until OD-1                                                                     |
| `achievement_definitions` | `&id`                                               | unused (always empty; code definitions)            | none                                            | No                                                                              | Leave empty; do not repurpose without a decision                                   |
| `achievement_unlocks`     | `&id` = `unlock-${achievementId}`, `&achievementId` | learner                                            | via achievement ID only                         | Depends on OD-2 (shared-achievement scope)                                      | [U] until OD-2                                                                     |
| `backups`                 | `&id`                                               | device audit                                       | none                                            | No                                                                              | Device-global                                                                      |

[I] Sessions, profile, XP and unlocks do **not** have identical ownership
requirements. Catalogue-derived learner rows (items, assets, slices, events,
resume points, progress, sessions) are attributable once catalogue IDs are
unique across programmes; sessions still need OD-4 to decide how history and
insights are scoped. XP and unlocks are not generally attributable and need
OD-1/OD-2 before any stored field is justified. The profile is learner-global
unless OD-4 decides otherwise.

## 4. Identifiers and relationships that assume one programme

[F] Confirmed by source; [P] where a probe observed it:

1. Catalogue primary keys are unprefixed CS50 IDs; the seed schema checks
   uniqueness only within one seed.
2. Derived IDs embed only item/asset IDs: `${itemId}-asset`,
   `${assetId}-slice-n`, `resume-${assetId}`.
3. XP transaction IDs and dedupe use `sourceType` + `sourceId` only [P4]. The
   final-project milestone `sourceId`s are fixed CS50 strings. Consequence:
   cross-programme XP uniqueness currently depends **entirely** on catalogue ID
   uniqueness. P4 does not show a duplicate occurring; it shows no programme
   dimension exists to prevent one.
4. Unlock IDs `unlock-${achievementId}` with a unique `achievementId` index.
5. `progress_entries` unique `itemId`; `resume_points` unique `assetId`.
6. `app_meta.seedVersion` is a single scalar written by whichever seed synced
   last [P2].
7. `.where('type').equals('final_project').first()` finds "the" final-project
   unit (`repositories.ts:2683,2933`).
8. Every catalogue read is whole-store [P3].
9. `course_required_completed` requires every required unit in the store.
10. Routes carry bare IDs: `/course/:itemId`, `/rpg/week/:unitId`,
    `/rpg/resource/:itemId`, `?itemId=` on `/sessions` and `/rpg/focus`.
11. XP level/summary is the sum of the whole ledger.
12. Coordination keys, lock names, BroadcastChannel names, service-worker cache
    and backup format identifiers are database-wide and programme-neutral
    (acceptable as-is).

## 5. Pre-existing backup-validation gap (reward safety)

[F] [P5] `assertBackupDataInvariants` rejects duplicate XP **row IDs** but
accepts two rows with different IDs and the same `(sourceType, sourceId)`.
`XpTransactionSchema` does not bind `id` to the source key, and no other
restore-path check exists.

[F] `docs/releases/backup-compatibility-matrix.md` lists "XP source
collisions" as must-reject, citing adversarial mutations in
`tests/lib/backup.test.ts`; no such mutation exists in that file.

Classification: **pre-existing gap between a documented backup contract and
its implementation**, predating Epic B and Epic C. App-generated backups do not
contain such rows (awards are deduplicated by source key before insert), so it
is reachable only through an edited or foreign backup, where it would
double-count XP in the level sum. It is not a multi-programme defect and C0
does not fix it. Owner: the first Epic C story that changes XP ownership or the
backup format (C6), with a RED test first — or an earlier maintenance story if
the owner prioritizes it.

## 6. Architectural proposals (for owner acceptance at C0 review)

Bounded to Epic C. None is a permanent roadmap decision.

- **[D] P-1 Database identity.** Epic C preserves the existing local database
  identity (`progresspal-cs50-edition`) and implements multi-programme support
  within the current database. [F] Renaming the database would orphan existing
  learner data unless a copy-migration were built; [F] the learner profile, XP
  ledger, coordination protocol and whole-device backup are database-wide
  today. Database replacement, splitting or renaming is outside Epic C; later
  data-lifecycle work (Epic F/G) is not constrained by this proposal beyond
  having to migrate from it.
- **[D] P-2 Existing CS50 identifiers.** No Epic C story re-keys existing CS50
  unit, item, derived asset/slice/resume, XP source or achievement IDs. They
  appear in progress rows, the XP ledger, unlock trigger IDs, routes and
  existing backups, and re-keying would risk re-award and backup breakage.
- **[D] P-3 Cross-programme identifier uniqueness.** Epic C's multi-programme
  support assumes catalogue and derived identifiers are unique across
  registered programmes, enforced fail-closed at registration (C7) and at
  catalogue sync (C6). A programme-prefix convention for new programmes is a
  recommendation for Epic E authoring, not a C0 decision.
- **[D] P-4 Ownership is explicit or deterministically derivable.** After any
  Epic C migration, every learner row resolves to exactly one programme or is
  declared learner-global. Which of XP, unlocks and sessions carry a stored
  field is decided by OD-1, OD-2 and OD-4.
- **[D] P-5 Per-programme catalogue version.** The single `seedVersion`
  becomes per-programme catalogue sync state; the legacy value maps to
  `cs50x-2026`. Sync must never silently lower a stored version.
- **[D] P-6 Active programme is passed, not read in passive transactions.**
  See `C0_PROGRAMME_DEFINITION_CONTRACT.md` §2.

## 7. Migration acceptance contract (entry gate for C6)

C6 may not start implementation until all entry preconditions hold.

| ID    | Entry precondition                                                                                                                | Why                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| MR-0a | OD-1 to OD-5 answered and recorded (`SPEC.md` §6)                                                                                 | They decide which stores gain explicit ownership and how version/enrolment works       |
| MR-0b | An accepted schema-change decision record exists                                                                                  | [F] `AGENTS.md` forbids schema changes without an accepted decision                    |
| MR-0c | C1–C5 accepted                                                                                                                    | Oracles, rule extraction and scoped reads exist, so the migration changes storage only |
| MR-0d | The C1 baseline-built schema-2 old-database fixture exists and still round-trips unchanged (`NEXT_STORY_HANDOFF_C1.md` §4 item 7) | [F] only a v1→v2 fixture and two envelope-1/schema-2 backup fixtures exist today       |
| MR-0e | A C6 readiness record re-plans C6 from the OD answers and states whether C6 splits                                                | The answers may shrink or split the schema change                                      |

Required properties, each with its acceptance evidence:

| ID    | Property                                                                                                                                                                                                                                                                                                                                                                                                     | Acceptance evidence                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| MR-1  | **Ownership mapping.** Every learner row resolves to exactly one programme or is declared learner-global (P-4). Legacy rows without programme identity map to `cs50x-2026` only where source proves the relationship.                                                                                                                                                                                        | Invariant test over the migrated fixture; zero unresolved rows           |
| MR-2  | **Enrolment / active state.** Legacy-database default per OD-3 (proposal: enrolled in and active on `cs50x-2026` when it has CS50 catalogue rows or completed onboarding). Fresh database follows the onboarding decision.                                                                                                                                                                                   | Upgrade tests: fresh, onboarded-empty, progressed                        |
| MR-3  | **Per-programme catalogue version.** Legacy `seedVersion` maps to the `cs50x-2026` catalogue state; sync never silently lowers a version; sync fails closed when a seed reuses an ID owned by another programme.                                                                                                                                                                                             | P2 as a RED test, then green                                             |
| MR-4  | **Legacy compatibility.** No CS50 ID re-keyed (P-2); database name unchanged (P-1); v2 rows byte-identical except explicitly added fields.                                                                                                                                                                                                                                                                   | Before/after row diff over the fixture                                   |
| MR-5  | **Idempotency / reopen.** Running the upgrade logic twice, or reopening an upgraded database, writes nothing and changes no value.                                                                                                                                                                                                                                                                           | Double-run and reopen tests; write counter via `tests/db/accessProbe.ts` |
| MR-6  | **No duplicate XP or unlock rewards.** The migration writes no `xp_transactions` or `achievement_unlocks`; award source keys unchanged; re-saving every completed item after upgrade awards 0 XP and unlocks nothing new. Restore rejects duplicate `(sourceType, sourceId)` (§5).                                                                                                                           | Ledger/unlock equality + re-save test + RED→green backup invariant       |
| MR-7  | **No cross-programme crossover.** With a test-only second programme fixture, completion, recommendations, `course_required_completed`, reward labels and XP previews of each programme are unaffected by the other.                                                                                                                                                                                          | Isolation tests in both directions                                       |
| MR-8  | **Backup/export compatibility.** Export writes the new schema version. Import accepts `v1.2.0-envelope1-schema2.json`, `v1.3.0-envelope1-schema2.json` and the C1 fixture through one pure, tested schema-2 → new transform applying the same rules as the database upgrade, then full invariant validation. [F] `parseBackupFile` requires an exact schema match today, so this path is added deliberately. | Fixture round trips; malformed/adversarial matrix still rejects          |
| MR-9  | **Forward incompatibility is explicit.** A v1.3.0 app rejects a new-schema backup with the existing "different data version" message.                                                                                                                                                                                                                                                                        | Compatibility-matrix entry; old-direction test                           |
| MR-10 | **Restore / recovery.** Restoring an old backup into an upgraded database is atomic and equals upgrading that database in place. Reset re-seeds and re-enrols correctly. Rollback expectation: a failed upgrade leaves the v2 database untouched; there is no downgrade path, so recovery is restore from a pre-upgrade backup.                                                                              | restore(old) == upgrade(old) equivalence test; reset test                |
| MR-11 | **Unknown / invalid programme identity.** Rows or backups naming an unregistered or malformed programme ID fail closed with a learner-visible error; nothing is guessed or silently dropped.                                                                                                                                                                                                                 | Adversarial fixtures per case                                            |
| MR-12 | **Transaction failure.** The Dexie upgrade runs in the version-change transaction and aborts atomically on any error; no half-migrated database persists; rows the upgrade cannot attribute cause an abort, not a guess.                                                                                                                                                                                     | Injected-failure tests (restore-rollback pattern)                        |
| MR-13 | **Failure propagation and multi-tab.** Upgrade errors propagate to `AppStateProvider` initialization; nothing is swallowed. [F] No explicit `versionchange`/`blocked` handling exists today; the story tests an old-version tab open during upgrade and the old service-worker shell.                                                                                                                        | E2E multi-tab test + unit test of the error path                         |
| MR-14 | **Coordination.** The upgrade open is a coordinated write (`openingDatabaseMayWrite` already treats an upgrade as a write). Read-only tabs never attempt it.                                                                                                                                                                                                                                                 | Existing coordination suites + one upgrade case                          |
| MR-15 | **Snapshot coverage.** Any added store or field is covered by `allDataTables`, `DatabaseSnapshot`, `BackupDataSchema` and restore; the existing coverage check fails closed otherwise.                                                                                                                                                                                                                       | Existing guard                                                           |

Required fixtures (built by code, not hand-written, except adversarial
mutations):

- the C1 baseline-built schema-2 database/backup fixture: full bundled seed,
  started/blocked/completed/submitted/accepted progress, long-form media events
  with resume points and skipped slices, study sessions (including a corrected
  assignment), every XP source type reachable from the CS50 catalogue, at least
  one unlock of each achievement class, one backup audit row — synthetic data
  only;
- the existing backup fixtures, unchanged;
- one malformed fixture per MR-11/MR-12 failure class;
- a test-only second programme fixture obeying P-3, used only in tests and
  never registered in production code.

C6 stop conditions: any CS50 row would need re-keying; an existing fixture
cannot be imported; ownership of an existing row cannot be determined
deterministically; an Epic A read-boundary guard would have to be weakened
rather than deliberately extended; a new dependency would be needed; an owner
decision is missing or contradicts the migration design.

Non-goals: cloud or Firebase persistence, database rename, re-keying, a second
programme's content, changes to existing XP amounts or achievement rules, UI
redesign.
