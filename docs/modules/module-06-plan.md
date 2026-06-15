# Module 06 Plan

## Objective

- Build the reusable UI foundation for ProgressPal CS50 Edition before any
  feature-complete screens land.
- Replace the current placeholder styling with explicit design tokens,
  accessible layout primitives, form controls, progress indicators, feedback
  states, and restrained motion defaults.
- Keep feature routes truthful placeholders while proving the design system on
  a small local showcase surface.

## Expected files to change

- src/app/routes/HomePage.tsx
- src/app/routes/NotFoundPage.tsx
- src/app/shell/AppShell.tsx
- src/components/layout/\*\*
- src/components/placeholder/PlaceholderPage.tsx
- src/components/ui/\*\*
- src/features/dashboard/routes/DashboardPage.tsx
- src/styles/\*\*
- tests/app/App.test.tsx
- tests/components/\*\*
- e2e/dashboard.spec.ts
- docs/modules/module-06-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Forbidden files / work for Module 06

- No real dashboard metrics, XP rollups, blocker workflows, or resume logic.
- No full course map, achievements grid, insights charts, or settings
  implementation beyond placeholder use of shared components.
- No onboarding persistence flow, profile editor, or course-item interaction.
- No heavy UI component library, animation library, remote font, analytics,
  backend, auth, or external API integration.
- No schema changes, migration changes, or seed-structure changes unless
  strictly required for a design-system regression fix.

## Acceptance criteria

- Reusable `AppShell`, `PageHeader`, `Card`, `Button`, `IconButton`,
  `ProgressBar`, `SliceProgressBar`, `Badge`, `StatusPill`, `FormField`,
  `TextInput`, `Select`, `TextArea`, `NumberInput`, `Dialog`, `EmptyState`,
  `Toast`, `LoadingState`, and `ErrorState` components exist under
  `src/components` with explicit TypeScript props.
- Styling is tokenized and maintainable instead of route-specific placeholder
  CSS.
- The shell and placeholder routes consume the shared primitives without
  pretending later modules already exist.
- Motion is restrained and respects reduced-motion preferences.
- Focus styles, touch-target sizing, label wiring, contrast, and keyboard
  access are covered by code and tests.
- A simple showcase or dev surface exists without introducing Storybook or a
  heavy component-workbench dependency.
- Triple-Zero is achieved with the full validation suite and updated
  documentation.

## Tests expected

- Unit: button disabled and loading states.
- Unit: progress bars at zero, partial, full, and clamped invalid values.
- Unit: status-pill variants and labels.
- Unit: form labels, descriptions, and invalid state wiring for core controls.
- E2E: app shell and seeded placeholder flow render cleanly, keyboard
  navigation still works, and no console or accessibility regressions appear on
  the smoke path.

## Validation commands

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run check:circular`
- `npm audit --audit-level=moderate`

## Data compatibility risk

- Module 06 should be presentation-only. Persisted data shapes, store names,
  and seed IDs must remain unchanged.
- The new shell and page composition must not assume onboarding state exists;
  the current default learner-profile bootstrap behavior must stay intact until
  Module 07 deliberately replaces it.

## Rollback plan

- Remove the new `src/components/layout` and `src/components/ui` files.
- Restore the previous placeholder-first `src/styles/index.css`,
  `src/app/shell/AppShell.tsx`, `src/app/routes/HomePage.tsx`,
  `src/app/routes/NotFoundPage.tsx`, and `src/components/placeholder` content.
- Remove the Module 06 component tests and restore the prior smoke assertions
  in `tests/app/App.test.tsx` and `e2e/dashboard.spec.ts`.
- Leave Module 04 persistence and Module 05 seed data unchanged.
