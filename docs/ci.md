# ProgressPal release validation

## Purpose

`.github/workflows/test.yml` independently proves that the triggering ProgressPal source state passes the full release gate once in a clean GitHub-hosted environment. Together with one clean local final gate, it implements D-0075. It is a certification workflow, not a fast feedback or deployment workflow.

## Runtime and installation

- Node version comes from `.nvmrc` and must be major 24.
- npm is pinned to `11.10.1`; the release runner accepts npm major 11.
- Every job runs `npm ci` from `package-lock.json`.
- Playwright browser binaries are installed fresh. They are not cached because the official Playwright guidance does not recommend browser-binary caching for typical CI runs.

## Pipeline structure

The `Final candidate` job checks out `github.sha`, installs the locked environment, and runs `npm run verify:release` once with `RELEASE_MODULE=v1.3-final-candidate` and `RELEASE_PASS=1`.

There is no sharding or retry. `npm test` is intentionally limited to one worker and no file parallelism because the inherited unconstrained Vitest process model leaked workers on Windows.

## Canonical local command

From a clean committed tree under Node 24/npm 11:

```powershell
npm ci
npx playwright install chromium
$env:RELEASE_MODULE = 'v1.3-final-candidate'
$env:RELEASE_PASS = '1'
$env:RELEASE_REVIEW_FILE = 'docs/remediation/v1.3-final-release-review.json'
npm run verify:release
```

The runner executes and records:

```text
git status --porcelain=v1
git diff --check
npm ls --depth=0
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit
git status --porcelain=v1
```

It rejects the wrong Node/npm major, version drift between package and lockfile,
a dirty starting/ending tree, non-zero exits, signals, warnings, skipped tests,
retried tests, and missing or non-proceeding review evidence. The tracked review
file must match the named module, identify the reviewer, record every finding
and resolution, resolve all P0/P1 findings, and include the retrospective
decision. Evidence JSON, the review-file checksum, parsed test counts, and
build checksums are written under ignored `artifacts/release-evidence/`.

## Artifacts and data handling

The CI job uploads evidence JSON, `playwright-report/`, and `test-results/` for 30 days. Current tests use synthetic local learner data and no accounts or secrets. Do not add real learner data, tokens, private backups, or production credentials to test fixtures; traces and screenshots can expose any data rendered during a failing test.

## Required branch protection

After the workflow is proven on the remote, require `Release validation / Final candidate` before merging to `master`. If repository permissions prevent changing an obsolete required check, record it as governance debt; do not misrepresent the actual CI result.

## Troubleshooting

- Wrong Node/npm: activate Node 24 and npm 11; do not waive the runtime check.
- Dirty worktree: commit the exact candidate or use ordinary targeted commands during development. A dirty tree cannot produce counted certification evidence.
- Review evidence: pass a tracked JSON file for the exact module. A missing reviewer, unresolved P0/P1 finding, rejected retrospective, or mismatched module fails the gate.
- Port 42183 in use: close the owning process. The E2E runner will not attach to an existing server.
- Playwright failure: retrieve the job artifact and inspect the retained trace, screenshot, video, and HTML report.
- Audit endpoint unavailable: the job fails. Record the external outage; do not relabel it a clean security pass.
- Process leak or timeout: fail the gate, contain only the owned process tree, fix the harness, and run a new final gate for the corrected source state.

## Deliberate omissions

- No deployment or Vercel credentials.
- No Slack/email hook without an authorized destination.
- No browser-binary cache.
- No changed-file-only release decision.
- No retries that could hide flakiness.
- No backend, contract-test, or secret-dependent stage because the product has none.
