# Module 08 Plan

## Objective

- Replace the `/course` placeholder with a real local course map backed by the
  seeded CS50 catalog.
- Show units and items in stable seed order with honest rollups from persisted
  `progress_entries`.
- Keep Module 08 read-only so later item-detail, long-form progression,
  session, XP, and dashboard modules are not pulled in early.

## Expected files to change

- src/app/routes/HomePage.tsx
- src/features/course/\*\*
- src/lib/db/index.ts
- src/lib/db/repositories.ts
- src/styles/\*\*
- tests/app/App.test.tsx
- tests/db/repositories.test.ts
- tests/features/courseModel.test.ts
- e2e/dashboard.spec.ts
- docs/modules/module-08-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Forbidden files / work for Module 08

- No item-detail editing controls, status mutation UI, unsaved-change prompts,
  or item-detail route work.
- No content assets, slices, media events, resume points, or long-form
  progression logic.
- No study-session logging, XP rules, achievements, dashboard metrics, or
  insights rollups.
- No backup, export, import, destructive reset UI, authentication, sync,
  analytics, backend, or remote content fetching.
- No schema-version bump or seed-ID churn unless a real compatibility defect
  requires it.

## Acceptance criteria

- `/course` renders the seeded `course_units` and `course_items` in stable
  order after onboarding is complete.
- The route shows unit and course rollups from local `progress_entries`,
  defaulting missing entries to honest not-started or optional states.
- Required completion percentages count only required items with
  `completed`, `submitted`, or `accepted` status. Optional items never inflate
  required progress.
- Blocked progress is surfaced clearly instead of being hidden inside neutral
  completion styling.
- The course map stays read-only and does not claim item-detail, slice,
  session, XP, or dashboard behavior exists yet.
- The home route no longer claims the course map is still deferred.
- Triple-Zero is achieved with the full validation suite and updated
  documentation.

## Tests expected

- Unit: course-map rollup model handles empty progress, mixed statuses,
  optional items, minute formatting, and ordered output.
- Integration: repository progress listing returns stable ordered data for
  course-map composition.
- App route: `/course` renders seeded units and saved progress rollups after
  onboarding.
- E2E: onboarding-complete learner can open `/course`, see seeded week data,
  and confirm persisted progress still renders after reload.

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

- Module 08 keeps the version-2 Dexie schema and existing singleton IDs intact.
- The route depends on stable seeded unit or item IDs and the one-record-per-
  item progress contract already enforced by `upsertProgress`.
- Progress rollups are read-only projections over existing data and must not
  mutate stored rows while rendering.

## Rollback plan

- Remove the Module 08 course components, model, and README under
  `src/features/course/`.
- Remove the `listProgressEntries` repository surface and the course-map test
  coverage added for this module.
- Restore the previous `/course` placeholder route and the older home-route
  copy that still treated the course map as deferred.
- Reset Module 08 documentation and validation records to the Module 07 state.
