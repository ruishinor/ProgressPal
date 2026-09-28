# Epic C / C6-R2 — repair closure record (second owner-review repair round)

## 1. State

**`C6_REPAIRED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`**

Not `C6_ACCEPTED`. C6 remains not accepted, C7 was not started, and nothing
was pushed, merged, tagged, deployed or otherwise published.

- Independent owner review of the exact final C6-R Git bundle
  (candidate `e6372af`, closure `245d642`) did **not** accept it. Review
  found the existing D2, RD3, E1, E2, and C1-oracle direction correct, but
  identified two remaining gaps: an incomplete aspect of the already-
  authorized D1 repair ("D1b"), and a missing mandatory final evidence
  step (the 64/64 C1 visual comparison against the accepted retained
  baseline, which the R1 closure incorrectly treated as unnecessary).
- This round (C6-R2) is deliberately narrow: it repairs D1b and completes
  the 64/64 comparison. It does not reopen D2, RD3, E1, E2, the C1 oracle,
  schema design, or the backup model, and none of them regressed.
- `e6372af` and `245d642` are preserved as historical evidence of a
  candidate independently reviewed and not accepted. Neither was amended,
  rewritten, or rebased.

## 2. Identities

| Item                                           | Value                                                                                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rejected original C6 source candidate          | `7af18c2035ccb8f9338321475b65e0111856dae9`                                                                                                                 |
| Rejected original C6 closure                   | `b3c654417f6f34831cdafdbbf2c8ceae82e6fd5f`                                                                                                                 |
| First C6-R candidate (not accepted)            | `e6372af1768f5dce818fe60b8a0c059d9ec42a22` (tree `11b21ebd6b68b7a007b569a1f29a6a7981006702`)                                                               |
| Superseded C6-R closure (not accepted)         | `245d642cd82a90dc465e83dc54c0f50be3efbaa5`, `docs/post-release/epic-c/C6_R_CLOSURE_RECORD.md`                                                              |
| Continuation owner authorization (2026-09-29)  | independently reviewed `e6372af`/`245d642`; not accepted; authorized D1b repair and 64/64 comparison only                                                  |
| D1b RED checkpoint                             | `362d0282c3202a44ba68c8b43782d8a0ee9d5e52` (tree `ee01458cf3efd59959fb01cbcd2efdbdc30fe961`)                                                               |
| D1b GREEN repair (exact replacement candidate) | `af923346197391ce3578e238b676b717564f1e79`                                                                                                                 |
| Replacement candidate tree                     | `3f9597d4a02fe60ae0c19872f4c18f758993aeb9`                                                                                                                 |
| Replacement candidate `src` subtree            | `03d506711d03ec6d412de298ed2e15e229f54196`                                                                                                                 |
| `origin/master` (unchanged throughout)         | `d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3`                                                                                                                 |
| Rejected C6 branch (untouched)                 | `cx/epic-c6-persisted-ownership-migration`, still at `b3c6544`                                                                                             |
| C6-R repair branch                             | `cx/epic-c6-r-owner-review-repair`                                                                                                                         |
| Accepted C1 visual baseline archive            | `artifacts/epic-c1-visual-baseline/c1-visual-baseline-69b1db7.zip`, SHA-256 `cb40459103140f0de7de562e7c84d244ab6826d668952e7d06af0dea7c42917c` (unchanged) |

Continuation preflight was verified exactly against the owner's stated
identities before any mutation: branch, `HEAD` (`245d642`), parent
(`e6372af`), candidate tree/`src` (`11b21eb`/`8018afc`), worktree
cleanliness (including untracked files), unchanged C6-R history, the
rejected C6 branch still unmodified at `b3c6544`, no C6/C6-R push, no
candidate tag, and no merge/deploy/publication. No mutation occurred
before this was confirmed.

## 3. Commits added this round

| #   | Commit    | Tree      | Concern                                                            |
| --- | --------- | --------- | ------------------------------------------------------------------ |
| 1   | `362d028` | `ee01458` | D1b RED checkpoint — tests only, no `src/**` change                |
| 2   | `af92334` | `3f9597d` | D1b GREEN repair — mandatory enrolment invariant (exact candidate) |

Neither commit amends, squashes, rebases, or rewrites `e6372af`, `245d642`,
or any earlier C6-R commit. All prior C6-R commits (`004cf57` through
`245d642`) remain exactly as previously recorded.

## 4. D1b — confirmed incomplete D1 repair

The D1 fix (`2c9c063`) added a `canCheckEnrolmentHere` guard to
`ensureBaseInitialization` specifically to avoid a
`SubTransactionError: Table programme_enrolments not included in parent
transaction` when the function ran nested inside a caller's own Dexie
transaction that omitted `programme_enrolments`. That guard's effect was
that the missing-enrolment invariant was **skipped**, not enforced,
exactly in that nested case.

**Reachable through real compound write paths.** Three real exported
functions open a `'rw'` transaction over their own feature stores plus
`app_meta`/`learner_profile` (but not `programme_enrolments`), then call a
lower-level repository function that invokes `ensureBaseInitialization`
nested inside that same transaction:

- `upsertProgressAndAwardXp` -> `upsertProgress` (nested at the point it
  calls `ensureBaseInitialization`)
- `logMediaProgressAndAwardXp` -> `logMediaProgress`
- `addStudySessionAndAwardXp` -> `addStudySession`

A current valid v3 database whose active-programme enrolment was removed
could therefore still accept a learner progress/media/session write (and
award XP) through any of these three real paths, even though a direct
`initializeDatabase` call already failed closed on the identical missing
state (D1-B).

**All real ambient transaction callers found.** Every call site of
`upsertProgress`, `logMediaProgress`, `addStudySession`, `addXpTransaction`,
`saveLearnerProfile`, `updateProfile`, and
`ensureCourseCatalogFromSeed(WithinScope)` in `repositories.ts` was located
and checked against every `database.transaction(...)` block's declared
store list:

- The three functions above matched the D1b mechanism exactly.
- `ensureCourseCatalogFromSeedWithinScope`'s own nested invocation (from
  `initializeDatabase`) passes `skipBaseInitialization: true`, so it never
  reaches the enrolment check nested at all.
- `correctStudySessionAssignment` writes `studySessions`/`xpTransactions`
  directly via raw Dexie calls; it does not call any of the
  `ensureBaseInitialization`-invoking repository functions, so it does not
  reach this mechanism.
- `saveLearnerProfile` and `updateProfile` call `ensureBaseInitialization`
  standalone, before entering their own (narrower) write transactions, and
  are never called nested from another repository function's transaction
  in this codebase — application/route code calls them directly, where the
  ambient transaction is always `null`.

No fourth caller matching this mechanism was found.

## 5. D1b RED checkpoint

Commit `362d028` (tree `ee01458`), changed paths:
`tests/db/bootstrapInvariants.test.ts` only — no `src/**`.

**D1b-A** (`upsertProgressAndAwardXp`): seeds a valid current database
(`sampleCourseSeed`), removes the active programme's enrolment row, then
calls `upsertProgressAndAwardXp` with valid fixtures
(`cs50CatalogueId`, `cs50Policy`, an item that genuinely exists). Observed
pre-fix: the call **resolved**, with a real persisted progress entry and a
computed XP summary, instead of rejecting on the missing enrolment.

**D1b-B** (`logMediaProgressAndAwardXp`): identical pattern through the
media path. Observed pre-fix: resolved, with a real persisted media
progress event, slice updates, and an awarded XP transaction.

**D1b-C** (`addStudySessionAndAwardXp`): identical pattern through the
study-session path. Observed pre-fix: resolved, with a real persisted
study session and an awarded XP transaction.

In every case the failure was discriminated from any unrelated
fixture/catalogue/policy problem by the operation completing successfully
with genuine domain output (a real progress entry, media event, or study
session, each with real derived XP) — proving the intended fixtures were
valid and the intended mechanism (the skipped enrolment check) was what
let the write through.

## 6. D1b production repair

Commit `af92334` (tree `3f9597d`), touching only
`src/lib/db/repositories.ts`:

1. Removed the `canCheckEnrolmentHere` conditional and the
   `Dexie.currentTransaction` ambient-transaction inspection entirely. The
   enrolment check inside `ensureBaseInitialization` now always runs when
   existing `app_meta` is present - mandatory, not advisory.
2. Added `database.programmeEnrolments` to the transaction store list of
   `upsertProgressAndAwardXp`, `logMediaProgressAndAwardXp`, and
   `addStudySessionAndAwardXp`, so the now-unconditional nested check can
   always execute inside whichever transaction reaches it.

No schema, store, index, or field change. No programme-switching
semantics. No change to XP/reward calculation, session ownership, or UI.
Fresh initialization (no stored `app_meta`) is unaffected - it still
creates valid `app_meta`, profile, and enrolment state atomically, exactly
as before.

## 7. D1b GREEN results

All three compound paths now fail closed on a missing enrolment, and the
target write does not persist:

- D1b-A: rejects with `/no enrolment exists for active programme/i`; no
  `progressEntries` row for the targeted item exists afterward.
- D1b-B: same rejection; no `mediaProgressEvents` row for the targeted
  asset exists afterward.
- D1b-C: same rejection; no `studySessions` row for the attempted session
  ID exists afterward.

A new valid-state regression (same file) runs all three compound paths in
direct sequence against one database with its enrolment intact -
`upsertProgressAndAwardXp`, then `logMediaProgressAndAwardXp`, then
`addStudySessionAndAwardXp` - and confirms each still succeeds normally
(real progress entry, real media event, real study session with an
awarded XP transaction), proving the fix does not overreach into the
happy path.

## 8. D1-A/B/C preservation

Unchanged and still passing: D1-A (mismatched `activeProgrammeId` on a
current database fails closed), D1-B (a current database missing its
active-programme enrolment fails closed via a direct `initializeDatabase`
call), D1-C (a valid current database remains a no-op idempotent
bootstrap). None of these tests, or the code paths they exercise, were
weakened, skipped, or deleted.

## 9. Focused D2/RD3/E1/E2/C1 results

Run immediately after the D1b repair, unmodified in design or intent:

- `tests/db/repositories.test.ts` - PASS (all XP/achievement/backup/reset
  integration tests, including the three compound-write functions'
  existing extensive coverage)
- `tests/db/migrationV2ToV3.test.ts`, `tests/db/migrationV2ToV3Adversarial.test.ts`
  (RD3, E1) - PASS
- `tests/db/migrations.test.ts`, `tests/db/backupCompatibility.test.ts` - PASS
- `tests/lib/backup.test.ts` (D2 parser-layer evidence) - PASS
- `tests/components/importBackupControl.test.tsx` (D2) - PASS
- `tests/features/settings/backupRecoveryComposition.test.tsx` (D2
  composition evidence) - PASS
- `tests/preservation/c1BaselineFixture.test.ts` (C1 oracle),
  `tests/preservation/migrationRestoreEquivalence.test.ts` (E2) - PASS
- `tests/programmes/catalogueScope.test.tsx` (C5 preservation, affected by
  the earlier D1 fix) - PASS

None of these required a design change; the D1b repair produced no
regression in any of them. The one harmless duplicated assertion noted in
review (`expect(observedWritesBeforeFailure.length).toBeGreaterThan(0)`
inside the E1 spy) was left as-is - that file was not touched for a
directly necessary reason this round, so it was not manufactured into
cleanup work.

## 10. Exact replacement candidate

`af923346197391ce3578e238b676b717564f1e79`, tree
`3f9597d4a02fe60ae0c19872f4c18f758993aeb9`, `src` subtree
`03d506711d03ec6d412de298ed2e15e229f54196`. Worktree confirmed clean,
including untracked files, immediately before and immediately after the
final aggregate.

## 11. Final aggregate (exact candidate `af92334`)

Run once, in order, on this exact candidate:

| Gate                                  | Result                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `npm run lint`                        | PASS - 0 warnings                                                        |
| `npm run format:check`                | PASS                                                                     |
| `npm run typecheck`                   | PASS                                                                     |
| `npm run check:circular`              | PASS - 257 files analyzed, 0 circular dependencies                       |
| `npm run build`                       | PASS - 270 modules transformed                                           |
| `npm run check:bundle`                | PASS - 0 violations; largest raw JS chunk 394,168 bytes (budget 500,000) |
| `npm test`                            | PASS - 93 files, 946 tests, 0 failed, 0 skipped, 0 retried               |
| `npm run test:e2e` (managed, one run) | PASS - 90 tests, 0 failed, 0 skipped (`chromium` and `offline` projects) |
| `git diff --check`                    | PASS - no whitespace errors                                              |

No skipped test, retried test, non-zero exit, or environment-only
interruption occurred. `verify:release` was not run (out of scope).

## 12. 64/64 C1 visual comparison

The managed E2E run above regenerated
`artifacts/epic-c1-visual-baseline/captures/` (64 PNGs) via
`e2e/c1-baseline-visual-capture.spec.ts`. Per the owner's explicit
correction of the prior closure's disposition, these were compared
against the accepted retained baseline using its per-file inventory
hashes (`INVENTORY-69b1db7.sha256`, the same 64 entries embedded in the
accepted ZIP), not the ZIP's own hash:

| Check                                      | Result                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Generated PNG count                        | 64                                                                                                           |
| Accepted inventory entry count             | 64                                                                                                           |
| Missing names (accepted, not generated)    | 0                                                                                                            |
| Unexpected names (generated, not accepted) | 0                                                                                                            |
| Duplicate names                            | 0                                                                                                            |
| Same-name SHA-256 mismatches               | 0                                                                                                            |
| Result                                     | **64/64 identical**                                                                                          |
| Accepted archive                           | `c1-visual-baseline-69b1db7.zip`, SHA-256 `cb40459103140f0de7de562e7c84d244ab6826d668952e7d06af0dea7c42917c` |

The accepted archive and its embedded inventory were not regenerated,
recompressed, replaced, resealed, or otherwise modified - confirmed by
`git status` showing no change under the entirely git-ignored `artifacts/`
path, and by the archive's SHA-256 above matching the value already
recorded as accepted in `SPEC.md`. Capture generation itself is not
described as, and is not, visual preservation evidence on its own; the
64/64 hash comparison above is the preservation evidence.

## 13. Scope and preservation confirmation

- **No MR-0b persistence change**: `git diff --stat` from `245d642` to
  `af92334` touches exactly `src/lib/db/repositories.ts` (production) and
  `tests/db/bootstrapInvariants.test.ts` (tests) - no schema, store, or
  index change.
- **No C7 leakage**: no multi-programme registration, enrolment, or
  switching behavior was added; the invariant enforced is stability of the
  existing enrolment, not a way to change it.
- **No dependency change**: `package.json` / `package-lock.json`
  unchanged.
- **No unrelated feature/UI change**: no new visible copy, route, layout,
  CSS, or navigation.
- **No architecture guard weakened**: `tests/architecture/**` passed
  unchanged as part of the full suite.
- **No push, merge, tag, deploy, or publication** occurred at any point in
  this round.

## 14. Residual limitations

- C6 remains **not accepted**; this record documents a second locally
  validated repair candidate for separate owner review.
- The residual limitations recorded in `C6_R_CLOSURE_RECORD.md` §11 that
  are unrelated to D1b or the 64/64 comparison (backup-side stricter
  relational invariants left intentionally alone; no C7/publication/
  `verify:release` work) still apply unchanged.
- No new materially different product/schema/architecture/trust-boundary
  defect was discovered during this round's focused work.

## 15. Confirmation

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
