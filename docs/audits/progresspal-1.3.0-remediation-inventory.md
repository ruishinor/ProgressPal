# ProgressPal v1.3.0 Remediation Inventory

Captured: 2026-07-13 (Europe/Oslo)

Branch: `cx/release-1.3.0-remediation`

Baseline commit: `67ed6af836ec46f136bc5622aa68c8745c8bcf40`

Baseline tree: `160c7bf304bdd77b585af185f24e537ea9e2c2bd`

Baseline lockfile SHA-256: `13837540B58EDF49800B03834B40B2AF2559F7DC8139D37BE61316A17109B88F`

Starting branch: `master`; remote default: `origin/master`

Runtime observed: Node `v22.14.0`, npm `11.10.1`

Git line endings observed: global `core.autocrlf=true`; no repository `.gitattributes`; Prettier `endOfLine: auto`.

## Preservation rule

The inherited dirty worktree is user/project work. Do not run `git reset`, `git clean`, `git restore`, or any destructive equivalent. All remediation continues on the isolated branch and every inherited path remains attributable.

## Release/tag state

- `v1.2.0-local-first-proof` exists at `62354ee`.
- `v1.2.1-local-first-proof` exists at `9d8646f` and is an ancestor of the baseline.
- Both historical tags embed package application version `0.1.0`; current dirty metadata says `1.2.0`.
- Historical tags are immutable. The remediation target is the backward-compatible feature release `1.3.0`, with a prospective tag `v1.3.0-local-first-proof` only after final certification.

## Inherited change classification

| Area                                      | Paths                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Classification                                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release identity and active documentation | `README.md`, `docs/releases/v1.2.0-local-first-proof.md`, `docs/rpg-v2/MIGRATION_CONTRACT.md`, `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md`, `docs/rpg-v2/VISUAL_TARGET.md`, `package.json`, `package-lock.json`                                                                                                                                                                                                                                         | Previously implemented stabilization work; release identity is now stale because `v1.2.1` already exists and post-tag user-visible work is present.              |
| Managed E2E and evidence                  | `playwright.config.ts`, `playwright.managed.config.ts`, `scripts/run-e2e.mjs`, `e2e/accessibility.spec.ts`, `e2e/offline.spec.ts`, `e2e/release-candidate.spec.ts`, `e2e/settings.spec.ts`, `e2e/support/onboarding.ts`                                                                                                                                                                                                                                     | Preserve. Baseline passed 31/31; failure artifact policy and cross-browser coverage remain incomplete.                                                           |
| First-use, routing, and shared RPG state  | `src/app/shell/AppShell.tsx`, `src/app/shell/RpgRouteShell.tsx`, `src/features/profile/routes/OnboardingPage.tsx`, `src/features/rpg/components/RpgButton.tsx`, `src/features/rpg/components/RpgResourceCard.tsx`, `src/features/rpg/routes/RpgFocusPage.tsx`, `src/features/rpg/routes/RpgResourcePage.tsx`, `src/features/rpg/shell/RpgShell.tsx`, `src/features/sessions/components/StudySessionsSurface.tsx`, `src/lib/routing/onboardingReturnPath.ts` | Preserve. Focused functional correction already has tests; wider route/idempotency/passive-read evidence remains.                                                |
| Atomic recovery and backup validation     | `src/lib/backup/envelope.ts`, `src/lib/backup/index.ts`, `src/lib/db/repositories.ts`                                                                                                                                                                                                                                                                                                                                                                       | Preserve. Schema 2/envelope 1 contract must remain unchanged. Historical fixtures, concurrency, and browser storage failure evidence remain.                     |
| Test support and regression coverage      | `src/lib/testing/renderAppAtRoute.tsx`, `tests/app/App.test.tsx`, `tests/db/databaseInitialization.test.ts`, `tests/db/repositories.test.ts`, `tests/features/profile/`, `tests/features/rpg/components.test.tsx`, `tests/lib/backup.test.ts`, `tests/lib/onboardingReturnPath.test.ts`, `vitest.setup.ts`                                                                                                                                                  | Preserve. Baseline passed 367/367 only after containing Vitest to one worker.                                                                                    |
| Audit evidence                            | `docs/audits/progresspal-production-readiness-2026-07-11.md`                                                                                                                                                                                                                                                                                                                                                                                                | Preserve and track. It honestly distinguishes local candidate evidence from production certification, but later release-wide work supersedes its `1.2.0` target. |

Starting semantic diff: 32 modified tracked files, 1,518 insertions, 149 deletions, plus six untracked path groups.

## Baseline verification

| Check                         | Result                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ls --depth=0`            | Pass; direct dependency tree valid.                                                                                                                        |
| Default `npm test`            | Fail; timed out after 120 seconds before executing a test and leaked process trees. This invalidates the inherited unconstrained runner as a release gate. |
| Contained targeted Vitest     | Pass; 1/1 file, 10/10 tests.                                                                                                                               |
| Contained full Vitest         | Pass; 39/39 files, 367/367 tests in 164.27 seconds.                                                                                                        |
| Managed production Playwright | Pass; 31/31 cases in 52.2 seconds.                                                                                                                         |

## First adversarial retrospective

- What appeared complete but was not: large prior pass counts did not prove the default unit command was safe or reproducible in the current process environment.
- Root cause: validation focused on assertion outcomes, not process containment. The default parallel runner could leak children after the controlling command timed out.
- Corrective rule: a release gate must prove termination and cleanup as well as assertions. Unit execution is single-worker until a bounded alternative passes the same containment test three consecutive times.
- Opportunity cost rejected: do not start visual expansion while release identity, CI provenance, service-worker upgrade behavior, concurrency, and product evidence remain unsettled.
