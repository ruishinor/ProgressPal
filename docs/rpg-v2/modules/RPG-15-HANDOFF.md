# RPG-15 Handoff - Release Candidate

## 2026-06-23 Classification Note

RPG-15 remains useful release-candidate evidence, but it should not be read as proof that the fully realized RPG v2 shell is complete. The current app is now classified for release as `ProgressPal CS50 Edition v1.2 - local-first CS50 tracker proof with gamified elements`, with recommended tag `v1.2.0-local-first-proof`.

The next implementation phase should begin after this freeze from a clean branch and focus on shell transformation: persistent Hero HUD, collapsed/detail panels, quest-first loop, reward feedback, asset foundation, and campaign-map redesign.

## Module and Goal

RPG-15 - Classic regression and release candidate.

Goal: prove RPG v2 can coexist with classic ProgressPal safely. This is a release-candidate validation module, not a feature-building module.

Branch: `rpg/15-release-candidate`.

Base: `f6552fc Merge pull request #22 from ruishinor/rpg/14-asset-pass-visual-polish`.

## Initial Evidence

- `git status -sb`: branch `rpg/15-release-candidate`; clean at inspection; emitted the existing global-ignore permission warning.
- `git log --oneline --decorate -5`: `f6552fc (HEAD -> rpg/15-release-candidate, origin/rpg/v2, rpg/v2) Merge pull request #22 from ruishinor/rpg/14-asset-pass-visual-polish`; `cfe4ee2 rpg-14: polish RPG visuals and approved assets`; `62fcd02 Merge pull request #21 from ruishinor/rpg/13-rpg-settings-faq-backup-trust`; `d8319f5 rpg-13: add RPG settings FAQ and backup trust copy`; `1d082ce Merge pull request #20 from ruishinor/rpg/12-rpg-hero-profile`.
- `git diff --name-status`: no output.
- `git diff --stat`: no output.
- `git diff --check`: no output.

## Files Changed

- `src/styles/rpg-shell.css`
- `e2e/release-candidate.spec.ts`
- `docs/rpg-v2/modules/RPG-15-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `src/styles/rpg-shell.css`: fixes a proven 390px mobile horizontal overflow in the RPG bottom navigation by matching the mobile negative margin to the mobile shell padding.
- `e2e/release-candidate.spec.ts`: adds a release-candidate route/layout guard for required classic and RPG routes across mobile, tablet, and desktop viewports.
- `docs/rpg-v2/modules/RPG-15-HANDOFF.md`: records the release-candidate gate, failed checks, correction, warnings, and release decision.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-15 evidence and updates the module handoff index.

## Corrective Action

The first reliable viewport route smoke found a real layout flag:

- Route: `/rpg`
- Viewport: 390 x 844 mobile
- Result: `mobile horizontal overflow 4 at /rpg`
- Classification: release-candidate layout blocker until corrected.

Root cause: at mobile widths, `.shell-root` uses `--space-3` padding, while `.rpg-bottom-nav` still used `--space-4` negative margins. The nav extended 4px beyond the viewport.

Correction:

- Changed mobile `.rpg-bottom-nav` margin from `calc(var(--space-4) * -1)` to `calc(var(--space-3) * -1)`.
- Added `e2e/release-candidate.spec.ts` so the named routes are checked for horizontal overflow across mobile, tablet, and desktop.

## Release-Candidate Checks

### Classic route regression

Covered by `tests/app/App.test.tsx`, `tests/architecture/routeDefinitions.test.ts`, and `e2e/release-candidate.spec.ts`.

Routes checked:

- `/`
- `/dashboard`
- `/course`
- `/course/week-0-lecture`
- `/sessions`
- `/achievements`
- `/insights`
- `/settings`

Evidence:

- `npm run test -- tests/app/App.test.tsx tests/architecture/routeDefinitions.test.ts tests/architecture/localOnly.test.ts tests/architecture/rpgFeature.test.ts tests/lib/backup.test.ts`: pass; 5 files, 111 tests.
- `npx playwright test e2e/release-candidate.spec.ts e2e/settings.spec.ts e2e/accessibility.spec.ts e2e/offline.spec.ts`: pass; 11 tests.

### RPG route regression

Covered by `tests/app/App.test.tsx`, `tests/architecture/routeDefinitions.test.ts`, and `e2e/release-candidate.spec.ts`.

Routes checked:

- `/rpg`
- `/rpg/map`
- `/rpg/week/week-4`
- `/rpg/resource/week-0-lecture`
- `/rpg/focus`
- `/rpg/hero`
- `/rpg/badges`
- `/rpg/log`
- `/rpg/settings`

Evidence:

- App route tests cover passive no-mutation behavior across RPG routes.
- The new release-candidate Playwright spec checks route readiness and horizontal overflow across mobile, tablet, and desktop viewports.
- Focus route without a query intentionally resolves to the "No task selected" state.

### Data checks

Covered by `tests/lib/backup.test.ts`, `tests/app/App.test.tsx`, `e2e/settings.spec.ts`, and `e2e/offline.spec.ts`.

Evidence:

- Backup envelope tests passed in the targeted Vitest set.
- `e2e/settings.spec.ts` passed export, reset, onboarding restore, settings import, and invalid-import-no-mutation checks.
- `e2e/offline.spec.ts` passed backup export/reset/import while the service worker was active.
- No backup/export/import/reset implementation changed.

### Local-first and privacy checks

Covered by `tests/architecture/localOnly.test.ts`, `tests/architecture/rpgFeature.test.ts`, `e2e/offline.spec.ts`, source inspection, and validation.

Result:

- No backend.
- No account/auth.
- No cloud sync.
- No analytics/telemetry.
- No runtime external assets.
- No embedded external media.
- Official links remain user-clicked anchors only.

### Asset and brand checks

Covered by `docs/rpg-v2/ASSETS.md`, `tests/architecture/rpgFeature.test.ts`, and source inspection.

Result:

- No new assets.
- No `src/features/rpg/assets/` production asset import.
- No wholesale asset import.
- RPG CSS guard still blocks CSS imports, remote CSS asset URLs, and inline CSS data-URL blobs.
- Asset ledger remains coherent: concrete RPG production assets are still planned, not approved.
- No official-looking CS50, Harvard, edX, OpenCourseWare, shield, trophy, or institutional marks were added.

### Accessibility and layout checks

Covered by `e2e/accessibility.spec.ts` and `e2e/release-candidate.spec.ts`.

Result:

- Keyboard focus indicator checks passed.
- Reduced-motion checks passed.
- Mobile/tablet/desktop route layout checks passed.
- The found mobile RPG overflow was corrected and covered by the new RC spec.

## Validation

Targeted validation after the corrective CSS/test changes:

- `npx prettier --write src/styles/rpg-shell.css e2e/release-candidate.spec.ts`: pass.
- `npx playwright test e2e/release-candidate.spec.ts`: pass; 1 test.
- `npm run test -- tests/app/App.test.tsx tests/architecture/routeDefinitions.test.ts tests/architecture/localOnly.test.ts tests/architecture/rpgFeature.test.ts tests/lib/backup.test.ts`: pass; 5 files, 111 tests.
- `npx playwright test e2e/release-candidate.spec.ts e2e/settings.spec.ts e2e/accessibility.spec.ts e2e/offline.spec.ts`: pass; 11 tests.

Final validation after documentation update:

- Initial validation blocked by Prettier on committed RPG-14 files.
- Formatter reconciliation was performed on the exact flagged files.
- One later full validation passed, then a subsequent run failed in Playwright.
- Failure was traced to the new RC test being too broad as one 51-route-navigation test.
- RC test was split into one test per viewport.
- Targeted RC/settings/XP tests passed.
- Full E2E passed with 27 tests.
- Three consecutive full npm run validate passes then passed.

## Warning and Anomaly Classification

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`.
  - Classification: environment warning.
  - Impact: repo-local status and diffs remained readable.

- First ad hoc viewport smoke failed with `spawn EINVAL`.
  - Classification: tooling command-launch issue.
  - Action: retried with a Windows shell invocation.
  - Impact: no product conclusion drawn from that failed attempt.

- Second ad hoc viewport smoke timed out during onboarding setup.
  - Classification: test-script synchronization issue.
  - Action: reran with explicit onboarding navigation/waiting.
  - Impact: no product conclusion drawn from that failed attempt.

- Adjusted ad hoc viewport smoke found `mobile horizontal overflow 4 at /rpg`.
  - Classification: real release-candidate layout blocker.
  - Action: corrected mobile RPG bottom-nav margin and added a Playwright regression guard.
  - Impact: clean release claim blocked until the corrected checks passed.

- One diagnostic smoke timed out before printing overflow details.
  - Classification: tooling/server lifecycle issue in the one-off script.
  - Action: replaced ad hoc smoke with a normal Playwright spec using the repo's existing webServer lifecycle.
  - Impact: no product conclusion drawn from the timeout.

- A combined `npx prettier ... && npx playwright ...` command failed because this PowerShell version does not accept `&&`.
  - Classification: shell syntax issue.
  - Action: reran the commands separately.
  - Impact: no validation work ran in the failed combined command.

- Early versions of `e2e/release-candidate.spec.ts` failed on route-readiness selectors and parallel memory pressure.
  - Classification: new-test implementation issues.
  - Action: tightened exact heading matching, corrected the `/rpg/focus` ready state, increased async route wait, and made viewport checks sequential.
  - Impact: no clean validation claim was made until the corrected spec passed.

## Adversarial Review

- Risk: RPG v2 may have broken classic fallback routes. Evidence: classic routes are covered by App tests, route-definition tests, and the new viewport route guard.
- Risk: RPG route rendering could mutate local stores. Evidence: App tests compare snapshots for passive RPG route navigation.
- Risk: backup/export/import/reset semantics could have changed unnoticed. Evidence: settings and offline E2E recovery loops passed; no backup code changed.
- Risk: CSS visual polish from RPG-14 could have introduced mobile layout regressions. Evidence: it did; `/rpg` overflowed by 4px at 390px. The fix is scoped and now guarded.
- Risk: adding RC tests could become broad test churn. Mitigation: one Playwright spec only; it checks required route fit/readiness and does not duplicate detailed semantics already covered elsewhere.
- Risk: release candidate could hide privacy/network regressions. Evidence: local-only and RPG CSS asset architecture guards passed; audit passed during full validation.

## Retrospective

The release candidate did its job: it found a small but real mobile layout defect that previous desktop-oriented E2E coverage did not catch. The defect was not data-corrupting, but it was a release-readiness failure because horizontal overflow on the RPG hub would be visible to mobile users.

The main correction was not to expand product scope. The correct response was one CSS line plus one targeted RC guard. That keeps the release candidate as validation work rather than turning it into another feature module.

## Risk Review

1. Work mode: release-candidate validation with one corrective patch.
2. New product risk introduced: low; one mobile CSS fix and one E2E guard.
3. Existing risk severity changed: no.
4. Risk mitigated: R-002 and R-018 are further mitigated by explicit classic/RPG route viewport coverage.
5. Accepted risk: R-007 remains accepted v2 risk; no change.
6. Source-of-truth inconsistencies: checked-in roadmap ordering may still be stale; branch request and merged history were used as current truth.
7. Warnings/anomalies: classified above and in the validation log.
8. Implementation/evidence status: corrective patch, tests, handoff, and validation log are implemented locally; targeted checks, full E2E, and three consecutive local full validation passes completed after the RC test split.
9. Blocking risk for release: none identified after three consecutive local full validation passes.

## Source-of-Truth Reconciliation

- Attached module request: RPG-15 is Classic regression and release candidate.
- Current branch: `rpg/15-release-candidate`.
- Actual merged history: RPG-10 Journey Log, RPG-11 Badge Gallery, RPG-12 Hero/Profile, RPG-13 Settings/FAQ, RPG-14 Asset pass and visual polish.
- Expected base matched: `f6552fc Merge pull request #22 from ruishinor/rpg/14-asset-pass-visual-polish`.
- Resolution used: branch request and merged git history are treated as current module truth.
- Explicit deferrals: no new assets, no route redesign, no backup behavior changes, no storage/schema changes, no package changes, and no risk-register status change.

## Scope Discipline Check

- Intended module: RPG-15 - Classic regression and release candidate.
- Work mode: release-candidate validation with one minimal corrective patch.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: listed below.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Backup/export/import/reset behavior changed: no.
- XP/rank/achievement behavior changed: no.
- Source-of-truth reconciliation: completed; stale roadmap ordering noted.
- Warnings and anomalies: classified above and in the validation log.
- Validation cadence used: targeted Vitest and targeted Playwright passed; full E2E passed; three consecutive local full `npm run validate` passes completed after the release-candidate route test was split by viewport.
- Commit status: not committed; final staged-diff review pending.
- Any deferred tempting work: visual redesign, route refactors, asset import, richer screenshots, backup UI extraction, and route-level code changes beyond the proven mobile overflow fix.

## Deliberately Not Added

- No package or dependency changes.
- No database schema or storage changes.
- No XP, rank, or achievement changes.
- No new app routes.
- No assets.
- No visual redesign.
- No classic route behavior changes.
- No backup/export/import/reset behavior changes.
- No backend, auth, account, cloud sync, analytics, telemetry, network fetch, or external runtime asset behavior.
- No broad refactors.

## Release Decision

Release decision: pass.

RPG-15 found and corrected one real mobile layout blocker. Targeted route, backup, privacy, accessibility, offline, and viewport checks passed after the correction. The release-candidate route test was then split by viewport to remove the single-test timeout/flakiness issue. Full E2E passed with 27 tests, and three consecutive local full `npm run validate` passes completed successfully.

RPG-15 can be marked pass because targeted checks, full E2E, and three consecutive local full `npm run validate` passes completed successfully.

## Commit Status

Not committed. Full validation is complete; staged-diff and commit review are pending.
