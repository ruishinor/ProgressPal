# Pathways-only tester pilot: critical audit, 23 November 2026

## Scope and evidence

Target: protected Vercel project `progresspal-pathways-tester`, built from `feat/pathways-only-tester-pilot`; not the normal ProgressPal production application. Audit uses repository source inspection, completed Vercel TypeScript/build logs, and a live Chromium browser against the protected pilot URL using an authorized short-lived share link. All browser contexts were new and isolated.

1. First run: tested at widths 360, 390, 768 and 1280 px; onboarding completed at every width (PASS).
2. Theme choice: System/Light/Dark available. Dark applied immediately and survived reload (PASS at all four widths).
3. Classic/RPG choice: mode changed to /rpg/pathways, body RPG theme activated and Glassmorphic style applied (PASS at all four widths).
4. Navigation boundary: /dashboard returned to /pathways; theme and RPG path changes stayed within Pathways routes (PASS at all four widths). Static source-path allowlist examined separately.
5. Mobile lesson: first M01 lesson opened, marked complete, reloaded with completed status, and switched to its RPG lesson URL (PASS at widths 320 and 390 px).
6. Horizontal overflow: document scrollWidth equalled clientWidth at 320, 360, 390, 768 and 1280 px on tested overview, track, RPG and lesson surfaces (PASS on tested views).
7. Runtime errors: no uncaught page errors were observed in these browser journeys (PASS for tested paths).

Viewport screenshots were captured in the test sandbox and the reduced mobile Classic/RPG overview images inspected. No obvious clipping or blocked controls was visible. The sandbox files are ephemeral, not long-term evidence or a comprehensive screenshot archive. Browser automation measured viewport width; real device gesture, soft keyboard and browser chrome behavior are not proven.

## Defects corrected

- P1: first pilot removed Classic/RPG and theme controls. Restored profile-backed System/Light/Dark, Classic/RPG Pathways routes, and the existing four RPG style choices.
- P1: early pilot imported other study-programme catalogues. Pilot now uses a Git-only programme composition; the subsequent Vercel build output shows only the Git/GitHub catalogue chunk.
- P2: no dedicated mobile shell. Added wrapping control layout, touch-sized controls, skip link and overflow protections.
- P2: early pilot overview copy suggested another active study programme; restricted-pilot copy corrected.

## Remaining limitations and risks

- **Authentication boundary:** Vercel project-level authentication protects the deployment, while a shareable link is a bearer capability valid until expiration/revocation. Forwarded links grant access. There are no per-learner permissions inside the client app.
- **Static assets:** Vite copies public/ from the shared repository. The git-only JavaScript import graph removes other programme catalogue chunks, but a complete confidentiality audit of copied static files was not performed. Do not use this pilot to share data that would be sensitive if the invited tester could inspect static files.
- **Persistence:** one browser/device; no account sync, centralized telemetry, tester analytics, consent capture or automatic feedback collection. Clearing site data loses progress. No built-in remote backup.
- **Accessibility:** semantic labels, focus styles, visible controls and keyboard-sized targets were inspected in source and screenshots. Contrast measurement, screen reader navigation, text zoom, reduced-motion flows, real mobile keyboard and touch ergonomics remain unverified.
- **Exercises:** one lesson's local completion was tested; a representative submitted exercise with saved answer and evaluation across all M01–M07 content was not verified in the live browser.
- **CI:** GitHub Actions for this branch report failure before executable job steps in observed run(s), so GitHub release certification is **not green**. Separate Vercel `npm run typecheck && npm run build:pathways-pilot` and direct Chromium smoke are positive evidence, not a replacement for every release check.
- **UX:** pilot header and page h1 both read “Pathways” on overview, a minor repetition. There is no guided tester-feedback workflow.

## Recommendation

Suitable for a **small, explicitly invited functional trial** with clearly communicated local-only storage, after confirming the desired link and expiry. Not certified for broad publication, sensitive-source confidentiality, universal accessibility, or long-term learner-data preservation. Keep the isolated branch/project rather than merge into standard production solely to distribute the pilot.
