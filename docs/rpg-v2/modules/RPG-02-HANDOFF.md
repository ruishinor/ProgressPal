# RPG-02 Handoff

## Module

RPG-02 - RPG routes and shell

## Goal

Add the `/rpg/*` route tree, RPG shell boundary, bottom navigation, and shell stubs without changing the v1 engine, schema, storage, service worker, assets, or classic route behavior.

## Branch

`rpg/02-rpg-routes-shell`

## Routes Added

- `/rpg`
- `/rpg/map`
- `/rpg/week/:unitId`
- `/rpg/resource/:itemId`
- `/rpg/focus`
- `/rpg/hero`
- `/rpg/badges`
- `/rpg/log`
- `/rpg/settings`

## Files Changed

- `src/app/router/routeDefinitions.ts`
- `src/app/router/router.tsx`
- `src/features/rpg/index.ts`
- `src/features/rpg/routes/RpgHomePage.tsx`
- `src/features/rpg/routes/RpgMapPage.tsx`
- `src/features/rpg/routes/RpgModulePage.tsx`
- `src/features/rpg/routes/RpgResourcePage.tsx`
- `src/features/rpg/routes/RpgStubPage.tsx`
- `src/features/rpg/routes/RpgFocusPage.tsx`
- `src/features/rpg/routes/RpgHeroPage.tsx`
- `src/features/rpg/routes/RpgBadgesPage.tsx`
- `src/features/rpg/routes/RpgLogPage.tsx`
- `src/features/rpg/routes/RpgSettingsPage.tsx`
- `src/features/rpg/shell/RpgShell.tsx`
- `src/features/rpg/shell/RpgBottomNav.tsx`
- `src/lib/routing/rpgRoutePaths.ts`
- `src/styles/index.css`
- `src/styles/rpg-shell.css`
- `tests/architecture/routeDefinitions.test.ts`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-02-HANDOFF.md`

## Why Each File Changed

- Router files: register the complete nested `/rpg/*` route tree under `RpgShell`.
- RPG route pages: render the existing read-only bridge pages and add minimal stubs for shell-only destinations.
- RPG shell files: provide the shell boundary, RPG skip link, RPG main landmark, and bottom navigation.
- `src/lib/routing/rpgRoutePaths.ts`: centralize RPG path constants/helpers for app and feature layers without violating import boundaries.
- `src/styles/rpg-shell.css`: add scoped shell and bottom-nav layout styles only.
- Tests: verify route definitions, hidden classic primary nav, shell rendering, bottom-nav keyboard navigation, and passive no-mutation behavior.

## Implementation Notes

- Route naming was reconciled to the roadmap and decisions: week detail is `/rpg/week/:unitId`, not `/rpg/module/:unitId`.
- RPG routes remain hidden from classic primary navigation.
- `RpgShell` renders only for `/rpg/*` routes.
- `RpgBottomNav` includes Hub, Map, Focus, Hero, Badges, Log, and Settings.
- Week and resource detail routes mark Map active in the bottom nav.
- Missing RPG destinations are stubs only; full Focus, Hero, Badges, Log, and Settings implementations are deferred.
- Existing read-only bridge pages still use RPG-01 read models:
  - `loadRpgHubSummary()`
  - `loadRpgCourseMapSummary()`
  - `loadRpgModuleSummary(unitId)`
  - `loadRpgStudyResourceSummary(itemId)`

## Validation Checklist

- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/architecture/routeDefinitions.test.ts tests/app/App.test.tsx`
- `npm run validate`
- Confirm RPG routes remain absent from `primaryNavigationItems`.
- Confirm week/resource not-found states render through `ErrorState`.
- Confirm passive RPG route navigation does not mutate IndexedDB snapshot contents.
- Confirm classic primary navigation remains unchanged.

## Scope Discipline Check

- Intended module: RPG-02 - RPG routes and shell.
- Files changed: only router definitions, RPG route/shell files, one neutral RPG route-path module, scoped RPG shell CSS, route/app tests, and this handoff.
- Why each changed file was necessary: listed above.
- What was deliberately not added: no full Focus implementation, no Hero profile logic, no Badge Gallery, no Journey Log, no RPG Settings data controls, no RPG-03 primitives, no asset pass, no route redirects, no classic route redesign.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Any deferred tempting work: visual polish, icons, real RPG primitives, focus-session save flow, badge/log data screens, settings FAQ copy, and asset work.

Anti-overbuild answers:

1. Yes, the shell, route tree, bottom nav, tests, and handoff are required by RPG-02.
2. Yes, each runtime addition supports only shell routing/navigation.
3. Yes, changes are required by the source roadmap and corrective review.
4. Yes, no engine write path or schema changed.
5. Yes, same-origin `/rpg/*`, no backend, no schema change, no embedded media, and local-first behavior are preserved.
6. No dependency, asset, runtime request, store, or preference was introduced.
7. Yes, existing React Router, components, styles, and read models were reused.
8. Yes, each file maps directly to RPG-02 route, shell, navigation, or validation acceptance criteria.
