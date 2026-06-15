# Module 07 Plan

## Objective

- Replace the implicit default-profile bootstrap with a real first-run learner
  setup flow.
- Let the learner save a local display name, avatar config, study cadence,
  theme, and reduced-motion preference without introducing any backend,
  account, or remote asset dependency.
- Keep later modules honest by redirecting unfinished learners into onboarding
  while leaving dashboard, course, and other feature routes as truthful
  placeholders after setup is complete.

## Expected files to change

- src/app/providers/AppProviders.tsx
- src/app/router/\*\*
- src/app/routes/HomePage.tsx
- src/app/shell/AppShell.tsx
- src/components/ui/Checkbox.tsx
- src/features/profile/\*\*
- src/features/settings/routes/SettingsPage.tsx
- src/lib/appState/\*\*
- src/lib/db/\*\*
- src/lib/domain/\*\*
- src/lib/profile.ts
- src/lib/testing/renderAppAtRoute.tsx
- src/styles/\*\*
- tests/app/App.test.tsx
- tests/architecture/routeDefinitions.test.ts
- tests/components/checkbox.test.tsx
- tests/db/\*\*
- tests/domain/\*\*
- tests/features/profileModel.test.ts
- e2e/dashboard.spec.ts
- docs/modules/module-07-plan.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- DECISIONS.md
- SECURITY.md
- TEST_PLAN.md
- vite.config.ts
- vitest.setup.ts

## Forbidden files / work for Module 07

- No course-map rollups, item-detail logging, resume points, or slice logic.
- No XP ledger, achievements engine, insights charts, or dashboard metrics.
- No backup, import, export, destructive reset UI, or privacy-policy screen.
- No authentication, sync, analytics, backend, remote fonts, or external avatar
  service.
- No schema-version bump or seed-ID churn unless a real compatibility defect
  requires it.

## Acceptance criteria

- A dedicated `/onboarding` route exists and blocks unfinished learners from
  the rest of the app.
- App startup still creates the singleton learner profile safely, but
  onboarding completion is tracked explicitly through app metadata.
- Avatar config is validated against supported face, hair, and top-color
  values instead of accepting arbitrary JSON.
- The learner can create or edit display name, avatar, study days, weekly
  target, theme, and reduced-motion preferences locally.
- Saved theme and reduced-motion preferences are applied to the shell on reload.
- After onboarding, the learner lands on the dashboard placeholder and can
  revisit the profile and settings routes without seeing onboarding again.
- Triple-Zero is achieved with the full validation suite and updated
  documentation.

## Tests expected

- Unit: learner-profile schema rejects invalid avatar config and duplicate study
  days.
- Integration: repository save flow writes learner preferences and marks
  onboarding complete without breaking legacy initialization.
- App route: first-run gating redirects to onboarding, and completed learners
  can open the saved profile route.
- Feature utility: onboarding completion fallback handles legacy customized
  profiles and empty avatar config safely.
- E2E: first run redirects to onboarding, profile creation persists through
  reload, stored preferences apply, unknown routes still render, and offline
  navigation still works after setup.

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

- Module 07 keeps the version-2 Dexie schema and singleton IDs intact.
- The database still creates a default learner-profile record for safety, so
  onboarding status must be tracked separately from profile existence.
- Legacy profiles without `app_meta.onboardingCompletedAt` are treated as
  complete only when their stored values differ from the default bootstrap
  record.

## Rollback plan

- Remove `src/lib/appState`, `src/lib/profile.ts`, the onboarding route, the
  profile components, and the checkbox primitive.
- Restore the Module 06 home-route showcase and the earlier settings
  placeholder route.
- Remove the onboarding-specific tests and restore the previous dashboard and
  home-route Playwright assertions.
- Reset `vite.config.ts` chunk warning configuration if the onboarding module is
  rolled back entirely.
