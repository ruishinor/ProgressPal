# Module 05 Plan

## Objective

- Add the first real bundled CS50x course seed payload under `src/seed`.
- Validate that payload through the shared domain parser with the exact fields
  the database layer requires.
- Load the bundled seed on app startup and keep re-sync non-destructive to
  learner data while still applying deliberate catalog revisions.

## Expected files to change

- src/app/providers/AppProviders.tsx
- src/app/routes/HomePage.tsx
- src/app/shell/AppShell.tsx
- src/features/course/routes/CoursePage.tsx
- src/lib/db/README.md
- src/lib/db/repositories.ts
- src/lib/domain/schemas.ts
- src/seed/\*\*
- e2e/dashboard.spec.ts
- tests/db/\*\*
- tests/domain/\*\*
- tests/seed/\*\*
- docs/modules/module-05-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Tests expected

- Unit: the bundled CS50x payload parses successfully and exposes the expected
  week, special-unit, and final-project structure.
- Unit: the course-seed schema rejects under-specified payloads that the
  database cannot materialize safely.
- Integration: database initialization with the bundled seed creates the course
  catalog and records the seed version.
- Integration: re-syncing a revised seed updates seed-managed catalog fields
  without duplicating rows or mutating learner progress.
- Boundary: `src/seed` exposes only the curated payload, README, and public
  entrypoint.
- E2E: app startup seeds the catalog into IndexedDB while the existing console,
  accessibility, reload, route, and offline smoke coverage stays clean.

## Validation commands

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run check:circular`
- `npm audit --audit-level=moderate`
