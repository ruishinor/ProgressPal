# Module 04 Plan

## Objective

- Replace the `src/lib/db` placeholder with a real Dexie persistence layer.
- Introduce explicit schema versioning, a tested migration path, and repository
  functions for the first persisted entities.
- Keep bundled CS50 seed payloads deferred to Module 05 while making the
  database ready to consume validated seed input safely.

## Expected files to change

- package.json
- package-lock.json
- src/app/providers/AppProviders.tsx
- src/lib/db/\*\*
- vitest.setup.ts
- e2e/dashboard.spec.ts
- tests/db/\*\*
- tests/domain/moduleBoundaries.test.ts
- docs/modules/module-04-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Tests expected

- Unit/integration: fresh database initialization creates singleton metadata and
  a default profile.
- Unit/integration: interrupted initialization is repaired without duplicating
  singleton records.
- Unit/integration: seed sync inserts missing course units and items
  idempotently without overwriting existing rows.
- Unit/integration: repository functions reject invalid profile and progress
  writes.
- Unit/integration: version-one fixture data migrates to the current schema and
  preserves records.
- Boundary: `src/seed` remains payload-free until Module 05.
- E2E: the app initializes IndexedDB once and preserves singleton records across
  reload while the existing scaffold smoke coverage continues to pass.

## Validation commands

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run check:circular`
- `npm audit --audit-level=moderate`
