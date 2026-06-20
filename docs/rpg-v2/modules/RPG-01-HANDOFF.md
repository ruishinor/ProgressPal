# RPG-01 Handoff

## Summary

Implemented the minimum RPG feature boundary and read-model layer for the first Week 4 slice.

Added:

- RPG feature export boundary.
- Shared RPG read-model types.
- Thin read-only RPG loaders for hub summary, course map summary, module summary, and study resource summary.
- Focused unit tests proving the loaders derive from real seeded course/progress/session/XP data and do not mutate database state.
- Minimal architecture guard for future RPG UI directories so routes/components/shell files cannot import the database layer directly.

No routes, UI screens, CSS, assets, dependencies, storage fields, schema changes, or package changes were added.

## Files changed

- `src/features/rpg/index.ts`
- `src/features/rpg/model/types.ts`
- `src/features/rpg/model/readModels.ts`
- `tests/features/rpg/readModels.test.ts`
- `tests/architecture/rpgFeature.test.ts`
- `docs/rpg-v2/modules/RPG-01-HANDOFF.md`

## Why each changed file was necessary

- `src/features/rpg/index.ts`: defines the public RPG feature boundary for the new read models and types.
- `src/features/rpg/model/types.ts`: defines the minimal shared types needed by the Week 4 slice read models.
- `src/features/rpg/model/readModels.ts`: implements the read-only hub, course map, module, and study resource loaders over existing repository snapshots and existing pure course/progress/XP models.
- `tests/features/rpg/readModels.test.ts`: proves the read models load real Week 4 seeded data, reflect existing saved progress/session/XP records, handle missing IDs safely, and leave database snapshots unchanged.
- `tests/architecture/rpgFeature.test.ts`: adds the narrow architecture guard requested for future RPG UI files.
- `docs/rpg-v2/modules/RPG-01-HANDOFF.md`: records implementation, validation, and scope discipline for module handoff.

## Read-only proof

The RPG loaders read via `getDatabaseSnapshot()` and derive views using existing pure model/formula functions:

- `buildCourseMap()`
- `buildCourseDetailView()`
- `buildLongFormProgressMap()`
- `calculateXpSummary()`
- static CS50 outbound link helpers

The tests wrap each loader call with:

```text
before = getDatabaseSnapshot()
run RPG read model
after = getDatabaseSnapshot()
expect(after).toEqual(before)
```

Covered calls:

- `loadRpgHubSummary()`
- `loadRpgCourseMapSummary()`
- `loadRpgModuleSummary('week-4')`
- `loadRpgStudyResourceSummary('week-4-problem-set')`
- missing module/resource IDs

No read model writes progress, sessions, XP, achievements, app metadata, preferences, backup records, or schema data.

## Validation results

Focused validation:

- `npm run test -- tests/features/rpg/readModels.test.ts tests/architecture/rpgFeature.test.ts`
- Result: passed, 2 files and 5 tests.

Full validation pass 1:

- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test`: passed, 36 files and 266 tests.
- `npm run test:e2e`: passed, 24 tests.
- `npm run check:circular`: passed, 135 files analyzed and no circular dependency found.
- `npm run audit`: passed, 0 vulnerabilities.

Full validation pass 2:

- `npm run validate`: passed.
- Included lint, format check, typecheck, build, unit/integration tests, E2E, circular check, and audit.
- Unit/integration tests: 36 files and 266 tests.
- E2E tests: 24 passed.
- Audit: 0 vulnerabilities.

Full validation pass 3:

- `npm run validate`: passed.
- Included lint, format check, typecheck, build, unit/integration tests, E2E, circular check, and audit.
- Unit/integration tests: 36 files and 266 tests.
- E2E tests: 24 passed.
- Audit: 0 vulnerabilities.

## Known warnings/noise

- Git still prints: `warning: unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. This did not affect validation.
- Initial non-escalated Vitest attempts hit Vite temp-file write restrictions under `node_modules/.vite-temp`. Validation was rerun with normal filesystem access and passed.

## Adversarial review

Potential risk: `getDatabaseSnapshot()` is broad. It was used deliberately because it is an existing read-only repository function and avoids side-effecting helpers such as `getXpSummary()` that can initialize app metadata on an uninitialized database. The RPG layer remains thin; it does not introduce a separate data service or new formulas.

Potential overbuild risk: hub summary could expand into hero/profile, badge gallery, or journey log concerns. This implementation avoids those. It includes only learner name, course progress, continue quest, Week 4 pointer, study minutes/session count, and XP level totals required for the first slice.

## Retrospective

The main implementation constraint was avoiding accidental writes from read helpers. Snapshot-based loading kept that boundary explicit and made the pre/post mutation tests simple. The tests also caught incorrect assumptions about real seed titles and estimates, which is useful evidence that the read models are tied to actual seed data rather than invented RPG content.

## Scope Discipline Check

- Intended module: RPG-01 - minimum architecture boundary and slice read models.
- Files changed: RPG feature boundary/read-model files, focused RPG tests, one architecture guard, and this handoff.
- Why each changed file was necessary: each file directly supports the RPG-01 acceptance criteria.
- What was deliberately not added: routes, UI screens, React page components, CSS, visual tokens, assets, dependencies, package changes, schema changes, storage fields, preferences, backup/import/reset changes, classic route changes, hero model, badge gallery model, journey log model, asset loader, path selector, guild customization, and global RPG state manager.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no. Static official CS50 links are exposed as existing outbound link data only.
- Classic route behavior changed: no.
- Any deferred tempting work: route stubs, shell/nav, full hero identity, badge gallery, journey log, visual styling, and richer module/resource fields.

## Stop decision

Ready for RPG-02 after review.

Do not start RPG-02 in this module.
