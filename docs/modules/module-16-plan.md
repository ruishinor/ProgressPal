# Module 16 Plan — Settings, Backup, Import, Reset

> Status: **Module 16 complete and validated.** Sections 1–12 record the approved
> plan; section 13 is the verified end-of-module handoff. Read the handoff for
> the as-built outcome.

## Summary

- Module 16 gives the learner local data control and safe recovery paths from
  `/settings`: **export** a full local backup as JSON, **import** a
  Zod-validated backup with replace-all semantics, and **reset** all local data
  behind a typed confirmation phrase.
- Backup import also lives on the onboarding/empty-state screen so it stays
  reachable after a reset (the app gate forces a fresh database into
  `/onboarding`, where `/settings` is unreachable).
- No Dexie schema change: schema v2 already ships the `backups` store and
  `BackupRecordSchema`. No new dependencies; export/import use native `Blob`,
  anchor download, file input, `JSON`, and existing Zod.
- Replace-all only (no merge mode), full-snapshot export (no selective export),
  privacy page deferred to Module 19.

## 1. Approved scope decisions

1. **Import = replace-all only.** Validate first, preview, confirm, then clear +
   restore in one atomic transaction, reconcile the seed catalog, refresh app
   state. Merge import is deferred to a separate future module.
2. **Export = full database snapshot** (every store from `getDatabaseSnapshot()`,
   including media events, resume points, and frozen slice plans).
3. **Privacy page deferred to Module 19** (Security and privacy review). Module
   16 adds only short, action-specific inline warnings — no `/privacy` route and
   no `PRIVACY.md`.

## 2. Backup file format (versioned envelope)

Pure, `.strict()` Zod schema in `src/lib/backup/` reusing `@/lib/domain` store
schemas:

```
{
  format: "progresspal-backup",
  formatVersion: 1,
  appVersion: string,
  schemaVersion: number,        // must equal currentDatabaseSchemaVersion (2)
  exportedAt: ISO-8601 datetime,
  data: { <all 14 stores from getDatabaseSnapshot(), each Zod-validated> }
}
```

`data.appMeta` / `data.learnerProfile` may be `null` (tolerated; post-import
re-init re-bootstraps default singletons). Import rejects: malformed JSON,
oversized input (25 MB cap, checked by `File.size` in the UI and by text length
in `parseBackupFile`), wrong `format`/`formatVersion`, mismatched
`schemaVersion`, unknown fields (`.strict()`), malformed rows, and duplicate IDs
within any store.

## 3. DB semantics (exact)

- **Passive render:** opening/reloading `/settings` mutates no store. Export,
  import, and reset write only on explicit action.
- **Export:** serialize the full snapshot first, then append exactly one
  `backups` record (`type: 'export'`). The file never contains its own export
  event. Export mutates only `backups`.
- **Import (replace-all):** validate, then one atomic transaction clears all
  stores and writes validated rows; afterward `initializeDatabase({ seed })`
  reconciles the bundled catalog (idempotent on already-current data) and one
  `import` record is appended. The 13 non-`backups` stores restore to equality
  with `data`; `backups` equals `data.backups` plus exactly one `import` record.
- **Reset:** clear every store (incl. `backups`) and re-bootstrap a fresh default
  profile + seeded catalog; the app gate forwards to onboarding.

## 4. Files

- New pure logic: `src/lib/backup/envelope.ts` + `src/lib/backup/index.ts`
  (`BackupEnvelopeSchema`, `buildBackupEnvelope`, `parseBackupFile`,
  `summarizeBackup`, `backupFileName`). Depends only on `@/lib/domain` and
  `@/lib/validation`; no Dexie/UI/app — avoids feature→feature coupling and any
  cycle.
- New shared control: `src/components/ui/ImportBackupControl.tsx`
  (feature-agnostic; imports `@/lib/backup` + UI primitives; checks `File.size`
  before reading). Reused by Settings and onboarding.
- Repository (`src/lib/db/repositories.ts` + `index.ts`):
  `restoreDatabaseFromBackup`, `resetAllData`, `recordBackupEvent`. Reuses
  `getDatabaseSnapshot()` as the export source.
- Routes/styling: `SettingsPage.tsx` (export/import/reset + inline warnings),
  `OnboardingPage.tsx` (import recovery entry point), additive dark-theme-safe
  CSS in `design-system.css`.

## 5. Recovery path

`AppShell` redirects every route except `/onboarding` to onboarding when
`requiresOnboarding` is true, and `SettingsPage` renders nothing without a
completed profile — so `/settings` is unreachable after a reset. Resolution:
expose the same `ImportBackupControl` on `OnboardingPage`. The E2E exercises the
full loop: export → reset → onboarding → import via the reachable control →
restored state visible → reload preserves it.

## 6. Copy/docs scope (minimal, additive)

Settings backup copy states what a backup contains (full local snapshot;
learning history/progress; notes/evidence/blockers; XP and achievements; media
progress/resume points; settings/profile/app metadata; backup audit log). The
import preview includes a "How to verify your restore" checklist. No new
help/docs/roadmap/data-model/privacy routes; no `PRIVACY.md`.

## 7. Tests

- `tests/lib/backup.test.ts` (pure): round-trip; format/version metadata;
  summarize counts; null profile tolerated; reject malformed JSON, oversized
  input, wrong format/format version/schema version, unknown top-level and nested
  fields, malformed rows, per-store duplicate IDs (cross-store same id allowed);
  script note kept inert; invalid avatar config rejected.
- `tests/db/repositories.test.ts`: export records one event and mutates nothing
  else; replace-all restore yields 13-store equality and `backups = data + 1
import`, no XP/achievement/session duplication; reset clears all stores and
  re-bootstraps; invalid payload writes nothing.
- `tests/components/importBackupControl.test.tsx`: confirm gated until a valid
  file parses; invalid file shows an error and no import; valid file shows a
  preview and confirms.
- `tests/app/App.test.tsx`: `/settings` renders the data-control surface with
  reset gated by the phrase; opening/reloading `/settings` mutates no store.
- `e2e/settings.spec.ts`: the recovery loop, settings import, and invalid-file
  rejection; dark-theme axe clean; no unsafe card variant; no console errors.

## 8. Security

Size guard, `JSON.parse` try/catch, strict envelope + per-row Zod validation,
duplicate-ID rejection, enum-constrained avatar config, and React text rendering
(no raw-HTML injection). Backup import executes no scripts; the E2E fails if any
dialog fires from an injected `<script>` note.

## 9. Validation commands

- `npm run validate` = lint, format:check, typecheck, build, test, test:e2e,
  check:circular, audit. Three consecutive clean passes required.

## 10. Stop conditions

Schema change needed; restore/reset not atomic; onboarding import not reachable;
passive `/settings` render mutates a store; export mutates a non-`backups` store;
import duplicates XP/achievements/sessions/seed; 13-store equality unachievable;
backups audit semantics untestable; post-import re-init overwrites restored data;
new dependency needed; lint boundaries force feature→feature coupling; locked
engine/domain/seed edits required; dark-theme axe fails; chunk budget > 600 kB;
or full validation cannot reach three clean passes.

## 11. Files forbidden to change

`src/lib/xp/engine.ts`, `src/lib/achievements/**`, `src/lib/progress/engine.ts`,
`src/lib/domain/**`, `src/seed/**`, and the Dexie schema/store/index surfaces in
`src/lib/db/database.ts`.

## 12. Phased execution (as built)

1. Pure `src/lib/backup/` + pure tests.
2. Repository functions + DB tests.
3. Shared import control, Settings, onboarding recovery entry point, additive
   CSS, app/component tests.
4. E2E recovery loop and adversarial import tests.
5. Docs + three clean `npm run validate` passes + handoff. Hard stop after
   Module 16; do not begin Module 17.

## 13. End-of-module handoff (verified)

- Current module complete/incomplete: **complete.**
- Changed files:
  - New: `src/lib/backup/envelope.ts`, `src/lib/backup/index.ts`,
    `src/components/ui/ImportBackupControl.tsx`, `tests/lib/backup.test.ts`,
    `tests/components/importBackupControl.test.tsx`, `e2e/settings.spec.ts`,
    this plan.
  - Edited: `src/lib/db/repositories.ts`, `src/lib/db/index.ts`,
    `src/features/settings/routes/SettingsPage.tsx`,
    `src/features/profile/routes/OnboardingPage.tsx`,
    `src/styles/design-system.css`, `tests/db/repositories.test.ts`,
    `tests/app/App.test.tsx`.
  - Docs: `PROJECT_STATE.md`, `DECISIONS.md` (D-0038), `MODULE_CHECKLIST.md`,
    `CHANGELOG.md`, `TEST_PLAN.md`, `VALIDATION_LOG.md`.
- Validation status: **three consecutive clean `npm run validate` passes** (each:
  lint, format:check, typecheck, build with all chunks under the 600 kB warning
  budget, unit tests, E2E tests, no circular dependencies, 0 audit
  vulnerabilities).
- Confirmations: Dexie schema stayed version 2; no new dependency; replace-all
  restore yields full 13-store equality with the backup plus exactly one import
  audit record; export mutates only `backups`; opening/reloading `/settings`
  mutates no store; reset clears all stores and re-bootstraps; import stays
  reachable from onboarding after a reset; no engine/domain/seed edits.
- Known risks (deferred): cross-seed-version backup imports rely on the current
  bundled seed for catalog reconciliation; the dedicated privacy page and
  `PRIVACY.md` remain deferred to Module 19; merge import and selective export
  remain deferred.
- Next module: **Module 17 - Offline hardening (not started).**
