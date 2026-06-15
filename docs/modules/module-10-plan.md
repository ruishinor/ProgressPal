# Module 10 Plan

## Objective

- Add a real content-detail route that opens one seeded course item from the
  course map without turning the whole `/course` screen into an edit surface.
- Show the item context, saved local status, notes, evidence, derived
  long-form asset summary, slice timeline, and resume point for the selected
  item.
- Let the learner save item-level progress locally and log exact watched ranges
  for eligible long-form items through the existing immutable media-event
  engine.

## Expected files to change

- src/app/router/routeDefinitions.ts
- src/app/router/router.tsx
- src/app/routes/HomePage.tsx
- src/features/course/\*\*
- src/features/progress/\*\*
- src/lib/db/index.ts
- src/lib/db/repositories.ts
- src/lib/time/\*\*
- src/styles/design-system.css
- tests/app/App.test.tsx
- tests/architecture/routeDefinitions.test.ts
- tests/db/repositories.test.ts
- tests/features/progressModel.test.ts
- e2e/dashboard.spec.ts
- docs/modules/module-10-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Forbidden files / work for Module 10

- No study-session timer, manual focus-session workflow, or session ledger UI.
  Those belong to Module 11.
- No XP rules, achievements, dashboard metrics, insights rollups, backup or
  restore UI, reset flow, authentication, sync, analytics, backend, or remote
  content fetching.
- No schema-version bump, store rename, or seeded course-item ID churn unless a
  concrete compatibility defect forces it.
- No deceptive long-form override that marks a partially logged asset complete
  while its saved slice history still proves otherwise.

## Acceptance criteria

- `/course/:itemId` exists, loads after onboarding, and can be opened from the
  course-map item rows.
- The detail screen shows the selected unit, item metadata, current local
  status, saved notes, evidence, and a route back to the course map.
- Non-long-form items can save allowed progress states locally without
  introducing later-module session, XP, or achievement behavior.
- Eligible long-form items show their derived asset, slice timeline, watched
  summary, resume point, and working logging controls backed by the existing
  immutable media-event repository surface.
- Manual watched-range logging validates timestamp format and ordering, rejects
  duplicate exact ranges, respects asset duration limits, and persists across
  reload.
- Long-form manual status changes do not overstate partial saved media history.
- The course map reflects saved detail-screen changes after reload.
- Triple-Zero is achieved with the full validation suite and updated
  documentation.

## Tests expected

- Route definitions: the new course-detail path remains in the central route
  catalog and can build a stable item-detail URL.
- Feature model: long-form detail projection exposes slice statuses and next
  resume information from saved events.
- Integration: repository lookup helpers can load one unit or item by ID, and
  the existing progress or media-event writes still persist cleanly for the new
  route.
- App route: `/course/:itemId` renders seeded item context and saved long-form
  progress after onboarding.
- E2E: a learner opens a course item, logs watched progress, reloads, and sees
  the same summary again on both the detail route and the course map.

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

- Module 10 keeps the existing version-2 Dexie schema and store names intact.
- Item detail saves keep using the existing `progress_entries` contract rather
  than introducing a new form-specific table.
- The route relies on the Module 09 derived long-form asset IDs and frozen
  slice plans once progress exists.
- Long-form partial histories remain authoritative for watched-time truth, so
  the detail screen must not write contradictory manual completion states over
  incomplete saved media coverage.

## Rollback plan

- Remove the course-detail route and the item-row links into it.
- Remove the detail-specific feature model and UI sections while keeping the
  Module 09 read-only course-map summaries intact.
- Remove any repository lookup helpers added only for the detail route.
- Reset Module 10 documentation and validation records to the Module 09 state.
