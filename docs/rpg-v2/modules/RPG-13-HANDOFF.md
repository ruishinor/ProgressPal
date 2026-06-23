# RPG-13 Handoff - Settings, FAQ, Backup Trust Surface

## Module and Goal

RPG-13 - Settings/FAQ/backup trust surface.

Goal: replace the `/rpg/settings` placeholder with a sober read-only trust and settings information route that explains local data, backups, reset boundaries, privacy/offline limits, RPG/classic coexistence, and official course boundaries.

Branch: `rpg/13-rpg-settings-faq-backup-trust`.

Base: `1d082ce Merge pull request #20 from ruishinor/rpg/12-rpg-hero-profile`.

## Initial Evidence

- `git status -sb`: branch `rpg/13-rpg-settings-faq-backup-trust`; clean at inspection; emitted the existing global-ignore permission warning.
- `git log --oneline --decorate -5`: `1d082ce (HEAD -> rpg/13-rpg-settings-faq-backup-trust, origin/rpg/v2, rpg/v2) Merge pull request #20 from ruishinor/rpg/12-rpg-hero-profile`; `2d603cd rpg-12: build RPG hero profile`; `1c1390d Merge pull request #19 from ruishinor/rpg/11-rpg-badge-gallery`; `486b756 rpg-11: build RPG badge gallery`; `9028900 Merge pull request #18 from ruishinor/rpg/10-rpg-journey-log`.
- `git diff --name-status`: no output.
- `git diff --stat`: no output.
- `git diff --check`: no output.

## Files Changed

- `src/features/rpg/routes/RpgSettingsPage.tsx`
- `src/styles/rpg-components.css`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-13-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `src/features/rpg/routes/RpgSettingsPage.tsx`: replaces the settings stub with a real read-only FAQ/trust route.
- `src/styles/rpg-components.css`: adds scoped `.rpg-settings*` styling and mobile layout support only.
- `tests/app/App.test.tsx`: adds RPG Settings route trust-copy and no-mutation coverage, updates route readiness, and removes settings from placeholder assumptions.
- `docs/rpg-v2/modules/RPG-13-HANDOFF.md`: records implementation, validation, warnings, risks, and scope discipline.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-13 evidence and updates the module handoff index.

## What RPG Settings Now Does

- Renders `/rpg/settings` as a real RPG route instead of a placeholder.
- Explains that ProgressPal stores records in this browser on this device.
- States there is no ProgressPal account, no cloud sync, and no hidden analytics.
- Explains browser storage can be cleared by user/browser/device/system cleanup tools.
- Points users to classic `/settings` for existing export/import/reset controls instead of duplicating write behavior.
- Explains backups are the user's responsibility and export/import is the recovery path.
- Explains reset local data as destructive and local-only.
- Explains RPG routes read the same local ProgressPal records as classic routes.
- Explains RPG ranks, badges, profile, and activity summaries are local ProgressPal interpretations.
- States RPG status does not change official CS50, Harvard, edX, or OpenCourseWare status.
- Links back to RPG Hub and to classic Settings.

## Deliberately Not Added

- No backup/export/import/reset behavior changes.
- No duplicated export or reset writer logic in the RPG route.
- No database schema or storage changes.
- No account, auth, backend, cloud sync, analytics, or telemetry behavior.
- No XP rule changes or XP transactions.
- No new achievements, criteria, or passive unlocks.
- No Journey Log, Badge Gallery, or Hero/Profile implementation changes.
- No broad RPG shell redesign.
- No classic route behavior changes.
- No new dependencies.
- No new assets.
- No official-looking CS50, Harvard, shield, trophy, or institutional marks.

## Tests Authored or Updated

- `tests/app/App.test.tsx`
  - Added `renders RPG Settings trust and backup FAQ without mutating local stores`.
  - Updated passive RPG route readiness so `/rpg/settings` waits for real settings content.
  - Updated shell route coverage wording so `/rpg/settings` is no longer described as a placeholder.

## Validation

Current status: implemented locally and validated.

Observed checks:

- Initial required evidence:
  - `git status -sb`: branch `rpg/13-rpg-settings-faq-backup-trust`; clean at inspection; emitted global-ignore permission warning.
  - `git log --oneline --decorate -5`: expected base at `1d082ce`.
  - `git diff --name-status`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: no output.
- Formatting before targeted test:
  - `npx prettier --write src/features/rpg/routes/RpgSettingsPage.tsx src/styles/rpg-components.css tests/app/App.test.tsx`: pass.
- Sandboxed targeted test attempt:
  - `npm run test -- tests/app/App.test.tsx`: failed before tests ran because Vite could not write `node_modules/.vite-temp/...`.
- Escalated targeted validation:
  - `npm run test -- tests/app/App.test.tsx`: pass.
  - Result: 1 file passed, 83 tests passed.
- First full `npm run validate` attempt: failed at `format:check`.
  - `npm run lint`: pass.
  - `npm run format:check`: failed; Prettier flagged previously committed RPG-10/RPG-12 files plus `docs/rpg-v2/VALIDATION_LOG.md`.
- Formatter reconciliation:
  - `npx prettier --write` on the exact flagged files: pass.
  - The previously committed flagged files produced no substantive tracked diff after index refresh; only LF-to-CRLF warnings remained.
- Full validation after formatter reconciliation:
  - `npm run validate` pass 1: pass; 37 unit-test files, 310 tests; 24 E2E tests; no circular dependencies; 0 audit vulnerabilities.
  - `npm run validate` pass 2: pass; 37 unit-test files, 310 tests; 24 E2E tests; no circular dependencies; 0 audit vulnerabilities.
  - `npm run validate` pass 3: failed during `npm run test`; `tests/app/App.test.tsx > App > redirects a fresh run to onboarding` stayed on the loading shell until timeout.
- Targeted reproducibility check after the failed full pass:
  - `npm run test -- tests/app/App.test.tsx`: pass; 1 file passed, 83 tests passed.
- Restarted three-pass full validation cadence after the non-reproducible full-suite failure:
  - `npm run validate` restarted pass 1: pass; 37 unit-test files, 310 tests; 24 E2E tests; no circular dependencies; 0 audit vulnerabilities.
  - `npm run validate` restarted pass 2: pass; 37 unit-test files, 310 tests; 24 E2E tests; no circular dependencies; 0 audit vulnerabilities.
  - `npm run validate` restarted pass 3: pass; 37 unit-test files, 310 tests; 24 E2E tests; no circular dependencies; 0 audit vulnerabilities.

## Warning and Anomaly Classification

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`.
  - Classification: environment warning.
  - Impact: repo-local status and diffs remained readable.

- Git diff commands emitted LF-to-CRLF warnings for touched files.
  - Classification: environment/line-ending warning.
  - Impact: `git diff --check` exited with no whitespace errors.

- Sandboxed targeted Vitest failed at Vite config loading with `EPERM` on `node_modules/.vite-temp`.
  - Classification: environment/sandbox warning.
  - Action: reran the same command with filesystem escalation.
  - Impact: clean validation claim unaffected after escalated targeted test passed.

- First full `npm run validate` failed at `format:check` because Prettier flagged existing files from earlier RPG modules.
  - Classification: validation blocker until formatter reconciliation.
  - Action: ran Prettier on the exact flagged files and refreshed the git index for no-content-diff files.
  - Impact: no clean validation claim was made until after formatter reconciliation.

- Third full `npm run validate` attempt after two clean passes failed one existing App onboarding test because the app stayed on the loading shell until the test timeout.
  - Classification: non-reproducible full-suite initialization race.
  - Action: reran `npm run test -- tests/app/App.test.tsx` successfully, then restarted the full validation cadence.
  - Impact: no clean validation claim was made from the interrupted streak; three subsequent consecutive full validation passes completed cleanly.

## Adversarial Review

- Risk: exposing backup/import/reset controls in RPG could fork or weaken existing destructive-action behavior. Mitigation: the RPG route links to classic Settings and does not import backup writer functions.
- Risk: trust copy could overclaim security or recovery guarantees. Mitigation: copy says local/browser/device, no account/cloud/analytics, and backup responsibility; it does not claim encryption, compliance, or guaranteed recovery.
- Risk: RPG status could imply official CS50 progress. Mitigation: the route explicitly states RPG ranks, badges, profile, and activity summaries are local ProgressPal interpretations and not official course status.
- Risk: read-only settings route could still mutate stores through app-level side effects. Mitigation: route-level and passive-route no-mutation tests compare `getDatabaseSnapshot()` before and after render.

## Retrospective

The lowest-risk implementation was a read-only RPG trust surface plus links to classic Settings. Export and reset are not reusable components in the current codebase; moving or duplicating them would have increased blast radius and risked changing data-control behavior. Keeping those writes in classic Settings preserves the existing tested behavior.

The main design constraint was avoiding marketing-style reassurance. The page states operational facts, recovery limitations, and official boundaries directly.

## Risk Review

1. Work mode: normal feature module.
2. New product risk introduced: low; static read-only route and links only.
3. Existing risk severity changed: no.
4. Risk mitigated: `/rpg/settings` is no longer a dead stub and now explains local data and backup limits.
5. Accepted risk: actual backup/export/import/reset controls remain in classic Settings rather than embedded in RPG.
6. Source-of-truth inconsistencies: checked-in roadmap ordering may still be stale; actual merged history is RPG-10 Journey Log, RPG-11 Badge Gallery, RPG-12 Hero/Profile, RPG-13 Settings/FAQ.
7. Warnings/anomalies: classified above.
8. Implementation/evidence status: targeted App route validation passed and three restarted consecutive full validation passes completed.
9. Blocking risk for next module: none identified; commit remains pending.

## Source-of-Truth Reconciliation

- Attached module request: RPG-13 is Settings/FAQ/backup trust surface.
- Current branch: `rpg/13-rpg-settings-faq-backup-trust`.
- Actual merged history: RPG-10 is Journey Log, RPG-11 is Badge Gallery, and RPG-12 is Hero/Profile.
- Roadmap conflict: stale ordering may still exist in checked-in roadmap.
- Resolution used: branch request and merged git history are treated as current module truth.
- Explicit deferrals: Journey Log, Badge Gallery, Hero/Profile, backup-control refactors, and roadmap renumbering were not performed.
- Decision-log conflict: none blocking.

## Scope Discipline Check

- Intended module: RPG-13 - Settings/FAQ/backup trust surface.
- Work mode: Next-module implementation.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: listed above.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Source-of-truth reconciliation: completed; stale roadmap ordering noted.
- Warnings and anomalies: classified above.
- Validation cadence used: targeted App test passed; after one interrupted full-validation streak, three restarted consecutive full validation passes completed.
- Commit status: committed locally. Push was blocked by environment reviewer; PR not created.
- Any deferred tempting work: embedding backup controls, extracting export/reset components, adding settings preferences, adding backup reminders, and broader visual polish.

## Commit Status

Committed locally. Push was blocked by environment reviewer; PR not created.
