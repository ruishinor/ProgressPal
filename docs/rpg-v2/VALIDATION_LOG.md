# ProgressPal RPG v2 Validation Log

Status: active validation and evidence log  
Created: 2026-06-20  
Scope: ProgressPal RPG v2 only  
Recommended repo path: `docs/rpg-v2/VALIDATION_LOG.md`  
Related files: `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md`, `docs/rpg-v2/DECISIONS-rpg-v2.md`, `docs/rpg-v2/modules/*.md`, `docs/rpg-v2/ASSETS.md`, `docs/rpg-v2/RISK_REGISTER.md`

## 0. Purpose

This file records validation evidence for RPG v2. It is not a place for optimistic summaries. It is where the project records what was actually checked, what passed, what failed, what was not run, and what still blocks implementation.

This file starts before RPG-00 implementation. It must not claim clean validation until commands have been run locally in the repository and the results are recorded.

## 1. Validation status labels

Use these exact labels:

```text
clean       = all required checks for this gate passed with no unresolved warnings, flags, or exceptions
partial     = some checks passed but one or more required checks were not run or could not complete
blocked     = one or more required checks failed or the repo/source-of-truth state prevents safe progress
not-run     = check has not been run
n/a         = check is not applicable to this module, with reason recorded
```

Do not use `clean` if:

```text
working tree is dirty without explanation
required file is missing
npm audit could not run
known warnings are ignored
network failure prevented a required check
only a subset of required tests ran
classic regression was skipped
asset ledger is missing for added assets
module handoff file is missing
```

## 2. Gate standards

### 2.1 RPG-00 baseline gate

RPG-00 is a reconciliation and documentation baseline. It must not change runtime code or package files.

RPG-00 requires:

```text
three consecutive clean full-validation passes, if the environment supports all checks
```

If a network-dependent check such as `npm audit` cannot run, RPG-00 is `partial`, not `clean`, until audit is completed.

RPG-00 must not edit:

```text
src/*
package.json
package-lock.json
vite config
service worker
IndexedDB schema
route definitions
runtime CSS
runtime assets
validation config
```

RPG-00 may create or edit only documentation and evidence files, unless the user explicitly approves otherwise:

```text
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
docs/rpg-v2/DECISIONS-rpg-v2.md
docs/rpg-v2/VALIDATION_LOG.md
docs/rpg-v2/ASSETS.md
docs/rpg-v2/RISK_REGISTER.md
docs/rpg-v2/modules/RPG-00-HANDOFF.md
```

### 2.2 Validation cadence by work type

Do not use three full validation passes as the default for every module. Validation cadence is proportional to risk.

```text
Normal module:
- targeted tests during development;
- one clean full `npm run validate` after final changes.

Corrective patch after a failed or partial module:
- targeted tests for the corrected gap;
- one clean full `npm run validate` after final changes;
- optionally two additional full validation passes only if the prior failure was flaky, environment-sensitive, or repeatedly reproduced.

Major gates:
- RPG-00 baseline: three consecutive clean full-validation passes, if the environment supports them.
- RPG-09 Week-4 vertical slice: three consecutive clean full-validation passes, if the environment supports them.
- RPG-15 release candidate: three consecutive clean full-validation passes, if the environment supports them.
```

A validation pass only validates the file state that existed when it ran. If files change after validation, rerun the required cadence for the final state.

### 2.3 Normal module gate

Normal implementation modules require:

```text
targeted tests for changed behavior during development
one clean full-validation pass after final changes
no ignored warnings
no unresolved audit issues
no missing handoff file
no missing Scope Discipline Check
source-of-truth reconciliation completed
warnings and anomalies classified
```

Flaky tests are defects. If a test is flaky, record it, investigate it, and rerun only after the cause is understood. Do not treat repeated reruns until green as evidence of correctness.

### 2.4 Corrective patch gate

Corrective patches after a failed, partial, or over-scoped module require:

```text
targeted tests for the corrected acceptance gap
one clean full-validation pass after final changes
updated handoff explaining what was corrected
updated validation log if evidence changed
updated risk register if risk changed
```

Run two additional full validation passes only when there is a concrete reason:

```text
prior failure was flaky
prior failure was environment-sensitive
prior failure was repeatedly reproduced
major gate confidence is being established
project owner explicitly requests extra confirmation
```

Do not use extra validation passes to compensate for unclear acceptance criteria, unclassified warnings, or uncommitted work.

### 2.5 Week-4 vertical slice integration gate

The first vertical slice gate requires:

```text
three consecutive clean full-validation passes
```

Required path:

```text
Hub -> Map -> Week 4 -> Study Resource -> save local progress -> Focus Session -> return to Hub
```

The slice gate must happen before profile, badge gallery, journey log, broad visual polish, or large asset work expands the surface.

### 2.6 Release candidate gate

The release candidate gate requires:

```text
three consecutive clean full-validation passes
```

Release candidate must also include:

```text
classic route regression
RPG route regression
backup/export/import/reset validation
offline cold boot
local-only architecture guard
asset provenance check
brand/copyright boundary review
keyboard navigation review
reduced-motion review
mobile/tablet/desktop layout review
```

## 3. Standard validation command sequence

Run from the repository root unless otherwise noted.

```powershell
git status -sb
git log --oneline --decorate -10
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit
```

If the repo has a combined command such as `npm run validate`, record the exact script contents or cite `package.json` and run:

```powershell
npm run validate
```

A combined command does not replace the need to understand which checks ran.

## 4. `npm audit` rule

If `npm run audit` cannot run because the environment has no network:

```text
Status: partial
Action: record the exact command, exact error, date/time, and environment limitation.
Restriction: do not call the gate clean.
Requirement: run audit before Week-4 slice gate and release candidate gate.
```

If audit reports moderate/high/critical:

```text
Status: blocked unless triaged
Required triage:
- package name
- severity
- production or dev/test-only
- direct or transitive
- affected command/runtime
- fix available yes/no
- chosen action
- decision or validation note
```

## 5. Warning and anomaly classification

Warnings must be classified. Do not call a gate clean if a relevant warning is ignored.

Use this template whenever a command emits a warning or non-fatal anomaly:

```text
Warning/anomaly:
- Command:
- Exact warning:
- Classification: code blocker / environment warning / harmless but noted
- Action taken:
- Does it affect clean validation claim: yes/no
- Reason:
```

Examples:

```text
Git global ignore permission warning:
- likely environment warning if repo-local git behavior and validation are unaffected;
- still record it in the validation log or handoff.

Build-size warning:
- not automatically a blocker;
- classify against asset/bundle-size risk and record follow-up if needed.

Network failure during `npm audit`:
- not clean;
- status is partial until audit runs or a decision records accepted deferral.
```

## 6. Source-of-truth reconciliation checklist

RPG-00 must complete this before RPG-01 starts.

| Check                                                                |  Status | Evidence / notes                                                                |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------------------- |
| `docs/rpg-v2/` exists                                                | not-run |                                                                                 |
| Roadmap installed at `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md` | not-run |                                                                                 |
| RPG v2 decisions installed at `docs/rpg-v2/DECISIONS-rpg-v2.md`      | not-run |                                                                                 |
| Validation log installed at `docs/rpg-v2/VALIDATION_LOG.md`          | not-run |                                                                                 |
| Asset ledger created at `docs/rpg-v2/ASSETS.md`                      | not-run |                                                                                 |
| Risk register created at `docs/rpg-v2/RISK_REGISTER.md`              | not-run |                                                                                 |
| Module handoff directory created at `docs/rpg-v2/modules/`           | not-run |                                                                                 |
| Root `DECISIONS.md` deletion reconciled intentionally                | not-run | Do not restore blindly. Commit deletion or document replacement.                |
| Older roadmap drafts archived or marked superseded                   | not-run |                                                                                 |
| BMAD artifacts role defined                                          | not-run | Decide: formal BMAD folders required, or roadmap is accepted planning artifact. |

## 7. Branch and git baseline checklist

| Check                                               |  Status | Evidence / notes                                                                                    |
| --------------------------------------------------- | ------: | --------------------------------------------------------------------------------------------------- |
| Current branch identified                           | not-run |                                                                                                     |
| Freeze tag `v0.21.0-ux-complete` exists             | not-run |                                                                                                     |
| `HEAD` relation to freeze tag recorded              | not-run |                                                                                                     |
| `rpg/v2` branch exists or creation plan recorded    | not-run |                                                                                                     |
| `v1-maintenance` branch exists or deferral recorded | not-run |                                                                                                     |
| Working tree clean or intentional changes listed    | not-run |                                                                                                     |
| Git permission warnings checked                     | not-run | External audit previously reported warning for `C:\Users\alex_/.config/git/ignore`; verify locally. |

## 8. Baseline validation pass log

Use this section for RPG-00 baseline passes.

### Baseline pass 1

- Date/time:
- Branch:
- Commit:
- Operator/agent:
- Status: not-run

| Command                            |  Status | Output summary / failure |
| ---------------------------------- | ------: | ------------------------ |
| `git status -sb`                   | not-run |                          |
| `git log --oneline --decorate -10` | not-run |                          |
| `npm run lint`                     | not-run |                          |
| `npm run format:check`             | not-run |                          |
| `npm run typecheck`                | not-run |                          |
| `npm run build`                    | not-run |                          |
| `npm run test`                     | not-run |                          |
| `npm run test:e2e`                 | not-run |                          |
| `npm run check:circular`           | not-run |                          |
| `npm run audit`                    | not-run |                          |

Notes:

```text

```

### Baseline pass 2

- Date/time:
- Branch:
- Commit:
- Operator/agent:
- Status: not-run

| Command                            |  Status | Output summary / failure |
| ---------------------------------- | ------: | ------------------------ |
| `git status -sb`                   | not-run |                          |
| `git log --oneline --decorate -10` | not-run |                          |
| `npm run lint`                     | not-run |                          |
| `npm run format:check`             | not-run |                          |
| `npm run typecheck`                | not-run |                          |
| `npm run build`                    | not-run |                          |
| `npm run test`                     | not-run |                          |
| `npm run test:e2e`                 | not-run |                          |
| `npm run check:circular`           | not-run |                          |
| `npm run audit`                    | not-run |                          |

Notes:

```text

```

### Baseline pass 3

- Date/time:
- Branch:
- Commit:
- Operator/agent:
- Status: not-run

| Command                            |  Status | Output summary / failure |
| ---------------------------------- | ------: | ------------------------ |
| `git status -sb`                   | not-run |                          |
| `git log --oneline --decorate -10` | not-run |                          |
| `npm run lint`                     | not-run |                          |
| `npm run format:check`             | not-run |                          |
| `npm run typecheck`                | not-run |                          |
| `npm run build`                    | not-run |                          |
| `npm run test`                     | not-run |                          |
| `npm run test:e2e`                 | not-run |                          |
| `npm run check:circular`           | not-run |                          |
| `npm run audit`                    | not-run |                          |

Notes:

```text

```

## 9. IndexedDB and backup evidence

Because RPG v2 shares the same origin and database as v1, read-only screens must prove they do not mutate data.

### 8.1 Manual v1 backup evidence

- Date/time:
- Branch:
- Commit:
- Backup filename:
- Backup created through app UI: not-run
- Backup import tested: not-run
- Notes:

```text

```

### 8.2 Deterministic test fixture evidence

- Fixture name/path:
- Created in module:
- Covers:
  - learner profile: not-run
  - course units/items: not-run
  - progress entries: not-run
  - study sessions: not-run
  - XP transactions: not-run
  - achievement unlocks: not-run
  - backups: not-run
- Notes:

```text

```

### 8.3 Read-only mutation assertion template

Use for read-only routes.

| Module | Route/screen                | Pre-state method                                 | Post-state method                                       | Mutation expected |  Result | Notes                                                                                                                                                                          |
| ------ | --------------------------- | ------------------------------------------------ | ------------------------------------------------------- | ----------------: | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RPG-02 | `/rpg` shell routes         | `getDatabaseSnapshot()` before route render loop | `getDatabaseSnapshot()` after each passive route render |                no |    pass | `tests/app/App.test.tsx` covers `/rpg`, `/rpg/map`, `/rpg/week/week-4`, `/rpg/resource/week-0-lecture`, `/rpg/focus`, `/rpg/hero`, `/rpg/badges`, `/rpg/log`, `/rpg/settings`. |
| RPG-03 | `/rpg` Hub                  | not-run                                          | not-run                                                 |                no | not-run | Future full hub implementation module.                                                                                                                                         |
| RPG-04 | `/rpg/map` Campaign Map     | not-run                                          | not-run                                                 |                no | not-run | Future full map implementation module.                                                                                                                                         |
| RPG-09 | `/rpg/badges` Badge Gallery | not-run                                          | not-run                                                 |                no | not-run |                                                                                                                                                                                |
| RPG-10 | `/rpg/log` Journey Log      | not-run                                          | not-run                                                 |                no | not-run |                                                                                                                                                                                |

## 10. Classic route regression evidence

Classic routes must remain behaviorally and visually stable while RPG routes are added.

Required viewports:

```text
390px mobile
768px tablet
1280px desktop
```

Required routes:

```text
/dashboard
/course
/course/:itemId with known fixture
/sessions
/achievements
/insights
/settings
```

Pass standard:

```text
no missing content
no changed destructive-action wording
no altered classic navigation hierarchy
no visual breakage introduced by RPG CSS
no RPG styling leaking into classic routes
backup/import/reset semantics unchanged
offline cold boot unchanged
```

| Module   | Route             |   390px |   768px |  1280px |  Result | Notes |
| -------- | ----------------- | ------: | ------: | ------: | ------: | ----- |
| Baseline | `/dashboard`      | not-run | not-run | not-run | not-run |       |
| Baseline | `/course`         | not-run | not-run | not-run | not-run |       |
| Baseline | `/course/:itemId` | not-run | not-run | not-run | not-run |       |
| Baseline | `/sessions`       | not-run | not-run | not-run | not-run |       |
| Baseline | `/achievements`   | not-run | not-run | not-run | not-run |       |
| Baseline | `/insights`       | not-run | not-run | not-run | not-run |       |
| Baseline | `/settings`       | not-run | not-run | not-run | not-run |       |

## 11. RPG route validation evidence

| Module | Route                   | Expected status                    | Result | Notes                                                                                        |
| ------ | ----------------------- | ---------------------------------- | -----: | -------------------------------------------------------------------------------------------- |
| RPG-02 | `/rpg`                  | shell renders                      |   pass | Covered by `tests/app/App.test.tsx`; renders in `RpgShell` with bottom nav.                  |
| RPG-02 | `/rpg/map`              | shell renders                      |   pass | Covered by `tests/app/App.test.tsx`; renders in `RpgShell` with bottom nav.                  |
| RPG-02 | `/rpg/week/:unitId`     | shell renders or valid empty state |   pass | Covered by `tests/app/App.test.tsx` with `/rpg/week/week-4` and not-found state.             |
| RPG-02 | `/rpg/resource/:itemId` | shell renders or valid empty state |   pass | Covered by `tests/app/App.test.tsx` with `/rpg/resource/week-0-lecture` and not-found state. |
| RPG-02 | `/rpg/focus`            | shell renders                      |   pass | Stub shell route only.                                                                       |
| RPG-02 | `/rpg/hero`             | shell renders                      |   pass | Stub shell route only.                                                                       |
| RPG-02 | `/rpg/badges`           | shell renders                      |   pass | Stub shell route only.                                                                       |
| RPG-02 | `/rpg/log`              | shell renders                      |   pass | Stub shell route only.                                                                       |
| RPG-02 | `/rpg/settings`         | shell renders                      |   pass | Stub shell route only.                                                                       |

## 12. Week-4 vertical slice gate

Do not expand into profile, badge gallery, journey log, broad visual polish, or large asset work before this gate passes.

Required path:

```text
Hub -> Map -> Week 4 -> Study Resource -> save local progress -> Focus Session -> return to Hub
```

### Slice pass 1

- Date/time:
- Branch:
- Commit:
- Status: not-run
- Result summary:

```text

```

### Slice pass 2

- Date/time:
- Branch:
- Commit:
- Status: not-run
- Result summary:

```text

```

### Slice pass 3

- Date/time:
- Branch:
- Commit:
- Status: not-run
- Result summary:

```text

```

## 13. Module handoff index

Every module must create a durable handoff file in `docs/rpg-v2/modules/`.

| Module | Handoff path                            |  Status | Notes                            |
| ------ | --------------------------------------- | ------: | -------------------------------- |
| RPG-00 | `docs/rpg-v2/modules/RPG-00-HANDOFF.md` | not-run |                                  |
| RPG-01 | `docs/rpg-v2/modules/RPG-01-HANDOFF.md` | not-run |                                  |
| RPG-02 | `docs/rpg-v2/modules/RPG-02-HANDOFF.md` |    pass | Includes Scope Discipline Check. |
| RPG-03 | `docs/rpg-v2/modules/RPG-03-HANDOFF.md` |    pass | Includes Scope Discipline Check. |
| RPG-04 | `docs/rpg-v2/modules/RPG-04-HANDOFF.md` | not-run |                                  |
| RPG-05 | `docs/rpg-v2/modules/RPG-05-HANDOFF.md` | not-run |                                  |
| RPG-06 | `docs/rpg-v2/modules/RPG-06-HANDOFF.md` | not-run |                                  |
| RPG-07 | `docs/rpg-v2/modules/RPG-07-HANDOFF.md` | not-run |                                  |
| RPG-08 | `docs/rpg-v2/modules/RPG-08-HANDOFF.md` | not-run |                                  |
| RPG-09 | `docs/rpg-v2/modules/RPG-09-HANDOFF.md` | not-run |                                  |
| RPG-10 | `docs/rpg-v2/modules/RPG-10-HANDOFF.md` | not-run |                                  |
| RPG-11 | `docs/rpg-v2/modules/RPG-11-HANDOFF.md` | not-run |                                  |
| RPG-12 | `docs/rpg-v2/modules/RPG-12-HANDOFF.md` | not-run |                                  |
| RPG-13 | `docs/rpg-v2/modules/RPG-13-HANDOFF.md` | not-run |                                  |
| RPG-14 | `docs/rpg-v2/modules/RPG-14-HANDOFF.md` | not-run |                                  |

## 14. Scope Discipline Check template

Every module handoff must include this.

```text
Scope Discipline Check
- Intended module:
- Work mode: Acceptance audit only / Corrective patch / Next-module implementation:
- Files changed:
- Why each changed file was necessary:
- What was deliberately not added:
- New dependencies: none / list and justify:
- New assets: none / list asset IDs from ASSETS.md:
- New storage/schema: none / decision ID:
- Runtime network behavior changed: no / decision ID:
- Classic route behavior changed: no / explain and cite decision:
- Source-of-truth reconciliation: no conflicts / list resolved conflicts:
- Warnings and anomalies: none / list classifications:
- Validation cadence used: normal / corrective / major gate:
- Commit status: committed / uncommitted local work:
- Any deferred tempting work:

Anti-overbuild questions answered:
1. Does this need to be here?
2. Is this required to reach the intended endstate for this module?
3. Is this required by the roadmap, an accepted decision, or a failing test?
4. Does this preserve the v1 engine contract?
5. Does this preserve same-origin /rpg/*, no backend, no schema change, no embedded video, and Level 1 local-first?
6. Does this introduce a dependency, asset, runtime request, store, preference, or abstraction the current module did not ask for?
7. Can this be done with existing code, existing styles, existing data, or a smaller local component?
8. Would a future maintainer understand why this was necessary from the module acceptance criteria alone?
```

## 15. Known external audit observations to verify locally

These are not accepted facts until verified in the repo. They come from an external AI audit and must be checked during RPG-00.

| Observation                                                                |  Status | Required action                                                                    |
| -------------------------------------------------------------------------- | ------: | ---------------------------------------------------------------------------------- |
| Canonical roadmap was outside repo in Downloads                            | not-run | Install roadmap at `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md`.                |
| `docs/rpg-v2/` reportedly did not exist                                    | not-run | Create and verify.                                                                 |
| `git status -sb` reportedly showed `D DECISIONS.md`                        | not-run | Confirm deletion is intentional and reconcile git state.                           |
| Git emitted permission warning for user git ignore                         | not-run | Verify whether still present and whether it affects validation.                    |
| `_bmad-output/planning-artifacts` reportedly empty                         | not-run | Decide whether BMAD folders are required or roadmap is accepted planning artifact. |
| `_bmad-output/implementation-artifacts` reportedly empty                   | not-run | Not blocker unless formal BMAD governance is chosen.                               |
| `package.json` reportedly contains validation scripts including `validate` | not-run | Verify exact scripts.                                                              |

## 16. RPG-00 readiness verdict

Current status: not-run

RPG-01 may not begin until:

```text
1. Source-of-truth files exist in docs/rpg-v2/.
2. Root DECISIONS.md deletion is reconciled intentionally.
3. Branch/freeze/tag state is recorded.
4. Validation gate standard is recorded.
5. Baseline validation has been run and recorded.
6. Asset ledger and risk register exist.
7. Module handoff directory exists.
8. RPG-00-HANDOFF.md exists.
```

## 17. RPG-00 handoff starter

Create this file after RPG-00 work:

```text
docs/rpg-v2/modules/RPG-00-HANDOFF.md
```

Suggested content:

```markdown
# RPG-00 Handoff — Baseline Reconciliation

## Goal

Establish the source-of-truth files, reconcile repo state, and validate the baseline without runtime/package changes.

## Files changed

- docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
- docs/rpg-v2/DECISIONS-rpg-v2.md
- docs/rpg-v2/VALIDATION_LOG.md
- docs/rpg-v2/ASSETS.md
- docs/rpg-v2/RISK_REGISTER.md
- docs/rpg-v2/modules/RPG-00-HANDOFF.md

## Runtime/package changes

None.

## Git state

- Branch:
- Commit:
- Freeze tag:
- Root DECISIONS.md deletion reconciled:

## Validation

Paste command summaries from VALIDATION_LOG.md.

## Scope Discipline Check

Paste completed check.

## Next module readiness

RPG-01 may begin: yes/no
Reason:
```

## RPG-01b avatar asset patch validation

Branch: `rpg/01b-character-avatar-asset`

Summary:

- Replaced generated SVG learner avatar preview with bundled RPG-style profile portrait.
- Added resized local PNG.
- Added generated inline data URL module to avoid offline image-request failures.
- Rounded the avatar frame so the portrait behaves like a profile medallion.

Validation:

- `npm run build`: pass.
- Targeted offline E2E: `npx playwright test e2e/dashboard.spec.ts -g "survives local storage reset"`: pass.
- `npm run validate`: pass.
- Unit/integration tests: 36 files, 266 tests passed.
- E2E tests: 24 passed.
- Circular dependency check: pass.
- Audit: 0 vulnerabilities.

Warnings and anomalies:

- `git diff --check` emitted LF-to-CRLF normalization warnings on Windows. Classification: environment/line-ending warning, non-blocking. No whitespace errors after Prettier.
- `npm run test` emitted transient Dexie `DatabaseClosedError` stderr during `tests/app/App.test.tsx`, while all tests passed. Classification: test-environment/teardown warning, non-blocking for RPG-02. Monitor if it becomes reproducible failure or affects new RPG route tests.

Notes:

- The public image-path version failed offline navigation with `net::ERR_INTERNET_DISCONNECTED` for `/assets/character-profile.png`.
- Final implementation avoids that runtime request by importing `CHARACTER_PROFILE_ASSET` from `characterProfileAsset.ts`.

## RPG-03 visual primitives validation

Branch: `rpg/03-rpg-visual-primitives`

Summary:

- Added `.rpg-shell`-scoped RPG visual tokens.
- Added scoped RPG primitive CSS.
- Added presentation-only RPG primitives for the near-term Week-4 slice.
- Added tests for semantic rendering, progress ARIA, DOM text, no image dependency, scoped token definitions, and no CSS remote/image asset references.

Validation:

- `npm run lint`: pass.
- `npm run typecheck`: pass after elevated rerun for TypeScript tsbuildinfo write access.
- `npm run test -- tests/features/rpg/components.test.tsx`: pass; 1 file, 7 tests.
- `npm run test -- tests/features/rpg/components.test.tsx tests/app/App.test.tsx tests/architecture/routeDefinitions.test.ts`: pass; 3 files, 75 tests.
- `npm run format:check`: pass after formatting Prettier-flagged committed RPG v2 files.
- `git diff --check`: pass; emitted LF-to-CRLF environment warnings only.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 284 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. It does not affect repo-local diff/status readability.
- Initial `npm run typecheck` could not write `node_modules/.tmp/tsconfig.app.tsbuildinfo` in sandbox. Classification: environment/sandbox warning. Reran with elevated filesystem access and passed.
- Initial targeted Vitest run could not write Vite temp config under `node_modules/.vite-temp` in sandbox. Classification: environment/sandbox warning. Reran with elevated filesystem access and passed.
- First `npm run format:check` found existing Prettier failures in committed RPG v2 docs/route-shell files. Classification: validation blocker until reconciled. Formatted the exact flagged files; subsequent `npm run format:check` passed.
- Final `git diff --check` emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. The command exited 0 with no whitespace errors.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct Dexie/database access from RPG UI components.
