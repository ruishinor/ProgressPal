# Release certification reuse

The existing Release validation workflow retains one native final-candidate
job/check named **Final candidate**, its triggers, read-only permissions and upload.
PRs and master pushes select METADATA only for an exact license-only diff, COPY only for a structurally safe, approved single-catalogue-file diff, otherwise FULL. Manual dispatch and release-control transitions run FULL. A master push may run ATTEST only after authenticating
the comprehensive certificate of its exact tested PR synthetic merge. Activation,
rollback and other release-control transitions run FULL on both PR and master.

## Authority and source authentication

Independent payload review and authorized workflow changes remain the trust
boundary: candidate code executes on the runner in both paths. The verifier does
not claim to isolate a hostile authorized workflow editor. The existing
release-review-binding.mjs resolver retains exact payload binding, strict file
validation and rejection precedence; independent review is not self-review.

Discovery independently joins the actual master merge to exactly one merged
same-repository PR. Require complete tree equality, including review evidence,
and ordered parents(synthetic) = parents(master) = [base, head]. The synthetic
checkout comes from the authenticated artifact and is independently checked using
GitHub's Git commit endpoint. Today's moving pull merge ref is never evidence.

Require the expected workflow, latest successful run and exact successful attempt,
one native job with all comprehensive steps successful, and the GitHub Actions
check producer. Artifact ownership, bounded ZIP parsing and SHA-256 authenticate
the bytes. The schema-3 manifest must explicitly certify comprehensive, name the
same run/attempt/checkout/PR and contain all 21 passed command records with the
unchanged command profile. Validate Node TAP and both raw structured test reports,
their digests, invocation identities and counts. Unknown counts are not zero.
ATTEST records are ineligible as sources: there are no reuse chains.

Require exact Node patch/npm, Linux/x64, lock digest, runner versions, current
review digest and release controls. The fingerprint covers workflows; release,
review, reporter, reuse, E2E and bundle controls; Node/npm and build/test/lint/
format/TypeScript/hosting configuration; package scripts, engines and manager.
Application code, ordinary tests and dependency graphs are covered by source/target
tree equality, rather than frozen across releases. A changed control fingerprint
requires FULL. Checkout depth 2 preserves both parents and their control trees.

ZIP limits remain 16 MiB compressed, 64 MiB expanded, 32 MiB per entry, 128 entries.
Unsupported ZIP features, malformed reports and unavailable artifacts require
FULL; bytes are never extracted or executed. Source timestamps must fit the exact
attempt's job interval. GitHub artifact creation timestamps have second precision:
only that comparison floors the millisecond manifest end to a second. Historical
run 41367646765, artifact 13109457491 confirms the defect: manifest ended
2026-11-02T01:21:55.198Z, artifact created 01:21:55Z. Exact attempt bindings
and job bounds are unchanged; this is not a multi-second grace period.

## Decision and execution

- **ATTEST:** all positive source/current predicates, a clean fresh audit and final
  source/target recheck pass. Before publishing the step output, exclusively write
  and read back a UUID-bound artifacts/release-evidence/reuse-<invocation>.json
  record with target SHA/run/attempt and source PR/synthetic/run/attempt/job/artifact/
  digest. This is reuse evidence, never a fabricated comprehensive manifest.
  The record says eligibility was verified; the native job's actual step outcomes
  establish execution, including a later output fault that selects FULL.
- **FULL:** unsupported event/topology/environment, changed controls, unavailable,
  malformed, stale or ambiguous optional evidence, registry/API failure, or optional
  record/output failure. The original npm ci, Chromium install and
  npm run verify:release execute once with their genuine failure propagation.
- **BLOCK:** confirmed current identity, checkout, review or package-policy
  corruption, or a structured current prohibited audit finding. Fail the native
  job; optional fallback cannot hide that failure.

The selector is invoked once under a 150-second shell deadline. Its bootstrap
catches import/parser/runtime errors as FULL, but carries confirmed BLOCK through
a distinct failing exit. A fresh private output file is copied to Actions only
after successful selector completion and exact complete output validation. Missing,
partial, invalid, stale or timed-out output cannot select ATTEST. No job-level
skip or continue-on-error exists. Only the three expensive steps branch; upload
still runs with always(). A real FULL failure is neither caught nor retried.

Discovery has a 60-second budget, 10 seconds per request, bounded pagination;
fresh audit has a 60-second command budget. Optional bounds mean FULL. An
irrecoverable workflow output/storage failure can still fail the job honestly.

The lightweight audit directly invokes npm 11.10.1, without install or lifecycle
scripts: npm audit --package-lock-only --ignore-scripts --audit-level=moderate
--json --include=dev --include=optional --include=peer. A valid report v2 with
consistent vulnerability entries/counts establishes a finding; moderate/high/
critical findings BLOCK. Clean complete JSON plus exit zero allows continuation.
Nonzero alone, transport errors, missing/malformed/inconsistent output or an
interrupted command require FULL. Its authoritative audit still fails honestly
if the registry is unavailable. npm documents threshold and JSON semantics in
[npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/).

## Verification, release and recovery

Use changed-file formatting/lint, focused Node reuse/review/gate tests, the workflow
architecture test, and TypeScript when TS/config/E2E APIs change. Exercise the actual
installed shell with small command doubles as well as source attacks. No routine
full local certification or manual hosted dispatch is needed. A separate reviewer
binds the final payload; an evidence-only commit must preserve that payload tree.

One ordinary PR event comprehensively certifies its actual synthetic checkout.
Before authorized merge, recheck head/base/tree/review and the successful current
run attempt. Activation's master run must use FULL because controls changed. A
later useful release may naturally demonstrate active reuse; no dummy release or
forced eligibility is permitted. Observe master check success, automatic deployment
source, public alias assignment and minimal public smoke separately. READY alone
does not establish promotion or end-user behavior.

Read-only CLI inspection on 2026-11-02 confirms project
prj_npdQBbWuAlQMzraZuhM12yv3XgmZ, production branch master, and check
chk_405a1c74-57c8-4f43-b2d8-ac38d03de6e7, GitHub Final candidate, blocking
deployment-alias for production. No provider settings changed. GitHub currently
reports no branch protection/rulesets; the authorized merger must enforce the
candidate predicates. Rollback is a normal independently reviewed change restoring
unconditional FULL. Never remove/bypass the provider check or manually promote.

Historical shadow #75/#84/#90 reported eligible exact source in about five seconds
but still ran FULL. That is feasibility evidence, not active-reuse proof or a
measured saving. Identical source can have substantially different hosted runtime;
only actual selected steps establish avoided work. No future eligibility rate or
wall-time saving is promised.
