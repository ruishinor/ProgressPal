# Module 20 Plan - Final CS50 Project Packaging

> Status: **Module 20 implemented in the working tree (docs-only); final
> validation pending.** This is the final packaging module. It adds
> submission-ready documentation only: it changes **no runtime application
> source**, no Dexie schema, no routes, no service worker, no dependencies, and no
> package scripts (`package.json` / `package-lock.json` are untouched). It adds no
> tests.

## Summary

- Create the project `README.md` (the first one in the repo — only `node_modules`
  READMEs existed before), with an accurate overview, feature inventory tied to
  the real routes, tech stack, install/run/test instructions, the honest
  privacy/security boundary, scope/non-goals, limitations, and CS50 final-project
  framing.
- Create `docs/DEMO.md`: a written demo walkthrough plus a ~3-minute CS50 video
  narration script. No screenshots or binary assets.
- Refresh the planning/state docs to mark Module 20 complete and resolve the
  long-standing "README and demo deferred to Module 20" item.

## Scope boundaries

- Documentation only. No runtime application source change (`src/**`), no route
  change, no UI change.
- No Dexie schema/store/index change; no seed/domain/engine change.
- No service-worker/PWA change (`public/sw.js`, `src/lib/pwa/**`).
- No dependency change (`package.json` / `package-lock.json` untouched); no
  package-script change.
- No new tests and no test changes.
- No screenshots, PNGs, or other binary/generated assets (per D-0043 the demo
  assets are written, source-controlled materials).
- No backend, authentication, encryption/key-management, cloud sync/backup,
  telemetry/analytics, external APIs, AI, or social features.
- No claims of production-grade security, regulatory/GDPR compliance, encryption
  at rest, tamper-resistance, or deployment readiness. "Local-only" is documented
  honestly as "data not transmitted", not as "encrypted or safe against device
  access".
- `.claude/settings.local.json` stays uncommitted local noise; it is never
  staged.

## Accuracy rules for the docs

- Every feature claim maps to a real route in
  `src/app/router/routeDefinitions.ts` and a real feature folder under
  `src/features/`.
- Charts are described as reserved/deferred, never as shipped: `recharts` and
  `date-fns` are declared but unimported (D-0041).
- Install/run/test commands match `package.json` scripts exactly.
- Privacy/security wording mirrors `PRIVACY.md` and `SECURITY.md`.
- The `npm run validate` teardown caveat and the managed-server workaround are
  stated honestly; no claim is made that bare `npm run validate` passed.
- No exact final test/E2E counts are written into `README.md` or `docs/DEMO.md`;
  counts and results live in `VALIDATION_LOG.md` (and the implementation report).

## Implementation

- `README.md` (new): overview, non-affiliation disclaimer, feature inventory,
  not-included list, tech stack, project layout, getting started
  (install/dev/build/preview), testing & validation with the known caveat,
  privacy/security boundary, limitations, CS50 notes, and a repository map.
- `docs/DEMO.md` (new): a full click-through walkthrough (onboarding → progress →
  long-form watched ranges/resume → study session → XP/level → achievement →
  dashboard → insights → settings backup/export/import/reset → offline) and a
  selective ~3-minute CS50 video narration script focused on the core loop.
- `docs/modules/module-20-plan.md` (new): this plan.
- Planning docs updated: `MODULE_CHECKLIST.md`, `PROJECT_STATE.md`,
  `CHANGELOG.md`, `DECISIONS.md` (D-0043), `TEST_PLAN.md`, `VALIDATION_LOG.md`.

## Validation protocol

- Run validation **after** all documentation edits are complete.
- Because the docs are Markdown, the most relevant gate is `format:check`
  (Prettier on `.md`); the rest of the suite is a regression confirmation since
  no code changed.
- Full suite: `npm run lint`, `npm run format:check`, `npm run typecheck`,
  `npm run build`, `npm run test`, `npm run test:e2e`, `npm run check:circular`,
  `npm run audit`.
- Use the documented managed-server full-suite-equivalent method (dev and
  production-preview servers started explicitly and reused by Playwright) if bare
  `npm run validate` still hangs on Playwright web-server teardown. Record the
  method honestly; do not claim bare `npm run validate` passed unless it did.
- Confirm Module 16 recovery, Module 17 offline, Module 18 accessibility, and
  Module 19 local-only guard remain green.

## Handoff notes

- Stop before commit/push. Report exact files changed, exact validation commands
  used, results and caveats, confirmation that `.claude/settings.local.json` is
  still uncommitted, confirmation of no runtime/schema/dependency/route/
  service-worker/binary changes, the final `git status -sb`, and a concise diff
  summary, then wait for explicit approval of the final commit.
- This is the last module in `ROADMAP.md`; after it is committed, the offline
  CS50 MVP endpoint is reached.
