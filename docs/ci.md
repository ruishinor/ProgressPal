# ProgressPal release validation

## Purpose and invariant

`.github/workflows/test.yml` proves, in a clean GitHub-hosted environment, that the triggering ProgressPal commit passes the full release gate once. Together with one clean local final gate it implements D-0075. It is a certification workflow, not a fast-feedback or deployment workflow.

The release invariant is **validated before production**:

> Production must not move to product bytes that have not already passed the exact-candidate validation and review the release gate requires.

Two mechanisms carry it. Their status is tracked in `docs/CURRENT_STATE.md`; this file describes how they work.

| Mechanism                                              | What it enforces                                                                                      | Where it lives                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Candidate-bound review evidence                        | The gate fails closed unless a review is bound to the exact payload tree it certifies                 | `scripts/release-review-binding.mjs`, the gate  |
| Vercel Deployment Checks (requires one dashboard step) | A production deployment is built but not promoted to the production domain until the check has passed | Vercel project settings (not in the repository) |

## Candidate-bound review evidence

A review is applicable to a candidate only if it names the candidate's **payload tree**: the candidate's root git tree with `docs/release-reviews/` removed. That directory is the only place review files live, so adding, removing or editing a review file never changes the payload it is judged against (no self-reference), while any other byte of the candidate does.

Consequences, all enforced by `scripts/release-review-binding.mjs` and covered by `scripts/release-review-binding.test.mjs`:

- A review written for one payload does not apply to any other. Changing a product file, script, workflow, test or other doc after review makes the review inapplicable.
- An evidence-only successor commit (the commit that adds the review file) keeps the same payload tree, so it inherits the review.
- A merge commit inherits a review only when its resulting tree equals the reviewed tree. If the base branch moved and the merge result differs, certification does not transfer; the result is a new candidate.
- Review files are discovered by binding, not selected by an environment variable. `RELEASE_REVIEW_FILE` and `--review-file` are rejected rather than ignored. `RELEASE_MODULE`, if set, must equal the bound review's module.
- Every file under `docs/release-reviews/` must be a strictly validated `<module>.json` file. A stray file, nested directory, symlink, malformed file or misnamed file fails the gate, because anything there escapes review.
- A recorded `reject` review for the exact payload blocks certification even if another review of the same payload says `proceed`.
- When running in GitHub Actions the checked-out `HEAD` must equal `GITHUB_SHA`.

### Review file format (schema version 2)

```json
{
  "schemaVersion": 2,
  "module": "kebab-case-name",
  "reviewer": "who reviewed",
  "binding": {
    "kind": "payload-tree",
    "payloadTree": "<40-hex payload tree of the reviewed candidate>",
    "excludedPath": "docs/release-reviews"
  },
  "reviewScope": {
    "summary": "what was reviewed",
    "evidence": ["optional list"]
  },
  "adversarialFindings": [
    {
      "id": "F-1",
      "severity": "P2",
      "description": "...",
      "resolution": "...",
      "status": "resolved"
    }
  ],
  "retrospective": { "decision": "proceed", "summary": "..." }
}
```

`proceed` requires every finding `resolved` or `accepted-risk`, P0/P1 `resolved`, and none `open`. The file must be named `docs/release-reviews/<module>.json`. The earlier schema version 1 files under `docs/remediation/` and `docs/post-release/` are historical evidence; they bind nothing and cannot certify a candidate.

### Producing a review for a candidate

```powershell
npm run review:payload-tree -- <candidate-commit>
```

prints the payload tree to bind. Independent review is of that exact commit; the reviewer's file is then committed on top of it. The implementation session may record its own self-review as evidence input, but it is not the independent review the process requires.

## Release gate

From a clean committed tree under Node 24/npm 11:

```powershell
npm ci
npx playwright install chromium
npm run verify:release
```

`RELEASE_PASS` is optional. The runner resolves the candidate identity and review binding first, before executing any other step, and then runs and records:

```text
git status --porcelain=v1
git diff --check
node --test scripts/release-gate-utils.test.mjs scripts/release-review-binding.test.mjs
npm ls --depth=0
npm run lint
npm run format:check
npm run typecheck
npm run build
node --test scripts/bundle-budget-utils.test.mjs
npm run check:bundle
npm run test
npm run test:e2e
npm run check:circular
npm run audit
git status --porcelain=v1
```

It rejects the wrong Node/npm major, version drift between package and lockfile, a dirty starting/ending tree, non-zero exits, signals, warnings, skipped tests, retried tests, and missing or non-applicable review evidence. Evidence JSON (manifest schema 2: commit, tree, payload tree, bound review and its checksum, parsed test counts, build checksums) is written under ignored `artifacts/release-evidence/`.

Running the ordinary commands above directly validates a candidate without review evidence. That is useful for an independent reviewer, but it is not certification and must not be presented as such.

## Pipeline

One workflow, `Release validation`, with one job whose check name is `Final candidate`. It runs on pushes to `master`, pull requests to `master` and manual dispatch, checks out `github.sha`, installs the locked environment and runs `npm run verify:release` once. There is no sharding, no retry and no deployment stage. `npm test` is limited to one worker and no file parallelism because the inherited unconstrained Vitest process model leaked workers on Windows.

Timeout ladder: `20m Playwright → 21m managed wrapper → 22m release command → 40m GitHub job`. The inner three were widened from 13/14/15 minutes after a measured hosted timeout (v1.5.1). The green v1.5.1 job then took 27 m 42 s, leaving only 2 m 18 s under its former 30-minute ceiling, so the owner raised the job ceiling to 40 minutes as an outer safety envelope, not a runtime target (2026-10-04).

The check name `Final candidate` is a contract: Vercel stores the required check by name. `tests/architecture/releaseWorkflow.test.ts` pins the workflow name, job name, triggers, single gate invocation and absence of secrets. Renaming the job requires updating the Vercel check at the same time.

## Validated before production

### Why this mechanism

The repository is private on a GitHub plan that returns HTTP 403 for branch protection and rulesets, so a required-check-before-merge model cannot be enforced. Vercel deploys every push to `master` to Production. Before this change a commit whose validation later failed still reached Production (observed for `f153f19`, `269633…`, `5eadb2b…` and `d92d8ce…`).

Vercel Deployment Checks hold each production deployment, which Vercel still builds, until the required GitHub check on the same commit passes, and only then assign it to the production domains. A failed or missing check leaves the previous deployment serving Production. It needs no secret, no deploy hook and no branch protection, and it gates promotion regardless of how the commit reached `master`.

Identity chain: the Vercel production deployment records the Git commit it was built from; the `Final candidate` check run is for the same commit SHA; the gate manifest records that commit, its tree and its payload tree, and the bound review file; a merge that changes the tree is a different commit and gets its own check.

### Status and activation

The repository side is in place. The platform side is a Vercel project setting that this repository cannot hold. Observed on 2026-10-02 (read-only, authenticated CLI): project `progress-pal`, production branch `master`, `autoAssignCustomDomains: true` (a prerequisite), no deploy hooks, `GET /v2/projects/progress-pal/checks` returns no checks, and the production deployment carries no check state. **Deployment Checks are therefore not active.**

Activation, one action in the Vercel dashboard: Project → Settings → Build & Deployment → Deployment Checks → Add Checks → provider GitHub → select the `Final candidate` check from the `Release validation` workflow. Vercel documents these checks as available to every team; confirm that the control is present on this Hobby team.

Verify after activation (read-only):

```powershell
vercel api /v2/projects/progress-pal/checks
```

and on the next production deployment confirm that it is not aliased until the check completes and succeeds. Record the activation date in `docs/CURRENT_STATE.md`.

Rollback: remove the check in the same settings page. A deployment held by a check can be released with **Force Promote**, which deliberately bypasses the check and should be used only by the owner.

### Release sequence

With Deployment Checks active, every `master` commit needs its own passing `Final candidate` check before it is promoted, and that check needs an applicable review:

1. The candidate commit `C` is frozen and independently reviewed (`npm run review:payload-tree -- C` names the payload).
2. The reviewer commits `docs/release-reviews/<module>.json` on top of `C` as an **evidence-only** commit `E`. `E` has the same payload tree as `C`.
3. `E` (or a merge whose tree equals `E`'s) reaches `master`, its check passes, and Vercel promotes it.

Pushing `C` without `E` is safe but unproductive: its check fails closed, so Vercel holds that deployment and Production stays on the previous one. A commit whose validation run was superseded and cancelled by a newer push likewise stays staged; validate the newer commit instead.

### Residual limits

- The gate proves a review **names this exact payload**; it does not authenticate **who wrote it**. A review file is a claim recorded in Git, and anyone who can commit can write one. Independence rests on process: the reviewer, not the implementer, authors and commits the evidence file, and the owner checks the evidence commit's author and `reviewer` field before merging.
- Without branch protection, GitHub cannot stop a direct push to `master`; the guarantee is that such a push is not promoted until its check passes.
- Force Promote and `vercel deploy --prod` with owner credentials are deliberate owner bypasses.
- The gate runs from the candidate's own checkout, so a candidate that edits `scripts/` or the workflow can alter the gate that judges it. The independent review must cover those paths; upgrading the GitHub plan would allow a base-branch-owned gate.
- Vercel rebuilds the commit; it does not promote the CI-built `dist`. Identity is by commit, and the deterministic lockfile build is the basis for treating the bytes as equivalent.
- Nothing here validates Production after promotion. Hosted smoke is a separate evidence class.

## Artifacts and data handling

The CI job uploads evidence JSON, `playwright-report/` and `test-results/` for 30 days. Current tests use synthetic local learner data and no accounts or secrets. Do not add real learner data, tokens, private backups or production credentials to test fixtures; traces and screenshots can expose any data rendered during a failing test.

## Troubleshooting

- Wrong Node/npm: activate Node 24 and npm 11; do not waive the runtime check.
- Dirty worktree: commit the exact candidate or use ordinary targeted commands during development. A dirty tree cannot produce counted certification evidence.
- `No release review evidence is bound to candidate payload tree …`: the candidate changed after review, or no review exists. Run `npm run review:payload-tree`, compare with the review file's `binding.payloadTree`, and either add an independent review for this payload or restore the reviewed bytes.
- A file under `docs/release-reviews/` is rejected: it must be a regular, valid `<module>.json`; move anything else out.
- Port 42183 in use: close the owning process. The E2E runner will not attach to an existing server.
- Playwright failure: retrieve the job artifact and inspect the retained trace, screenshot, video and HTML report.
- Audit endpoint unavailable: the job fails. Record the external outage; do not relabel it a clean security pass.
- Process leak or timeout: fail the gate, contain only the owned process tree, fix the harness and run a new final gate for the corrected source state.

## Deliberate omissions

- No deployment or Vercel credentials in the repository or workflow.
- No Slack/email hook without an authorized destination.
- No browser-binary cache.
- No changed-file-only release decision.
- No retries that could hide flakiness.
- No backend, contract-test or secret-dependent stage because the product has none.
