# Epic C / C0 — persisted programme ownership and versioning

Status: **ANALYSIS COMPLETE; NO SCHEMA CHANGE AUTHORIZED**. Labels: [F] fact,
[I] inference, [D] proposed decision, [O] owner decision, [X] deferred. Probe
IDs (P1–P7) refer to `C0_EVIDENCE_PROBES.md`.

## 1. Current persistence contract

[F] One IndexedDB database, `progresspal-cs50-edition`, Dexie schema version 2
(`src/lib/db/database.ts`), 14 stores. One migration exists (v1 → v2:
`study_sessions.blockers` default, `app_meta` repair). Backup envelope format 1
requires `schemaVersion === 2` exactly (`src/lib/backup/envelope.ts`
`parseBackupFile`, `assertBackupDataInvariants`). Snapshot, restore and reset
enumerate all tables and fail closed if a table is not covered
(`getDatabaseSnapshot`, `allDataTables`).

## 2. Store-by-store ownership

| Store                     | Primary key / unique index                              | Programme linkage today      | Owner class                                               | Multi-programme consequence                                                                                             |
| ------------------------- | ------------------------------------------------------- | ---------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `app_meta`                | `&id` = `app-meta`                                      | none; single `seedVersion`   | device singleton + **catalogue sync state**               | [F] P2: syncing another seed overwrote `seedVersion` 20260617 → 1 (a downgrade). Needs per-programme catalogue version. |
| `learner_profile`         | `&id` = `learner-profile`                               | none                         | learner-global                                            | [I] stays global; [O] OD-4 if per-programme weekly targets are wanted                                                   |
| `course_units`            | `&id`; `courseId`, `[courseId+order]`                   | **explicit** `courseId`      | programme catalogue (materialized)                        | [F] P2: a colliding unit id is silently re-owned (courseId and title overwritten).                                      |
| `course_items`            | `&id`; `unitId`                                         | derived via `unitId`         | programme catalogue (materialized)                        | [F] global PK; collision risk as above                                                                                  |
| `content_assets`          | `&id` = `${itemId}-asset`                               | via `itemId`                 | derived catalogue, frozen after media history             | [F] ID derived from item id only                                                                                        |
| `content_slices`          | `&id` = `${assetId}-slice-n`                            | via `itemId`/`assetId`       | **hybrid**: derived plan + learner `status`/`completedAt` | [I] must follow item ownership                                                                                          |
| `media_progress_events`   | `&id` (random)                                          | via `itemId`/`assetId`       | learner events                                            | derivable                                                                                                               |
| `resume_points`           | `&id` = `resume-${assetId}`, `&assetId`                 | via asset                    | learner                                                   | derivable                                                                                                               |
| `progress_entries`        | `&id`, **`&itemId`**                                    | via `itemId`                 | learner                                                   | [F] one entry per item id globally                                                                                      |
| `study_sessions`          | `&id` (random)                                          | `unitId` + `itemId`          | learner                                                   | derivable; [O] OD-4 scope of history/insights                                                                           |
| `xp_transactions`         | `&id` = `xp-${sourceType}-${sourceId}`                  | **none** (opaque `sourceId`) | learner ledger                                            | [F] P4: IDs carry no programme dimension; ownership is not generally derivable from `sourceId`                          |
| `achievement_definitions` | `&id`                                                   | none                         | **unused** (always empty; code definitions)               | [D] leave empty; do not repurpose without a decision                                                                    |
| `achievement_unlocks`     | `&id` = `unlock-${achievementId}`, **`&achievementId`** | via achievement id only      | learner                                                   | [F] one unlock per achievement id globally                                                                              |
| `backups`                 | `&id`                                                   | none                         | device audit                                              | global                                                                                                                  |

## 3. Identifiers and relationships that assume one programme

[F] Confirmed by source and probes:

1. Catalogue primary keys are unprefixed CS50 IDs (`week-0`, `final-project`,
   `practice-debug`, …); the seed schema checks uniqueness only within one seed.
2. Derived IDs embed only item/asset IDs: `${itemId}-asset`,
   `${assetId}-slice-n`, `resume-${assetId}`.
3. XP transaction IDs and dedupe use `sourceType` + `sourceId`; fixed CS50
   milestone source IDs `final-project-build-completed`,
   `final-project-readme-demo-combined`.
4. Unlock IDs `unlock-${achievementId}` with a unique `achievementId` index.
5. `progress_entries` unique `itemId`; `resume_points` unique `assetId`.
6. `app_meta.seedVersion` is a single scalar written by whichever seed synced
   last (P2).
7. `.where('type').equals('final_project').first()` finds "the" final-project
   unit (`repositories.ts:2683,2933`).
8. Every catalogue read is whole-store: map, module, resource, hub, hero, HUD,
   dashboard, insights and achievement evaluation (`readA4CourseState`,
   `evaluateAndUnlockAchievements`, `getDatabaseSnapshot`). P3: a second
   catalogue merges into CS50 map output (14 → 16 units, 26 → 28 required).
9. `course_required_completed` requires every required unit in the store; its
   trigger source is the lexicographically smallest `courseId`.
10. Routes carry bare IDs: `/course/:itemId`, `/rpg/week/:unitId`,
    `/rpg/resource/:itemId`, `?itemId=` on `/sessions` and `/rpg/focus`.
11. XP level/summary is the sum of the whole ledger.
12. Coordination keys, lock names, BroadcastChannel, service-worker cache and
    backup format identifiers are programme-neutral and database-wide
    (acceptable).

## 4. Catalogue and version ownership today

- [F] The bundled seed is the only catalogue source; `dataVersion` 20260617.
- [F] Sync is additive: new/changed units and items are written; removed seed
  rows are never deleted; titles/order/required are updated in place.
- [F] Derived long-form assets keep their original duration, slice size and
  estimate once media history exists; slices are re-planned only without
  history.
- [F] `seedVersion` is set to the synced seed's `dataVersion` even if it is
  lower (no monotonic check), and a version change alone forces a metadata
  write.
- [F] Restore writes the backup's rows and then re-syncs the bundled seed
  inside the same transaction; reset clears all stores and re-seeds.

## 5. Architectural decisions proposed by C0

- **[D] P-1 Single database, forever.** Keep one database named
  `progresspal-cs50-edition`. The name is an opaque legacy identifier; renaming
  it is data loss. No database-per-programme: the learner profile, XP ledger,
  coordination protocol and whole-device backup are database-wide.
- **[D] P-2 CS50 identifiers are frozen.** Existing CS50 unit/item/derived IDs,
  XP source keys and achievement IDs are never re-keyed. They appear in
  progress rows, XP ledger, unlock trigger IDs, resume/slice IDs, routes and
  existing backups.
- **[D] P-3 Global identifier uniqueness across registered programmes.** Every
  additional programme uses IDs that cannot collide with any other registered
  programme (unit, item, derived asset/slice/resume IDs, achievement IDs,
  milestone source IDs). A registry validator fails closed on any collision.
  Recommended convention: a programme prefix for all new-programme IDs. This
  keeps routes and derived-ID mechanisms unchanged and avoids re-keying
  migrations.
- **[D] P-4 Ownership is explicit or deterministically derivable.** Every
  learner row must resolve to exactly one programme, or be declared
  learner-global. Catalogue rows are explicit (`course_units.courseId`) and
  items, assets, slices, events, resume points, progress and sessions derive
  through foreign keys. `xp_transactions` and `achievement_unlocks` are not
  generally derivable; whether they need a stored programme field depends on
  OD-1/OD-2.
- **[D] P-5 Catalogue version is per programme.** The single `seedVersion`
  becomes per-programme catalogue sync state; the legacy value maps to
  `cs50x-2026`. Sync must never downgrade a stored version silently.
- **[D] P-6 Active programme is passed, not read in passive transactions.**
  See `C0_PROGRAMME_DEFINITION_PROPOSAL.md` §1.

## 6. Pre-existing gap relevant to reward safety

[F] P5: `assertBackupDataInvariants` rejects duplicate XP **row IDs** but
accepts two rows with different IDs and the same `(sourceType, sourceId)`.
`docs/releases/backup-compatibility-matrix.md` lists "XP source collisions" as
must-reject. At runtime, awards are deduplicated by source key before insert,
so the app does not create such rows; an edited or foreign backup could. Any
Epic C story that touches XP ownership or backup format must add this
invariant (restore-time) with a red test first. C0 does not change it.

## 7. What is not yet decidable from source

Whether XP/levels, shared achievements, sessions/insights and onboarding are
learner-global or per programme, and how enrolment/switching behaves, are
product decisions (OD-1 to OD-5). They change the v3 schema shape, so the
migration story (C6) is gated on them. They do not affect C1–C5.
