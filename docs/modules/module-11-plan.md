# Module 11 Plan

## Objective

- Add a real `/sessions` route for append-only study-session logging.
- Support one live focus-session flow with start, pause, resume, finish, and
  discard, plus one manual entry flow for already-completed effort.
- Persist saved study sessions through the existing `study_sessions` store and
  `addStudySession()` repository surface without implying completion, watched
  time, XP, or dashboard metrics.

## Expected files to change

- src/app/router/routeDefinitions.ts
- src/app/router/router.tsx
- src/app/routes/HomePage.tsx
- src/app/shell/AppShell.tsx
- src/features/course/paths.ts
- src/features/course/routes/ContentDetailPage.tsx
- src/features/sessions/\*\*
- src/lib/db/index.ts
- src/lib/db/repositories.ts
- src/lib/time/\*\*
- src/styles/design-system.css
- tests/app/App.test.tsx
- tests/architecture/routeDefinitions.test.ts
- tests/architecture/sessionsFeature.test.ts
- tests/db/repositories.test.ts
- tests/features/sessionsModel.test.ts
- tests/lib/time.test.ts
- e2e/sessions.spec.ts
- docs/modules/module-11-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Forbidden files / work for Module 11

- No Dexie schema version bump, store rename, index change, or singleton-ID
  churn.
- No session edit or delete UI.
- No persisted unfinished timers or draft session records.
- No unattached or unit-only saved sessions. The current `StudySessionSchema`
  requires both `unitId` and `itemId`, so every saved session must reference
  one existing course item.
- No writes to `progress_entries`, `media_progress_events`, `content_slices`,
  or `resume_points` from session flows.
- No XP, achievements, dashboard metrics, insights, backup, reset,
  authentication, sync, analytics, backend, or remote content fetching.
- No generated watched media ranges from session duration.

## Acceptance criteria

- `/sessions` exists in the central route catalog, appears in primary
  navigation, and renders after onboarding.
- Live-session flow can start, pause, resume, finish, and save exactly one row
  when active time reaches at least 60 seconds.
- Live-session discard or reload-mid-session writes nothing.
- Manual entry validates mode, item selection, unit-to-item match, start time,
  and whole-minute duration in the 1-720 range.
- `/course/:itemId` exposes only one new link to `/sessions?itemId=...`; no
  other session UI is added to the detail route.
- Saved session flows leave progress, media, slice, resume, XP, achievement,
  and backup stores unchanged.
- Dexie schema remains version 2 and the existing migration fixture stays
  green.
- Triple-Zero is achieved with the full validation suite and updated module
  documentation.

## Tests expected

- Pure model tests for live-session transitions, duration rounding, validation,
  discard, and deterministic ledger projection.
- Repository tests for `listStudySessions()`, append-only ordering, invalid
  session rejection, non-session-store immutability, and seed re-sync
  preservation.
- App-route tests for `/sessions`, item prefill, locked unit behavior, and the
  detail-route link.
- Architecture tests that keep sessions free of XP and progress-engine write
  imports.
- E2E tests for live-session save, discard, reload-mid-session absence, and
  invalid manual entry rejection.

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

- Module 11 keeps the existing Dexie schema at version 2 with no store or
  index changes.
- The existing `StudySessionSchema` contract requires both `unitId` and
  `itemId`, so the route must save only item-bound sessions and derive
  `unitId` from the selected item.
- Study sessions stay append-only and do not write any completion, watched
  range, slice, or resume data.
- Unfinished timers are represented by absence only; nothing is persisted until
  an explicit save occurs.

## Rollback plan

- Remove the `/sessions` route and its navigation entry.
- Remove `src/features/sessions/` and the additive session time helpers.
- Remove `listStudySessions()` from the public database surface.
- Remove the one content-detail link to the sessions route.
- Reset Module 11 documentation and validation records to the Module 10 state.
