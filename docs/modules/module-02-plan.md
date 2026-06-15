# Module 02 Plan

## Objective

- Expand the scaffold into an intentional app architecture with `app`, `components`, `features`, `lib`, `seed`, and `tests`.
- Preserve the Module 01 route behavior while moving feature routes behind public entrypoints and a shared route catalog.
- Add alias-based imports, initial import-boundary enforcement, and a circular-dependency check.

## Expected files to change

- package.json
- package-lock.json
- tsconfig.app.json
- vite.config.ts
- eslint.config.js
- src/app/\*\*
- src/components/\*\*
- src/features/\*\*
- src/lib/\*\*
- src/seed/\*\*
- tests/\*\*
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Tests expected

- Unit: app renders the scaffold home route after the architecture refactor.
- Unit: route definitions and primary navigation remain aligned with the baseline route set.
- Static architecture: circular dependency analysis passes across `src` and `tests`.
- E2E: the existing dashboard, accessibility, unknown-route, local-storage reset, keyboard navigation, and in-session offline checks continue to pass.

## Validation commands

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run check:circular`
- `npm audit --audit-level=moderate`
