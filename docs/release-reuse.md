# Release certification reuse — shadow installation

Task A, 2026-10-29. This change installs **shadow only**. The single native
`Final candidate` job still runs the comprehensive gate on every PR, master
push and manual dispatch. No tests, Chromium installation or existing policy
checks are skipped. Activation and merging require the existing independent
review and owner authorization.

## Authority and design choice

Use a reviewed in-repository verifier and a bounded release-control fingerprint.
Independent payload review and owner control of the workflow remain the trust
boundary. Authenticated Actions run/job/check records authenticate the producer;
artifact ownership, SHA-256, Git objects and report validation establish the
record's relationship to the tested synthetic merge. A manifest's claims alone
never suffice.

An immutable Q/K controller would additionally detect replacement of its own
module when an honest wrapper invokes it. It would require a bootstrap release,
template/pin management and recurring controller transitions. It cannot isolate
hostile candidate code on the same runner or constrain an authorized workflow
editor. Those limits already apply to the comprehensive gate. The smaller design
preserves this existing trust boundary without claiming to solve it.

The fingerprint covers workflows; release/review/reporter/reuse scripts and
their focused tests; E2E wrapper and bundle controls; Node/npm settings; build,
test, lint, formatting, TypeScript and hosting configurations; package scripts,
engines and package-manager identity. It does not freeze application code,
ordinary tests or the dependency graph. Changes to these controls between B and C
require full certification, including installation, activation and rollback.
There is no transitive policy inventory or YAML renderer.

## Evidence and decisions

The schema-3 manifest gains optional `certification` metadata with explicit
`certificationContractVersion: 1`, `certificationKind: comprehensive`, repository,
run/attempt, job, workflow ref/SHA, checkout, parents, PR base/head and control
fingerprint. Missing metadata cannot fail full certification. Existing uploaded
manifest and structured report bytes are reused; no second certificate artifact
is introduced. Historical schema-2 and B-only schema-3 manifests are ineligible.

Discovery independently joins the merge to exactly one merged same-repository PR,
then verifies the expected workflow, successful attempt-specific native job,
mandatory steps and GitHub Actions check producer. Empty run `pull_requests` is
accepted only through this independent match. S comes from the authenticated
artifact, and GitHub's Git commit endpoint must independently establish its full
tree and ordered parents. Today's pull merge ref is never used. Require
`parents(S) = parents(C) = [B,H]` and complete `tree(S) = tree(C)`, including
review evidence. The current resolver retains rejection precedence.

All 21 command records and their normalized invocation profile must be complete,
passed, exit-zero, without signal/timeout/interruption or policy violations.
Node TAP and both raw structured reports are validated with B's existing
validators; report bytes, digest, invocation, embedded record and explicit counts
must agree. Keyword `warningCount` is never an eligibility input. Unknown counts
are not zero. Source reports are data and are never extracted or executed.

Archive bounds: 16 MiB compressed, 64 MiB total expanded, 32 MiB per entry,
128 entries. The observed B artifact was approximately 425 KiB compressed and
2.4 MiB expanded. ZIP64, comments, directory entries, unusual names, symlinks,
duplicates, traversal, unsupported compression and invalid checksums fall back.
The parser accepts ordinary stored/deflated files and data-descriptor flags.

Exact Node patch and npm version, Linux/x64 and lock digest must match the source.
Node patch changes therefore sometimes require FULL; no exact Ubuntu image label,
first-attempt restriction or arbitrary TTL is imposed. Artifacts must remain
available and belong to the correct attempt's time interval. This certifies CI
source evidence, not byte-identical Vercel output.

| Result                        | Reason codes and effect                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ATTEST (shadow: would-attest) | `EXACT_SOURCE_CERTIFIED`: all positive predicates, fresh audit and final identity check pass. Installed workflow still runs full.                                                                                                                                                                                                                                                                                       |
| FULL                          | `CURRENT_EVENT_FULL_ONLY`, `CURRENT_MERGE_UNSUPPORTED`, `CURRENT_CONTROLS_CHANGED`, `CURRENT_ENVIRONMENT_UNSUPPORTED`, `CURRENT_MASTER_MOVED`: unsupported/ineligible current context, original gate remains authoritative.                                                                                                                                                                                             |
| FULL                          | `SOURCE_PR_MISSING`, `SOURCE_PR_AMBIGUOUS`, `SOURCE_PR_CONTRADICTION`, `SOURCE_RUN_MISSING`, `SOURCE_RUN_INVALID`, `SOURCE_JOB_AMBIGUOUS`, `SOURCE_JOB_INVALID`, `SOURCE_PRODUCER_INVALID`, `SOURCE_WORKFLOW_INVALID`: source association/producer not positively established.                                                                                                                                          |
| FULL                          | `SOURCE_CONTRACT_UNSUPPORTED`, `SOURCE_BINDING_INVALID`, `SOURCE_TREE_DIFFERENT`, `SOURCE_TOPOLOGY_INVALID`, `SOURCE_CONTROLS_CHANGED`, `SOURCE_ENVIRONMENT_DIFFERENT`, `SOURCE_REVIEW_DIFFERENT`, `SOURCE_CHECKOUT_INVALID`, `SOURCE_ATTEMPT_TIME_INVALID`, `SOURCE_RACE`: source cannot certify this candidate.                                                                                                       |
| FULL                          | `SOURCE_ARTIFACT_AMBIGUOUS`, `SOURCE_ARTIFACT_IDENTITY_INVALID`, `SOURCE_ARTIFACT_SIZE_INVALID`, `SOURCE_ZIP_INVALID`, `SOURCE_MANIFEST_AMBIGUOUS`, `SOURCE_COMMAND_PROFILE_INVALID`, `SOURCE_POLICY_INVALID`, `SOURCE_TAP_INVALID`, `SOURCE_REPORT_MISSING`, `SOURCE_REPORT_DIGEST_INVALID`, `SOURCE_REPORT_CONTENT_INVALID`, `SOURCE_REPORT_COUNTS_INVALID`: old evidence is unusable, not proof that C is defective. |
| FULL                          | `SOURCE_API_UNAVAILABLE`, `SOURCE_LOOKUP_TIMEOUT`, `SOURCE_RESPONSE_LIMIT`, `SOURCE_RESPONSE_INVALID`, `SOURCE_PAGINATION_CHANGED`, `SOURCE_PAGINATION_LIMIT`, `SOURCE_EVIDENCE_UNAVAILABLE`, `VERIFIER_UNAVAILABLE`: API/parser/import/runtime uncertainty cannot disable full certification.                                                                                                                          |
| BLOCK                         | `CURRENT_IDENTITY_INVALID`, `CURRENT_CHECKOUT_CHANGED`, `CURRENT_REVIEW_INVALID`, `CURRENT_PACKAGE_POLICY_INVALID`, `CURRENT_AUDIT_FAILED`: current authority or mandatory policy failure. In shadow the original comprehensive gate independently decides the job; analysis cannot suppress or replace it.                                                                                                             |

`SOURCE_RUNNER_VERSION_INVALID` also yields FULL when the locked Vitest/Playwright
versions or the recorded Playwright/Chromium command outputs cannot be reconciled.

The checkout uses a **bounded `fetch-depth: 2`**: the verifier needs both
merge parents and the first parent's tracked control files. Depth 1 makes
`git show --format=%P` hide parents and makes the parent tree unavailable,
forcing every otherwise valid master candidate to FULL. No full-history clone
is necessary.

The installed workflow has no enforcement branch. Its shell handles absent or
crashing entrypoints and a 150-second deadline, then proceeds unconditionally to
the original install/Chromium/full gate sequence. Discovery has a 60-second
budget, each request 10 seconds, at most three pages of 100 rows per endpoint;
fresh audit has its own 60-second budget. Bounds cause FULL, not a failed valid
release. `reuse-shadow.json` records actual mode, candidate/run/attempt, source
identities/digest when available, decision, would-attest and elapsed milliseconds.
An entrypoint failure is logged as FULL / VERIFIER_UNAVAILABLE.

## Audit parity and efficiency evidence

The proposed lightweight audit directly invokes npm, never a project lifecycle
or `npm run` script: `npm audit --package-lock-only --ignore-scripts
--audit-level=moderate --include=dev --include=optional --include=peer`.
On npm 11.10.1, installed and lock-only audits on this lock produced matching
zero-vulnerability reports and the same dependency counts (364 total). A
throwaway synthetic fixture with lodash 4.17.20 as dev and minimist 0.0.8 as
optional produced byte-equivalent JSON results on both paths: one high and one
critical vulnerability, both exit 1. No lifecycle scripts ran. These are targeted
parity results on Windows, not a universal npm guarantee; hosted Linux shadow
evidence must confirm the actual operating environment before activation.

Read-only historical sample, downloaded and checked on 2026-10-29:

| PR / source run   | Tested synthetic S                       | Complete tree and parents match C | B/C controls stable | Historical result                                                   |
| ----------------- | ---------------------------------------- | --------------------------------- | ------------------- | ------------------------------------------------------------------- |
| #47 / 40679259536 | 969b188261c8230632edc80b4d4635240cbfc0ad | Yes                               | No                  | FULL: control changes and legacy schema 2                           |
| #48 / 40756188138 | d890456659f6c7c38cc0ef7bd8c5e513f8abdfa8 | Yes                               | Yes                 | Structurally eligible ordinary release; FULL today: legacy schema 2 |
| #49 / 40799107209 | 4632d58f2c45c7ded658aeffae2e7a1374b081ae | Yes                               | No                  | FULL: B control changes and absent A binding                        |

This is 3/3 structural equivalence and 1/3 unchanged controls in a small sample
dominated by release-policy changes, not a measured future eligibility rate.
PR #48's full job was 60m08s; PR #49's was 71m32s. Master #49 ran approximately
62 minutes. A later qualifying merge could avoid that duplicate master suite.
Minutes for attestation remain a budget/hypothesis, not a hosted measurement.
The two Task A transitions (installation and activation) require four full
hosted runs in total; at roughly an hour each, their runner cost takes roughly
four later eligible releases to repay, excluding implementation/review time.
Shadow uses one already-planned ordinary release and introduces no new routine
owner action. Persistent fallback or environment drift must be assessed from
real shadow evidence before activation.

## Rollout and recovery

1. Independently review the exact implementation payload, add the normal bound
   review evidence, and publish this PR for one authoritative full hosted run.
   Owner-authorized merge must also receive full master certification.
2. The next real planned compatible PR runs full on S. Its authorized merge must
   record would-attest, pass full certification and reach the expected Vercel
   alias. Until then: **SHADOW—AWAITING_REAL_PROOF** after installation.
3. Independently review that evidence and a small activation workflow change.
   Activation PR and merge themselves run full because controls changed. Only
   a later ordinary qualifying merge may attest. No activation is implemented
   by changing an environment variable or dispatch input in this installation.
4. Rollback is a normal reviewed workflow change restoring unconditional full
   execution (the current installed behavior). Never remove the Vercel check.

Read-only provider verification: project `prj_npdQBbWuAlQMzraZuhM12yv3XgmZ`,
check `chk_405a1c74-57c8-4f43-b2d8-ac38d03de6e7`, GitHub source
`Final candidate`, blocks `deployment-alias`, target `production`, timeout
5000 seconds. Deployment `dpl_AdNcSuWt7ohcAMR7sRZ5trmQTGew` reports source
`3be2fcbdf7fb46125fa84997eb875904660bc1bc`, READY and successful alias check.
Provider settings were not modified. Native check identity is retained as required
by [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks).
