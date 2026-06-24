# RPG Shell Phase 1C Handoff - Mobile Viewport Containment and Header Surface

## Module

RPG Shell Phase 1C - corrective patch for mobile viewport containment and RPG route header surface.

## Purpose

Fix mobile horizontal panning and incomplete RPG route title/header presentation after `/rpg/*` was separated from the classic `AppShell`.

## Files changed

- `src/styles/rpg-shell.css`
- `src/styles/rpg-components.css`
- `e2e/rpg-mobile-overflow.spec.ts`

## What changed

- Added RPG shell safe gutters, width containment, min-width containment, and horizontal overflow protection.
- Contained HUD, frame, main content, panels, cards, and bottom navigation within the viewport.
- Removed the mobile bottom-nav negative-margin risk.
- Added shared RPG route header surface styling for:
  - RPG Hub
  - Campaign Map
  - Week detail
  - Study Resource
  - Focus
  - Journey Log
  - Badge Gallery
  - Hero Profile
  - RPG Settings
- Added readable header background, border, radius, padding, shadow, and text/action wrapping.
- Extended the mobile Playwright regression to check:
  - no horizontal overflow at 360, 390, and 430 px;
  - visible RPG bottom navigation;
  - non-transparent, padded, bordered RPG route header surfaces.

## Scope Discipline Check

- Intended module: RPG Shell Phase 1C.
- Work mode: corrective patch.
- Classic routes changed: no.
- Router changed: no.
- Data/schema changed: no.
- Backend/auth/sync/analytics/telemetry/AI changed: no.
- Dependencies changed: no.
- Assets added: no.
- New mechanics added: no.
- Campaign map redesigned: no.
- Bottom nav preserved: yes.
- Phase 1B route separation preserved: yes.

## Validation

Run locally before merge:

- `npm run build`
- `npm run format:check`
- `git diff --check`
- `npm run lint`
- `npm run typecheck`
- `npm run check:circular`
- `npm run test -- tests/app/App.test.tsx tests/architecture/routeDefinitions.test.ts tests/architecture/localOnly.test.ts tests/architecture/rpgFeature.test.ts tests/features/rpg/readModels.test.ts`
- `npx playwright test e2e/rpg-mobile-overflow.spec.ts --workers=1`

## Manual QA

Check `/rpg`, `/rpg/map`, `/rpg/focus`, `/rpg/hero`, `/rpg/badges`, `/rpg/log`, and `/rpg/settings` on mobile.

Acceptance:

- no sideways panning;
- visible left/right gutters;
- HUD stays contained;
- bottom nav stays contained;
- route title/header no longer floats directly on raw grid background;
- classic routes still render as before.
