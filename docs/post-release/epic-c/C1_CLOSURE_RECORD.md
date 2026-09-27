# Epic C / C1 — closure record (baseline preservation evidence)

## 1. State

**`C1_ACCEPTED_CLOSED`** — the owner accepted C1 on 2026-09-27, and it is
closed locally by this docs/evidence-binding closure commit D. Sections 3–11
are the historical record of the first candidate (H/M). Section 12 records
the correction and closure.

- **Accepted visual baseline:**
  `artifacts/epic-c1-visual-baseline/c1-visual-baseline-69b1db7.zip`, SHA-256
  `cb40459103140f0de7de562e7c84d244ab6826d668952e7d06af0dea7c42917c`. It was
  captured at S `69b1db7`, whose product bytes equal R2 `9bdbce8`. It is
  bound in `C1_VISUAL_BASELINE_MANIFEST.md` and committed in D under OD-8.
- **Rejected:** the first capture (`c1-visual-baseline-b9ae4f3.zip`, H/M). It
  is pre-fix comparison evidence only.
- **Owner acceptance:** the owner directly accepted the retained baseline and
  the completed independent review. The cool-neutral RPG light palette and the
  temporary neutral-grey unresolved-theme preparation state (a bounded C1
  compromise) were approved at the earlier visual-decision gate.
- **Independent C1 review:** completed. It concluded that the retained
  baseline is valid and required one reporting correction (§12.4).
- **Not authorized by this state:** C2 is not authorized and stays blocked on
  OD-9. C1 closure is local and is not publication. It does not authorize
  push, merge, tag or deployment.

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
| Docs-only binding commit M           | `e9da87a` (parent H); bound the first capture, later rejected                                                  |
| Theme repair R / corrected R2        | `8e49ee2` / `9bdbce8` (tree `93681e27`) on `cx/epic-c1-rpg-theme-repair` (§12)                                 |
| Retained-capture candidate S         | `69b1db7db3889af82265d2430e45ff3f074db02d` / tree `7a0a8a0f`, parent R2; `src` subtree `a8f71739` equals R2    |
| Closure binding commit D             | the commit that adds §12 and the accepted archive (parent S); identity reported with the branch                |
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

## 9. Identity proofs and first capture (rejected; see §12)

This capture was later **rejected** by owner visual review: captures labelled
RPG light rendered the RPG UI dark. It is kept as comparison evidence only.

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

## 10. Validation of M (historical)

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

## 12. Correction, retained capture and closure

### 12.1 Rejection and repair

- **Rejection:** owner visual review of M found that captures labelled RPG
  light rendered the RPG UI dark. RPG ignored the app-wide theme preference.
- **Owner decision:** theme is app-wide, with RPG keeping its own identity in
  both themes. Root cause, implementation and evidence changes are in
  `C1_THEME_REPAIR_RECORD.md`.
- **R `8e49ee2`:** app-wide theme repair.
- **R2 `9bdbce8`:** cool-neutral RPG light palette and the neutral-grey
  unresolved-theme preparation state.
- **S `69b1db7`:** evidence stabilization only. The preparation-state oracle
  now checks OKLab chroma neutrality directly, and a stale capture-harness
  comment is corrected. `git diff 9bdbce8 69b1db7 -- src` is empty.

### 12.2 Retained aggregate and capture at S

- **Command:** `npm run test:e2e` from clean S, 2026-09-27 12:25:29–12:31:28
  UTC. Result **90/90 passed**, 0 failed, 0 skipped, 0 retries, exit 0.
- **Capture set:** exactly 64 PNGs, with 0 missing, unexpected, duplicate or
  misnamed files.
- **Sealing:** sealed immediately into
  `c1-visual-baseline-69b1db7.zip`: 65 entries, 15,176,163 bytes, SHA-256
  `cb40459103140f0de7de562e7c84d244ab6826d668952e7d06af0dea7c42917c`.
  The inventory SHA-256 is
  `2bbb32f69e0d4276b4960084e1762b8bf0be4a18c4beedbbe1adc3a7d5820f34`.
- **Extraction check:** 64/64 match the inventory and the pre-archive
  captures.
- **Environment:** the same toolchain as H (manifest §3).

### 12.3 Comparison with the rejected archive

The comparison matches `C1_THEME_REPAIR_RECORD.md` §5 with **0 unexpected**
rows:

| Group                     | Captures | Result    |
| ------------------------- | -------: | --------- |
| Classic, except Settings  |       16 | identical |
| Classic Settings          |        4 | different |
| RPG dark, except Settings |       20 | identical |
| RPG dark Settings         |        2 | different |
| RPG light                 |       22 | different |

That is 36 identical and 28 expected-different captures. No new RPG
light/dark pair is byte-identical. Details are in manifest §6.

### 12.4 Independent review

The independent review concluded that the retained baseline is valid. It
found two defects in the untracked run report, and both are corrected in the
reporting layer only; nothing was rerun or regenerated:

- The report claimed no new capture equals an old capture under a different
  name. That is false: there are **20 intentional cross-name matches**. Each
  preserved RPG dark capture also equals the old rejected same-surface "light"
  capture, because that archive's RPG "light" captures were byte-identical to
  RPG dark. This confirms the defect diagnosis and is not contamination.
- "No environment drift" is narrowed to: no material rendering drift was
  detected on the preserved comparison surfaces.

The run's one tooling incident was a report-writing shell quoting failure
before any file was written. It had no effect on the evidence.

### 12.5 Owner acceptance and OD-8

- On 2026-09-27 the owner directly accepted the retained visual baseline and
  the completed independent review, and authorized this closure commit D.
- The owner had already approved the cool-neutral RPG light palette and the
  temporary neutral-grey preparation state (a bounded C1 compromise) at the
  earlier visual-decision gate.
- It does not cover Navigation/HUD/Map redesign, C2, publication or broader
  UI work.
- **OD-8 is resolved.** The exact accepted ZIP bytes are committed in D at
  `artifacts/epic-c1-visual-baseline/c1-visual-baseline-69b1db7.zip`,
  force-added because `artifacts/` is gitignored.
- Only the ZIP is retained. The loose PNGs, the inventory copy, and the
  machine-readable comparison and verification files are not committed. The
  ZIP contains the inventory, and the manifest carries every capture hash and
  its comparison relation.

### 12.6 Validation of D

D changes only `docs/post-release/epic-c/**` and adds the one archive. No
product, test, e2e, CSS, configuration or package byte changed, and the `src`
subtree is `a8f71739` at R2, S and D.

Only the gates that D could invalidate were run:

- Git identity and ancestry;
- the archive SHA-256 before and after staging, including the staged blob;
- the inventory and per-capture hash consistency of the manifest against the
  sealed archive;
- YAML parse of `stories.yaml`;
- Prettier check of the changed documents;
- `git diff --check`;
- the exact staged path set.

The E2E, unit, accessibility and capture suites were not rerun, because D
changes no code or test.

## 13. Disposition

- **C1: accepted and closed** (locally, in D).
- **OD-8:** resolved; the accepted archive is committed.
- **C2:** not authorized. It is blocked by **OD-9** (Epic B remote
  publication / intended branch baseline), which remains unresolved.
- Nothing is pushed, merged, tagged or deployed.

Recorded limitation (backlog, non-blocking): `.gitattributes` marks
`docs/**` as `export-ignore` but not `artifacts/**`. A `git archive` source
archive therefore includes the 15 MB accepted ZIP. Changing that is a
configuration change outside C1 closure.
