# Module 03 Plan

## Objective

- Define the shared domain model for ProgressPal before persistence begins.
- Add runtime validation helpers that reject malformed local seed and entity data.
- Preserve the Module 02 route shell and architecture while keeping `db` and `seed`
  implementation work deferred.

## Expected files to change

- tsconfig.app.json
- src/lib/domain/\*\*
- src/lib/validation/\*\*
- tests/domain/\*\*
- docs/modules/module-03-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Tests expected

- Unit: valid course-seed payloads parse successfully.
- Unit: malformed course seeds fail on duplicate IDs, invalid item types, missing
  final-project coverage, and all-optional content.
- Unit: persisted-entity schemas reject invalid URLs, missing video duration,
  skipped-slice omissions, invalid progress-event ranges, duplicate study days,
  and reversed session timestamps.
- Unit: module-boundary checks confirm `src/lib/db` and `src/seed` remain
  placeholder-only in Module 03.
- E2E: existing scaffold smoke coverage continues to pass unchanged.

## Validation commands

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run check:circular`
- `npm audit --audit-level=moderate`
