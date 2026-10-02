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
- The bundle budgets leave 109 B of CSS gzip and about 100 kB of JS gzip headroom, which constrains Epic E (fit report section 6).
- Two infrastructure notices from CI are carried, not blocking: Node 20 deprecation for `actions/upload-artifact@v5` and the `ubuntu-latest` migration beginning 2026-10-19.
- Self-review is not independent review. Everything above is implementer evidence input.

## 9. STOP states

- Release gate: `READY_FOR_RELEASE_GATE_ACTIVATION` (one owner action).
- Source fit: `PRE_E_DOMAIN_MODEL_REPLAN_REQUIRED` for the lesson-content contract and content delivery, `PRE_E_L3_SCOPE_DECISION_REQUIRED` for the attempt/mastery engine. Detail and owner decisions D1–D7 are in `PROGRAMVAREUTVIKLING_SOURCE_FIT_REPORT.md`.
