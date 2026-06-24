# RPG Shell Phase 2F Handoff - Settings as a Classic-Wrapped Capability

## Module

RPG Shell Phase 2F - make `/rpg/settings` ("Settings" in the bottom nav) a
visual wrapper over the classic Settings / data-controls capability, not a
separate RPG trust-copy page. "Trust copy supports controls; it does not replace
controls."

## Mode

Mode B - corrective patch.

## Summary

`/rpg/settings` previously rendered a trust-copy page: four explanatory panels
("Local data", "Backup and restore", "Reset local data", "What RPG changes"), a
four-item FAQ, and an "Official course boundary" panel - none of which contained
the real controls. It told the user to "Open classic Settings" / "Open backup
controls" to actually export, import, or reset, so the authoritative data
controls lived only on `/settings`.

This phase replaces that wall of trust text with the classic Settings surface,
extracted into one shared component rendered by both routes. The profile form
and the authoritative export / import / reset controls (with their
destructive-action safeguards) now render directly inside the RPG shell. The
trust copy is collapsed to a single local-first + course-boundary note that
supports the controls instead of replacing them, and the "Open classic Settings"
hand-off is gone because the real controls are now present.

## Classic component reused / shared component extracted

Direct reuse was not clean because the classic `SettingsPage` was a single
component that rendered a fixed classic `PageHeader` and owned all the
export/import/reset state and handlers, with no shell variant. Following the
Phase 2C/2D/2E precedent, the classic page body was extracted into a new shared
component:

```text
src/features/settings/components/SettingsSurface.tsx
```

It takes a single `variant: 'classic' | 'rpg'` prop. The variant only changes:

- the section wrapper class (`page-section` vs `page-section rpg-settings`);
- the route header (classic `PageHeader` with "Back to profile" vs the RPG
  `.rpg-settings__header` with eyebrow / "Settings" title / lede / "Back to Hub");
- one extra, collapsed "Local-first and course boundary" note rendered only in
  the RPG variant (preserving the local-first warning and the CS50/Harvard
  independence disclaimer that previously lived in the RPG trust panels).

Everything else - the `ProfileForm`, the "Export a backup" card and
`handleExport`, the `ImportBackupControl` and `handleImport`, the "Reset local
data" card with its `RESET` confirmation phrase and `handleReset`, and the toast
stack - is the same component tree with the same handlers and the same
safeguards.

`SettingsSurface` lives in `settings` (not `rpg`) on purpose: it imports the
database layer (`getDatabaseSnapshot`, `recordBackupEvent`, `resetAllData`,
`restoreDatabaseFromBackup`) and `useAppState`, and the RPG-feature architecture
boundary forbids RPG UI files (`components`/`routes`/`shell`) from importing
`@/lib/db`. The RPG route imports only the component, so the boundary is
preserved (verified by `tests/architecture/rpgFeature.test.ts`).

## Files changed

- `src/features/settings/components/SettingsSurface.tsx` (new shared surface)
- `src/features/settings/routes/SettingsPage.tsx` (now `<SettingsSurface variant="classic" />`)
- `src/features/settings/index.ts` (export the shared surface)
- `src/features/rpg/routes/RpgSettingsPage.tsx` (now `<SettingsSurface variant="rpg" />`; no longer renders the bespoke trust panels/FAQ or any "Open classic Settings" hand-off)
- `src/styles/rpg-components.css` (removed the dead RPG-settings trust-wall CSS: `__grid`, `__panel`, `__list`, `__copy`, `__control-row`, `__faq`, `__faq-list` + children, `__official-boundary`, and the `__grid` entry in the 720px media query; kept the `.rpg-settings` / `.rpg-settings__header` / `__eyebrow` / `__lede` / `__actions` classes used by the RPG header)
- `tests/app/App.test.tsx` (retargeted the `/rpg/settings` test to the real controls and `waitForRpgRouteReady` to the "Export a backup" heading)
- `docs/rpg-v2/modules/RPG-SHELL-02F-HANDOFF.md`

The E2E route-heading assertions were updated from "RPG Settings" to "Settings"
for `/rpg/settings`; the route path and `.rpg-settings__header` selector are unchanged.

## What changed visually

- `/rpg/settings` now shows the real data controls inside the RPG shell: the
  local profile form, "Export a backup" (Export local backup), "Import a backup"
  (file picker + preview + replace-all confirm), and "Reset local data" (RESET
  confirmation phrase gating a destructive button).
- The four trust panels, the FAQ, and the "Official course boundary" panel are
  replaced by one collapsed "Local-first and course boundary" note beneath the
  controls.
- "Open classic Settings" and "Open backup controls" hand-off buttons are
  removed; only "Back to Hub" remains in the header.
- The classic inner controls keep their classic styling; the RPG "coloring" is
  the surrounding shell, dark canvas, Hero HUD, bottom nav, and route header.
- The heading is now "Settings" to match the product concept and bottom-nav label.

## What engine/data behavior did NOT change

- No second settings system and no duplicated logic: export, import, and reset
  use the exact same handlers (`handleExport` -> `buildBackupEnvelope` +
  `recordBackupEvent`; `handleImport` -> `restoreDatabaseFromBackup`;
  `handleReset` -> `resetAllData`) and the same `ImportBackupControl`.
- Destructive-action safeguards are unchanged: reset still requires typing
  `RESET` to enable the danger button; import still requires picking a file,
  shows the preview, and requires the explicit replace-all confirmation.
- No passive route-load writes: opening either `/settings` or `/rpg/settings`
  mutates no local store (the App-level "without mutating local stores" snapshot
  test covers `/rpg/settings`, and the classic Settings mutation test covers
  `/settings`). Writes happen only on explicit user action.
- No cloud / account / sync language was introduced; the collapsed note states
  there is no account, no cloud sync, and no analytics.
- Classic `/settings` is unchanged: the `variant='classic'` branch renders the
  same `PageHeader`, profile form, and control cards it always did. (This is not
  a byte-identical claim about the RPG variant, which differs in shell/header
  styling and the collapsed note.)
- No schema / dependency / backend / auth / sync / analytics / AI changes. Route
  table unchanged: `/rpg/settings` remains the route path.

## Acceptance

- Classic `/settings` still works.
- RPG `/rpg/settings` exposes the same authoritative settings/data controls.
- User can export a backup from RPG settings.
- User can import a backup from RPG settings.
- User can reset local data from RPG settings with the same `RESET` safeguard.
- RPG settings is visually aligned but not a separate settings engine.
- No passive route-load writes are introduced.
- RPG difference is shell/header styling (plus a collapsed boundary note), not a
  second settings implementation.

## Validation

- `npm run lint` - clean.
- `npm run typecheck` - clean.
- `npm run build` - succeeds.
- `npm run format:check` - clean after formatting the Phase-2E handoff whitespace issue.
- `git diff --check` - clean (only benign LF->CRLF advisories).
- `npm run test -- tests/app/App.test.tsx` - first run failed once in the unrelated RPG Focus prefill assertion (`Unit` value was still empty); rerun passed. Classified as transient App-test timing/Dexie teardown noise, not a Settings behavior failure.
- Also run for boundary / safety:
  `npm run test -- tests/architecture/rpgFeature.test.ts tests/architecture/localOnly.test.ts tests/lib/backup.test.ts`

## Manual QA

### Code-supported checks (automated, this phase)

- `/rpg/settings` renders the "Export a backup", "Import a backup", and "Reset
  local data" controls, the "Backup file" input, and a disabled "Reset all local
  data" button (RESET safeguard intact) - asserted by the rewritten App test.
- "Open classic Settings" is absent; "Back to Hub" -> `/rpg` is present.
- The collapsed local-first ("no account, no cloud sync, and no analytics") and
  CS50/Harvard independence disclaimers are present.
- A passive load of `/rpg/settings` mutates no local store (snapshot equality).
- Classic `/settings` still renders its controls (existing classic Settings
  tests pass).

### Live browser QA (not performed here; recommended before merge)

- Open classic `/settings` and confirm it is unchanged.
- Open `/rpg/settings` and confirm the same controls are available.
- Export a backup from `/rpg/settings` and confirm a JSON file downloads.
- Import a backup from `/rpg/settings` and confirm the preview + replace-all
  confirm flow works and lands on the dashboard.
- Type `RESET` and confirm the reset button enables, then reset and confirm the
  app returns to onboarding.
- Confirm no cloud/account/sync implication appears anywhere on the page.

## Scope Discipline Check

- Intended module: RPG Shell Phase 2F - Settings classic wrapper.
- Work mode: corrective patch.
- Classic Settings behavior changed: no; the `variant='classic'` branch is the
  same header + controls, with classic Settings tests still passing.
- Second settings system / duplicated backup/import/reset logic added: no (same
  handlers and `ImportBackupControl`).
- Gamified reset/delete action added: no (same `RESET`-phrase danger button).
- Cloud / account / sync language added: no (the note explicitly denies it).
- Passive writes on route load: no (snapshot tests guard it).
- Route / route table changed: no (`/rpg/settings` retained).
- Engine / data / schema / backend / auth / sync / analytics / AI / dependencies
  changed: no.
- Achievement / Focus / Insights / Hero-Profile / Resource / Campaign-Map / asset
  work started: no.
