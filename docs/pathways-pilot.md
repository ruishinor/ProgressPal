# Pathways-only tester pilot

This is a separate Vercel project, never a feature switch on the existing ProgressPal production project. It uses the Git & GitHub Pathways content and learning engine, but ships a separate HTML entry and only the Pathways routes.

## Local validation

1. Use Node 24, npm 11 and npm ci.
2. Run npm run typecheck and npm run build:pathways-pilot.
3. Run npm run preview -- --host 127.0.0.1 and visit the local URL.
4. In a fresh browser profile click Start Pathways, open and complete a lesson, reload to verify local progress.
5. Direct navigation to /rpg, /dashboard, /course and /settings must redirect to /pathways. Verify lesson deep links.
6. Verify the ordinary npm run build remains unaffected.

## Protected pilot deployment

1. Keep this feature branch separate from master. Create a NEW Vercel Vite project with production branch set to feat/pathways-only-tester-pilot; do not deploy the main app under a pilot name.
2. Set build command npm run build:pathways-pilot, install command npm ci, output directory dist and Node version 24.x.
3. Leave account-sync environment variables unset. The pilot has no remote account gate.
4. BEFORE sharing, protect all accessible deployment URLs and static assets using Vercel password protection if supported by the plan, Vercel Authentication with invited tester, or another equivalent access gateway. A shareable URL alone is not authentication.
5. Test from an incognito browser: unauthorized traffic is blocked; authorized tester can start, save, reload and resume; other app URLs are unreachable.
6. Share the protected pilot URL; send access credentials separately. Disable the pilot project or revoke access when finished.

## Limitations

- Progress is local to the participant's browser origin. Clearing site data can remove it; there is no owner-side reporting or sync.
- Route restrictions are not authentication. Server-side deployment protection is mandatory for private testing.
- Vite copies shared public/ assets; audit them if those files contain confidential material.
- The shared database framework still registers the programme catalogue for migration compatibility, but the pilot starts with Git & GitHub only.
- Not release-certified until the pilot build and browser flow tests pass.

## 23 November 2026 review

- System / Light / Dark preferences were restored using the existing persisted learner profile.
- Classic and RPG Pathways views, plus four existing RPG visual styles, are now available without exposing other application routes.
- A pilot-specific programme composition stops importing the CS50 and Programvareutvikling catalogue modules. The build should emit Git & GitHub content only.
- The CI browser smoke checks 360, 390, 768 and 1280 px widths, theme persistence, RPG style, navigation restrictions, console errors and horizontal overflow.
- Vercel typecheck/build was successful. Independent live browser screenshots and interactive acceptance are not yet available; test infrastructure crashed before screenshots could be captured.
- This is not the full accessibility audit. Keyboard navigation, screen readers, contrast and exercise inputs still require successful browser verification.
