# Module 18 Plan - Accessibility and UX Hardening

> Status: **Module 18 complete with three clean full-suite-equivalent validation
> passes.** Exact `npm run validate` could not be counted because the default
> Playwright webServer teardown hangs in this shell after all tests report `ok`;
> the same E2E suite was run with explicitly managed dev/preview servers instead.
> This module is intentionally CSS-only plus tests/docs. It does not change
> product routes, component markup, persistence, service worker behavior,
> dependencies, or schema.

## Summary

- Harden dark-theme contrast at the design-system level for card variants and
  status surfaces that previously carried light-theme fills into dark theme.
- Add computed-style contrast checks for surfaces axe cannot evaluate reliably,
  especially gradient or hardcoded backgrounds.
- Make the custom checkbox's keyboard focus visible on the rendered indicator.
- Make the in-app reduced-motion setting neutralize keyframe animations, not only
  transitions.
- Pin component class/structure contracts so CSS-fixture E2E checks stay tied to
  real components.

## Scope Boundaries

- No backend, authentication, cloud sync, external APIs, analytics, AI coaching,
  social/comparison features, or new dependency.
- No Dexie schema/store/index change, no seed change, no domain or engine change,
  no service-worker/PWA change, no manifest/installability work.
- No route changes, no new route, no route-level lazy loading, no forced app
  failure/loading state, and no component markup/DOM restructuring.
- Locked files remain untouched: `public/sw.js`, `src/lib/pwa/**`,
  `src/lib/db/database.ts`, `src/lib/domain/**`, `src/seed/**`,
  `src/lib/xp/engine.ts`, `src/lib/achievements/**`, and
  `src/lib/progress/engine.ts`.

## Implementation

- `tokens.css`: dark-only opaque surface tokens for accent and danger cards.
- `design-system.css`: dark-theme overrides for `.card--accent`,
  `.card--subtle`, `.card--danger`, invalid fields, primary/danger hover states,
  warning badges, and `.checkbox__input:focus-visible + .checkbox__indicator`.
- `base.css`: in-app `data-motion="reduced"` now neutralizes keyframe animations
  the same way the OS `prefers-reduced-motion` path does.
- `e2e/accessibility.spec.ts`: computed-style contrast coverage for real reachable
  routes plus browser-rendered CSS fixtures for transient/unreachable states.
- `tests/components/checkbox.test.tsx`: component contracts for EmptyState,
  LoadingState, ErrorState, and the checkbox input/indicator adjacency required by
  the focus CSS selector.

## Validation Protocol

- Targeted component contract test:
  `npm run test -- tests/components/checkbox.test.tsx`
- Targeted accessibility E2E:
  `npx playwright test e2e/accessibility.spec.ts`
- Affected regressions:
  dashboard, insights, settings, and offline Playwright specs.
- Full validation:
  three consecutive clean `npm run validate` passes before handoff if feasible.

## Handoff Notes

- axe remains necessary but insufficient: it did not catch the broken gradient /
  hardcoded card backgrounds, so computed-style contrast checks are now part of the
  accessibility validation surface.
- Module 16 recovery and Module 17 offline behavior must stay green because this
  module touches global CSS and the reduced-motion path.
- Validation completed with three clean manual full-suite-equivalent passes:
  static checks, build, 195 Vitest tests, 22 dev E2E tests, 2 production-preview
  offline E2E tests, circular dependency analysis, and `npm audit` with 0
  vulnerabilities. The exact `npm run validate` command remains blocked by the
  default Playwright webServer teardown hang observed after tests report `ok`.
