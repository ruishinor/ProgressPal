# RPG-06 Handoff - Week 4 Module Detail

## Module and Goal

RPG-06 - Week 4 Module Detail slice.

Goal: build `/rpg/week/week-4` as the Week 4: Memory module detail screen using real current CS50x seed/course data and existing ProgressPal progress.

Work mode: Mode B - Corrective patch / completion of current module.

Branch: `rpg/06-rpg-week-detail`.

## Roadmap Acceptance Criteria

- Week 4 renders from real data.
- Task rows open real routes.
- Progress rollup matches existing engine.
- No read-only render unlocks badge or awards XP.
- Full validation passes once cleanly.

## Files Changed

- `src/features/rpg/routes/RpgModulePage.tsx`
- `src/lib/routing/rpgRoutePaths.ts`
- `src/styles/rpg-components.css`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-06-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `src/features/rpg/routes/RpgModulePage.tsx`: replaces the classic-styled Week route surface with a focused RPG Week detail screen that renders module progress and real task rows from `loadRpgModuleSummary`.
- `src/lib/routing/rpgRoutePaths.ts`: adds `getRpgFocusPath(itemId)` so Week task rows and tests build the selected-item focus route consistently with URL encoding.
- `src/styles/rpg-components.css`: adds scoped `.rpg-week*` layout and task-action styles under `.rpg-shell`.
- `tests/app/App.test.tsx`: verifies Week 4 renders from real seed data, required/optional labels are visible, task status text derives from saved progress, each row links to the real resource route and selected focus route, not-found behavior remains, and passive route rendering remains read-only.
- `docs/rpg-v2/modules/RPG-06-HANDOFF.md`: records module evidence.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-06 validation and read-only route evidence.

## What Week Detail Now Shows

- Week 4: Memory title and module type/time estimate from the current seed.
- Module status and required progress rollup from the existing course-map/read-model engine.
- Real Week 4 task rows only:
  - Lecture 4: Memory
  - Shorts: Memory
  - Section: Memory
  - Problem Set 4: Memory
- Required/optional labels from the seed.
- Per-task status text from saved local progress.
- Estimated time for each task.
- Resource action per task linking to `/rpg/resource/:itemId`.
- Focus action per task linking to `/rpg/focus?itemId=<itemId>`.
- Loading, error, and not-found states.

## Deliberately Not Added

- No fake Review task.
- No fake XP preview.
- No fake completion.
- No official completion claim.
- No module still image.
- No new assets.
- No dependencies.
- No schema/storage changes.
- No runtime network behavior.
- No direct database imports in RPG UI components.
- No classic UI redesign.
- No Study Resource implementation beyond real links.
- No Focus implementation beyond selected-item links.
- No Hero, Badges, Log, Settings, or RPG-07 work.

## Tests and Validation

- `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`: pass; 2 files / 71 tests.
- First `npm run validate`: failed at `format:check`; Prettier flagged `docs/rpg-v2/modules/RPG-05-HANDOFF.md`, `src/features/rpg/model/readModels.ts`, `src/features/rpg/model/types.ts`, `src/features/rpg/routes/RpgMapPage.tsx`, and `tests/features/rpg/readModels.test.ts`.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files / 288 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

## Warning and Anomaly Classification

- Command: `git status -sb`
  - Warning: `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`
  - Classification: environment warning.
  - Action taken: recorded; repo-local status and diff remained readable.
  - Clean validation impact: no.

- Command: previous sandboxed targeted Vitest attempt
  - Warning/failure: sandbox blocked Vite temp config write under `node_modules/.vite-temp`.
  - Classification: environment/sandbox warning.
  - Action taken: reran targeted tests with elevated filesystem access; targeted tests passed.
  - Clean validation impact: no after elevated rerun passed.

- Command: `git diff --check`
  - Warning: `LF will be replaced by CRLF the next time Git touches it`.
  - Classification: environment/line-ending warning.
  - Action taken: recorded; command exited 0 with no whitespace errors.
  - Clean validation impact: no.

- Command: first `npm run validate`
  - Warning/failure: `format:check` flagged five previously committed RPG-05 files.
  - Classification: validation blocker until formatter reconciliation.
  - Action taken: ran Prettier on the exact flagged files. `git diff --name-status` showed no substantive RPG-05 file changes after reconciliation, only line-ending warnings.
  - Clean validation impact: no after final validation passed.

## Risk Review

1. Work mode: Mode B - Corrective patch / completion of current module.
2. New risk introduced: no new storage, network, dependency, asset, or schema risk. Main residual risk is that the selected focus route remains a stub until RPG-08, but the Week page only links to it and does not implement focus behavior.
3. Existing risk severity changed: no.
4. Risk mitigated: R-018 and R-019 are partially mitigated by semantic task rows, visible status/requirement text, real route links, and passive no-mutation coverage.
5. Accepted risk: none newly accepted.
6. Source-of-truth inconsistencies: none found that block RPG-06.
7. Warnings/anomalies: classified above.
8. Implementation/evidence status: committed with this handoff.
9. Blocking risk for next module: none if final validation and commit complete.

## Source-of-Truth Reconciliation

- Roadmap conflicts found: none.
- Decision-log conflicts found: none.
- Validation-log stale entries found: RPG-06 Week route validation evidence, read-only route evidence, and handoff status needed updating.
- Handoff inconsistencies found: none.
- Risk-register updates needed: none; no severity/status change.
- Any unresolved inconsistency before commit: none.

## Scope Discipline Check

- Intended module: RPG-06 - Week 4 Module Detail slice.
- Work mode: Corrective patch / completion of current module.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: fake tasks, XP preview, completion behavior, assets, dependencies, schema/storage, runtime network behavior, direct database access, and non-Week-detail screens.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Source-of-truth reconciliation: no blocking conflicts.
- Warnings and anomalies: classified above.
- Validation cadence used: normal module cadence.
- Commit status: committed with message `rpg-06: build Week 4 module detail slice`.
- Any deferred tempting work: Study Resource controls, real Focus behavior, Week detail polish beyond Week 4, module images, XP previews, badge behavior, Journey Log, Hero/Profile, Settings, and RPG-09 vertical-slice gate.

Anti-overbuild questions answered:

1. Yes, the Week 4 detail screen is required by RPG-06.
2. Yes, every runtime field supports required Week detail content.
3. Yes, the work maps to the roadmap and accepted decisions.
4. Yes, the v1 engine contract is preserved.
5. Yes, same-origin `/rpg/*`, no backend, no schema change, no embedded media, and Level 1 local-first are preserved.
6. No dependency, asset, runtime request, store, preference, or broad abstraction was introduced.
7. Yes, existing read-model patterns, route helpers, database snapshots, and RPG-03 primitives were reused.
8. Yes, each changed file maps directly to RPG-06 acceptance criteria.

## Suggested Next Module

RPG-07 - Study Resource slice.
