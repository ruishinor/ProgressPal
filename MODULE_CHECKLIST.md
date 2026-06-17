# Module Checklist

## Current Module

Module: 18 - Accessibility and UX hardening
Status: complete

Objective:

- Harden dark-theme accessibility and UX at the design-system level without
  changing routes, component markup, persistence, schema, service-worker behavior,
  or dependencies.
- Cover contrast defects axe cannot see with computed-style E2E checks, and pin
  the component class/structure contracts those checks depend on.

Expected files changed:

- src/styles/tokens.css
- src/styles/design-system.css
- src/styles/base.css
- e2e/accessibility.spec.ts (new)
- tests/components/checkbox.test.tsx
- docs/modules/module-18-plan.md (new)
- PROJECT_STATE.md
- DECISIONS.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- TEST_PLAN.md

Forbidden files / work for Module 18:

- No new dependencies.
- No Dexie schema/store/index change; no seed/domain/engine change.
- No service-worker/PWA edits, manifest/installability work, route-level lazy
  loading, route changes, or new routes.
- No forced/artificial app failure or loading state.
- No component markup/DOM structure change, heading hierarchy refactor, landmark
  rewrite, toast live-region dedupe, or dialog restructuring.
- No edits to locked engines (`src/lib/xp/engine.ts`, `src/lib/achievements/**`,
  `src/lib/progress/engine.ts`), `src/lib/domain/**`, `src/seed/**`, or the Dexie
  schema in `src/lib/db/database.ts`; no edits to `public/sw.js` or
  `src/lib/pwa/**`.
- No Module 19 security/privacy work or Module 20 packaging work.

Acceptance criteria:

- Dark-theme `.card--accent`, `.card--subtle`, `.card--danger`, EmptyState,
  LoadingState, ErrorState, invalid fields, primary/danger button hovers, and
  warning badges meet contrast expectations in computed-style tests.
- Custom Checkbox exposes a visible keyboard focus indicator on the visible
  indicator, and tests preserve the adjacent input/indicator structure required by
  the CSS selector.
- The in-app reduced-motion setting neutralizes keyframe animations, not only
  transitions.
- Component contract tests prove fixture-tested CSS classes stay connected to real
  components.
- No schema change, no dependency change, no service-worker/PWA change, no route
  change, and no locked-file changes.
- Module 16 recovery and Module 17 offline behavior remain green.

Tests added/updated:

- `e2e/accessibility.spec.ts` (computed-style contrast, checkbox focus-visible,
  in-app reduced motion)
- `tests/components/checkbox.test.tsx` (status component and checkbox structure
  contracts)

Validation commands:

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run check:circular`
- `npm audit --audit-level=moderate`

Data compatibility risk:

- None expected. Module 18 is CSS/test/docs only and does not touch Dexie schema,
  stores, indexes, seed data, repositories, or persisted data contracts.

Rollback plan:

- Revert `src/styles/tokens.css`, `src/styles/design-system.css`,
  `src/styles/base.css`, `e2e/accessibility.spec.ts`, and
  `tests/components/checkbox.test.tsx`.
- Reset Module 18 documentation and validation records to the Module 17 state.

## Module Status

| Module | Name                                  | Status      |
| ------ | ------------------------------------- | ----------- |
| 00     | Repository inspection and state setup | complete    |
| 01     | Scaffold                              | complete    |
| 02     | Architecture and folders              | complete    |
| 03     | Domain types                          | complete    |
| 04     | Local database                        | complete    |
| 05     | CS50 seed data                        | complete    |
| 06     | Design system                         | complete    |
| 07     | Onboarding and profile                | complete    |
| 08     | Course map                            | complete    |
| 09     | Long-form progression engine          | complete    |
| 10     | Content detail screen                 | complete    |
| 11     | Study session logging                 | complete    |
| 12     | XP engine                             | complete    |
| 13     | Achievement engine                    | complete    |
| 14     | Dashboard                             | complete    |
| 15     | Insights                              | complete    |
| 16     | Settings, backup, import, reset       | complete    |
| 17     | Offline hardening                     | complete    |
| 18     | Accessibility and UX hardening        | complete    |
| 19     | Security and privacy review           | not started |
| 20     | Final CS50 project packaging          | not started |
