# Pre-E hardening report

Date: 2026-10-02. Branch: `maintenance/pre-e-hardening-source-fit`. Risk tier: L2, with L3-style scrutiny on release authority only.

This report is part of the candidate it describes, so it cannot contain that candidate's commit SHA or the broad-validation counts: recording them here would change the candidate they identify. Those live in the evidence package (`CANDIDATE_IDENTITY.json`, `VALIDATION_SUMMARY.md`) and in the independent review file that will bind the payload tree. Read the live identity with `git rev-parse HEAD` and `npm run review:payload-tree`.

## 1. Starting identity (verified before any mutation)

| Item                         | Value                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `master` = `origin/master`   | `95489ea0e08909054a4fa82120b28b131873d40c` (no advancement since the prompt's anchor)                      |
| Root tree / `src` tree       | `5a100a524e5436458afef0ddb69eb975153ffb3f` / `67a3bc74a812fd9ff194bc8afdd0bdb75c32ae8e`                    |
| Worktree                     | clean, nothing protected or stashed                                                                        |
| GitHub Release validation    | succeeded for this commit (run `36980240454`)                                                              |
| Production                   | Vercel `dpl_9iRR6M9WdKJruKhWDj8ftULvuGCn`, built from this commit, READY, aliased                          |
| Application version / schema | `1.3.0` / v3                                                                                               |
| Tags                         | `v1.3.0-local-first-proof` is the latest release tag; nothing named `1.4`                                  |
| GitHub plan                  | private repository, free plan: branch protection and rulesets return HTTP 403                              |
| Vercel                       | project `progress-pal`, Hobby team, production branch `master`, auto-assign on, no checks, no deploy hooks |

## 2. Owner correction applied

The reward feature was intentional, owner-authorized and independently reviewed; it was not re-reviewed or reopened. The defect repaired here is narrower: the release gate consumed one static review file (`docs/remediation/rpg-primary-final-release-review.json`, last touched in `534a293`, naming base `770c1c0`) for every candidate and never checked that it applied.

## 3. Candidate-bound review evidence

**Before.** `RELEASE_REVIEW_FILE` named a tracked file; `validateReviewEvidence` checked only schema, module name, reviewer and finding statuses. The manifest recorded the file's SHA-256, which made the evidence look "byte-bound" in closure records but bound nothing. Positive control (`control-old-mechanism.txt`): the verbatim `95489ea` gate code accepts that review as sufficient for candidate `95489ea` although it certifies base `770c1c0`.

**After.** A review applies only to the candidate's **payload tree**: its root tree with `docs/release-reviews/` removed.

- Non-circular: review files live only in that directory, so writing a review never changes the payload it names; every other byte does.
- Evidence-only successors inherit the review; a merge inherits it only if the resulting tree equals the reviewed tree.
- The runner resolves identity and review first, before any other step, and fails closed. It rejects the legacy `RELEASE_REVIEW_FILE`/`--review-file`, a checkout that is not `GITHUB_SHA`, malformed or misnamed or stray files in the directory (anything there escapes review), unknown fields, schema v1, a recorded rejection of the exact payload, and open or unresolved findings on a `proceed`.
- `npm run review:payload-tree -- <commit>` prints what a reviewer must bind.

**Evidence.** `scripts/release-review-binding.test.mjs` (21 tests): exact match passes; stale, wrong-tree and post-review changes to a product file, script, workflow, doc or deleted file all fail; malformed and missing binding fields fail; byte-identical merge passes while a merge after the base moved fails; rejection blocks; directory hygiene; and the real runner, copied into a throwaway repository, fails closed with only the two identity commands executed, rejects the legacy input, refuses a mismatched `GITHUB_SHA`, and (positive control) proceeds past review when bound evidence exists. Control: with the tree comparison disabled, 5 of those 21 fail (`control-old-mechanism.txt`).

**Not done by design.** No review evidence was written for this candidate or for `95489ea`: the implementation session cannot supply independent review, and the reward review is the owner's. The old schema-v1 files remain as historical evidence and cannot certify anything.

## 4. Validated before production

**Before.** Every `master` push became a Production deployment at once; validation ran in parallel and could not stop it. Observed: `f153f19`, `269633…`, `5eadb2b…` and `d92d8ce…` failed Release validation and each still has a Production deployment record.

**Mechanism chosen.** Vercel Deployment Checks requiring the `Final candidate` GitHub check. Vercel builds the commit as a production deployment but does not assign it to the production domains until the check on that commit passes. Chosen because the repository's plan cannot enforce branch protection, and because it needs no secret, deploy hook or credentials. The alternative (production branch `production` advanced by a workflow) needs the same kind of dashboard step plus more machinery.

**Repository side: done.** The review gate, plus `tests/architecture/releaseWorkflow.test.ts` pinning the workflow name, job name, triggers, single gate invocation, read-only permissions and absence of secrets. The workflow no longer names a review file or module.

**Platform side: not active.** Observed read-only on 2026-10-02: no checks configured (`GET /v2/projects/progress-pal/checks` is empty), no check state on the production deployment. Nothing was changed in Vercel or GitHub, nothing was pushed, and Production was not touched. The Vercel documentation shows no plan restriction for this feature, but availability on the Hobby team is confirmed only when the control is used.

**One activation action:** Vercel → project `progress-pal` → Settings → Build & Deployment → Deployment Checks → Add Checks → GitHub → select `Final candidate`. Full steps, verification and rollback are in `docs/ci.md`. Until then the honest state is `READY_FOR_RELEASE_GATE_ACTIVATION`, not "Production gated".

**Not proven here (cannot be, without pushing):** that a failing check leaves Production on the previous deployment. That is Vercel's documented behaviour, taken from its documentation, and should be observed on the first gated deployment. Residual limits (no branch protection, owner bypasses, candidate-owned gate, rebuild rather than artifact promotion) are in `docs/ci.md`.

## 5. Version and provenance

Release history gives no other meaning to `1.4`, so the application identity moves `1.3.0 → 1.4.0`, the next backward-compatible minor. Coupled sources updated: `package.json`, `package-lock.json` (two lines), `CACHE_VERSION` in `public/sw.js` (pinned to the package version by `tests/architecture/serviceWorker.test.ts`; its `progresspal-cache-` prefix is unchanged), and four test assertions that name the current version.

Independence from the database is now asserted: `tests/db/databaseInitialization.test.ts` pins the database name `progresspal-cs50-edition` and schema `3`; the existing backup compatibility matrix restores the 1.2.0 and 1.3.0 envelopes and asserts the result carries `currentApplicationVersion` with the current schema. No tag, release or deployment was created.

**Accepted-oracle changes (owner-visible; the independent reviewer should confirm each).** The bump and the vocabulary addition changed three accepted C1 preservation assertions. None was weakened: each still pins the full state, and each now also pins something it did not before.

| File and assertion                                                        | Why it had to change                                                                                                                                                                                                                    | What it pins now                                                                                                                                           |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/preservation/c1LabelsAndCopy.test.tsx`, item-type label map        | An exact `toEqual` over the ten C1 labels; the append of `lesson` necessarily adds a key                                                                                                                                                | The same ten labels plus `lesson: 'Lesson'`, still exact, so any other added, removed or changed label fails                                               |
| `tests/preservation/c1BaselineFixture.test.ts`, backup summary            | It asserted the frozen fixture's `appVersion` equals `currentApplicationVersion`, true only while the running version was 1.3.0                                                                                                         | The literal `'1.3.0'` the frozen bytes carry, which also pins that the fixture was not edited                                                              |
| `tests/preservation/c1BaselineFixture.test.ts`, restored `app_meta` state | Restoring a backup from a different application version runs the existing documented normalization (`app_meta.appVersion` becomes the running version, `updatedAt` the restore time). The oracle had never exercised a version mismatch | The complete canonical state: the frozen bytes plus exactly `appVersion` and `updatedAt`; every learner table is still asserted equal to the parsed backup |

Restore semantics are unchanged: the behaviour was already documented in `docs/releases/backup-compatibility-matrix.md`, was already asserted for the 1.2.0 fixture, and `tests/preservation/migrationRestoreEquivalence.test.ts` (upgrade versus restore) passes untouched. What changed is that the 1.3.0-era fixture now triggers it.

## 6. Authority reconciliation

`docs/CURRENT_STATE.md` is the single live authority. `AGENTS.md` and `README.md` point to it instead of repeating state; `SECURITY.md` and `PRIVACY.md` drop the obsolete branch and "offline-only" claims (the learner-data guarantee is unchanged: nothing a learner enters is transmitted); the status-bearing Epic A/B/C and RPG v2 records and three `stories.yaml` files carry an insert-only banner (0 deletions); `docs/ci.md` is rewritten; the backup matrix gains a current-state note. No historical closure text was rewritten.

## 7. Maintenance

Admission test applied (activated by this work, concrete reviewability risk, locally coherent, behaviour-preserving, much smaller than a refactor, no cascade).

- **Admitted and done:** the release-gate binding is a new small module instead of growing `release-gate-utils.mjs`; the old unbound validator was deleted so only one exists; doc consolidation above.
- **Deferred, none manufactured:** `src/lib/db/repositories.ts`, `ContentDetailPage.tsx`, `localDataCoordination.ts`, `StudySessionsSurface.tsx`, `rpg/model/readModels.ts`, `AppStateProvider.tsx`, `tests/app/App.test.tsx`. Size alone does not admit them. The one with a concrete near-term trigger is `ContentDetailPage.tsx` and the CS50-default compatibility helpers behind it (fit report row 20); they are handled RED-first in Epic E, not here. A scenario-builder test fixture layer remains useful when Epic E multiplies cross-programme UI tests.

## 8. Residual risks

- The new gate and the workflow are in the candidate, so a candidate can alter the gate that judges it; the independent review must read `scripts/` and `.github/`.
- Platform activation is an owner action, and Force Promote and CLI production deploys remain deliberate bypasses.
- The first gated deployment is the first observation of Vercel's hold behaviour on this project.
- The bundle budgets leave 109 B of CSS gzip and about 100 kB of JS gzip headroom. Epic E measures its real build against them; no budget change is pre-authorized (fit report section 6).
- Two infrastructure notices from CI are carried, not blocking: Node 20 deprecation for `actions/upload-artifact@v5` and the `ubuntu-latest` migration beginning 2026-10-19.
- Self-review is not independent review. Everything above is implementer evidence input.

## 9. STOP states

- Release gate: `READY_FOR_RELEASE_GATE_ACTIVATION` (one owner action). Still current.
- Source fit, as recorded by C2 and **superseded by section 10**: `PRE_E_DOMAIN_MODEL_REPLAN_REQUIRED` for the lesson-content contract and content delivery, and `PRE_E_L3_SCOPE_DECISION_REQUIRED` for the attempt/mastery engine, with owner decisions D1 to D7. Neither label is a current Epic E readiness state.
- Source fit, as corrected by C3 and **superseded again by section 11** where C3 deferred the learner loop. Current state: Epic E is the faithful M01/M02 learner loop; it starts only after the schema decision record is accepted and the owner gives an explicit instruction.

## 10. Independent-review correction (C3)

**Engineering accepted in substance.** Independent review found no defect requiring engineering rollback in the candidate-bound review binding and its fail-closed applicability checks, evidence-only successor handling, release-gate ordering, the `1.3.0 → 1.4.0` provenance change, schema v3 and the unchanged IndexedDB name, the service-worker cache-version coupling, the three changed C1 preservation oracles, the additive `module`/`lesson` vocabulary, and the release-gate test design. The documentation-only successor (C3) leaves every engineering subtree byte-identical to C2 `2f3484a84f51f1483a18504a8e5dbdf4974b90c2`.

**History preserved.** C1 `dfc6bc43e2c10e8206dbbec17cada13fd4a465f1` failed the repository format check on this very report because the pre-freeze check was partial; it was not green. C2 repaired that with a docs-only successor, and only the invalidated cheap evidence was rerun. Neither fact is rewritten.

**Planning layer corrected.** The review found three errors in how C2 interpreted the source, none in the engineering:

1. It classified the static instructional-content layer as `PRE_E_DOMAIN_MODEL_REPLAN_REQUIRED`. Package 21 names that layer and its renderer as the first integration story, and it is static, bundled, programme-owned and non-persisted. It is bounded Epic E scope.
2. It classified future attempt, evaluator and mastery persistence as `PRE_E_L3_SCOPE_DECISION_REQUIRED`. Those are later phases with their own schema decision. They are `DEFERRED_FUTURE_PHASE_NOT_EPIC_E` and block nothing now. The normal stop rule stays for anything Epic E itself unexpectedly needs.
3. It let derived analysis outrank the protected Programme #2 authority, manufactured owner decisions D2 to D7 that source and architecture already answer, and treated bundle budgets as an advance owner decision instead of something to measure on the real candidate.

`PROGRAMVAREUTVIKLING_SOURCE_FIT_REPORT.md`, `EPIC_E_AUTONOMOUS_PROMPT.md` and `docs/CURRENT_STATE.md` carry the corrected conclusions. The one genuine open owner decision is the visible shell brand (OD-6). _(R4 note, added later and not a rewrite of this section: point 2's deferral of attempt, evaluator and mastery work was itself over-corrected, and "the one genuine open owner decision" is no longer the whole list. Section 11 supersedes both.)_

**Review scope.** C3 changes the documents inside the reviewed payload, so it needs its own independent review. No earlier review certifies it, and `npm run verify:release` is expected to fail closed for it until an independent reviewer authors review evidence for its payload tree. No full-suite rerun is claimed for C3. Vercel Deployment Checks remain unactivated.

**Change inventory.** An independent review recorded that a summary given of the C2 work stated a different inventory (32 files, +2,313/−133). The exact Git diff from `95489ea0e08909054a4fa82120b28b131873d40c` to C2 is **49 changed files, +2,116/−247** (`git diff --shortstat`). Counts are generated from Git, never reconstructed by hand. The C3 inventory is in the C3 evidence package, not here, because a document inside the candidate cannot record the final inventory of the candidate that contains it.

## 11. Architecture correction of the C3 source-fit interpretation (R4)

C3 (the revision adjudicated as R3) was not correct on this point, and this section does not present it as correct. It fixed C2's over-expansion and then over-corrected in the opposite direction. R4 corrects the source-fit interpretation after direct adjudication of the learner loop, persistence, mastery and runtime against Package 21 and the authored M01/M02 slice.

**Why C3 was insufficient.**

1. **One deferral bucket for unlike things.** C3 placed exercises, evaluators, attempts, learner evidence, derived mastery, curriculum-spaced retrieval, checkpoint judgement and lesson/step resume together in `DEFERRED_FUTURE_PHASE_NOT_EPIC_E` and told Epic E to build none of them. For M01/M02 they are not one future bundle. Delivering lessons and canonical hints with no durable evidence would present reading as if it were competence.
2. **A decision requirement read as a deferral.** Package 21 DC-41 says a new persisted entity needs the platform's own schema decision. C3 read that as "later" and stated that schema v3 was sufficient. It is not sufficient: schema 3 cannot hold an append-only attempt history or a non-media resume position.
3. **A blanket runtime downgrade.** Making every runtime-dependent gate non-counting would drop the M02 construction task (`S1-M02-CHK-E01` to `E03`) from the evidence a critical skill needs and, if the denominator were then shrunk, would let M02 look cleared without executable evidence. M01's critical skills need no runtime and `S1-M01-CHK-E01` concerns a supporting skill, so the correct treatment splits by exercise type.
4. **An estimate that hid the risk.** C3 excluded evaluator payloads from Epic E, so its content-weight estimate left them out. With evaluation in scope the estimate for content plus evaluator payloads exceeds the JS gzip headroom before any renderer or runtime is counted.
5. **A loading design stated as architecture, and no PWA end state.** Eager static chunks were the working assumption, and the intended installable-PWA direction, runtime availability and content/evidence version coherence were not stated.

**What R4 records.** The faithful learner loop and the principle that a capability gap must not silently downgrade a defensible requirement; the split into required, spike-gated, deferred and deferred-until-needed items; schema 4 as a separate decision record, **PENDING OWNER ACCEPTANCE**, with an append-only evidence store and a lesson-position store, a determination that the authored slice needs no revision-bearing `ProjectArtefact` (kept as a concept, not a third store); `RUNTIME_REQUIREMENT_SPLIT_BY_EXERCISE_TYPE`; an early bounded runtime spike with no product pre-selected; two timeout classes with `evaluator_error` for infrastructure failures; the `testtable` versus `program` distinction; an asynchronous content-provider boundary with static chunks as a candidate only; the PWA, offline and version-coherence constraints; a measure-then-decide budget sequence with a rule against hiding weight from the gate; curriculum-spaced retrieval in and time-based scheduling out. Two findings from re-reading the authority are carried as dependencies and not decided: the checkpoint pass rule (K-4) and gate retry rule (K-3) are unauthored content decisions, and one observer sentence (D-2) still sits in the source.

**What R4 does not do.** It changes documentation only, in five files, and it implements nothing. No schema, code, test or script changed; the engineering subtrees are byte-identical to C3 and C2. Schema 4 is not accepted and no review evidence was written for this candidate. The R4 payload changes documents inside the reviewed payload, so it needs its own independent review; no earlier review certifies it, and `npm run verify:release` is expected to fail closed for it until an independent reviewer authors evidence bound to its payload tree. Nothing was pushed, merged, tagged or deployed, and Vercel Deployment Checks remain unactivated.

**Residual risks added by R4.** The DC-19 reading in the fit report is a derived interpretation for the owner to confirm. The `ProjectArtefact` determination rests on structural inspection of the authored lab and quest exercises. The runtime question is open until the spike. The oracle-change table in the schema record is read from the baseline and is superseded by the RED run at the start of Epic E.
