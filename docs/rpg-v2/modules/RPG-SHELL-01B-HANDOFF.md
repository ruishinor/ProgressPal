# RPG Shell Phase 1B Handoff - RPG Chrome Boundary and HUD Tightening

## Module

RPG Shell Phase 1B - Corrective patch for RPG chrome boundary and HUD tightening.

## Purpose

Fix the Phase 1 acceptance gap where `/rpg/*` routes rendered below the classic ProgressPal v1.2 proof chrome. The RPG route tree should own its page shell while preserving classic routes unchanged.

## Files changed

- `src/app/router/router.tsx`
- `src/app/shell/RpgRouteShell.tsx`
- `src/features/rpg/model/readModels.ts`
- `src/features/rpg/model/types.ts`
- `src/features/rpg/shell/RpgShell.tsx`
- `src/styles/rpg-shell.css`
- `tests/app/App.test.tsx`

## What changed

- Moved `/rpg/*` routing outside the classic `AppShell`.
- Added `RpgRouteShell` to preserve loading, error, and onboarding behavior without rendering classic chrome.
- Kept existing `/rpg/*` URLs.
- Passed existing learner avatar config through the RPG read model.
- Updated the Hero HUD to use the existing profile avatar when available.
- Kept initials fallback only for profiles without avatar config.
- Removed prominent visible `ROUTE: ...` copy from the HUD.
- Tightened the mobile HUD layout.
- Added/updated app tests for RPG route shell behavior and classic route preservation.

## Scope Discipline Check

- Intended module: RPG Shell Phase 1B - RPG chrome boundary and HUD tightening.
- Work mode: Corrective patch.
- Files changed: listed above.
- Why each changed file was necessary:

  - `router.tsx`: separates RPG route tree from classic app shell.
  - `RpgRouteShell.tsx`: preserves app-state gate behavior for RPG routes without classic chrome.
  - `readModels.ts` and `types.ts`: expose existing learner avatar config as derived RPG read-model data.
  - `RpgShell.tsx`: removes route copy and uses existing avatar representation in the HUD.
  - `rpg-shell.css`: tightens mobile HUD layout.
  - `App.test.tsx`: proves RPG routes do not render classic chrome and classic routes still do.

- What was deliberately not added:

  - no campaign map redesign;
  - no collapsed panel system;
  - no reward feedback;
  - no visual asset system;
  - no new RPG mechanics;
  - no backend/sync/auth/analytics/telemetry/AI.

- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no intended behavior change; classic routes remain under `AppShell`.
- Source-of-truth reconciliation: no conflicts found.
- Warnings and anomalies:

  - Dexie/fake-indexeddb `DatabaseClosedError` stderr appeared during targeted tests, but the targeted suite passed. Classified as known test-harness noise unless it becomes a failing test.
  - Git LF/CRLF notices may appear on Windows. Classified as environment/line-ending notice when `git diff --check` passes.

- Validation cadence used: corrective patch; targeted tests plus build/format/diff checks.
- Commit status: uncommitted local work at handoff creation.
- Deferred tempting work:

  - quest-first resource flow;
  - campaign map redesign;
  - collapsed panels;
  - reward feedback;
  - asset foundation;
  - broader page redesign.
