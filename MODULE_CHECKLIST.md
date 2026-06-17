# Module Checklist

## Current Module

Module: 19 - Security and privacy review
Status: complete

Objective:

- Audit the app for local-only security and privacy risks using source,
  build-output, and dependency-posture evidence.
- Refresh the security baseline to current reality (Modules 14-18), add a
  local-only privacy boundary document, and lock the verified local-only
  invariant with one narrow regression guard.
- Add no security features and make no runtime/source/dependency/schema/
  service-worker change.

Expected files changed:

- SECURITY.md
- PRIVACY.md (new)
- tests/architecture/localOnly.test.ts (new)
- docs/modules/module-19-plan.md (new)
- PROJECT_STATE.md
- DECISIONS.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- TEST_PLAN.md

Forbidden files / work for Module 19:

- No new dependency and no `package.json` / `package-lock.json` change.
- No Dexie schema/store/index change; no seed/domain/engine change.
- No route change; no service-worker/PWA edits (`public/sw.js`, `src/lib/pwa/**`);
  no manifest/installability work.
- No runtime application source change (no `src/**` runtime code edits); the only
  code artifact is the new test under `tests/`.
- No authentication, encryption/key-management, cloud sync/backup, telemetry/
  analytics, external APIs, or AI features.
- No Module 20 packaging/README/demo work.

Acceptance criteria:

- `SECURITY.md` reflects Modules 14-19; stale open risks (claiming no data
  control and no cold-start offline) are corrected.
- `PRIVACY.md` documents the local-only boundary, user-controlled
  backup/export/import/reset, and explicit non-guarantees.
- `tests/architecture/localOnly.test.ts` passes and fails when runtime `src/`
  source introduces a network-request primitive, dynamic code execution, a
  raw-HTML injection sink, or a non-allowlisted external URL.
- The reserved-dependency and embedded-`package.json` findings are documented
  honestly, with the dependency claim verified against build output.
- No runtime source, dependency, schema, route, or service-worker change.
- Module 16 recovery, Module 17 offline, and Module 18 accessibility behavior
  remain green.

Tests added/updated:

- `tests/architecture/localOnly.test.ts` (local-only source-safety guardrail)

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

- None. Module 19 is docs plus one test and does not touch Dexie schema, stores,
  indexes, seed data, repositories, or persisted data contracts.

Rollback plan:

- Revert `tests/architecture/localOnly.test.ts` and `PRIVACY.md`.
- Reset `SECURITY.md` and the Module 19 documentation and validation records to
  the Module 18 state.

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
| 17     | Offline hardening                     | complete    |
| 18     | Accessibility and UX hardening        | complete    |
| 19     | Security and privacy review           | complete    |
| 20     | Final CS50 project packaging          | not started |
