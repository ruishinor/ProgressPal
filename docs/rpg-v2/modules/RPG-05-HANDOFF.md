# RPG-05 Handoff - Campaign Map

## Module and Goal

RPG-05 - Campaign Map slice.

Goal: build `/rpg/map` as an accessible course map using real current CS50x seed/course data and existing ProgressPal progress.

Work mode: Mode C - Next-module implementation.

Branch: `rpg/05-rpg-campaign-map`.

## Roadmap Acceptance Criteria

- Every node is keyboard reachable.
- Every node has readable label.
- Status derives from real progress.
- No fake course support appears.
- Full validation passes once cleanly.

## Files Changed

- `src/features/rpg/model/types.ts`
- `src/features/rpg/model/readModels.ts`
- `src/features/rpg/routes/RpgMapPage.tsx`
- `src/styles/rpg-components.css`
- `tests/features/rpg/readModels.test.ts`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-05-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `src/features/rpg/model/types.ts`: adds the derived `currentModule` field to the map summary type.
- `src/features/rpg/model/readModels.ts`: derives `currentModule` from the same recommended-quest/current-module logic used by the Hub.
- `src/features/rpg/routes/RpgMapPage.tsx`: replaces the `/rpg/map` stub-like route with an accessible Campaign Map built from real local course-map data.
- `src/styles/rpg-components.css`: adds scoped `.rpg-map*` layout, node, fallback-list, and focus styles under `.rpg-shell`.
- `tests/features/rpg/readModels.test.ts`: verifies the map summary exposes the current module without mutation.
- `tests/app/App.test.tsx`: verifies all seed units render, every map node links to `/rpg/week/:unitId`, accessible names exist, progress/status text derives from saved progress, a plain list fallback exists, forbidden fake course support is absent, and passive route rendering remains read-only.
- `docs/rpg-v2/modules/RPG-05-HANDOFF.md`: records module evidence.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-05 validation and read-only route evidence.

## What the Campaign Map Shows

- All 14 current CS50x 2026 seed units.
- A required-course progress summary.
- The current module/week derived from local progress and recommended-quest selection.
- A semantic ordered visual route where each module node is a normal link.
- Visible status text for each module: completed, in progress, not started, optional, or blocked if local progress has that state.
- Visible availability text for each module.
- Required progress counts and percentage for each module.
- A plain module list fallback with the same real module titles, links, statuses, availability labels, and progress counts.

## Deliberately Not Added

- No fake locked CS50P, CS50AI, CS50W, or CS50SQL courses.
- No fake future course support.
- No official CS50 campaign branding.
- No copied course art.
- No image assets.
- No canvas.
- No dependencies.
- No schema/storage changes.
- No runtime network behavior.
- No direct database imports in RPG UI components.
- No classic UI redesign.
- No work on Week detail, Study Resource, Focus, Hero, Badges, Log, or Settings beyond existing links required from the map.

## Tests and Validation

- `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`: pass; 2 files / 71 tests.
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

- Command: initial targeted `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`
  - Warning/failure: sandbox blocked Vite temp config write under `node_modules/.vite-temp`.
  - Classification: environment/sandbox warning.
  - Action taken: reran with elevated filesystem access; targeted tests passed.
  - Clean validation impact: no after elevated rerun passed.

- Command: `git diff`
  - Warning: `LF will be replaced by CRLF the next time Git touches it`.
  - Classification: environment/line-ending warning.
  - Action taken: recorded; `git diff --check` passed with the same line-ending warnings and no whitespace errors.
  - Clean validation impact: no.

- Command: first `npm run validate`
  - Warning/failure: `format:check` flagged `docs/rpg-v2/modules/RPG-04-HANDOFF.md` and `src/features/rpg/routes/RpgHomePage.tsx`.
  - Classification: validation blocker until formatter reconciliation.
  - Action taken: ran Prettier on the exact flagged files. `git diff --stat` and `git diff` showed no substantive content changes for those files, only line-ending warnings.
  - Clean validation impact: no after final validation passed.

## Risk Review

1. Work mode: Mode C - Next-module implementation.
2. New risk introduced: no new storage, network, dependency, asset, or schema risk. Main residual risk is visual/accessibility quality of the first map layout before broader RPG visual polish.
3. Existing risk severity changed: no.
4. Risk mitigated: R-005, R-018, and R-019 are partially mitigated by real-data map tests, readable status text, semantic links, forbidden-copy assertions, and passive no-mutation coverage.
5. Accepted risk: none newly accepted.
6. Source-of-truth inconsistencies: none found that block RPG-05.
7. Warnings/anomalies: classified above.
8. Implementation/evidence status: committed with this handoff.
9. Blocking risk for next module: none if final validation and commit complete.

## Source-of-Truth Reconciliation

- Roadmap conflicts found: none.
- Decision-log conflicts found: none.
- Validation-log stale entries found: RPG-05 Map read-only evidence, route validation evidence, and handoff status needed updating.
- Handoff inconsistencies found: none.
- Risk-register updates needed: none; no severity/status change.
- Any unresolved inconsistency before commit: none.

## Scope Discipline Check

- Intended module: RPG-05 - Campaign Map slice.
- Work mode: Next-module implementation.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: fake course support, assets, dependencies, schema/storage, runtime network behavior, broad read-model scaffolding, new routes, and non-map screen work.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Source-of-truth reconciliation: no blocking conflicts.
- Warnings and anomalies: classified above.
- Validation cadence used: normal module cadence.
- Commit status: committed with message `rpg-05: build RPG campaign map`.
- Any deferred tempting work: map art, route animation, icons, richer node grouping, Week detail expansion, Study Resource behavior, Focus behavior, Hero/Profile, Badge Gallery, Journey Log, Settings, and RPG-14 visual polish.

Anti-overbuild questions answered:

1. Yes, the Campaign Map is required by RPG-05.
2. Yes, every runtime field supports required map content.
3. Yes, the work maps to the roadmap and accepted decisions.
4. Yes, the v1 engine contract is preserved.
5. Yes, same-origin `/rpg/*`, no backend, no schema change, no embedded media, and Level 1 local-first are preserved.
6. No dependency, asset, runtime request, store, preference, or broad abstraction was introduced.
7. Yes, existing read-model patterns, route helpers, database snapshots, and RPG-03 primitives were reused.
8. Yes, each changed file maps directly to RPG-05 acceptance criteria.

## Suggested Next Module

RPG-06 - Week 4 Module Detail slice.
