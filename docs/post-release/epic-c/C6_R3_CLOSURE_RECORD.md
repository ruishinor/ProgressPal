# Epic C / C6-R3 — repair closure record (third owner-review repair round)

## 1. State

**`C6_REPAIRED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`**

Not `C6_ACCEPTED`. C6 remains not accepted, C7 was not started, and nothing
was pushed, merged, tagged, deployed or otherwise published.

- Independent owner review of the exact C6-R2 Git bundle (candidate
  `af92334`, closure `c76610e`) did **not** accept it. Review accepted the
  existing repair direction for D1/D1b generally, D2, RD3, E1, E2, the C1
  preservation oracle, the MR-0b schema boundary, and the 64/64
  visual-preservation mechanism, but found one remaining reachable branch
  of the same D1 fail-closed defect family ("D1c"), plus two required
  evidence/documentation completions.
- This round (C6-R3) is deliberately narrow: it repairs D1c, strengthens
  the D1b evidence with explicit no-XP/no-silent-repair assertions, and
  supplies the complete MR-1 through MR-15 matrix this record now
  contains. It does not reopen D2, RD3, E1, E2, the C1 oracle, schema
  design, the backup model, or the visual-baseline machinery, and none of
  them regressed.
- `7af18c2`, `b3c6544`, `e6372af`, `245d642`, `af92334`, and `c76610e` are
  all preserved as historical evidence of candidates independently
  reviewed and not accepted. None was amended, rewritten, or rebased.

## 2. Identities

| Item                                           | Value                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Original rejected C6 candidate                 | `7af18c2035ccb8f9338321475b65e0111856dae9`                                                                               |
| Original rejected C6 closure                   | `b3c654417f6f34831cdafdbbf2c8ceae82e6fd5f`                                                                               |
| Rejected C6-R candidate                        | `e6372af1768f5dce818fe60b8a0c059d9ec42a22`                                                                               |
| Superseded C6-R closure                        | `245d642cd82a90dc465e83dc54c0f50be3efbaa5`                                                                               |
| Rejected C6-R2 candidate                       | `af923346197391ce3578e238b676b717564f1e79` (tree `3f9597d4a02fe60ae0c19872f4c18f758993aeb9`)                             |
| Superseded C6-R2 closure                       | `c76610eb89fd956aed2b3a3512a0523428952419`                                                                               |
| D1c RED checkpoint                             | `ba19765f0311f81ea5ff2a9d375f2b62f1dde591` (tree `a64fad18c8aede9466443e091b60049ea86e1250`)                             |
| D1c GREEN repair / final replacement candidate | `6f4ca7da31247ecac8f0763ec38f51a209e4ff8a`                                                                               |
| Final candidate tree                           | `2497a1425d3614505a54cd6beccf4a372e39ea6f`                                                                               |
| Final candidate `src` subtree                  | `fb3ed560147e1b42bd687f54872cdb683b3f4775`                                                                               |
| `origin/master` (unchanged throughout)         | `d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3`                                                                               |
| Rejected C6 branch (untouched)                 | `cx/epic-c6-persisted-ownership-migration`, still at `b3c6544`                                                           |
| C6-R repair branch                             | `cx/epic-c6-r-owner-review-repair`                                                                                       |
| Accepted C1 visual baseline archive            | `c1-visual-baseline-69b1db7.zip`, SHA-256 `cb40459103140f0de7de562e7c84d244ab6826d668952e7d06af0dea7c42917c` (unchanged) |

Continuation preflight was verified exactly against the owner's stated
identities before any mutation: branch, `HEAD` (`c76610e`), parent
(`af92334`), rejected candidate tree/`src` (`3f9597d`/`03d5067`), worktree
cleanliness (including untracked files), unchanged prior C6/C6-R/C6-R2
history, the rejected C6 branch still unmodified at `b3c6544`, no
C6/C6-R/C6-R2 push, no candidate tag, and no merge/deploy/publication. No
mutation occurred before this was confirmed.

## 3. Commits added this round

| #   | Commit    | Tree      | Concern                                                                     |
| --- | --------- | --------- | --------------------------------------------------------------------------- |
| 1   | `ba19765` | `a64fad1` | D1c RED checkpoint — tests only, no `src/**` change                         |
| 2   | `6f4ca7d` | `2497a14` | D1c GREEN repair + D1b evidence strengthening (exact replacement candidate) |

Neither commit amends, squashes, rebases, or rewrites any prior C6-R
commit. All commits from `004cf57` through `c76610e` remain exactly as
previously recorded.

## 4. D1c — confirmed reachable branch of the D1/D1b defect family

`addStudySessionAndAwardXp` (`src/lib/db/repositories.ts`) has an
existing-session branch: when `input.id` is supplied and a row with that
ID already exists, `studySession` is assigned from the existing row and
`addStudySession(...)` — the only call in this function that reaches
`ensureBaseInitialization` — is skipped entirely. When the existing
session's `durationMinutes` is below the 25-minute XP threshold, the
XP-award branch is also skipped, so `addXpTransaction` (which also calls
`ensureBaseInitialization`) is never reached either. A repeat call with
the same session ID therefore never invoked `ensureBaseInitialization`
anywhere in the function, bypassing the D1/D1b enrolment invariant
completely — even on a database whose active-programme enrolment had
been removed after the session was first created.

This is the same fail-closed defect family as D1 and D1b, not a new
unrelated story. It was found by the owner's own independent review of
the exact C6-R2 bundle; C6-R2's own search (per §4 of
`C6_R2_CLOSURE_RECORD.md`) had covered every caller of
`upsertProgress`/`logMediaProgress`/`addStudySession`/`addXpTransaction`
that opens a transaction lacking `programme_enrolments`, but did not
separately check for an existing-entity skip branch bypassing the
lower-level call altogether within an already-repaired transaction.
`upsertProgressAndAwardXp` and `logMediaProgressAndAwardXp` were both
re-checked this round and confirmed to have no equivalent skip branch —
each calls its lower-level function (`upsertProgress`,
`logMediaProgress`) unconditionally, every time.

## 5. D1c RED checkpoint

Commit `ba19765` (tree `a64fad1`), changed paths:
`tests/db/bootstrapInvariants.test.ts` only — no `src/**`.

**D1c-A**: creates a legitimate short (10-minute, non-XP-qualifying) study
session while the enrolment is valid, confirms it persists, removes the
active-programme enrolment, then repeats the identical
`addStudySessionAndAwardXp` call with the same session ID and otherwise
valid fixtures (`sampleCourseSeed`, `cs50CatalogueId`, `cs50Policy`, an
item that genuinely exists). Observed pre-fix: the call **resolved
successfully**, returning the existing session data with `0` XP
transactions awarded, instead of rejecting on the missing enrolment. The
session was deliberately kept below the 25-minute threshold so the
reproduction could not be rescued by the XP-award branch's own
`addXpTransaction` call.

**D1c-B**: the existing qualifying/idempotent-session behavior (a
≥25-minute session repeated with a valid enrolment throughout) was
inspected and a dedicated test added confirming it is unaffected — a
repeat call does not duplicate the session or its XP transaction. This
passed before the repair (proving it is a pre-existing baseline
behavior, not a new defect) and remained green after.

## 6. D1c production repair

Commit `6f4ca7d` (tree `2497a14`), touching only
`src/lib/db/repositories.ts`. Adds one call,
`await ensureBaseInitialization({ ...options, db: database })`, at the
top of `addStudySessionAndAwardXp`'s compound transaction body —
immediately after `markCurrentTransactionCoordinated(database)` and
before the branch that checks whether `input.id` already exists — so the
invariant is established once, before either the existing-session or
new-session branch runs.

This transaction already includes `database.programmeEnrolments` (added
in the D1b repair), so the now-unconditional check
(`ensureBaseInitialization` no longer has any ambient-transaction guard,
per D1b) can run inside it — the same nested-transaction/coordinated-write
pattern that already ran safely whenever the new-session branch called
`addStudySession` nested, just invoked one level higher and
unconditionally. On the new-session branch this means the check now runs
twice (once here, once again inside the nested `addStudySession` call);
per the accepted repair direction this harmless duplication was kept
rather than adding another conditional bypass or a new
`skipBaseInitialization`-style flag. No schema, store, index, or field
change. No programme-switching semantics. No change to XP/reward
calculation, session ownership, or UI.

## 7. D1c GREEN results

- D1c-A: rejects with `/no enrolment exists for active programme/i`; the
  existing session is unchanged (`toEqual`-compared to its pre-attempt
  state); no XP transaction exists for that session's source ID; the
  missing enrolment is not silently recreated.
- D1c-B: unchanged and still passing — a repeat call for an existing
  qualifying session with a valid enrolment does not duplicate the study
  session (exactly one row) or its XP transaction (exactly one row).

## 8. D1b evidence strengthening (explicit no-XP / no-silent-repair)

Per the owner's finding that D1b-A/B/C proved the feature write failed
but did not mechanically assert every required side effect, each of
D1b-A, D1b-B, and D1b-C (`tests/db/bootstrapInvariants.test.ts`) now
additionally asserts, after the expected rejection:

1. `xpTransactions.count()` is `0` — no XP was awarded for the rejected
   attempt;
2. `programmeEnrolments.get(activeProgrammeId)` is `undefined` — the
   missing enrolment was not silently recreated by the failed attempt.

These are in addition to the pre-existing assertion that the target
learner mutation (progress entry / media progress event / study session)
does not persist. No product behavior changed for these evidence
completions — they assert facts already true of the D1b repair, made
explicit rather than implicit in test ordering.

## 9. D1/D1b/D1c focused results

`tests/db/bootstrapInvariants.test.ts` — **9 tests, all passing**:
D1-A, D1-B, D1-C (bootstrap-level, unchanged), D1b-A, D1b-B, D1b-C, D1b
valid-state regression (compound-write level, strengthened this round for
D1b only), D1c-A, D1c-B (existing-session branch, new this round). None
of D1-A/B/C or the D1b tests were weakened, skipped, or deleted.

## 10. D2/RD3/E1/E2/C1 regression results

Run immediately after the D1c repair, unmodified in design or intent —
all **PASS**, confirming no regression:

- `tests/db/repositories.test.ts` (XP/achievement/backup/reset
  integration, including the three compound-write functions' existing
  extensive coverage)
- `tests/db/migrationV2ToV3.test.ts`, `tests/db/migrationV2ToV3Adversarial.test.ts`
  (RD3, E1)
- `tests/db/migrations.test.ts`, `tests/db/backupCompatibility.test.ts`
- `tests/lib/backup.test.ts` (D2 parser-layer evidence)
- `tests/components/importBackupControl.test.tsx` (D2)
- `tests/features/settings/backupRecoveryComposition.test.tsx` (D2
  composition evidence)
- `tests/preservation/c1BaselineFixture.test.ts` (C1 oracle),
  `tests/preservation/migrationRestoreEquivalence.test.ts` (E2)
- `tests/programmes/catalogueScope.test.tsx` (C5 preservation)

11 test files, 151 tests, 0 failures. None of these systems were
redesigned merely because their tests were rerun.

## 11. Exact final replacement candidate

`6f4ca7da31247ecac8f0763ec38f51a209e4ff8a`, tree
`2497a1425d3614505a54cd6beccf4a372e39ea6f`, `src` subtree
`fb3ed560147e1b42bd687f54872cdb683b3f4775`. Worktree confirmed clean,
including untracked files, immediately before and immediately after the
final aggregate.

## 12. Final aggregate (exact candidate `6f4ca7d`)

Run once, in order, on this exact candidate:

| Gate                                  | Result                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `npm run lint`                        | PASS — 0 warnings                                                        |
| `npm run format:check`                | PASS                                                                     |
| `npm run typecheck`                   | PASS                                                                     |
| `npm run check:circular`              | PASS — 257 files analyzed, 0 circular dependencies                       |
| `npm run build`                       | PASS — 270 modules transformed                                           |
| `npm run check:bundle`                | PASS — 0 violations; largest raw JS chunk 394,190 bytes (budget 500,000) |
| `npm test`                            | PASS — 93 files, 948 tests, 0 failed, 0 skipped, 0 retried               |
| `npm run test:e2e` (managed, one run) | PASS — 90 tests, 0 failed, 0 skipped (`chromium` and `offline` projects) |
| `git diff --check`                    | PASS — no whitespace errors                                              |

No skipped test, retried test, non-zero exit, or environment-only
interruption occurred at any point in this run. `verify:release` was not
run (out of scope).

## 13. 64/64 C1 visual comparison

The managed E2E run above regenerated
`artifacts/epic-c1-visual-baseline/captures/` (64 PNGs). Because
production source changed this round and the managed E2E was rerun, the
comparison was performed again in full, using the accepted archive's
per-file inventory hashes as authority (`INVENTORY-69b1db7.sha256`, the
same 64 entries embedded in `c1-visual-baseline-69b1db7.zip`), not the
ZIP's own hash:

| Check                                      | Result                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Generated PNG count                        | 64                                                                 |
| Accepted inventory entry count             | 64                                                                 |
| Missing names (accepted, not generated)    | 0                                                                  |
| Unexpected names (generated, not accepted) | 0                                                                  |
| Duplicate names                            | 0                                                                  |
| Same-name SHA-256 mismatches               | 0                                                                  |
| Result                                     | **64/64 identical**                                                |
| Accepted archive SHA-256 (unchanged)       | `cb40459103140f0de7de562e7c84d244ab6826d668952e7d06af0dea7c42917c` |

The accepted archive and its embedded inventory were not regenerated,
recompressed, replaced, resealed, or otherwise modified — confirmed by
`git status` showing no change under the entirely git-ignored
`artifacts/` path, and by the archive's SHA-256 above matching the value
already recorded as accepted in `SPEC.md`. Capture generation itself is
not described as, and is not, visual preservation evidence on its own;
the 64/64 hash comparison above is the preservation evidence.

## 14. Complete MR-1 through MR-15 matrix

MR-0a (`SPEC.md` §6, OD-1 to OD-5), MR-0b
(`C6_SCHEMA_CHANGE_DECISION_RECORD.md`), and MR-0e
(`C6_READINESS_RECORD.md`) are contract/history anchors, unchanged by any
C6-R round. The table below reflects the exact final candidate `6f4ca7d`
in full — not a link to an earlier matrix — with every row tied to a
named production path and a named test file.

| MR    | Requirement                                                                                                                | Final production implementation / path                                                                                                                                                                | Exact current test / evidence                                                                                                                                                     | Result | Residual / exception |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------- |
| MR-1  | Catalogue-derived rows resolve through validated relationships to an authorized catalogue; learner-global stores untouched | `assertFullRelationalValidity` (`src/lib/db/migrationV2ToV3.ts`), including the RD3 `item.unitId === session.unitId` check                                                                            | `tests/db/migrationV2ToV3.test.ts` (all abort-path tests, incl. RD3-A)                                                                                                            | PASS   | none                 |
| MR-2  | Every otherwise-valid v2 database with `app_meta` is enrolled in and active on the bound programme; fresh init is atomic   | `migrateVersionTwoToVersionThree` (`src/lib/db/database.ts`); `ensureBaseInitialization` (`src/lib/db/repositories.ts`), now mandatory and reachable on every real compound write path (D1, D1b, D1c) | `tests/db/migrations.test.ts`; `tests/db/bootstrapInvariants.test.ts` (D1-A/B/C, D1b-A/B/C, D1c-A/B)                                                                              | PASS   | none                 |
| MR-3  | `catalogue_versions` is the sole version authority; sync authorized, monotonic, collision-rejecting (P2)                   | `ensureCourseCatalogFromSeedWithinScope` (`src/lib/db/repositories.ts`)                                                                                                                               | `tests/db/migrationV2ToV3Adversarial.test.ts` ("catalogue sync adversarial evidence")                                                                                             | PASS   | none                 |
| MR-4  | No re-keying; database name unchanged; only the listed `app_meta` fields change                                            | `src/lib/db/database.ts` store/version definitions (untouched by any C6-R round)                                                                                                                      | `tests/db/migrations.test.ts` (schema shape assertions)                                                                                                                           | PASS   | none                 |
| MR-5  | Double upgrade and reopen write nothing                                                                                    | `ensureBaseInitialization`'s no-op early return, now reached only after the D1/D1b/D1c invariant checks pass                                                                                          | `tests/db/bootstrapInvariants.test.ts` (D1-C: no-write proof via an advancing clock; D1b valid-state regression: three compound paths, no unnecessary writes)                     | PASS   | none                 |
| MR-6  | No reward writes by migration; re-saving awards 0 XP; duplicate XP rejected                                                | `assertNoDuplicateXpSourceKeys` (`migrationV2ToV3.ts`); `addXpTransaction`'s `deriveXpTransactionId` de-duplication (`repositories.ts`)                                                               | `tests/db/migrationV2ToV3.test.ts` (duplicate-XP abort); `tests/db/repositories.test.ts` (re-save awards 0 XP); D1c-B (repeat call awards 0 duplicate XP)                         | PASS   | none                 |
| MR-7  | Isolation in both directions with the test-only programme                                                                  | `defaultTestMigrationContext` / `bothCataloguesMigrationContext` fixtures (`tests/db/testDatabase.ts`)                                                                                                | used across `tests/db/migrationV2ToV3*.test.ts`, `tests/programmes/catalogueScope.test.tsx`                                                                                       | PASS   | none                 |
| MR-8  | Schema-2 → 3 forward conversion with explicit context; fixtures round-trip; adversarial matrix rejects                     | `convertLegacyBackupDataV2ToV3` / `parseBackupFile` (`src/lib/backup/envelope.ts`); `ImportBackupControl.migrationContext` now required (D2)                                                          | `tests/db/backupCompatibility.test.ts`, `tests/lib/backup.test.ts`, `tests/components/importBackupControl.test.tsx`, `tests/features/settings/backupRecoveryComposition.test.tsx` | PASS   | none                 |
| MR-9  | A pre-C6 application rejects schema-3 backups with the existing message                                                    | `parseBackupFile`'s ordinary version-mismatch path (`envelope.ts`)                                                                                                                                    | `tests/lib/backup.test.ts` ("rejects a mismatched data (schema) version")                                                                                                         | PASS   | none                 |
| MR-10 | `restore(old) == upgrade(old)`; reset re-enrols; no downgrade; older-application return unsupported                        | `restoreDatabaseFromBackup` / native `migrateVersionTwoToVersionThree` (both paths share `migrateV2ToV3`); `resetAllData` (`repositories.ts`)                                                         | `tests/preservation/migrationRestoreEquivalence.test.ts` (E2, full-state equivalence); `tests/db/repositories.test.ts` (reset re-enrolment, downgrade rejection)                  | PASS   | none                 |
| MR-11 | Unknown catalogue, unknown programme, or mismatched active pointer fails closed                                            | `assertBackupDataInvariants` catalogue/programme checks (`envelope.ts`); D1/D1b/D1c's `activeProgrammeId`/enrolment checks (`repositories.ts`)                                                        | `tests/lib/backup.test.ts`; `tests/db/bootstrapInvariants.test.ts` (D1-A, D1b-A/B/C, D1c-A: every real path that can reach `ensureBaseInitialization` now fails closed)           | PASS   | none                 |
| MR-12 | Atomic abort leaves v2 intact, including a mid-write failure                                                               | `migrateVersionTwoToVersionThree`'s all-writes-in-one-transaction shape (`database.ts`)                                                                                                               | `tests/db/migrationV2ToV3Adversarial.test.ts` (pre-write abort tests; E1 mid-write injected-failure test, mechanically strengthened)                                              | PASS   | none                 |
| MR-13 | New `versionchange`/`blocked` handling with existing copy only                                                             | no custom hook exists; Dexie defaults (`database.ts`)                                                                                                                                                 | `tests/db/migrationV2ToV3Adversarial.test.ts` ("multi-tab old-shell upgrade")                                                                                                     | PASS   | none                 |
| MR-14 | Upgrade and initialization are coordinated writes                                                                          | `beginLocalWrite` / `beginDestructiveLocalWrite` coordination (`repositories.ts`, untouched by C6-R)                                                                                                  | exercised throughout `tests/db/repositories.test.ts` and the e2e `multi-tab.spec.ts` suite                                                                                        | PASS   | none                 |
| MR-15 | Snapshot coverage guard extended to the new stores                                                                         | `getDatabaseSnapshot`'s `allDataTables` completeness assertion (`repositories.ts`)                                                                                                                    | `tests/db/repositories.test.ts` ("captures every persisted store in one read transaction")                                                                                        | PASS   | none                 |

Every row above is satisfied by a named, currently-passing test against
the exact final candidate `6f4ca7d` — not asserted from a green test count
alone.

## 15. Schema/dependency scope proof

`git diff --stat` from `c76610e` (the superseded C6-R2 closure) to
`6f4ca7d` (this round's exact candidate) touches exactly:

- `src/lib/db/repositories.ts` (production: the D1c `ensureBaseInitialization`
  call added inside `addStudySessionAndAwardXp`)
- `tests/db/bootstrapInvariants.test.ts` (tests: D1c-A/B, D1b evidence
  strengthening)

No other production path changed. `package.json` / `package-lock.json`
unchanged throughout this round (confirmed via `git diff --stat`) — no new
dependency. No schema, store, index, or persisted-field change beyond the
already-accepted MR-0b boundary. No route, copy, layout, CSS, or
navigation change. No programme-switching semantics. No C7 work.

## 16. Residual limitations

- C6 remains **not accepted**; this record documents a third locally
  validated repair candidate for separate owner review.
- The residual limitations recorded in `C6_R_CLOSURE_RECORD.md` §11
  (backup-side stricter relational invariants left intentionally alone;
  no C7/publication/`verify:release` work) still apply unchanged.
- No new materially different product/schema/architecture/trust-boundary
  defect was discovered during this round's focused work on D1c.

## 17. Confirmation

- C6 is repaired and validated locally, but **not accepted**.
- C7 was not started.
- No push occurred.
- No merge occurred.
- No tag was created.
- No deploy occurred.
- No publication occurred.

Maximum state reached:
`C6_REPAIRED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`. Not
`C6_ACCEPTED`.

## 18. Final owner disposition (post-closure)

This section was added after this record's original closure, to document
a separate, subsequent owner decision. It does not change anything in
sections 1–17 above, which remain exactly as recorded at the moment
C6-R3 validation completed and awaited review. At that time C6 was **not
accepted** and this record's maximum state was
`C6_REPAIRED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`; that was true
when written.

The owner subsequently and directly accepted this exact candidate:

| Item                              | Value                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Owner acceptance date             | 2026-09-29                                                                        |
| Accepted implementation candidate | `6f4ca7da31247ecac8f0763ec38f51a209e4ff8a`                                        |
| Accepted implementation tree      | `2497a1425d3614505a54cd6beccf4a372e39ea6f`                                        |
| Accepted `src` subtree            | `fb3ed560147e1b42bd687f54872cdb683b3f4775`                                        |
| Validated R3 closure basis        | `aca97d88331fb05159c5f3c104aedb136fa0c7c8` (this record, as originally committed) |

No product code, test, fixture, schema, dependency, or build configuration
changed as part of recording this acceptance. This section is a
documentation-only addition on top of the already-validated candidate.

Final disposition:

- Epic C / C6: **LOCALLY ACCEPTED AND CLOSED**.
- Accepted implementation: `6f4ca7da31247ecac8f0763ec38f51a209e4ff8a`.
- C7: **NOT AUTHORIZED**. No C7 branch, story start, or implementation was
  introduced by this acceptance.
- Publication: **NOT AUTHORIZED**. `origin/master` remains
  `d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3`, unchanged.
- Push: NONE. Merge: NONE. Tag: NONE. Deploy: NONE.
- The pre-schema publication/deployment sequencing referenced in §16
  remains a separate, not-yet-authorized operational requirement before
  any C6 migration reaches Production.

This section does not reopen D1, D1b, D1c, D2, RD3, E1, E2, the C1
oracle, the schema boundary, or any MR in §14. It records only the
owner's acceptance decision.
