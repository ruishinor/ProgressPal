# Epic C / C6 — readiness record (MR-0e)

Status: **accepted by the owner on 2026-09-28.** All C6 planning and
readiness prerequisites are satisfied. C6 is **ready for a separate owner
start authorization** and remains **not started and not authorized**. No
product implementation has started. Publication is deferred.

Inputs: owner decisions `SPEC.md` §6 (MR-0a); schema
`C6_SCHEMA_CHANGE_DECISION_RECORD.md` (MR-0b); migration contract
`C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §7. C6 remains **one story** with
bounded internal phases and concern-scoped commits; it is not split.

## 1. Prerequisites

| ID    | Prerequisite                                  | Status                                                                                                                  |
| ----- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| MR-0a | OD-1 to OD-5 answered and recorded            | Resolved and recorded (`SPEC.md` §6)                                                                                    |
| MR-0b | Accepted schema-change decision record        | Accepted (`C6_SCHEMA_CHANGE_DECISION_RECORD.md`)                                                                        |
| MR-0c | C1–C5 accepted                                | Satisfied                                                                                                               |
| MR-0d | C1 schema-2 fixture exists and round-trips    | Satisfied (`tests/fixtures/backups/c1-baseline-envelope1-schema2.json`, `tests/preservation/c1BaselineFixture.test.ts`) |
| MR-0e | C6 readiness record                           | Accepted (this record)                                                                                                  |
| —     | Separate direct owner instruction to start C6 | **Not given**                                                                                                           |

Release gate (deployment only): the accepted pre-schema line, Epic B through
C5, is published and stabilized separately before any C6 database migration
reaches Production. It is not authorization to publish now and not a
prerequisite for local C6 implementation.

## 2. Allowed scope

- Exactly the MR-0b schema: `catalogue_versions`, `programme_enrolments`,
  `app_meta` (`activeProgrammeId` added, `seedVersion` removed), stable
  `ProgrammeDefinition.programmeId`.
- The programme definition schema, registry and a neutral
  programme/migration context derived at the composition root and passed
  through app state.
- `src/lib/db`: open, upgrade, initialization, catalogue sync, restore,
  reset, snapshot and the bootstrap consistency check.
- `src/lib/backup`: schema-3 shape, schema-2 forward conversion,
  invariants.
- Domain schemas; `versionchange`/`blocked` handling.
- Adapting existing tests and fixtures to the explicit context (a test-only
  second catalogue is authorized only through test contexts).
- `docs/post-release/epic-c/**` and `docs/releases/backup-compatibility-matrix.md`.

## 3. Forbidden scope

- Any persistence field, index or store beyond MR-0b, including an XP or
  unlock programme field, an XP compound index, a persisted active
  catalogue, an enrolment status or a catalogue-history registry.
- Trusting a data or backup `programmeId` claim for an unauthorized
  catalogue.
- CS50 identifier literals in `src/lib`; any `src/lib` → `@/programmes`
  dependency; a mutable module-global active-programme value.
- Re-keying CS50 identifiers; renaming the database.
- XP or achievement-unlock writes by the migration or conversion.
- Changes to XP amounts, achievement rules or catalogue rules.
- Scoping XP, level, unlocks, sessions, insights, weekly target or profile.
- Automatic progress carry-over, catalogue replacement, reused cross-edition
  IDs, predecessor collision exceptions.
- C7 switching behaviour or UI; a production second programme or catalogue.
- Route, copy, layout, CSS or asset changes; weakening read boundaries or
  guards; new dependencies; push, merge, tag, deploy or publication.

## 4. Binding implementation controls

1. **Full relational validation before any write.** Before any v2 → v3
   conversion writes data, it validates the complete legacy relational and
   ownership graph. Every catalogue-derived row that depends on
   unit/item/asset relationships must resolve deterministically through
   those relationships to an authorized catalogue and programme. An orphaned
   or otherwise unattributable catalogue-derived row aborts the migration;
   checking only `course_units.courseId` is not sufficient.
2. **Migration context bound before open.** The neutral
   migration/authorization context is supplied by composition before any
   database open capable of performing the v2 → v3 upgrade. Once bound for
   that database/open attempt it must not silently change. Missing or
   conflicting context fails closed and aborts the version-change
   transaction, leaving v2 intact. Not solved with a mutable module-global
   active-programme value or a `src/lib` → `@/programmes` dependency.

## 5. RED-first evidence

- P2: sync of a seed reusing another catalogue's unit or item ID is rejected
  (MR-3).
- An unauthorized catalogue is rejected by sync, upgrade and import, even
  when data or a backup claims `cs50x` (MR-11).
- An orphaned or unattributable catalogue-derived row aborts the upgrade and
  the schema-2 conversion (MR-1, control 1).
- Duplicate XP `(sourceType, sourceId)` is rejected by import and upgrade
  (MR-6, G-6).
- `seedVersion` > 0 with no catalogue units aborts; rows without `app_meta`
  abort (MR-12).
- An upgrade with missing or conflicting migration context fails closed and
  leaves v2 intact (MR-12, control 2).
- An unregistered or mismatched `activeProgrammeId` fails closed at
  bootstrap (MR-11).
- Restoring an old backup equals upgrading that database in place (MR-10).
- Injected failure during the upgrade leaves v2 intact (MR-12).
- A lower catalogue `dataVersion` is rejected (MR-3).

## 6. Fixtures

- Existing, unchanged: `c1-baseline-envelope1-schema2.json`,
  `v1.2.0-envelope1-schema2.json`, `v1.3.0-envelope1-schema2.json`.
- Code-built v2 databases (synthetic data only):
  - never initialized (no `app_meta`, no rows): the upgrade writes nothing;
    fresh initialization then creates `app_meta`, `activeProgrammeId`,
    enrolment, catalogue and version row atomically;
  - opened, not onboarded, not seeded: upgrades with `cs50x` enrolled and
    active and no catalogue-version row until the catalogue is materialized;
  - onboarded with no progress;
  - progressed (C1 baseline builder);
  - with skipped slices (the gap recorded by C1).
- Adversarial (one per failure class): duplicate XP source key; a
  `course_units.courseId` outside the authorized set; a backup version row
  claiming `cs50x` for an unknown catalogue; orphaned catalogue-derived rows
  (item without unit, asset without item, slice/event/resume point/progress
  without its parent); `seedVersion` > 0 with no units; rows without
  `app_meta`; missing and conflicting migration context; an unregistered or
  mismatched active programme; an enrolment for an unknown programme; a
  version row for an unmaterialized catalogue.
- A test-only second programme with its own `programmeId`, catalogue and
  IDs, authorized only in test contexts and never registered in production.

## 7. Internal C6 sequence (one story)

1. RED tests and fixtures (§5, §6).
2. `programmeId: 'cs50x'` in the definition, validation and registry; the
   composition-root programme/migration context passed through app state.
3. v3 domain schemas for `app_meta`, `catalogue_versions` and
   `programme_enrolments`.
4. A pure v2 → v3 mapping module taking the explicit context, performing the
   full relational validation first (control 1); shared by the upgrade and
   the backup conversion; unit-tested on every fixture.
5. The Dexie v3 upgrade using that module: atomic, idempotent, no reward
   writes, fail closed on missing or conflicting context (control 2).
6. Catalogue sync: authorization, collision rejection, monotonic versions,
   version-row maintenance.
7. Initialization, reset and restore: atomic enrolment, active pointer and
   version row; bootstrap consistency check.
8. Backup schema 3: export, schema-2 conversion, invariants (G-6,
   authorization), compatibility matrix.
9. `versionchange`/`blocked` handling; multi-tab and old-shell E2E.
10. Isolation, snapshot coverage and read-boundary review.
11. Final gates on one exact candidate; then the docs-only readiness record.

## 8. Final validation gates

On the exact source-changing candidate, once: `npm run lint`,
`npm run format:check`, `npm run typecheck`, `npm run check:circular`,
`npm run build`, `npm run check:bundle`, `npm test`, one managed
`npm run test:e2e` with a 64/64 C1 capture comparison against the accepted
inventory, and `git diff --check`; MR-0a to MR-15 evidence summarized in the
C6 closure record. `verify:release` only when a release decision exists.

## 9. Hard stops

- Any persistence change beyond MR-0b, including an XP compound index
  (return the evidence).
- Any guard would have to be weakened, including G-7 and the programme-layer
  boundary.
- A CS50 identifier or the database would need re-keying or renaming.
- An existing fixture cannot be imported.
- Ownership of an existing row cannot be determined deterministically.
- An Epic A read boundary would be weakened rather than deliberately
  extended with a reviewed reason.
- New visible copy or UI would be needed (including for multi-tab upgrade
  blocking or downgrade recovery).
- A new dependency would be needed.
- An owner decision is missing or contradicted.
- A second materially different product repair round.

## 10. Reconciliation with the C0 migration contract

| ID    | Resolution                                                                                                                                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MR-0a | Resolved and recorded (`SPEC.md` §6)                                                                                                                                                                                                         |
| MR-0b | Accepted                                                                                                                                                                                                                                     |
| MR-0c | Satisfied                                                                                                                                                                                                                                    |
| MR-0d | Satisfied                                                                                                                                                                                                                                    |
| MR-0e | Accepted                                                                                                                                                                                                                                     |
| MR-1  | Catalogue-derived rows resolve through validated relationships to an authorized catalogue and `cs50x` (control 1); XP, unlocks, sessions, profile, `app_meta` and backups are learner- or device-global; `achievement_definitions` untouched |
| MR-2  | Every otherwise-valid v2 database with `app_meta` is enrolled in and active on `cs50x` inside the upgrade; a never-initialized database is created atomically by fresh initialization                                                        |
| MR-3  | `catalogue_versions` is the sole version authority (P-5), state only; sync authorized, monotonic and collision-rejecting (P2)                                                                                                                |
| MR-4  | No re-keying; database name unchanged; only the listed `app_meta` fields change                                                                                                                                                              |
| MR-5  | Double upgrade and reopen write nothing                                                                                                                                                                                                      |
| MR-6  | No reward writes; re-saving awards 0 XP; duplicate XP rejected RED → GREEN                                                                                                                                                                   |
| MR-7  | Isolation in both directions with the test-only programme                                                                                                                                                                                    |
| MR-8  | Schema-2 → 3 forward conversion with the explicit context; all fixtures round-trip; the adversarial matrix rejects                                                                                                                           |
| MR-9  | A pre-C6 application rejects schema-3 backups with the existing message                                                                                                                                                                      |
| MR-10 | restore(old) equals upgrade(old); reset re-enrols; no downgrade; older-application return unsupported                                                                                                                                        |
| MR-11 | Unknown catalogue (regardless of claimed programme), unknown programme or mismatched active pointer fails closed                                                                                                                             |
| MR-12 | Atomic abort leaves v2 intact, including missing or conflicting context (control 2)                                                                                                                                                          |
| MR-13 | New `versionchange`/`blocked` handling with existing copy only                                                                                                                                                                               |
| MR-14 | Upgrade and initialization are coordinated writes                                                                                                                                                                                            |
| MR-15 | Snapshot coverage guard extended to the new stores                                                                                                                                                                                           |

C0 principles P-1 to P-7 hold; the persisted identity `cs50x` is an explicit
owner decision (P-7).
