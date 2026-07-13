---
story_id: '3.1'
story_key: '3-1-v1-3-release-remediation'
title: 'Certify ProgressPal v1.3.0 and validate the product direction'
status: in-progress
baseline_commit: '67ed6af836ec46f136bc5622aa68c8745c8bcf40'
created: '2026-07-13'
sources:
  - docs/audits/progresspal-production-readiness-2026-07-11.md
  - docs/remediation/sprint-change-proposal-2026-07-13.md
  - docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
  - docs/rpg-v2/MIGRATION_CONTRACT.md
---

# Story 3.1: Certify ProgressPal v1.3.0 and validate the product direction

Status: in-progress

## Story

As the maintainer of a local-first CS50x study tool,
I want one reproducible release identity, trustworthy recovery and offline behavior, evidence-backed task flows, and an explicit product decision,
so that a learner can use the tool without false release, durability, accessibility, or motivation claims.

## Acceptance Criteria

1. The application, package metadata, active documentation, cache identity, and release evidence consistently identify the candidate as `1.3.0`; historical tags remain unchanged and their metadata anomaly is documented.
2. Node 24 and npm 11 are the certification runtime, line endings are repository-controlled LF, and no validation command emits line-ending warnings.
3. One canonical fail-closed release command runs lint, format, typecheck, build, contained unit/integration tests, managed E2E, circular-dependency analysis, dependency audit, and clean-tree checks while recording reproducible evidence.
4. CI runs the same immutable commit through three sequential, independent release passes with `npm ci`, no retries, no skips, no warnings, and retained failure artifacts.
5. Envelope format 1, schema 2, all current store/entity/XP rules, historical valid backups, atomic reset/restore, and exact rollback remain compatible.
6. Concurrent tabs cannot silently overwrite stale state or perform an uncoordinated destructive recovery operation; storage persistence limitations are stated honestly.
7. Protected onboarding return paths, quick-start retry, router navigation, post-write HUD refresh, passive-route immutability, and explicit-write idempotency are covered by unit, integration, and E2E tests.
8. Service-worker upgrades update the cached shell, delete only ProgressPal-owned caches, preserve unrelated origin caches, and support tested rollback/offline/reconnect paths.
9. Production responses apply explicit security headers, the built bundle has no unexpected remote URLs or secrets, and bundle budgets are enforced.
10. Chromium covers the full release matrix; Firefox and WebKit cover critical flows; real-device and assistive-technology procedures identify evidence that cannot be automated locally.
11. `EXPERIENCE.md` and `DESIGN.md` make the current task—not theme, status, or marketing—the first interface priority and explicitly reject generic SaaS, tactical, cyberpunk, neon, glass, fake-HUD, and decorative card-grid patterns.
12. The classic, RPG, task-first neutral, and LibreOffice-compatible spreadsheet alternatives are tested against predefined learner-task thresholds before RPG becomes the default or receives further expansion.
13. Promotion, hosted smoke testing, rollback, tag creation, release evidence, and post-release field study are tied to the exact certified commit and artifact checksums.
14. Every module passes its targeted tests and the universal release gate three consecutive times before the next module is accepted; any code change, warning, skip, retry, or failed check resets the count.

## Tasks / Subtasks

- [ ] Module 0 — preserve and inventory the starting state (AC: 1, 14)
  - [ ] Work only on `cx/release-1.3.0-remediation`; never reset, clean, or discard the inherited dirty changes.
  - [ ] Record commit, tree, tags, lockfile hash, branch, runtime, line-ending configuration, modified files, and untracked files.
  - [ ] Classify every inherited change by remediation area and record the first adversarial retrospective.
- [ ] Module 1 — release identity, authority, runtime, and line endings (AC: 1, 2, 14)
  - [ ] Set package and lockfile application version to `1.3.0`; preserve envelope 1 and schema 2.
  - [ ] Pin Node 24 and npm 11 in `.nvmrc`, package metadata, documentation, and CI.
  - [ ] Add LF `.gitattributes`, set Prettier to LF, and isolate mechanical renormalization from semantic edits.
  - [ ] Replace contradictory active release, branch, contribution, security, roadmap, and validation claims with a single authority hierarchy.
  - [ ] Document the immutable `v1.2.0`/`v1.2.1` tag versus embedded `0.1.0` package anomaly; never move those tags.
- [ ] Module 2 — canonical gate and CI evidence (AC: 3, 4, 14)
  - [ ] Contain Vitest worker count and make timeout cleanup fail closed.
  - [ ] Add a single release-gate runner and evidence manifest with commit/tree/lock/runtime/browser/command/result/artifact fields.
  - [ ] Retain Playwright trace, screenshot, and video on failure with zero retries.
  - [ ] Add GitHub Actions validation plus three sequential certification jobs on the same commit.
- [ ] Module 3 — durability, compatibility, concurrency, and recovery (AC: 5, 6, 14)
  - [ ] Add real historical backup fixtures from tagged and current states and a complete compatibility matrix.
  - [ ] Add hostile-backup and injected failure coverage without changing schema, envelope, store, entity, or XP contracts.
  - [ ] Add persistent-storage status/request UX while preserving the backup requirement.
  - [ ] Add a schema-free cross-tab revision protocol that prevents stale writes and blocks destructive actions while a peer tab is active.
- [ ] Module 4 — routing and task interaction correctness (AC: 7, 14)
  - [ ] Complete the route matrix for valid/invalid return paths, onboarding variants, history, and idempotency.
  - [ ] Prove passive routes do not mutate storage and explicit actions write once.
  - [ ] Prove errors, focus, labels, status announcements, and HUD refresh behavior.
- [ ] Module 5 — service worker, browsers, security, and bundle (AC: 8, 9, 10, 14)
  - [ ] Version the cache as `progresspal-cache-v1.3.0`, restrict deletion to the ProgressPal prefix, and refresh cached HTML after successful online navigation.
  - [ ] Test no-worker, old-worker, open-tab, failed-install, activation, offline, reconnect, rollback, and unrelated-cache cases.
  - [ ] Add Chromium full coverage plus Firefox/WebKit critical flows.
  - [ ] Add explicit CSP, referrer, content-type, frame, and permissions headers.
  - [ ] Inspect production bundles for unexpected remote URLs, secrets, source maps, and budget regressions.
- [ ] Module 6 — certified local beta (AC: 3–10, 14)
  - [ ] Complete adversarial review with zero P0/P1 findings.
  - [ ] Complete three independent local/CI passes and publish evidence labelled only `Certified local beta`.
- [ ] Module 7 — hosted preview, devices, and rollback (AC: 10, 13, 14)
  - [ ] Use Vercel CLI only for build/deploy/log evidence; keep the current configuration format unless a functional need justifies migration.
  - [ ] Tie preview deployment to the exact commit and artifact hashes.
  - [ ] Execute the real-device/AT matrix and prove rollback with current database/cache state.
  - [ ] Publish evidence labelled only `Hosted production-certified beta` after all checks pass.
- [ ] Module 8 — product and UX authority (AC: 11, 12, 14)
  - [ ] Create tracked `EXPERIENCE.md`, `DESIGN.md`, a route-to-job inventory, and an evidence ledger.
  - [ ] Define the primary job as identifying, recording, resuming, and recovering the learner's next useful action.
  - [ ] Define the 12-participant comparative protocol and hard RPG/default/optional/retire/stop thresholds.
- [ ] Module 9 — conditional task-first implementation (AC: 11, 12, 14)
  - [ ] Put current/next task in the first viewport and reduce mobile primary navigation to Today, Course, Focus, and More.
  - [ ] Keep RPG as default, optional, or retired strictly according to study evidence; implement the corresponding route behavior.
  - [ ] Meet WCAG 2.2 AA behavior, keyboard, focus, error, motion, forced-color, zoom/reflow, and target-size gates.
  - [ ] Complete three fresh five-person cohorts with all critical flows successful without intervention.
- [ ] Module 10 — final promotion and release (AC: 1–14)
  - [ ] Re-run all requirement evidence against one immutable commit with zero P0/P1 findings.
  - [ ] Promote the exact certified artifact, run production smoke tests three times, and validate rollback.
  - [ ] Create annotated tag `v1.3.0-local-first-proof` only after production evidence passes; never tag a failed artifact.
- [ ] Module 11 — field trial and product decision (AC: 12, 13, 14)
  - [ ] Run 8–12 learner repeated-session field trials using manual diaries/interviews and no telemetry, cloud AI, Google, or Gemini dependency.
  - [ ] Record one explicit outcome: retain, optional, remove, simplify, reopen form factor, or stop.
  - [ ] Authorize no further RPG expansion until that decision is evidence-supported.

## Dev Notes

### Non-negotiable product and data boundaries

- Browser-only, local-first, single-user, one browser profile; no backend, accounts, cloud sync, analytics, AI tutor, runtime course-data fetch, remote assets, or embedded external course content.
- Preserve Dexie database schema 2, backup envelope 1, all 14 stores, singleton IDs, current entity shapes, progress/XP/achievement rules, and explicit-write semantics.
- Classic remains the control/default until comparative evidence says otherwise.
- Do not add a PWA manifest or claim installability in this remediation.
- No new dependency is justified merely for convenience. Reuse the existing React, React Router, Dexie, Zod, Vitest, Playwright, and Vite stack.

### Release and testing guardrails

- Certification runtime: Node 24 LTS and npm 11. Local Node 22 results are diagnostic only until repeated on Node 24.
- Unit/integration execution must be process-contained. The inherited parallel Vitest command leaked 187 process trees on Windows; use a bounded single-worker policy until a separately proven safe worker configuration exists.
- Playwright runs the production build on owned port `42183`, rejects port reuse, verifies application identity, owns cleanup, and uses one worker.
- `100%` means every predefined check passed; it is not a claim of universal correctness.
- Each counted pass begins from an independent clean checkout of the same commit/tree/lockfile and runs `npm ci`. Any failure, warning, flag, skip, retry, flaky result, or file change resets the module pass count.

### Universal gate

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

### Evidence manifest minimum fields

- module and pass number;
- commit SHA and tree SHA;
- application version and lockfile SHA-256;
- OS, Node, npm, and browser versions;
- exact command, start/end timestamps, exit code, test count, warning/skip/retry count;
- deployment ID and artifact checksums when applicable;
- workflow/run URL when applicable;
- adversarial review findings, resolutions, reviewer, and retrospective decision.

### UX research decision thresholds

- Participants: 12 total—4 active, 4 stalled/returning, 4 mobile-primary; at least 2 accessibility users may overlap.
- Compare current classic, current RPG, task-first neutral, and a LibreOffice-compatible `.ods` spreadsheet.
- RPG default requires no critical regression, at most one extra noncritical failure, median task time no more than 10% slower, equal-or-better accessibility/trust, and either 20% faster next-action/resume, meaningful session-completion improvement, or two-thirds choosing it.
- RPG may remain optional only if non-inferior and at least 40% prefer it; classic stays default.
- Retire RPG for two or more additional critical failures, more than 20% slower task time, two users mistaking RPG status for official CS50 status, preference below 40% with no behavioral gain, or duplicated chrome/surfaces.
- Simplify or stop if neither app variant beats the spreadsheet by at least 15% on next-action/resume or supplies a material recovery advantage.
- If at least 5 of 12 say cross-device continuity is essential, stop and reopen the form-factor decision; cloud sync remains out of scope for this story.

### Authoritative references

- `docs/audits/progresspal-production-readiness-2026-07-11.md`
- `docs/remediation/sprint-change-proposal-2026-07-13.md`
- `docs/rpg-v2/MIGRATION_CONTRACT.md`
- `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md`
- `package.json`
- `playwright.config.ts`
- `scripts/run-e2e.mjs`
- `src/lib/backup/envelope.ts`
- `src/lib/db/repositories.ts`
- `public/sw.js`
- Official current references used for unstable CI/runtime details: Node.js 24 LTS release, GitHub Actions Node build guidance, and Playwright CI/trace guidance.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-13: inherited `npm test` timed out after 120 seconds and leaked 187 Codex-launched cmd/Node test trees (854 processes); contained cleanup removed them without touching direct Codex or unrelated user processes.
- 2026-07-13: `npx vitest run tests/lib/onboardingReturnPath.test.ts --maxWorkers=1 --no-file-parallelism` passed 10/10.
- 2026-07-13: full contained Vitest baseline passed 39/39 files and 367/367 tests.
- 2026-07-13: managed production Playwright baseline passed 31/31 cases.

### Completion Notes List

- Ultimate context analysis completed from the approved remediation roadmap, audit, current source, current specs, Git history, and official runtime/CI documentation.
- Work started on the release-foundation stage. No module is marked compliant until the canonical gate exists and all three counted passes succeed.

### File List

- `docs/remediation/3-1-v1-3-release-remediation.md`

### Change Log

- 2026-07-13: Created the comprehensive implementation story and recorded the contained-test baseline.
- 2026-07-13: Marked the story in progress; kept Module 0 open pending the release-foundation gate.
