# Module Checklist

## Current Module

Module: 16 - Settings, backup, import, reset
Status: complete

Objective:

- Give the learner local data control from `/settings`: export a full local
  backup as JSON, import a Zod-validated backup with replace-all semantics, and
  reset all local data behind a typed confirmation phrase.
- Keep backup import reachable after a reset by exposing it on the onboarding
  screen (the app gate makes `/settings` unreachable on a fresh database).
- Reuse existing infrastructure: the schema-v2 `backups` store,
  `getDatabaseSnapshot()` as the export source, and `initializeDatabase` /
  `AppStateProvider.refresh()` for post-action re-bootstrap. No schema change,
  no new dependency.

Expected files changed:

- src/lib/backup/envelope.ts (new)
- src/lib/backup/index.ts (new)
- src/components/ui/ImportBackupControl.tsx (new)
- src/lib/db/repositories.ts
- src/lib/db/index.ts
- src/features/settings/routes/SettingsPage.tsx
- src/features/profile/routes/OnboardingPage.tsx
- src/styles/design-system.css
- tests/lib/backup.test.ts (new)
- tests/components/importBackupControl.test.tsx (new)
- tests/db/repositories.test.ts
- tests/app/App.test.tsx
- e2e/settings.spec.ts (new)
- docs/modules/module-16-plan.md (new)
- PROJECT_STATE.md
- DECISIONS.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- TEST_PLAN.md

Forbidden files / work for Module 16:

- No Dexie schema-version bump, store rename, index change, or seeded-ID churn.
- No merge-import mode; no selective/learner-only export.
- No `/privacy` route, no `PRIVACY.md`, no broad security/privacy review (Module
  19); only short action-specific inline warnings.
- No new dependencies (export/import use native `Blob`, anchor download, file
  input, `JSON`, and existing Zod).
- No new XP rules, no new/changed achievements, no edits to the locked engines
  (`src/lib/xp/engine.ts`, `src/lib/achievements/**`, `src/lib/progress/engine.ts`),
  `src/lib/domain/**`, or `src/seed/**`.
- No dark-theme-unsafe card variants (`.card--accent`, `.card--subtle`,
  `.card--danger`, `.state-card`) on the data-control/reset UI.
- No cloud, sync, auth, analytics, AI, or Module 17 work.

Acceptance criteria:

- Real recovery loop works: export from `/settings` → reset → app gates to
  onboarding → import from the reachable onboarding control → restored state
  visible → reload preserves it.
- Opening or reloading `/settings` mutates no store; export/import/reset mutate
  only on explicit action.
- Export serializes the full snapshot first, then appends exactly one `export`
  audit record; it mutates no non-`backups` store.
- Replace-all import restores the 13 non-`backups` stores to equality with the
  backup data, with `backups` equal to the backup's rows plus exactly one
  `import` record; it does not duplicate XP, achievements, or sessions.
- Reset clears every store (incl. `backups`) and re-bootstraps a fresh default
  profile and seeded catalog.
- Import rejects malformed JSON, oversized files, wrong format/format version,
  mismatched schema version, unknown fields, malformed rows, and duplicate IDs;
  an invalid payload writes nothing and notes render as inert text.
- The data-control/reset surface is accessible (axe) in dark theme and uses no
  non-dark-theme-safe card variant.
- The production build keeps every chunk under the 600 kB warning budget; Dexie
  schema stays version 2 and the migration fixture stays green.
- Triple-Zero achieved with lint, format check, typecheck, build, unit test,
  E2E test, circular-dependency analysis, and dependency audit.

Tests added/updated:

- `tests/lib/backup.test.ts` (pure envelope build/parse/summary + all rejections)
- `tests/db/repositories.test.ts` (export audit, replace-all equality and
  no-duplication, reset re-bootstrap, invalid-payload writes nothing)
- `tests/components/importBackupControl.test.tsx` (confirm gating, error display,
  preview)
- `tests/app/App.test.tsx` (settings data-control render + reset gating;
  `/settings` no passive mutation)
- `e2e/settings.spec.ts` (recovery loop, settings import, invalid-file rejection,
  dark-theme axe, no unsafe card variant, no console errors)

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

- No Dexie schema, store, index, or seeded-ID change. The `backups` store and
  `BackupRecordSchema` already exist in schema v2. New repository surfaces
  (`restoreDatabaseFromBackup`, `resetAllData`, `recordBackupEvent`) are additive.
  Restore re-validates every row through the domain schemas before writing.

Rollback plan:

- Remove `src/lib/backup/`, `src/components/ui/ImportBackupControl.tsx`,
  `tests/lib/backup.test.ts`, `tests/components/importBackupControl.test.tsx`,
  and `e2e/settings.spec.ts`.
- Revert the new repository functions in `src/lib/db/repositories.ts` /
  `index.ts`, the data-control UI in `SettingsPage.tsx`, the import entry point
  in `OnboardingPage.tsx`, the additive CSS, and the Module 16 test additions to
  `repositories.test.ts` and `App.test.tsx`.
- Reset Module 16 documentation and validation records to the Module 15 state.

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
| 17     | Offline hardening                     | not started |
| 18     | Accessibility and UX hardening        | not started |
| 19     | Security and privacy review           | not started |
| 20     | Final CS50 project packaging          | not started |
