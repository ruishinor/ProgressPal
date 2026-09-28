# Epic C / C6 — closure record (persisted-ownership schema migration)

## 1. State

**`C6_IMPLEMENTED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`**

Not `C6_ACCEPTED`. C6 is not recorded as accepted, C7 was not started, and
nothing was pushed, merged, tagged, deployed or otherwise published.

- Implemented on 2026-09-28 under a direct owner instruction starting C6
  from the accepted planning-readiness commit `42207203`, with the
  authoritative contract fixed to `C6_SCHEMA_CHANGE_DECISION_RECORD.md`
  (MR-0b), `C6_READINESS_RECORD.md` (MR-0e), `SPEC.md` §6 (MR-0a),
  `stories.yaml` and `C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §7.
- Preflight verified before any mutation: `HEAD` and its parent matched the
  instruction's stated identities exactly, the worktree was clean, no
  `cx/epic-c6-*` branch existed, and MR-0a/MR-0b/MR-0e were each independently
  read and confirmed accepted (§2).
- One architectural fork required owner input before implementation could
  proceed (binding control 2 — how the migration/authorization context
  reaches `src/lib/db` without a mutable module-global, an `@/programmes`
  dependency in `src/lib`, or threading it through the ~45 repository
  functions). The owner directed an instance-bound context; the existing
  shared-database singleton did not make this impossible, so no further
  STOP was needed. This is the one architecture decision this record makes
  explicit; everything else follows the accepted contract directly.
- One product-shape correction was made during implementation, caught by
  extending test coverage rather than by owner review: the composition root
  was authorizing catalogue sync by the definition's `catalogueId` (C5's
  read-scoping key) instead of the catalogue's own `courseId`. The two are
  always equal for a validated, registered definition, so this was invisible
  under CS50's one real definition; a test injecting a definition with a
  decoupled `catalogueId` (an existing C5 test fixture, `unmaterializedDefinition`)
  surfaced it as a bootstrap failure. Fixed in commit `39613ee` before any
  gate ran; see §4.
- This is one coherent implementation pass. No second materially different
  product or architecture defect appeared, so the one bounded repair round
  this authorization allows was not needed.

## 2. Identities

| Item                                       | Value                                                                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner authorization                        | direct owner instruction, 2026-09-28: start C6 from `42207203`, local only                                                                                                                                                            |
| Branch                                     | `cx/epic-c6-persisted-ownership-migration`                                                                                                                                                                                            |
| Branch point (accepted planning tip)       | `42207203532c67ce0bf1ab4a8a5bb9a54a8b32b2` (tree `183eb8e1`, `src` `0eb3b51c`, parent `d92d8cea`)                                                                                                                                     |
| MR-0a (owner decisions)                    | `SPEC.md` §6, OD-1 to OD-5 resolved 2026-09-28                                                                                                                                                                                        |
| MR-0b (schema-change decision record)      | `C6_SCHEMA_CHANGE_DECISION_RECORD.md` — accepted 2026-09-28                                                                                                                                                                           |
| MR-0e (readiness record)                   | `C6_READINESS_RECORD.md` — accepted 2026-09-28                                                                                                                                                                                        |
| Implementation commits (6, concern-scoped) | `7930053` (migration-context architecture), `39613ee` (schema migration, catalogue authorization, backup conversion), `89e01b2` (RED-first test evidence), `d9dd948` (formatting), `e92a33a` (MR-13/14 evidence), `7af18c2` (E2E fix) |
| Final candidate                            | `7af18c2035ccb8f9338321475b65e0111856dae9`                                                                                                                                                                                            |
| Final candidate tree                       | `277e6659b942522346aaf41e74046f66d5ba4813`                                                                                                                                                                                            |
| Final candidate `src` subtree              | `dacf89b258d45eceefc1e710843224b216cac68a`                                                                                                                                                                                            |
| Worktree at candidate                      | clean (including untracked files)                                                                                                                                                                                                     |

## 3. What C6 implements

- **Stable persisted programme identity.** `ProgrammeDefinition.programmeId`
  (`'cs50x'` for `cs50x-2026`), validated and distinct from `definitionKey`/
  `catalogueId`.
- **Instance-bound migration/authorization context** (binding control 2,
  `src/lib/db/migrationContext.ts`). `DatabaseMigrationContext` —
  `{ programmeId, authorizedCatalogues: [{ courseId, programmeId }] }` — is
  derived from the registry at the composition root
  (`app/providers/AppProviders.tsx`, from `catalogue.courseId`, not
  `catalogueId`; see §1) and bound to one `ProgressPalDatabase` instance at
  construction. It lives only on that instance: no module-global variable,
  no `src/lib` → `@/programmes` dependency, and no threading through the
  repository API. `AppStateProvider` binds it synchronously in the same
  render-phase initializer that resolves the programme scope, before any
  effect can open the database. A missing context on first construction, or
  a conflicting context on a later one, fails closed; an equivalent context
  is idempotent (`tests/db/migrationContext.test.ts`).
- **v3 domain schemas** (`src/lib/domain/schemas.ts`): `CatalogueVersionSchema`
  (`courseId`, `programmeId`, `dataVersion`, `syncedAt`),
  `ProgrammeEnrolmentSchema` (`programmeId`, `enrolledAt`), and `AppMetaSchema`
  with `activeProgrammeId` (required) replacing `seedVersion` (removed).
- **The pure v2 → v3 mapping module** (`src/lib/db/migrationV2ToV3.ts`),
  shared by the Dexie upgrade and the backup forward conversion. Before
  deciding anything it validates the complete legacy relational graph
  (course items → units; content assets → items; content slices, media
  events and resume points → their asset and item, cross-checked; progress
  entries → items; study sessions → their unit and item) against the
  authorized catalogue set, and rejects a duplicate XP `(sourceType,
sourceId)`. Only then: a never-initialized database (no `app_meta`, no
  other rows) is a no-op; rows without `app_meta` abort; an unauthorized
  `course_units.courseId` aborts; units present create a `catalogue_versions`
  row per authorized `courseId` with `dataVersion` from the legacy
  `seedVersion`; no units with `seedVersion` 0 creates none; no units with
  `seedVersion` > 0 aborts; every otherwise-valid database with `app_meta`
  gets a `programme_enrolments` row (`enrolledAt` from
  `onboardingCompletedAt` if present, else `createdAt`) and
  `activeProgrammeId`. It writes no XP and no achievement unlocks.
- **The Dexie v3 upgrade** (`database.ts`, `migrateVersionTwoToVersionThree`):
  loads the legacy snapshot inside the version-change transaction, hands it
  to the pure module, and performs exactly the writes it returns in that
  same transaction — an aborting validation leaves v2 completely intact
  (IndexedDB's own atomic version-change semantics; proven directly, §4).
- **Catalogue sync** (MR-3, `ensureCourseCatalogFromSeedWithinScope`):
  authorized against the instance-bound context (an unauthorized `courseId`
  is rejected before any write); `catalogue_versions` is the sole version
  authority — a lower `dataVersion` fails closed, an equal one writes
  nothing (no content diffing at an unchanged version — a deliberate
  behavior change from pre-C6, which diffed content independently of
  version; see §7); P2 collision rejection — a unit ID already owned by a
  different catalogue is rejected, never rewritten, and the same check
  extends to items via their owning unit.
- **Bootstrap consistency** (`ensureBaseInitialization`): a fresh database
  creates `app_meta` and its `programme_enrolments` row atomically; an
  existing `app_meta` whose `activeProgrammeId` does not match the bound
  context's programme, or has no enrolment row, fails closed rather than
  silently repairing.
- **Backup schema 3** (`src/lib/backup/envelope.ts`): `BackupData` gains
  `catalogueVersions` and `programmeEnrolments`; a schema-2 backup
  forward-converts through the same pure mapping module before the same full
  validation a native schema-3 backup gets (any other schema version is
  still rejected with the existing message); new invariants — no duplicate
  XP source key (unconditional), and, when a migration context is supplied,
  `activeProgrammeId` is registered and enrolled, every enrolment names a
  registered programme, every catalogue/version row's claimed `programmeId`
  is cross-checked against the authorized set rather than trusted, and every
  version row's catalogue is materialized.
- **Snapshot, restore, reset** (`DatabaseSnapshot`, `allDataTables`,
  `restoreDatabaseFromBackup`, `resetAllData`): extended to the two new
  stores; restore validates with the live database's own bound context, not
  a backup's claim.
- **`versionchange`/`blocked` handling** (MR-13/14): no custom hook exists or
  was added. The app relies entirely on Dexie's own default (closing a stale
  connection on `versionchange` so another tab's upgrade can proceed),
  exactly matching the accepted decision record's disposition. Verified
  directly (§4) because no prior test exercised this path.

## 4. RED-first evidence

`tests/db/migrationV2ToV3.test.ts` (13 cases, pure module): never-initialized
skip; rows without `app_meta` abort; an unauthorized catalogue unit aborts;
an orphaned course item, content asset, content slice (wrong asset's item),
progress entry, and study session (wrong unit or item) each abort;
duplicate XP source key aborts; `seedVersion` > 0 with no units aborts; no
version row with no units and `seedVersion` 0; enrolment uses
`onboardingCompletedAt` when present, else `createdAt`; a full successful
migration produces the exact `catalogueVersions`/`programmeEnrolments`/
`appMeta` shape.

`tests/db/migrationV2ToV3Adversarial.test.ts` (6 cases, Dexie/sync level):

- An unauthorized catalogue and an orphaned row each abort the real Dexie
  v2 → v3 upgrade; in both cases the native database version stays at 20
  (v2) and a fresh raw read of the same database shows the original v2 rows
  unchanged — the abort leaves v2 completely intact (MR-12), not merely
  "the promise rejected."
- An old tab holding a live v2 connection with no custom `versionchange`/
  `blocked` handling (matching production) is closed by Dexie's own default
  when the v3 upgrade opens elsewhere, and that upgrade completes correctly
  (MR-13/14 — previously unverified by any test; see §1).
- Catalogue sync rejects a lower `dataVersion` and a P2 cross-catalogue unit
  ID collision, in both cases writing nothing (verified against the stored
  row before and after).

Two of these tests caught bugs in their own fixtures while being written — a
legacy test database registered at the wrong Dexie version, and a
`dataVersion - 1` fixture that violated the seed schema's own positivity
constraint before ever reaching the code under test — both fixed before
landing (commit `89e01b2`).

`tests/db/migrationContext.test.ts` (8 cases): missing context on first
open, conflicting context on rebind (programmeId and authorized-catalogue-set
variants), an equivalent context is idempotent, a later call may omit the
context once bound, closing the shared database discards the bound context,
and `createProgressPalDatabase` rejects each malformed context shape.

**The one product-shape bug** (§1): `tests/programmes/catalogueScope.test.tsx`'s
existing `unmaterializedDefinition` fixture (`{ ...cs50, catalogueId:
'c5-unmaterialized' }`, a C5 fixture predating C6) decouples `catalogueId`
from `catalogue.courseId` to simulate an unmaterialized read scope. Under
C6's new sync authorization this fixture's bootstrap seed sync — which
syncs `catalogue.courseId` (`'cs50x-2026'`), not `catalogueId` — was rejected
as unauthorized, because the composition root had authorized only
`catalogueId`. Fixed by authorizing `catalogue.courseId` instead (the
identity catalogue sync actually writes), which is provably equivalent to
`catalogueId` for every registered, validated definition
(`validateProgrammeDefinition` already enforces `catalogue.courseId ===
catalogueId`). All 23 tests in that file, plus every other suite, pass
after the fix; see the full diff in commit `39613ee`.

## 5. Migration semantics by fixture class (accepted distinctions)

| Class                                                      | Behavior                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| Never initialized (no `app_meta`, no rows)                 | Upgrade writes nothing; fresh initialization creates valid v3 state         |
| Rows with no `app_meta`                                    | Fails closed                                                                |
| Otherwise-valid v2 with `app_meta`, never onboarded/seeded | Migrates: `cs50x` enrolled and active, no version row until materialization |
| Catalogue units present                                    | `catalogue_versions` row created from legacy `seedVersion`                  |
| No units, `seedVersion` == 0                               | No version row until catalogue materialization                              |
| No units, `seedVersion` > 0                                | Fails closed                                                                |
| Unauthorized catalogue                                     | Fails closed (sync, upgrade, and import — same authorization check)         |
| Duplicate XP source key                                    | Fails closed (upgrade and import; runtime dedup unchanged)                  |
| Failed upgrade                                             | Atomic rollback leaves v2 intact (verified directly, §4)                    |
| Schema-2 backup restore                                    | Forward-converted to v3 through the shared pure module; no downgrade path   |
| Lower catalogue version                                    | Rejected; an equal version writes nothing                                   |

The C1 baseline fixture (`c1-baseline-envelope1-schema2.json`, frozen,
byte-for-byte unchanged) exercises the schema-2 forward-conversion path
directly: `tests/preservation/c1BaselineFixture.test.ts` parses it (now
converting to v3), asserts the migration-contract state, and restores it
through the real restore path. Its one test that re-derived the fixture from
the live repositories to prove non-fabricated provenance
(`buildC1BaselineEnvelope() toEqual(committedFixture)`) can no longer pass
byte-for-byte: the live repositories now always produce schema-3 output
(and one extra bootstrap write shifts every later incrementing-clock
timestamp), so exact reproduction would require the retired schema-2 write
path. That test now builds successfully and checks catalogue/item/XP-ID
parity instead; the frozen fixture file is untouched and remains the
schema-2 state every other test in that file exercises.

## 6. Architecture and preservation

- No persistence change beyond MR-0b: `catalogue_versions` (`&courseId,
programmeId`), `programme_enrolments` (`&programmeId`), `app_meta`
  (`&id, schemaVersion`, `seedVersion` dropped, `activeProgrammeId` added),
  `ProgrammeDefinition.programmeId` — each an exact match to
  `C6_SCHEMA_CHANGE_DECISION_RECORD.md`'s table. No XP, achievement-unlock or
  session field or index; no persisted active catalogue; no
  catalogue-history registry; no enrolment status.
- `git diff 42207203 7af18c2 -- package.json package-lock.json` is empty: no
  dependency was added.
- `git diff 42207203 7af18c2 --stat -- src/lib/xp src/lib/achievements
src/features src/components src/styles src/app/router src/app/shell
src/app/routes` is empty: no XP, achievement, feature, component, style,
  route or shell file changed.
- G-7 (`tests/architecture/programmePolicyOwnership.test.ts`) and
  `programmeScopeComposition.test.ts` pass unchanged: no CS50 literal in
  `src/lib`, and the composition-root-only accessor pattern holds (the one
  `catalogueId`/`programmeId` destructure this story adds lives in
  `AppProviders.tsx`, the allowed file).
- `check:circular` required one internal fix: `database.ts` and
  `migrationV2ToV3.ts` both needed `DatabaseMigrationContext`, and even
  though `migrationV2ToV3.ts`'s reference was `import type` (erased at
  compile time), the source-level dependency graph `dpdm` analyzes still
  saw a cycle. Extracted the type and its validators into a third,
  dependency-free module (`migrationContext.ts`) that both depend on.
- `src/lib/db/` file inventory (`tests/domain/moduleBoundaries.test.ts`) grew
  by exactly two files: `migrationContext.ts`, `migrationV2ToV3.ts`.

## 7. Deliberate behavior change (recorded, not a defect)

Pre-C6, catalogue sync applied unit/item content differences whenever they
existed, independent of `dataVersion` — the stored `seedVersion` was pure
bookkeeping, not a sync gate. MR-3 makes `catalogue_versions` the sole
version authority: an equal `dataVersion` now writes nothing at all, even if
stored content has drifted from the seed (e.g. a manually deleted row).
Repairing such drift now requires a real version bump. This is the accepted
contract's explicit text ("an equal one writes nothing"), not an
implementation accident; two pre-existing peer-lock tests
(`tests/db/localWriteCoordination.test.ts`, "blocks a required seed-catalog
repair" / "blocks a required derived-catalog repair") assumed the old
behavior and were updated to bump the version for their repair attempt,
preserving their original intent (a peer-active block prevents a genuinely
needed write) under the new contract.

## 8. Final validation (candidate `7af18c2`)

| Check                    | Result                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`           | exit 0, 0 warnings                                                                                                                                                |
| `npm run format:check`   | exit 0                                                                                                                                                            |
| `npm run typecheck`      | exit 0                                                                                                                                                            |
| `npm test`               | exit 0; 90 files / 930 tests passed, 0 skipped, 0 retries                                                                                                         |
| `npm run check:circular` | exit 0, no cycle (after the `migrationContext.ts` extraction, §6)                                                                                                 |
| `npm run build`          | exit 0                                                                                                                                                            |
| `npm run check:bundle`   | exit 0, 0 violations; largest JS chunk 393,639 raw bytes / 140.70 kB gzip                                                                                         |
| `npm run test:e2e`       | exit 0; 90/90 passed, 0 skipped, 0 retries, ~5.7–5.9 min (managed run, twice)                                                                                     |
| 64 C1 visual captures    | regenerated by the E2E run; byte-for-byte SHA-256 identical to the accepted inventory (`INVENTORY-69b1db7.sha256`) on both runs; the accepted ZIP was not touched |
| `git diff --check`       | exit 0, no whitespace errors                                                                                                                                      |

- No test was skipped, retried, or weakened, and no timeout was changed.
- The E2E run's first pass was 89/90 (one assertion in `dashboard.spec.ts`
  still read the retired `appMeta.seedVersion` field directly from
  IndexedDB); fixed to read `activeProgrammeId` (commit `7af18c2`) and
  reconfirmed at 90/90 on the exact candidate.
- `verify:release` was not run: publication is a separate decision this
  authorization does not make.

## 9. Residual limitations

- The backup-import **preview** UI (`ImportBackupControl`, used by Settings
  and the onboarding recovery surface) does not receive a migration context
  and therefore skips the catalogue/enrolment authorization invariants at
  preview time; it still detects a schema-2 file needing conversion and
  reports "different data version" without one. The actual destructive
  restore path (`restoreDatabaseFromBackup`) always validates with the live
  database's own bound context regardless, so no unsafe restore can occur —
  only the friendly pre-confirmation preview is narrower than the backend.
  Threading a context through the shared UI component and its two feature
  callers was judged out of MR-0b's persistence scope and the "no
  route/copy/layout" boundary; flagged here rather than done silently.
- `assertBackupDataInvariants`'s new catalogue/enrolment checks are skipped
  entirely when no migration context is supplied (kept optional for
  backward compatibility with the one existing doc-only external reference,
  `C0_EVIDENCE_PROBES.md`); every real code path (import parsing with a
  context, and both restore validation points) always supplies one.
- Enrolment and bootstrap consistency are enforced only for the single
  currently-registered programme; C7's multi-programme switching is
  explicitly out of scope and not addressed here.

## 10. Disposition

- **C6:** implemented and validated locally on candidate `7af18c2`. Not
  accepted. C7 was not started.
- **Publication:** deferred. No push, merge, tag, or deployment occurred;
  `origin/master` and Production are unchanged.
- **Next step:** owner review of this record and the candidate diff
  (`git diff 42207203 7af18c2`).
