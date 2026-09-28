# Epic C / C6-R — repair closure record (owner-review repair round)

## 1. State

**`C6_REPAIRED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`**

Not `C6_ACCEPTED`. C6 remains not accepted, C7 was not started, and nothing
was pushed, merged, tagged, deployed or otherwise published.

- Independent owner review of exact rejected candidate `7af18c2` (closure
  `b3c6544`, `docs/post-release/epic-c/C6_CLOSURE_RECORD.md`) found two
  materially different confirmed product defects (D1, D2) plus a historical
  RED-first deviation and a weakened C1 preservation assertion. The owner
  directly authorized one bounded repair round, C6-R, from exactly the
  rejected closure commit.
- During C6-R's own mandated adversarial review of the relational migration
  validator, a third, materially distinct relational-validation gap (RD3)
  was found. Per the authorization's explicit STOP rule, work stopped there
  and the finding was reported rather than patched opportunistically. The
  owner independently reviewed and confirmed the finding, then issued one
  bounded continuation authorization covering RD3 repair plus several
  evidence-completion items that remained after the first STOP.
- This record covers both authorizations as one coherent repair round: the
  RED checkpoint and D1/D2 repair that preceded the STOP, and the RD3 RED
  checkpoint, RD3 repair, D2 API hardening, and E1/C1 evidence completions
  that followed the continuation.
- No second RD3-class defect was found after the continuation resumed. No
  further STOP was needed.

## 2. Identities

| Item                                          | Value                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Original C6 owner authorization               | direct owner instruction, 2026-09-28: start C6 from `42207203`, local only                                   |
| Original accepted planning/readiness base     | `42207203532c67ce0bf1ab4a8a5bb9a54a8b32b2`                                                                   |
| Rejected C6 source candidate                  | `7af18c2035ccb8f9338321475b65e0111856dae9` (tree `277e6659b942522346aaf41e74046f66d5ba4813`)                 |
| Rejected C6 closure (docs-only)               | `b3c654417f6f34831cdafdbbf2c8ceae82e6fd5f` (tree `54a1e6ce3da437d46dd93f5a89952ecf6a24de7b`)                 |
| Rejected candidate `src` subtree              | `dacf89b258d45eceefc1e710843224b216cac68a`                                                                   |
| Rejected candidate branch (untouched)         | `cx/epic-c6-persisted-ownership-migration`, still at `b3c6544`                                               |
| C6-R repair branch                            | `cx/epic-c6-r-owner-review-repair`, created from `b3c6544`                                                   |
| First owner-review authorization (2026-09-28) | independently rejected `7af18c2`; authorized RED -> D1 -> D2 -> E1/E2 -> C1 oracle -> STOP-on-new-finding    |
| RD3 STOP report                               | reported after the C1 oracle commit, at stopped `HEAD` `42262c7` (tree `1e9cee3`, `src` `f38c54e`)           |
| Continuation owner authorization (2026-09-28) | independently confirmed RD3; authorized RD3 repair, D2 hardening, E1/C1 completion, then the final aggregate |
| Final exact C6-R candidate                    | `e6372af1768f5dce818fe60b8a0c059d9ec42a22`                                                                   |
| Final candidate tree                          | `11b21ebd6b68b7a007b569a1f29a6a7981006702`                                                                   |
| Final candidate `src` subtree                 | `8018afc2a128998696a976ab79edb226f5ced04b`                                                                   |
| `origin/master` (unchanged throughout)        | `d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3`                                                                   |
| Implementation commits (concern-scoped)       | see §3                                                                                                       |

Preflight was verified exactly against the owner's stated identities before
any mutation, both at repair-branch creation and again at the continuation
resume: branch, `HEAD`, tree, `src` subtree, ancestry (`b3c6544` descends
from `7af18c2`; `7af18c2` descends from `4220720`), worktree cleanliness
(including untracked files), absence of any C6 candidate tag, the rejected
branch still pointing at `b3c6544` unmodified, and `origin/master` unchanged
from the previously verified publication baseline. No push, tag, merge, or
deploy occurred at any point in this round.

## 3. Commits (concern-scoped, in order)

| #   | Commit    | Tree      | Concern                                                                 |
| --- | --------- | --------- | ----------------------------------------------------------------------- |
| 1   | `004cf57` | `5d6a465` | C6-R RED checkpoint (D1, D2) — tests/fixtures only, no `src/**` change  |
| 2   | `2c9c063` | `38b37a0` | D1 repair — bootstrap fail-closed on inconsistent current state         |
| 3   | `825990b` | `20ff467` | D2 repair — wire authorized migration context into backup preview       |
| 4   | `b128d12` | `658411e` | E1/E2 evidence — mid-write rollback proof; restore==upgrade equivalence |
| 5   | `42262c7` | `1e9cee3` | C1 oracle strengthening beyond count/ID parity (STOP reported here)     |
| 6   | `e2c0c48` | `a6cec0c` | RD3 RED checkpoint — tests only, no `src/**` change                     |
| 7   | `9af3df8` | `374f479` | RD3 repair — reject a study session naming the wrong unit for its item  |
| 8   | `4d9ef1b` | `e012a6c` | D2 API hardening — required `migrationContext`; composition evidence    |
| 9   | `e6372af` | `11b21eb` | E1 write-order proof strengthened mechanically; C1 re-export completion |

No commit in this list amends, squashes, rebases, or rewrites another. The
rejected candidate's commits (`7af18c2`, `b3c6544`) and its own history are
untouched.

## 4. Original C6 owner-review defects (D1, D2)

### D1 — bootstrap consistency could be bypassed

`ensureBaseInitialization()` (`src/lib/db/repositories.ts`) computed
`needsAppMetaWrite` / `needsProfileWrite` and returned early whenever both
were false — before ever checking that the stored `app_meta.activeProgrammeId`
matched the database's bound migration context, or that the required
`programme_enrolments` row for the active programme existed. An
already-current v3 database with a mismatched `activeProgrammeId`, or one
missing its active-programme enrolment, therefore bootstrapped successfully
instead of failing closed, contradicting the accepted C6 fail-closed
bootstrap invariant.

**Repair** (`2c9c063`): the consistency check now runs against existing app
metadata before the no-op early return, not only inside the branch that
performs a write. Fresh initialization (no stored app metadata) is
unaffected — it still creates valid app metadata, profile, and enrolment
state. `ensureBaseInitialization` can also run nested inside a caller's own
transaction that does not include `programme_enrolments` (for example
`addStudySessionAndAwardXp`); that nesting is only safe because a successful
earlier top-level bootstrap already proved the invariant, so the enrolment
read runs only when it can do so inside the ambient transaction, or
standalone with none.

**Evidence**: `tests/db/bootstrapInvariants.test.ts` — D1-A (mismatched
`activeProgrammeId` on a current database fails closed), D1-B (a current
database missing its active-programme enrolment fails closed), D1-C (a
valid current database remains a no-op idempotent bootstrap, proven by an
advancing clock producing no `updatedAt` change).

**Malformed-current-state evidence**: D1-A / D1-B above, run RED against
exact rejected-candidate source (`7af18c2`) before the D1 commit, confirmed
resolving instead of rejecting.

**Valid-current no-write evidence**: D1-C, unchanged by the repair, still
passing.

### D2 — schema-2 backup recovery was not reachable through the real UI

The backend could forward-convert a schema-2 backup when supplied a valid
`DatabaseMigrationContext`, but the production `ImportBackupControl` called
`parseBackupFile(text, { expectedSchemaVersion })` without one. For a
schema-2 backup while the app expects schema 3, `parseBackupFile` requires
migration context for forward conversion; without it, parsing rejected the
file during preview with the "different data version" alert, so a
successful preview — which creates the selection that enables
confirmation — was never reached. The supported historical schema-2
recovery flow was unreachable through the real Settings/onboarding recovery
UI.

**Repair** (`825990b`, hardened by `4d9ef1b`): `ImportBackupControl` accepts
a `migrationContext` prop (now required, not optional — see below) and
forwards it to `parseBackupFile`. `SettingsSurface` and `OnboardingPage` —
the two real production compositions that render the shared control —
supply the live database's own bound context via
`getSharedDatabase().migrationContext`, the same pattern `AppStateProvider`
already uses to read the bound instance.

**API trust-boundary decision**: `migrationContext` is a required prop, not
optional. An optional prop let a caller forget authorization and still
compile against the same shape, with behavior silently varying by backup
schema (a schema-3 backup would still preview; a schema-2 backup would be
rejected). Making it required means a caller cannot compile without
supplying it. Context-free structural parsing is still exercised directly
at the `parseBackupFile` layer (`tests/lib/backup.test.ts`), not through the
production component.

**Settings recovery evidence / onboarding recovery evidence**:
`tests/features/settings/backupRecoveryComposition.test.tsx` — using the
real app shell/router (`renderAppAtRoute`) with no mocked programme, one
test drives the real Settings recovery surface through uploading a
historical schema-2 backup fixture (`v1.3.0-envelope1-schema2.json`),
confirms the restore, and verifies the resulting schema-3 state (learner
profile, `appMeta.schemaVersion`, `activeProgrammeId`) directly from the
database. A second test drives the real onboarding recovery surface and
confirms preview succeeds and the confirm button is reachable. Manually
reverting the forwarding of `migrationContext` reproduces the original D2
defect and fails both tests (confirmed non-vacuous during development).

**Schema-2 preview/import/restore result**: preview succeeds under an
authorized context; confirmation restores; final state is schema-3,
`activeProgrammeId` composition-authorized, `schemaVersion` current.

**Destructive-restore trust boundary, unchanged**: `restoreDatabaseFromBackup`
independently revalidates the snapshot against the live database's own
bound `migrationContext` regardless of what the preview supplied
(`parseSnapshotForRestore`, then a second `assertBackupDataInvariants` call
after seed reconciliation, both in `repositories.ts`) — neither function was
touched by this repair.

### Historical RED-first deviation

C6's original "RED-first" requirement was violated: production
implementation preceded the purported RED evidence, and the later tests
passed immediately. C6-R does not rewrite that history. Its own RED
checkpoints (`004cf57` for D1/D2, `e2c0c48` for RD3) are mechanically
verified: each was run against the exact pre-repair source, confirmed to
fail for the intended product mechanism, and committed before any `src/**`
change.

## 5. RD3 — study-session unit/item cross-check (discovered during C6-R)

Found during the owner-mandated adversarial re-read of the relational
migration validator against binding Control 1, before the original
candidate creation. `assertFullRelationalValidity`
(`src/lib/db/migrationV2ToV3.ts`) checked, for every legacy study session,
only that `session.unitId` and `session.itemId` each resolved to _some_
existing row — never that the referenced item's own `unitId` actually
equalled `session.unitId`. A malformed legacy session (`unitId = unit-a`,
`itemId` -> an item that really belongs to `unit-b`) therefore passed the
real Dexie in-place v2->v3 upgrade — the most common real-world migration
path — even though the identical input was already rejected by the
schema-2 backup-restore path's stricter `assertBackupDataInvariants` check
(`item.unitId === session.unitId`). This existed unchanged in rejected
candidate `7af18c2`; C6-R did not introduce it.

Per the authorization's STOP rule this was reported rather than patched
opportunistically. The owner independently reviewed and confirmed it, and
issued a continuation authorization for RD3 repair specifically.

**Repair** (`9af3df8`): an `itemById` lookup map was added alongside the
existing `itemIds` set (used unchanged everywhere else), and the study
session check now also verifies `item.unitId === session.unitId` after
confirming both rows exist, aborting the migration before any write on
mismatch — the same fail-before-write contract every other check in this
function already follows. No session ownership, `programmeId`, or
read-scoping semantics changed; sessions remain learner-global (OD-4
unaffected).

**RD3-A** (`tests/db/migrationV2ToV3.test.ts`): the pure `migrateV2ToV3`
function, given two real authorized units and a session naming the wrong
one for its item, RED-failed (accepted the contradiction) before the
repair and GREEN-passes (rejects it) after.

**RD3-B** (`tests/db/migrationV2ToV3Adversarial.test.ts`): the real Dexie
upgrade on an equivalent schema-valid legacy v2 database, same RED-to-GREEN
result; a raw reopen after rejection confirms v2 remains completely intact
(native version stays at 20; the v3-only object stores are never created).

**RD3-C** (same file, path-consistency evidence): the identical malformed
state as a schema-2 backup was already rejected by the real
forward-conversion path before the repair (via `assertBackupDataInvariants`,
which had the stricter check all along) — confirming the two real
migration paths _disagreed_ on this input pre-repair. After the repair, the
shared `migrateV2ToV3` catches it first for both paths (the backup path now
surfaces `MigrationAbortedError` from the shared check one layer earlier,
rather than its own separate `BackupValidationError`), so both real
migration paths now agree.

**Relational-validation disposition**: the native migration validator and
the backup validator do not need textually identical checks. Binding
Control 1 requires complete deterministic catalogue/programme attribution
through the relevant legacy parent relationships; RD3 was exactly that
class of gap (a session's parent-chain attribution could be internally
inconsistent while still resolving to an authorized catalogue). Several
other backup-side checks are stricter data-quality/recovery invariants
(optional media-event/slice consistency, media-event/session consistency,
resume-point/source-event consistency, resume-point/next-slice consistency,
unrelated backup-format invariants) and were deliberately left alone — they
were not opportunistically copied into `migrateV2ToV3`, and none of them was
found to create a materially ambiguous or unauthorized catalogue/programme
attribution under the binding C6 migration contract.

## 6. C1 preservation-oracle transition (owner-authorized)

**Old assertion**: `buildC1BaselineEnvelope() toEqual(committedFixture)` —
byte-for-byte equality between the rebuilt envelope and the frozen fixture.

**Why it became structurally obsolete**: C6's live repositories always
produce schema-3 output (`activeProgrammeId`, `catalogueVersions`,
`programmeEnrolments`; the extra bootstrap write also shifts every later
incrementing-clock timestamp), so the builder can no longer reproduce the
frozen schema-2 fixture byte-for-byte without reviving the retired
schema-2 write path. This is a fact about the builder's own provenance
mechanism, not the fixture, which stays byte-for-byte unchanged and is
exercised by every other test in the suite (parse, forward-conversion,
restore, invariants).

**Explicit owner authorization**: first granted in the original 2026-09-28
review authorization ("The owner now explicitly authorizes a C6-R
preservation-oracle transition, bounded as follows...") and confirmed as
correctly bounded in the continuation authorization's disposition of the
C1 work already done.

**New complete canonical migration oracle**: frozen historical C1 schema-2
bytes (`tests/fixtures/backups/c1-baseline-envelope1-schema2.json`) -> the
real current parser/converter (`parseBackupFile`) -> the real current
restore path (`restoreDatabaseFromBackup`) -> the canonical current
schema-3 persisted state, asserted completely in
`tests/preservation/c1BaselineFixture.test.ts`'s
"restores through the real restore path" test:

- every unchanged legacy learner-data table (`learnerProfile`,
  `courseUnits`, `courseItems`, `progressEntries`, `contentAssets`,
  `contentSlices`, `mediaProgressEvents`, `resumePoints`, `studySessions`,
  `xpTransactions`, `achievementDefinitions`, `achievementUnlocks`)
  survives exactly (`toEqual` against the parsed input, and again after a
  real re-export/reparse round trip);
- `app_meta` is asserted as one complete explicit literal (`id`, original
  `createdAt`, preserved `updatedAt`, current `appVersion`, preserved
  `onboardingCompletedAt`, current `schemaVersion`, composition-authorized
  `activeProgrammeId`), with a second assertion confirming that literal is
  exactly what the real parser/converter produced (not a value the test
  invented), and `seedVersion` confirmed absent;
- `catalogue_versions` is asserted as the exact expected migrated row,
  proving `dataVersion` derives from the legacy `seedVersion` (`20260617`)
  and `syncedAt` derives from the legacy `app_meta.updatedAt`
  (`'2026-09-19T12:05:00.000Z'`);
- `programme_enrolments` is asserted as the exact expected migrated
  enrolment, proving `enrolledAt` follows the `onboardingCompletedAt`
  branch of the accepted `onboardingCompletedAt ?? createdAt` rule (the
  fixture has both fields, so this proves the non-fallback branch);
- backup restore adds exactly the one specified `import` audit record
  (asserted against the frozen fixture's own `backups` plus that record);
- re-export/reparse retains canonical learner state, and now also
  `appMeta`, `catalogueVersions`, and `programmeEnrolments` exactly.

**Proof frozen fixture bytes are unchanged**: confirmed via `git status`
and `git diff` against `tests/fixtures/backups/c1-baseline-envelope1-schema2.json`
at every commit in this round — no diff, no status entry, at any point.

The historical `buildC1BaselineEnvelope()` count/ID smoke test remains in
the suite as a builder-still-works, provenance-adjacent check. It is not
described as, and is not, the primary preservation oracle; the test above
is.

## 7. Migration rollback and equivalence evidence (E1, E2)

### E1 — mid-write injected upgrade failure

The rejected candidate's "leaves v2 intact" tests only proved a pre-write
validation abort (`migrateV2ToV3` itself throwing before any write is
attempted) — not that a failure _after_ migration writes begin still rolls
back completely.

`tests/db/migrationV2ToV3Adversarial.test.ts` ("mid-write upgrade failure")
injects a failure into the last of the three concurrent migration writes in
`migrateVersionTwoToVersionThree` (`app_meta.put`,
`catalogue_versions.bulkAdd`, `programme_enrolments.bulkAdd`), after the
other two have already been issued against the same version-change
transaction, by patching the native `IDBObjectStore.prototype.put` and
`.add` primitives (test-only, self-restoring; Dexie's mutate core calls
these dynamically via `store[type](...)`, so this is the one seam every
write path goes through). Strengthened mechanically per the continuation
authorization: the test now _records_ every native `put`/`add` call's store
name as it happens and asserts, both at the moment the injected failure
fires and again after the upgrade rejects, that at least one earlier
migration write (`app_meta` and/or `catalogue_versions`) was genuinely
observed — not inferred from source-code reading. The whole upgrade,
including the schema change itself, rolls back: the native database stays
at v2 (native version 20), the v3-only object stores are never created, and
a fresh raw reopen shows the original v2 rows intact. No production debug
seam was added.

### E2 — `restore(old) == upgrade(old)`

`tests/preservation/migrationRestoreEquivalence.test.ts` takes the same
representative legacy v2 state through both real paths with a fixed clock:

- Path A: a real in-place Dexie v2->v3 upgrade
  (`createProgressPalDatabase` opening a raw legacy v2 fixture), followed
  by the same `initializeDatabase` bootstrap call the app always makes
  right after opening.
- Path B: the identical legacy state as a schema-2 backup, forward-converted
  by `parseBackupFile`, then restored through the real
  `restoreDatabaseFromBackup` path.

The comparison covers every store the migration affects or touches
(`appMeta`, `catalogueVersions`, `programmeEnrolments`, and the full set of
learner-data stores), naming the one legitimate path-specific difference
explicitly: restore appends exactly one `import` audit record that an
in-place upgrade never creates. `appVersion` is deliberately left stale in
the legacy fixture and asserted to normalize to `currentApplicationVersion`
on both paths, so the equivalence is not an accidental match on
already-equal inputs. A deliberate sanity mutation (diverging the two
paths' clocks) was used during development to confirm the test actually
fails on divergence, then reverted.

E2 was reviewed unchanged in intent during the continuation and needed no
redesign.

## 8. Full MR-1 through MR-15 disposition

MR-0a (`SPEC.md` §6, OD-1 to OD-5), MR-0b
(`C6_SCHEMA_CHANGE_DECISION_RECORD.md`), and MR-0e
(`C6_READINESS_RECORD.md`) are contract/history references, unchanged by
C6-R. MR-1 through MR-15 below reflect the exact C6-R candidate `e6372af`;
every row not directly touched by D1/D2/RD3 is unchanged from the original
C6 implementation and is covered by the full local gate (§9), which passed
in its entirety on this exact candidate.

| MR    | Requirement                                                                                                                | Production path / evidence                                                                                                                                  | Result                                                                           | Residual / exception |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------- |
| MR-1  | Catalogue-derived rows resolve through validated relationships to an authorized catalogue; learner-global stores untouched | `assertFullRelationalValidity` (`migrationV2ToV3.ts`), now including RD3's `item.unitId === session.unitId` check; `tests/db/migrationV2ToV3.test.ts`       | PASS (repaired: RD3)                                                             | none                 |
| MR-2  | Every otherwise-valid v2 database with `app_meta` is enrolled in and active on the bound programme; fresh init is atomic   | `migrateVersionTwoToVersionThree`, `ensureBaseInitialization`; `tests/db/migrations.test.ts`, `tests/db/bootstrapInvariants.test.ts`                        | PASS (repaired: D1 for the existing-database branch)                             | none                 |
| MR-3  | `catalogue_versions` is the sole version authority; sync authorized, monotonic, collision-rejecting (P2)                   | `ensureCourseCatalogFromSeedWithinScope`; `tests/db/migrationV2ToV3Adversarial.test.ts` ("catalogue sync adversarial evidence")                             | PASS (unchanged)                                                                 | none                 |
| MR-4  | No re-keying; database name unchanged; only the listed `app_meta` fields change                                            | `database.ts` (untouched by C6-R); schema/store definitions unchanged                                                                                       | PASS (unchanged)                                                                 | none                 |
| MR-5  | Double upgrade and reopen write nothing                                                                                    | `ensureBaseInitialization` D1-C idempotency; `tests/db/bootstrapInvariants.test.ts`                                                                         | PASS (strengthened: D1-C proves no-write via an advancing clock)                 | none                 |
| MR-6  | No reward writes by migration; re-saving awards 0 XP; duplicate XP rejected                                                | `assertNoDuplicateXpSourceKeys`; `tests/db/migrationV2ToV3.test.ts`                                                                                         | PASS (unchanged)                                                                 | none                 |
| MR-7  | Isolation in both directions with the test-only programme                                                                  | `defaultTestMigrationContext` / `bothCataloguesMigrationContext` fixtures across the migration test suites                                                  | PASS (unchanged)                                                                 | none                 |
| MR-8  | Schema-2 -> 3 forward conversion with explicit context; fixtures round-trip; adversarial matrix rejects                    | `convertLegacyBackupDataV2ToV3`; `tests/db/backupCompatibility.test.ts`, `tests/lib/backup.test.ts`                                                         | PASS (D2 makes this reachable through the real UI; parser-level tests unchanged) | none                 |
| MR-9  | A pre-C6 application rejects schema-3 backups with the existing message                                                    | `parseBackupFile`'s ordinary version-mismatch path; `tests/lib/backup.test.ts`                                                                              | PASS (unchanged)                                                                 | none                 |
| MR-10 | `restore(old) == upgrade(old)`; reset re-enrols; no downgrade; older-application return unsupported                        | `tests/preservation/migrationRestoreEquivalence.test.ts` (E2, new this round); reset/downgrade paths in `tests/db/repositories.test.ts`                     | PASS (new complete equivalence proof this round)                                 | none                 |
| MR-11 | Unknown catalogue, unknown programme, or mismatched active pointer fails closed                                            | `assertBackupDataInvariants` catalogue/programme checks; D1's `activeProgrammeId` check; `tests/db/bootstrapInvariants.test.ts`, `tests/lib/backup.test.ts` | PASS (repaired: D1 closes the mismatched-pointer gap on the bootstrap path)      | none                 |
| MR-12 | Atomic abort leaves v2 intact, including a mid-write failure                                                               | `migrateVersionTwoToVersionThree`'s all-writes-in-one-transaction shape; `tests/db/migrationV2ToV3Adversarial.test.ts` (E1, strengthened this round)        | PASS (new mid-write proof this round, mechanically strengthened)                 | none                 |
| MR-13 | New `versionchange`/`blocked` handling with existing copy only                                                             | no custom hook exists; Dexie defaults; `tests/db/migrationV2ToV3Adversarial.test.ts` ("multi-tab old-shell upgrade")                                        | PASS (unchanged; MR-13/14 needed no new copy, per prior evidence)                | none                 |
| MR-14 | Upgrade and initialization are coordinated writes                                                                          | `beginLocalWrite` / `beginDestructiveLocalWrite` coordination in `repositories.ts` (untouched)                                                              | PASS (unchanged)                                                                 | none                 |
| MR-15 | Snapshot coverage guard extended to the new stores                                                                         | `getDatabaseSnapshot`'s `allDataTables` completeness assertion; `tests/db/repositories.test.ts`                                                             | PASS (unchanged)                                                                 | none                 |

## 9. Final aggregate (exact candidate `e6372af`, tree `11b21eb`, `src` `8018afc`)

Worktree confirmed clean, including untracked files, immediately before and
immediately after this run. Run once, on this exact candidate, in this
order:

| Gate                                  | Result                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run lint`                        | PASS — 0 warnings                                                                   |
| `npm run format:check`                | PASS                                                                                |
| `npm run typecheck`                   | PASS                                                                                |
| `npm run check:circular`              | PASS — 257 files analyzed, 0 circular dependencies                                  |
| `npm run build`                       | PASS — 270 modules transformed                                                      |
| `npm run check:bundle`                | PASS — 0 violations; largest raw JS chunk 394,192 bytes (budget 500,000)            |
| `npm test`                            | PASS — 93 files, 942 tests, 0 failed, 0 skipped, 0 retried                          |
| `npm run test:e2e` (managed, one run) | PASS — 90 tests, 0 failed, 0 skipped (2 Playwright projects: `chromium`, `offline`) |
| `git diff --check`                    | PASS — no whitespace errors                                                         |

No skipped test, retried test, non-zero exit, or environment-only
interruption occurred at any point in this run. `verify:release` was not
run (out of scope — publication is not authorized).

### C1 visual captures

The managed E2E run includes `e2e/c1-baseline-visual-capture.spec.ts`,
which regenerates capture images by its own documented design. That spec's
own header states its contract explicitly: **"CAPTURE ONLY (no
comparison)"** and **"every run, including review-only runs, is disposable
and non-retained... a successful capture is not visual acceptance."**
Retaining a corrected C1 baseline requires separate owner authorization
binding an accepted candidate commit, which this round does not have. This
run's captures therefore were not compared against the accepted retained
baseline, per that spec's own contract, and were not used to replace or
reseal it.

The accepted retained baseline
(`artifacts/epic-c1-visual-baseline/c1-visual-baseline-69b1db7.zip` and its
inventory) is confirmed byte-for-byte untouched: `artifacts/` is entirely
git-ignored, `git status` shows no changes under it at any point in this
round, and this round made no writes to that path outside the spec's own
disposable `captures/` subdirectory.

## 10. Scope and preservation confirmation

- **No MR-0b persistence change**: the only persisted fields/stores this
  round touches are the ones MR-0b already authorized
  (`catalogue_versions`, `programme_enrolments`, `app_meta.activeProgrammeId`,
  removed `app_meta.seedVersion`). `git diff --stat` between the
  continuation-resume commit (`42262c7`) and the final candidate (`e6372af`)
  touches exactly two source files
  (`src/components/ui/ImportBackupControl.tsx`,
  `src/lib/db/migrationV2ToV3.ts`) — no schema, store, or index change.
- **No C7 leakage**: no multi-programme registration, enrolment, or
  switching behavior was added; D1's check enforces a _stable_ identity, it
  does not introduce a way to change it.
- **No new dependency**: `package.json` / `package-lock.json` unchanged
  throughout this round (confirmed via `git diff --stat`).
- **No unrelated feature/UI change**: no new visible copy, route, layout,
  CSS, or navigation. The only UI-adjacent change is the `migrationContext`
  prop plumbing (D2), which is not user-visible.
- **No architecture guard weakened**: `tests/architecture/**` passed
  unchanged as part of the full suite; the layer-boundary ESLint rules
  (`no-restricted-imports`) were not modified.
- **No pre-existing accepted assertion silently removed or skipped** beyond
  the one explicitly owner-authorized C1 oracle transition (§6); the
  historical count/ID smoke test was kept, not deleted, and is now
  correctly described as a smoke check rather than the primary oracle.
- **Epic A / C1-C5 preservation**: the full local test suite, including
  every Epic A read-boundary suite, C1-C5 architecture and preservation
  suites, and the C1 baseline fixture suite, passed unchanged in this
  round's final aggregate (§9).
- **Dependency diff**: none.

## 11. Residual limitations

- C6 remains **not accepted**; this record documents a locally validated
  repair candidate for separate owner review, not acceptance.
- The C1 visual baseline captured by this round's managed E2E run is
  disposable and non-retained, per that spec's own contract (§9); no new
  retained baseline exists or was created.
- The backup-side "stricter" relational invariants noted in §5 that were
  deliberately left alone (media-event/slice, media-event/session,
  resume-point/source-event, resume-point/next-slice consistency) remain
  data-quality/recovery invariants specific to the backup path; they were
  not evaluated for whether the native in-place upgrade should also enforce
  them, because none was found to bear on catalogue/programme attribution
  under binding Control 1. This is an explicit scope boundary, not a defect
  finding.
- No C7 work, publication, or `verify:release` run was performed or is
  authorized by this record.

## 12. Confirmation

- C6 is repaired and validated locally, but **not accepted**.
- C7 was not started.
- No push occurred.
- No merge occurred.
- No tag was created.
- No deploy occurred.
- No publication occurred.

Maximum state reached: `C6_REPAIRED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`.
Not `C6_ACCEPTED`.
