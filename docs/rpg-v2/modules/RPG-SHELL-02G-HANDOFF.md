# RPG Shell Phase 2G Handoff - Journey Log Cleanup

## Module

RPG Shell Phase 2G - remove stale "Journey Log" naming and the orphaned Journey
Log read-model remnants left behind after Phase 2E made `/rpg/log` a
classic-wrapped Insights route. Tiny corrective cleanup; no new UX.

## Mode

Mode B - corrective cleanup only.

## Inventory result (before changes)

`rg "Journey Log|journey log|RpgJourneyLog|loadRpgJourneyLogSummary|buildRpgJourneyLogSummary"`
returned three groups:

- **Historical documentation** (left as-is, clearly historical): `docs/rpg-v2/VISUAL_TARGET.md`,
  `docs/rpg-v2/VALIDATION_LOG.md`, and the earlier handoff docs (RPG-10, 2E).
- **Visible user-facing copy**: one link on `/rpg/hero` labeled "Open Journey Log"
  pointing to `/rpg/log`.
- **Orphaned model + remnants in code**:
  - `buildRpgJourneyLogSummary` / `loadRpgJourneyLogSummary` in `readModels.ts`
    (plus their journey-only helpers `buildJourneyContext`,
    `resolveXpSourceContext`, `toProgressStatusLabel`, and the
    `getRpgFocusPath` / `getRpgResourcePath` / `getRpgWeekPath` imports they alone
    used);
  - `RpgJourneyLogActivityType` / `RpgJourneyLogActivityLink` /
    `RpgJourneyLogActivity` / `RpgJourneyLogSummary` types in `types.ts`;
  - the barrel re-exports of all of the above in `src/features/rpg/index.ts`;
  - one unit test in `tests/features/rpg/readModels.test.ts` that existed only to
    exercise `loadRpgJourneyLogSummary`;
  - one explanatory comment in `RpgLogPage.tsx`.

## Did production code still reference the Journey Log model/types?

No. After Phase 2E, **no production route or component consumed**
`buildRpgJourneyLogSummary`, `loadRpgJourneyLogSummary`, or the `RpgJourneyLog*`
types. `RpgLogPage` (the only `/rpg/log` route) renders `InsightsSurface` and
never imported them. The only references were the definitions themselves, the
barrel re-exports, and a single unit test - so the removal was safe and did not
touch any live read path.

## Files changed

- `src/features/rpg/routes/RpgHeroPage.tsx` - relabel the Hero link "Open Journey
  Log" -> "Open Insights" (label only; the `/rpg/log` target is unchanged).
- `src/features/rpg/model/readModels.ts` - removed the orphaned
  `buildRpgJourneyLogSummary` and `loadRpgJourneyLogSummary`, the journey-only
  helpers `buildJourneyContext` / `resolveXpSourceContext` /
  `toProgressStatusLabel`, the now-unused `rpgRoutePaths` import
  (`getRpgFocusPath` / `getRpgResourcePath` / `getRpgWeekPath`), and the
  `RpgJourneyLog*` type imports. No other read model touched.
- `src/features/rpg/model/types.ts` - removed the four `RpgJourneyLog*` type
  definitions.
- `src/features/rpg/index.ts` - removed the barrel exports for the two functions
  and the four types.
- `src/features/rpg/routes/RpgLogPage.tsx` - reworded the explanatory comment to
  drop the dead "Journey Log" term while keeping the "no separate engine"
  guard-rail. No behavior change.
- `tests/features/rpg/readModels.test.ts` - removed the `loadRpgJourneyLogSummary`
  import and the single test that only preserved the orphan model. All other
  read-model tests are unchanged and still run.
- `tests/app/App.test.tsx` - updated the Hero link assertion "Open Journey Log"
  -> "Open Insights" to match the relabel.
- `docs/rpg-v2/modules/RPG-SHELL-02G-HANDOFF.md` - this doc.

## Why each file was necessary

- Hero relabel + its App-test assertion: the only remaining visible "Journey Log"
  copy; the acceptance requires it read "Insights".
- `readModels.ts` / `types.ts` / `index.ts`: remove the orphaned read-model
  functions, their dead-only helpers and imports, the types, and the exports, so
  no orphaned Journey Log surface remains now that production no longer uses it.
- `readModels.test.ts`: that test existed only to preserve the dead model;
  keeping it would force the model to stay.
- `RpgLogPage.tsx`: clears the last stale "Journey Log" string from production
  source without changing `/rpg/log` behavior.

## What did NOT change

- `/rpg/log` still renders `<InsightsSurface variant="rpg" />` - identical
  behavior to Phase 2E.
- `InsightsSurface` is untouched (the inventory found no stale string in it).
- The `/rpg/log` route path is unchanged; achievements links are unchanged; Hero
  layout is unchanged apart from the one link label.
- No database schema, XP, achievement, focus, settings, backup/import/reset,
  assets, package, or dependency changes. Other RPG read models
  (`buildRpgBadgeGallerySummary`, hero, hub, course-map, focus, module, study
  resource) are untouched.

## Validation

- `npm run format:check` - clean for all files changed in this phase.
- `git diff --check` - clean (only benign LF->CRLF advisories).
- `npm run typecheck` - clean.
- `npm run lint` - clean.
- `npm run build` - succeeds.
- `npm run test -- tests/app/App.test.tsx` - passes.
- `npm run test -- tests/architecture/rpgFeature.test.ts tests/features/rpg/readModels.test.ts`
  - passes (the read-model suite keeps its remaining model tests; only the
    Journey Log test was removed).

## Scope Discipline Check

- Intended module: RPG Shell Phase 2G - Journey Log cleanup. Mode B cleanup.
- `/rpg/log` behavior changed: no.
- `InsightsSurface` edited: no.
- New Insights features added: no.
- Achievements links rerouted: no. Hero/Profile redesigned: no (one link label
  only). `/rpg/log` route renamed: no.
- Orphaned Journey Log read-model exports remaining: none.
- Tests still preserving the dead Journey Log model: none.
- Database / XP / achievement / focus / settings / backup-import-reset / assets /
  packages / dependencies touched: no.
- Broad cleanup performed: no (only Journey Log remnants).
- Remaining "Journey Log" references: historical documentation only.
