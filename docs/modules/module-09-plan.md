# Module 09 Plan

## Objective

- Implement the long-form progression engine behind the existing seeded course
  catalog without introducing the Module 10 detail screen early.
- Derive stable local content assets and default slices for eligible long-form
  course items from the current bundled catalog.
- Log immutable media-progress events, compute honest watched-time rollups via
  interval union, maintain resume points, and bridge that state back into the
  read-only course map.

## Expected files to change

- src/app/routes/HomePage.tsx
- src/features/course/\*\*
- src/features/progress/\*\*
- src/lib/progress/\*\*
- src/lib/db/index.ts
- src/lib/db/repositories.ts
- src/styles/\*\*
- tests/app/App.test.tsx
- tests/db/repositories.test.ts
- tests/features/progressModel.test.ts
- tests/lib/progressEngine.test.ts
- e2e/dashboard.spec.ts
- docs/modules/module-09-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md

## Forbidden files / work for Module 09

- No new content-detail route, editable item-detail screen, or unsaved-change
  UI. Those belong to Module 10.
- No study-session timer or general focus-session UI. That belongs to Module 11.
- No XP, achievements, dashboard metrics, insights rollups, backup or restore
  UI, reset flow, authentication, sync, analytics, backend, or remote content
  fetching.
- No schema-version bump or seeded course-item ID churn unless a concrete
  compatibility defect forces it.

## Acceptance criteria

- Eligible seeded long-form items derive stable local `content_assets` and
  `content_slices` without changing existing course-item IDs or requiring a new
  schema version.
- Slice generation is deterministic, uses supported slice-minute options, and
  rejects invalid durations.
- Logging a media-progress event blocks exact duplicate ranges for the same
  asset, preserves immutable event history, updates or creates a resume point,
  and rolls watched time up through interval union instead of naive addition.
- Long-form partial progress does not falsely complete the parent course item
  after one slice, but all slices completed through the engine can resolve the
  item to `completed`.
- Existing binary-only completed progress remains respected when no slice
  events exist yet.
- `/course` remains read-only while surfacing honest watched-time or resume
  summaries for long-form items that have slice progress.
- Triple-Zero is achieved with the full validation suite and updated
  documentation.

## Tests expected

- Unit: slice generation, timestamp formatting, interval union, and frozen
  legacy-complete projection behavior.
- Feature model: long-form progress summaries for partial, overlapping, and
  legacy-complete states.
- Integration: derived asset sync, media-event logging, duplicate-range
  rejection, resume-point updates, slice-status rollups, and item-progress
  bridging.
- App route: `/course` renders read-only long-form summaries from local
  persistence after onboarding is complete.
- E2E: persisted long-form event history still renders on the course map after
  reload with zero console and accessibility regressions.

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

- Module 09 keeps the existing version-2 Dexie schema and store names intact.
- The engine derives one local primary long-form asset per eligible course item
  because the bundled seed still lacks explicit asset-level metadata.
- Once a long-form asset has saved media events, its generated slice plan stays
  frozen to avoid silently changing the denominator underneath saved learner
  effort.
- Existing `progress_entries` remain authoritative for explicit blocked or
  completed status, while media events can supply a fallback started or
  completed hint if item-level state is missing.

## Rollback plan

- Remove the shared long-form engine and the progress-summary surface under
  `src/lib/progress/` and `src/features/progress/`.
- Remove the new repository functions for derived asset sync, media-event
  logging, and long-form listing or summary reads.
- Restore the previous read-only course-map item rows without long-form summary
  lines.
- Reset Module 09 documentation and validation records to the Module 08 state.
