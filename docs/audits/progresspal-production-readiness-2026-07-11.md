# ProgressPal Production-Readiness Audit

Date: 2026-07-11
Scope: current `master` at `67ed6af`, local-first engine, classic routes, RPG routes, recovery, offline behavior, UX, accessibility, and release evidence.

## Executive verdict

**Baseline verdict: not production-ready. Confidence: high.**

This verdict does not mean the application is broadly broken. It means the current repository cannot support a defensible release decision yet:

- the post-2G release gate fails on a stale RPG Focus expectation;
- backup import/reset can report failure after destructive work has already committed;
- backup preview validation does not enforce all uniqueness rules the database enforces;
- current release evidence is narrower than the controlling roadmap requires;
- first-use RPG deep links, persistent HUD refresh, and several error-announcement paths have confirmed gaps.

The primary bottleneck is **trustworthy local-data recovery**, followed by **truthful release validation**. Visual expansion is not the bottleneck.

## Assumptions and trade-offs

- **Assumption:** ProgressPal CS50 Edition v1.2 is the release candidate; the full RPG v2 vision is not complete. Evidence: `README.md:5-9`.
- **Assumption:** Existing IndexedDB data and envelope-v1/schema-v2 backups must remain usable.
- **Constraint:** no backend, accounts, analytics, database-schema expansion, or engine rewrite.
- **Trade-off:** reject broad UI redesign in this pass. The screenshots show hierarchy problems, but there is no selected visual target or real-user evidence to justify a redesign safely.
- **Trade-off:** add dataset checks only where runtime/database invariants are explicit. Do not invent foreign-key rules that could reject historically valid local records.
- **Uncertainty:** no repository evidence demonstrates that RPG presentation improves learner motivation or course completion. Technical tests cannot resolve that.

## Evidence perimeter

| Area                                             | Status             | Evidence                                                                                                       |
| ------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Source, Git history, tests, active documentation | Available          | Repository and current `master`                                                                                |
| Browser UX evidence                              | Available          | Current-run desktop/mobile screenshots under `_bmad-output/implementation-artifacts/product-audit-2026-07-11/` |
| Static local-first/security review               | Available          | Source trace and targeted tests                                                                                |
| Post-2G release evidence                         | Failing/incomplete | `e2e/release-candidate.spec.ts`; `docs/rpg-v2/VALIDATION_LOG.md:54-57`                                         |
| Production telemetry                             | Missing            | Deliberately absent from this local-only product                                                               |
| Real-user task research                          | Missing            | No interviews or usability-study records located                                                               |
| Real-device/browser matrix                       | Missing            | Playwright evidence only                                                                                       |

## Adversarial retrospective

### Project Lead

What changed since the June roadmap audit: source-of-truth files are now in the repository, the worktree baseline is clean, and the RPG wrapper phases are merged. What did not change: release evidence still lags implementation. The current RC loop proves route headings, width containment, and console cleanliness, but not the shared-state, recovery, RPG-offline, or keyboard flows required by the roadmap.

Failure mode: treating a large test count as release evidence even when the required user journeys are not represented.

### Design Thinking Coach

The product has a coherent audience and context: one CS50x learner, one browser profile, repeated study sessions, explicit local persistence. A browser tool is justified; a marketing site or backend is not.

The central RPG thesis remains a hypothesis. “More motivation,” “better orientation,” and “five-second clarity” are planning claims, not demonstrated outcomes. Current mobile evidence shows the opposite risk: product chrome consumes most of the first viewport before the learner reaches the active task.

Failure mode: funding more RPG presentation before observing whether learners can find, record, resume, and recover work.

### UX Designer

Confirmed strengths include semantic navigation, skip links, reduced-motion handling, explicit local-data language, destructive-action confirmation, and safe external links.

Confirmed gaps:

- first-time `/rpg/*` deep links lose their destination during onboarding;
- “Use default learner” can fail silently;
- the persistent RPG HUD has no post-write invalidation contract;
- internal RPG buttons use full-document anchors while bottom navigation uses SPA links;
- RPG resource errors are visible but are not programmatically associated with invalid controls;
- at 390×844, the header, status block, and navigation push the actual Dashboard or Sessions task to roughly the bottom of the first viewport.

Failure mode: the interface communicates theme and system status before it enables the learner’s immediate task.

### Senior Analyst

The largest expected downside is local data loss or false recovery reassurance. Restore/reset commit destructive changes before all initialization/audit work succeeds, while UI copy promises unchanged data on failure. Backup parsing validates row shapes and primary IDs but misses the database’s unique secondary keys and fixed singleton identities.

The strongest competing interpretation is that post-commit initialization failures are unlikely. That may be true, but it does not make the UI promise defensible, and recovery code should be judged by consequence as well as likelihood.

Failure mode: optimizing visual completeness while a rare recovery failure can destroy the only copy of user data.

## Prioritized stabilization roadmap

### P0 — Restore truthful release gating

1. `[RC-00.1] Reconcile every RC route expectation with the current accessible route heading` → verify: the route matrix reaches all classic and RPG routes at mobile, tablet, and desktop widths.
2. `[RC-00.2] Keep the route loop focused on reachability and containment; add separate interaction tests instead of overloading it` → verify: a failure names one route or one journey precisely.
3. `[RC-00.3] Run the scoped RC gate three consecutive times` → verify: 100% pass rate, zero console errors, warnings, or overflow flags in all three runs.

### P0 — Make recovery atomic and preview-safe

1. `[DATA-01.1] Enforce fixed singleton IDs and every explicit unique IndexedDB key before destructive confirmation` → verify: malformed snapshots are rejected before any store changes.
2. `[DATA-01.2] Keep clear, restore/reset initialization, seed reconciliation, and import audit logging inside one compatible transaction outcome` → verify: injected failure at each post-clear stage rolls every store back to its exact pre-operation snapshot.
3. `[DATA-01.3] Preserve envelope-v1/schema-v2 behavior and document historical-schema policy` → verify: current exports still round-trip byte-for-data-equivalent; unsupported versions fail with explicit diagnostics.
4. `[DATA-01.4] Run backup and repository recovery tests three consecutive times` → verify: 100% pass rate with zero warnings in all three runs.

### P1 — Repair first-use and shared-state correctness

1. `[FLOW-01.1] Preserve a validated same-origin return path through onboarding` → verify: a fresh direct RPG resource visit returns to that resource after either onboarding path.
2. `[FLOW-01.2] Surface quick-start persistence failure and keep retry available` → verify: forced write failure produces an announced inline error and no navigation.
3. `[FLOW-01.3] Add one narrow RPG-summary invalidation signal after successful writes` → verify: HUD XP/current quest refreshes without a document reload or duplicate database write.
4. `[FLOW-01.4] Use router navigation for internal RPG destinations and anchors only for external URLs` → verify: internal transitions preserve the mounted shell and browser history works.
5. `[FLOW-01.5] Run focused flow tests three consecutive times` → verify: 100% pass rate, one write per action, zero console warnings in all three runs.

### P1 — Close accessibility and RPG-offline evidence gaps

1. `[A11Y-01.1] Associate every invalid RPG resource control with its error message` → verify: each `aria-invalid=true` control resolves an `aria-describedby` error ID.
2. `[A11Y-01.2] Add axe and keyboard traversal checks for representative RPG routes and invalid states` → verify: zero serious/critical axe findings and a complete keyboard path.
3. `[OFFLINE-01.1] Prove direct offline boot and navigation across representative RPG routes` → verify: installed production build loads the RPG hub/resource/focus path offline with no network dependency.
4. `[A11Y/OFFLINE-01.2] Run this evidence set three consecutive times` → verify: 100% pass rate and zero warnings in all three runs.

### P2 — Reconcile release identity and active documentation

1. `[DOC-01.1] Select one semantic application version and use it in package metadata, runtime metadata, exports, and release docs` → verify: an exported backup reports the selected version and repository search finds no conflicting active value.
2. `[DOC-01.2] Mark removed Journey Log guidance obsolete or replace it with current Insights guidance` → verify: active IA and production navigation use the same name and route.
3. `[DOC-01.3] Record the final post-2G release decision and exact validation commands` → verify: another engineer can reproduce all three clean passes from the log.

### P3 — Validate product value before more visual expansion

1. `[DISCOVERY-01.1] Observe representative learners complete deep-link onboarding, find next work, record partial progress, resume, and export/restore` → verify: task completion, misroutes, assistance, and trust comprehension are recorded.
2. `[DISCOVERY-01.2] Decide whether mobile chrome should collapse, reorder, or remain` → verify: the decision follows observed task performance, not visual preference alone.
3. `[DISCOVERY-01.3] Challenge whether every current surface is necessary` → verify: each retained route owns a distinct recurring user task.

## Current execution status

- [x] Evidence perimeter mapped.
- [x] Current desktop and mobile flows captured.
- [x] Architecture, product, UX, accessibility, and analyst reviews completed.
- [x] P0 release-gate patch completed and triple-verified (three final runs; 9/9 viewport cases, zero warnings).
- [x] P0 recovery patch completed and triple-verified (three final runs; 82/82 tests per run, clean static checks).
- [x] P0 managed release harness completed and triple-verified (three final runs; 30/30 browser cases per run, strict app identity and port cleanup).
- [x] P1 functional-flow patch completed and triple-verified (three final runs; 108/108 tests per run, clean static checks).
- [x] P1 accessibility/offline evidence completed and triple-verified (three byte-final runs; 97/97 unit integration plus 8/8 production browser cases per run).
- [x] P2 release identity and active documentation reconciled and triple-verified (three runs; 57/57 compatibility tests per run, clean static checks).
- [x] Full local repository gate completed three consecutive times: zero-warning lint/format/types/build, 39/39 unit files and 367/367 tests, 31/31 managed browser cases, and 168/168 cycle analysis per run.
- [ ] Canonical `npm run validate` completed three consecutive times. The unchanged final `npm audit --audit-level=moderate` step is blocked because this environment cannot reach or authorize npm's advisory endpoint.
- [x] Final adversarial review and conditional release decision recorded.

## Final release decision

**Decision:** conditional go for a local release-candidate handoff; no-go for production-deployment certification.

The implemented code, recovery behavior, local-first boundary, production build, browser flows, accessibility checks, offline routes, and local dependency tree are internally consistent under the available evidence. `npm ls --depth=0` reports no missing or invalid direct dependencies. Three consecutive byte-final local gates passed without code changes between runs.

Production certification remains blocked by evidence, not by a known runtime defect:

- the live npm advisory query could not run in the restricted environment;
- no deployment, deployment logs, or hosted smoke test were available;
- no real-user study or real-device/browser matrix exists;
- independent final reviewer agents reached their service usage limit, so the final branch walk was completed in-thread and is not represented as independent review evidence.

Do not tag or describe this checkout as production-certified until the live dependency audit and target-host deployment checks pass. Do not use that external evidence gap as justification for broader product or visual work.

## Evidence limits

Screenshots support hierarchy and visible-state findings only. They do not prove WCAG compliance, keyboard behavior, data durability, or real-user effectiveness. Automated checks support implementation correctness only; they do not prove the RPG product thesis.
