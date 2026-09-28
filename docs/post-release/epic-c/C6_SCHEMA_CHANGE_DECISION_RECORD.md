# Epic C / C6 — schema-change decision record (MR-0b)

Status: **accepted by the owner on 2026-09-28.** This record satisfies the
`AGENTS.md` requirement for an accepted schema-change decision. It
authorizes the schema below for C6; it does **not** start C6, which still
needs a separate direct owner instruction. The owner decisions it implements
are recorded in `SPEC.md` §6 (MR-0a). The migration contract is
`C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §7; the plan is
`C6_READINESS_RECORD.md` (MR-0e).

No persistence field, index or store change beyond this record is
authorized.

## 1. Current state (schema 2)

- One IndexedDB database, `progresspal-cs50-edition`, Dexie version 2
  (native 20), 14 stores. Row shapes are strict Zod schemas.
- `app_meta` store definition `&id, schemaVersion, seedVersion`; the
  `seedVersion` index is not queried. `app_meta.seedVersion` is a single,
  non-monotonic catalogue version written by catalogue sync.
- Catalogue sync rewrites a reused unit's `courseId` in place (P2).
- Backup envelope format 1; import accepts `schemaVersion` 2 only.
- Guard G-7 forbids CS50 catalogue identifier literals in `src/lib`, and
  `src/lib` never imports `@/programmes`.

## 2. Target schema (Dexie version 3, native 30)

Same database name; no store is renamed or removed.

| Change                             | Dexie store definition                                    | Row shape                                                                                              |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| New store `catalogue_versions`     | `&courseId, programmeId`                                  | `courseId`, `programmeId`, `dataVersion` (non-negative integer), `syncedAt` (ISO date-time)            |
| New store `programme_enrolments`   | `&programmeId`                                            | `programmeId`, `enrolledAt` (ISO date-time)                                                            |
| Changed `app_meta`                 | `&id, schemaVersion` (unused `seedVersion` index dropped) | `seedVersion` removed; required `activeProgrammeId` added; `schemaVersion` = 3; other fields unchanged |
| `ProgrammeDefinition` (not stored) | —                                                         | required stable `programmeId` (`cs50x` for the `cs50x-2026` definition)                                |

Unchanged: every other store, field and index. Explicitly **not**
authorized: a programme field or index on `xp_transactions`,
`achievement_unlocks` or `study_sessions`; an XP compound index; a persisted
active catalogue; an enrolment status; a catalogue-history registry.

`catalogue_versions` is the sole catalogue-version authority. It records
state for authorized catalogues; it grants no ownership authority.

## 3. Authorization and migration context

- In C6, `cs50x-2026` is the only authorized catalogue, for programme
  `cs50x`. Authority comes only from the registered programme definitions.
  An unknown catalogue identity fails closed even if data or a backup claims
  it belongs to `cs50x`.
- The app composition root derives a neutral context from the registered
  definitions: `{ programmeId, authorizedCatalogues: [{ courseId,
programmeId }] }`. It reaches lib code explicitly, as C5's programme scope
  does.

**Binding control 2 — migration context.** The neutral
migration/authorization context must be supplied by composition before any
database open capable of performing the v2 → v3 upgrade. Once bound for that
database/open attempt it must not silently change. Missing or conflicting
migration context fails closed and aborts the version-change transaction,
leaving v2 intact. It is not provided by a mutable module-global
active-programme value or by any `src/lib` → `@/programmes` dependency. G-7
and the programme-layer guard stay unchanged.

## 4. v2 → v3 upgrade (inside the version-change transaction)

**Binding control 1 — full relational validation before any write.** Before
the conversion writes anything, it validates the complete legacy relational
and ownership graph. Every catalogue-derived row that depends on
unit/item/asset relationships (course items, content assets, content
slices, media progress events, resume points, progress entries) must resolve
deterministically through those relationships to an authorized catalogue
and programme. An orphaned or otherwise unattributable catalogue-derived row
aborts the migration; checking only `course_units.courseId` is not
sufficient.

Rules, applied only after that validation passes:

1. A database with no `app_meta` row and no other rows (created by a v2 app
   but never initialized) is indistinguishable from a new database: the
   upgrade writes nothing, and fresh initialization creates `app_meta`,
   `activeProgrammeId` and the enrolment in one coordinated transaction. A
   database with rows but no `app_meta` aborts.
2. Every `course_units.courseId` must be an authorized catalogue; otherwise
   abort.
3. Version row: if authorized catalogue units exist, create
   `catalogue_versions[courseId]` with `programmeId` from the authorization
   (never from data), `dataVersion` = legacy `seedVersion` (0 allowed) and
   `syncedAt` = legacy `app_meta.updatedAt`. With no units and
   `seedVersion` 0, create none; later initialization materializes the
   catalogue normally. With no units and `seedVersion` > 0, abort (no
   legitimate producer of that state exists).
4. Enrolment: every otherwise-valid database with an `app_meta` row,
   including one opened but never onboarded or seeded, gets
   `programme_enrolments['cs50x']` with `enrolledAt` =
   `onboardingCompletedAt` if present, else legacy `app_meta.createdAt`;
   `app_meta.activeProgrammeId` = `cs50x`; `seedVersion` removed;
   `schemaVersion` = 3. No nullable or transitional active state exists, and
   nothing is deferred to bootstrap.
5. Duplicate XP: two or more XP rows with the same `(sourceType, sourceId)`
   abort the migration (in-memory key set; no new index).
6. All other rows stay byte-identical. The migration writes no XP and no
   achievement unlocks.

## 5. Runtime rules

- Fresh initialization and reset (reset clears first) create `app_meta` with
  `activeProgrammeId`, the enrolment, the authorized catalogue's rows and its
  version row, as coordinated writes, never inside passive reads.
- Bootstrap: `activeProgrammeId` must equal the registered definition's
  `programmeId` and have an enrolment row; otherwise the existing bootstrap
  error state.
- Catalogue sync: the seed's `courseId` must be authorized; a unit or item ID
  that exists under a different `courseId` is rejected (P2), never
  rewritten; a lower `dataVersion` fails closed, an equal one writes nothing;
  the version row changes only on a real version change.
- XP awards keep runtime deduplication by `(sourceType, sourceId)`.

## 6. Backup and import

- Envelope format stays 1; exports carry `schemaVersion` 3. `BackupData`
  adds `catalogueVersions` and `programmeEnrolments`; `appMeta` uses the v3
  shape.
- Schema-2 import passes through one pure conversion that applies §4
  (including binding control 1) with the explicit context, then full
  validation. Any other schema version is rejected with the existing message.
- Invariants: no duplicate XP `(sourceType, sourceId)`; `activeProgrammeId`
  registered and enrolled; every enrolment names a registered programme;
  every catalogue and version row has an authorized `courseId` and a
  `programmeId` matching the authorization (a backup's claim is never
  trusted); every version row's catalogue is materialized.
- A pre-C6 application rejects schema-3 backups with the existing "different
  data version" message.

## 7. Recovery

- A failed v2 → v3 upgrade aborts atomically and leaves the v2 database
  intact.
- A successful upgrade has no automatic downgrade.
- A schema-2 backup restored in the new application is converted forward to
  v3; the database is never reverted to v2.
- Returning to an older application after a successful upgrade is
  unsupported (it cannot open a v3 database) unless a separate destructive
  recovery procedure is designed and authorized.

## 8. Coverage and multi-tab

- The new stores and fields are covered by `allDataTables`,
  `DatabaseSnapshot`, the backup schema, restore and reset (MR-15).
  `DatabaseInitializationResult` replaces `seedVersion` with catalogue
  version state.
- `versionchange`/`blocked` handling closes stale connections and reports
  through existing error or coordination copy only.

## 9. Accepted consequence

The strict aborts (unauthorized catalogue, unattributable catalogue-derived
row, duplicate XP source key, orphan `seedVersion`, rows without
`app_meta`, missing or conflicting context) make such anomalous databases
unopenable by a C6 application until a fix release, with the v2 database
intact. These states are reachable only through edited or foreign data.
