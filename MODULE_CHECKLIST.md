# Module Checklist

## Current Module

Module: 20 - Final CS50 project packaging
Status: complete

Objective:

- Produce submission-ready packaging documentation: the project `README.md`
  (none existed before), a written demo walkthrough plus CS50 video script
  (`docs/DEMO.md`), and the module plan, with claims tied to actually implemented
  behavior.
- Resolve the long-standing "README and demo deferred to Module 20" item and
  refresh the planning/state docs.
- Add no features and make no runtime/source/dependency/schema/route/
  service-worker change; add no tests; add no binary/screenshot assets.

Expected files changed:

- README.md (new)
- docs/DEMO.md (new)
- docs/modules/module-20-plan.md (new)
- MODULE_CHECKLIST.md
- PROJECT_STATE.md
- CHANGELOG.md
- DECISIONS.md (D-0043)
- TEST_PLAN.md
- VALIDATION_LOG.md

Forbidden files / work for Module 20:

- No runtime application source change (`src/**`); no route change; no UI change.
- No Dexie schema/store/index change; no seed/domain/engine change.
- No service-worker/PWA change (`public/sw.js`, `src/lib/pwa/**`).
- No new dependency and no `package.json` / `package-lock.json` change; no
  package-script change.
- No new tests and no test changes.
- No screenshots, PNGs, or other binary/generated demo assets.
- No backend, authentication, encryption/key-management, cloud sync/backup,
  telemetry/analytics, external APIs, AI, or social features.
- No claims of production-grade security, GDPR/compliance, encryption at rest,
  tamper-resistance, or deployment readiness.

Acceptance criteria:

- `README.md` exists with an accurate overview, a CS50 non-affiliation
  disclaimer, a feature inventory tied to real routes, tech stack, install/run/
  test instructions, the honest privacy/security boundary, scope/non-goals,
  limitations, and CS50 final-project framing.
- `docs/DEMO.md` provides a full written walkthrough and a selective ~3-minute
  CS50 video script, with no binary assets.
- Charts are described as reserved/deferred (not shipped); the `npm run validate`
  teardown caveat and managed-server workaround are stated honestly.
- No exact final test/E2E counts are baked into `README.md` / `docs/DEMO.md`;
  counts live in `VALIDATION_LOG.md`.
- No runtime source, dependency, schema, route, or service-worker change; no new
  tests; no binary assets.
- Module 16 recovery, Module 17 offline, Module 18 accessibility, and Module 19
  local-only guard remain green.

Tests added/updated:

- None. Module 20 is documentation only.

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

- None. Module 20 is documentation only and does not touch Dexie schema, stores,
  indexes, seed data, repositories, or persisted data contracts.

Rollback plan:

- Revert `README.md`, `docs/DEMO.md`, and `docs/modules/module-20-plan.md`.
- Reset the Module 20 planning/state and validation records to the
  post-Module-19 (bundle-hygiene) state.

## Module Status

| Module | Name                                  | Status   |
| ------ | ------------------------------------- | -------- |
| 00     | Repository inspection and state setup | complete |
| 01     | Scaffold                              | complete |
| 02     | Architecture and folders              | complete |
| 03     | Domain types                          | complete |
| 04     | Local database                        | complete |
| 05     | CS50 seed data                        | complete |
| 06     | Design system                         | complete |
| 07     | Onboarding and profile                | complete |
| 08     | Course map                            | complete |
| 09     | Long-form progression engine          | complete |
| 10     | Content detail screen                 | complete |
| 11     | Study session logging                 | complete |
| 12     | XP engine                             | complete |
| 13     | Achievement engine                    | complete |
| 14     | Dashboard                             | complete |
| 15     | Insights                              | complete |
| 16     | Settings, backup, import, reset       | complete |
| 17     | Offline hardening                     | complete |
| 18     | Accessibility and UX hardening        | complete |
| 19     | Security and privacy review           | complete |
| 20     | Final CS50 project packaging          | complete |

## Post-build UX remediation (UX-00 through UX-09)

A separately scoped, learner-facing copy and UX pass layered on top of the
completed Module 00-20 build. It is tracked in `docs/remediation/`
(`ux-remediation-roadmap.md` and `ux-remediation-checklist.md`), not in the
Module table above. It adds no features and keeps the product definition
unchanged (offline-first, local-only, single-user, CS50-only, no account,
backend, cloud sync, analytics, external APIs, AI tutor, or affiliation claim).

| UX module | Name                               | Status   |
| --------- | ---------------------------------- | -------- |
| UX-00     | Audit and baseline lock            | complete |
| UX-01     | Plain-language terminology cleanup | complete |
| UX-02     | Learner-first lecture page         | complete |
| UX-03     | Learner-first problem set page     | complete |
| UX-04     | Stronger XP/achievement/level loop | complete |
| UX-05     | Save history and repair path       | complete |
| UX-06     | Onboarding simplification          | complete |
| UX-07     | Local CS50 guide content           | complete |
| UX-08     | Visual hierarchy polish            | complete |
| UX-09     | Final acceptance review            | complete |

UX-09 is complete (with documented known exceptions): Settings copy fix `8360c5c` plus documentation closeout, including corrected learner/evaluator-facing wording in `README.md` and `docs/DEMO.md`. The manual cross-route acceptance walkthrough was performed
and passed (every route inspected; `npm run build` and `npx playwright test
--workers=2` (24 tests) passed). Known validation exceptions remain (pre-existing
`format:check` formatting noise, repo not normalized; `npm run audit` flags a
transitive `undici@7.27.2` advisory via the test-only `jsdom` devDependency,
package files untouched). No clean-validation or production-readiness claim is
made. The documentation closeout records UX-09 as complete with documented known exceptions.
