# Epic C / C1 — closure record (baseline preservation evidence)

## 1. State

**`C1_CANDIDATE_READY_FOR_OWNER_REVIEW`**

The automation completed, and every gate below passed. That is **not** C1
acceptance:

- Owner visual review of the capture set has **not** happened.
- OD-8 (permanent retention of the capture archive) is **unresolved**.
- Independent C1 review has **not** happened.
- C2 remains **unauthorized**.

## 2. Objective

Establish, before programme ownership moves in C2–C5, executable and retained
evidence of the exact CS50 behaviour, data identity, content, rendering and
schema-2 migration baseline that later Epic C stories must preserve. C1 changes
no product behaviour (`NEXT_STORY_HANDOFF_C1.md`).

## 3. Identities

| Item                                 | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Branch                               | `cx/epic-c1-baseline-evidence` (created by the owner from accepted C0)                                         |
| Starting commit / tree (accepted C0) | `9c6d1b45b5f5b22afa0b8d009101b378c1df363a` / `ffd85d6e61c2a8fe11dc5b6dd331b1203b0cf968`                        |
| Accepted Epic B product              | `fd5e2d592bb6f5d1724509119147c48ba3a5df59` / `bc86fd392a5284d9db8821c31a27b8c95ec82a9a`                        |
| Evidence harness H                   | `b9ae4f3f087d106e3e7cb24403e96e1506e98e3d` / tree `4525b3b0fdbe7588ab5255995d20358fcb07bf02`, parent `9c6d1b4` |
| Docs-only binding commit M           | the commit that adds this file (parent H); identity reported with the branch                                   |
| `master`                             | `fd5e2d592bb6f5d1724509119147c48ba3a5df59` (unchanged)                                                         |
| `cx/epic-c0-v7-reconciliation`       | `9c6d1b45b5f5b22afa0b8d009101b378c1df363a` (unchanged)                                                         |
| `cx/epic-c0-programme-readiness`     | `137ffde46423a13f07dd8ba4a13a6e0b67b7dd65` (unchanged)                                                         |

Ancestry `fd5e2d5 → 137ffde → 64462f6 → ca8fe96 → 9c6d1b4 → H → M` was proved
with `git merge-base --is-ancestor`.

## 4. Environment

Windows 11 Home 10.0.26200 (build 10.0.26200.9457); Node v24.19.0 (engines
`>=24 <25`); npm 11.10.1 (`packageManager` npm@11.10.1); `@playwright/test`
1.60.0 with Chromium revision 1223 (148.0.7778.96) already installed.
`node_modules` was present, so no `npm ci` and no browser install were needed.
Disk headroom: 6.6 GB at start. It fell to about 2.6 GB during the run because
of an unrelated Android emulator active on the machine; it was 2.7 GB before
the retained capture, which needs about 30 MB. No tracked file changed from
environment preparation.

## 5. Pre-C1 baseline (unchanged accepted C0 state, before any C1 file existed)

| Command                  | Exit | Result                                          |
| ------------------------ | ---- | ----------------------------------------------- |
| `npm run lint`           | 0    | 0 warnings                                      |
| `npm run format:check`   | 0    | all files formatted                             |
| `npm run typecheck`      | 0    | —                                               |
| `npm test`               | 0    | 71 files / 717 tests passed, 0 skipped, 434.6 s |
| `npm run check:circular` | 0    | no circular dependency (217 modules)            |
| `npm run test:e2e`       | 0    | 74/74 passed, 0 retries, 0 skips, 6.2 min       |

## 6. Coverage mapping and new evidence

Full matrix, file list, authorities and ownership: `C1_EVIDENCE_COVERAGE.md`.
Existing strong tests were reused and not duplicated (listed there per area).

| Area                               | New file(s)                                                                                                             | Primary role                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1 Curriculum identity/order        | `c1CurriculumIdentity.test.ts`                                                                                          | semantic                                   |
| 2 Status reachability              | `c1StatusReachability.test.ts`                                                                                          | semantic                                   |
| 3 XP awards / 5 reward identity    | `c1XpAwards.test.ts`, `c1XpTable.ts`, fixture `c1-xp-awards.json`                                                       | semantic; ledger = mutation                |
| 4 Preview and reward labels        | `c1PreviewRewards.test.ts`, `c1PreviewTable.ts`, fixture `c1-preview-rewards.json`                                      | semantic                                   |
| 6 Achievements                     | `c1Achievements.test.ts`                                                                                                | semantic; rule encoding = characterization |
| 7 Schema-2 fixture                 | `c1BaselineFixtureBuilder.ts`, `c1BaselineFixture.test.ts`, `tests/fixtures/backups/c1-baseline-envelope1-schema2.json` | migration                                  |
| 8 Links, guides, labels, CS50 copy | `c1LabelsAndCopy.test.tsx`, fixture `c1-links-guides.json`                                                              | semantic                                   |
| 9 Asset/token identity             | `c1VisualIdentity.test.tsx`, `c1VisualIdentity.ts`, fixture `c1-visual-identity.json`                                   | visual (identity only)                     |
| 10 Retained rendered baseline      | `e2e/c1-baseline-visual-capture.spec.ts`                                                                                | visual                                     |
| Support                            | `c1Support.ts`                                                                                                          | test helper                                |

New C1 tests: 8 files, 96 tests.

Characterization retained, and the only characterization: the achievement
`ruleType`/`ruleConfig` encoding and the definitions' internal `createdAt`
timestamp (`c1Achievements.test.ts`, "rule encoding" suite). Everything else
is semantic, mutation, migration or visual evidence.

## 7. Schema-2 fixture provenance

- **How it is built:** `buildC1BaselineEnvelope` calls the real repositories:
  profile save, `upsertProgressAndAwardXp`, `logMediaProgressAndAwardXp`,
  `addStudySessionAndAwardXp`, `correctStudySessionAssignment` and
  `recordBackupEvent`.
- **How it is exported:** through the real Settings export path
  (`getDatabaseSnapshot` → `buildBackupEnvelope` → `serializeBackupEnvelope`).
- **Determinism:** a fixed clock throughout, explicit session IDs, and a
  counter-based `crypto.randomUUID` stub during the build.
- **Provenance check:** the committed file is re-derived by
  `c1BaselineFixture.test.ts` and must deep-equal the committed fixture.
- **Contents:**
  - envelope 1 / schema 2, app 1.3.0, full catalogue (14 units / 68 items);
  - 33 progress entries covering started, blocked, completed, submitted,
    accepted and skipped_optional;
  - 31 content assets and 170 slices (not_started, active, completed);
  - 4 media events, 2 resume points;
  - 5 study sessions, including the corrected assignment
    `c1-session-corrected` → `week-4-lecture`;
  - 72 XP transactions covering all 14 CS50-reachable source types;
  - 16 unlocks, one for every achievement;
  - 1 backup audit row.
- **Results:** it parses (real parser), restores (real restore path), and the
  learner tables round-trip unchanged through restore and re-export. Restore
  appends exactly one `import` audit row, and `appMeta` keeps its schema and
  seed version. All free text is synthetic.
- **Recorded gap for C6:** no production write path creates a `skipped` slice.
  The fixture therefore has none, and C6 needs a separate legacy/adversarial
  fixture (`C1_EVIDENCE_COVERAGE.md` §3). This deviates from the C0 data map's
  fixture list and is flagged for owner review; the C0 documents were not
  edited.

## 8. Validation of H (before commit H; every gate was a precondition of the commit)

| Check                                | Result                                                                                                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New C1 suites (`tests/preservation`) | 8 files / 96 tests passed                                                                                                                                                                                                      |
| Existing focused suites              | `xpEngine`, `achievementsEngine`, `repositories`, `backup`, `backupCompatibility`, `cs50Links`, `guideContent`, `courseDetailModel`, RPG `readModels`, `presentation`, `finalPresentation`, `App`: 12 files / 285 tests passed |
| `npm run lint`                       | exit 0, 0 warnings                                                                                                                                                                                                             |
| `npm run format:check`               | exit 0                                                                                                                                                                                                                         |
| `npm run typecheck`                  | exit 0                                                                                                                                                                                                                         |
| `npm test`                           | exit 0; 79 files / 813 tests (717 + 96); 0 skips; 300.5 s                                                                                                                                                                      |
| `npm run check:circular`             | exit 0                                                                                                                                                                                                                         |
| `git diff --cached --check`          | exit 0                                                                                                                                                                                                                         |
| Staged path scope                    | 20 paths, all added; only `tests/**`, one `e2e/` spec, one `docs/post-release/epic-c/` file                                                                                                                                    |
| Temporary helpers                    | the C1 fixture generator and probes were never staged and were deleted before H                                                                                                                                                |

No test was skipped or retried by C1, no existing test or guard was modified,
and no dependency, configuration, schema, seed, CSS or asset changed.

## 9. Identity proofs and retained capture

The three `C0_VISUAL_PRESERVATION_PLAN.md` §4a proofs passed at H (details in
`C1_VISUAL_BASELINE_MANIFEST.md` §2):

1. C0 → H lists only 20 added paths.
2. The production subset is equal to `fd5e2d5` (`git diff --quiet` exit 0).
3. The tree was clean before capture.

The retained run was `npm run test:e2e` from clean H at 2026-09-26
11:16:35–11:21:52 +02:00:

- **78/78 passed** (74 existing + 4 capture tests), exit 0, 0 retries, 0 skips,
  5.2 min.
- It is the aggregate E2E validation of H and the retained capture run.

Capture set:

- 64 PNGs in `artifacts/epic-c1-visual-baseline/captures/`, sealed immediately
  with `INVENTORY.sha256`.
- Archive `artifacts/epic-c1-visual-baseline/c1-visual-baseline-b9ae4f3.zip`
  (gitignored, temporary): 65 entries, 15,251,938 bytes.
- **Archive SHA-256
  `b87c8f5f93b3b3ee5efda66791c8eaea266f3cdd2d85dfca7c958bb19de9a67a`**.
- Extraction check: 64/64 PNG hashes match.
- The retained captures are byte-identical to three earlier disposable runs.

Manifest: `docs/post-release/epic-c/C1_VISUAL_BASELINE_MANIFEST.md`.

## 10. Validation of M

M changes only `docs/post-release/epic-c/**`: this file, the manifest, and the
state lines in `stories.yaml`, `SPEC.md` and `VALIDATION_READINESS.md`. Before
commit M the following were required:

- `git diff --name-status H` limited to `docs/post-release/epic-c/**`;
- `npm run format:check`;
- a separate `git diff --check`;
- a clean tree after commit.

Results are in the final report and are reproducible with the same commands.

## 11. Owner effort

- The owner created the branch `cx/epic-c1-baseline-evidence` from accepted C0
  before the run (one owner Git action).
- During the run: 0 owner clarification requests, 0 owner debugging requests,
  0 owner command executions, 0 support scripts handed to the owner, and 0
  preventable support failures reaching the owner.
- Internal development defects were fixed before H and never reached the
  owner:
  - three capture-spec readiness assertions (a saved-status text shown only
    after save; a loading-state heading that was matched by chance; the
    content-detail heading name);
  - four draft test expectations corrected against source (link field name,
    session-mode order, the RPG-only settings copy, and the first-step trigger
    persisted at first satisfaction);
  - two type errors in new files.
- No valid evidence was rerun unnecessarily. The pre-C1 E2E and the retained
  E2E are distinct required runs.

## 12. Open gates

1. Owner visual review of the 64 captures, bound to the ZIP SHA-256 above.
2. **OD-8**: permanent retention location of the ZIP.
3. Independent C1 review.
4. C2 remains unauthorized; it is also gated by OD-9.
