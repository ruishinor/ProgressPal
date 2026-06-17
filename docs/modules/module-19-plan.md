# Module 19 Plan - Security and Privacy Review

> Status: **Module 19 complete.** This is a review-and-document module, not a
> feature module. It refreshes the security baseline to current reality, adds a
> local-only privacy boundary document, and adds one narrow source-safety
> guardrail test. It changes **no runtime application source**, no Dexie schema,
> no routes, no service worker, and no dependencies (`package.json` /
> `package-lock.json` are untouched).

## Summary

- Audit the app for local-only security and privacy risks using evidence from
  the current source, build output, and dependency posture.
- Refresh `SECURITY.md` so it reflects Modules 14-18 (it had drifted to a
  "Module 13 complete" snapshot and still described already-shipped gaps as
  missing).
- Add `PRIVACY.md`: a plain, accurate, local-only privacy boundary - not a
  marketing README and not a compliance claim. README and demo assets remain
  Module 20.
- Add one narrow regression guard (`tests/architecture/localOnly.test.ts`) that
  fails when runtime source under `src/` introduces an obvious network,
  dynamic-code-execution, or HTML-injection primitive.

## Confirmed findings (evidence-based)

- The offline-only, local-first posture holds up under inspection. Runtime
  source under `src/` contains no network request primitives (no fetch helper,
  XHR, beacon, web socket, or event source), no dynamic code execution (no eval
  or runtime function compilation), and no raw-HTML injection sinks (no React
  raw-inner-HTML escape hatch, no `innerHTML`/`outerHTML` assignment, no
  document write). The only absolute URL in source is the SVG XML namespace in
  `ProfileAvatar.tsx`, which is an identifier, not a network call.
- `index.html` loads no external scripts, fonts, analytics, or trackers.
- The service worker (`public/sw.js`) caches same-origin `GET` only, returns
  early for cross-origin requests, never touches IndexedDB, and cleans up old
  caches on activate.
- Backup import (`src/lib/backup/envelope.ts`) validates strictly with Zod,
  enforces a 25 MB size guard, checks format/format-version/schema-version,
  rejects duplicate IDs, surfaces learner-safe error messages, and never
  executes file content.
- `SECURITY.md` was stale: its header read "Module 13 complete", its per-module
  controls stopped at Module 13, and its open risks still claimed that no
  export/import/reset flow existed (shipped in Module 16) and that cold-start
  offline was not present (shipped in Module 17).

## Findings carried as documented risks (not fixed here)

- **Unused-but-reserved dependencies.** `recharts` and `date-fns` are declared
  runtime dependencies but are not imported by application source. The build
  confirms their **library code is not bundled** (no recharts/date-fns chunk and
  no library identifiers such as `ResponsiveContainer` or `formatDistance` in the
  built output). They appear reserved for the retained future Charts feature.
  Per the approved decision they are **documented, not removed**, in Module 19;
  removal is deferred to a separate dependency-pruning decision if Charts is
  later dropped or re-scoped. They remain part of install/audit supply-chain
  surface.
- **Full `package.json` embedded in the client bundle.**
  `src/lib/db/constants.ts` does `import packageJson from '../../../package.json'`
  to read `packageJson.version`. Because the whole JSON default object is
  imported, the production bundle inlines the entire `package.json` - including
  every dependency, devDependency, and npm script - as a string literal. This is
  why the dependency names `date-fns` and `recharts` are present in the built
  output even though their code is not. Severity is low for an offline,
  single-user, local-only app (the manifest is not secret and never leaves the
  device), but it is needless shipped surface. A follow-up fix (a named
  `version` import or a build-time define) is recommended and is outside this
  module's documentation-only scope.
- **Console error logging.** Several route loaders and `AppStateProvider` log
  raw error objects with `console.error`. The console is local-only (no
  telemetry), so this is low risk; noted in the threat model rather than changed.

## Scope boundaries

- No backend, authentication, encryption/key-management, cloud sync/backup,
  telemetry/analytics, external APIs, or AI.
- No new dependency; no `package.json` / `package-lock.json` change.
- No Dexie schema/store/index change; no seed/domain/engine change.
- No route change; no service-worker/PWA change (`public/sw.js` and
  `src/lib/pwa/**` untouched); no manifest/installability work.
- No runtime application source change. The only code artifact is the new
  test under `tests/`.
- No Module 20 packaging/README/demo work.
- This review is not converted into new security features, and it does not
  claim security or privacy guarantees beyond the evidence. "Local-only" does
  not mean encrypted, tamper-proof, certified, or safe against device access.

## Implementation

- `SECURITY.md`: refreshed current stage and attack surface; added Module 14-18
  controls and a Module 19 review section; updated the threat-model baseline and
  open risks (removed stale "no data control" / "no cold-start offline" claims);
  documented the reserved dependencies, the embedded-manifest finding, and the
  new guardrail test.
- `PRIVACY.md` (new): local-only privacy boundary, what is stored and where,
  user-controlled backup/export/import/reset, and explicit non-guarantees.
- `tests/architecture/localOnly.test.ts` (new): deliberately boring source scan
  over `src/` .ts/.tsx (excluding test files), with comment stripping and an
  XML-namespace URL allowlist, to guard the local-only invariant against
  regressions.
- Planning docs updated: `PROJECT_STATE.md`, `MODULE_CHECKLIST.md`,
  `CHANGELOG.md`, `DECISIONS.md` (D-0041), `TEST_PLAN.md`, `VALIDATION_LOG.md`.

## Validation protocol

- Targeted: `npx vitest run tests/architecture/localOnly.test.ts`.
- Full suite: `npm run lint`, `npm run format:check`, `npm run typecheck`,
  `npm run build`, `npm run test`, `npm run test:e2e`, `npm run check:circular`,
  `npm run audit`.
- If exact `npm run validate` still hangs on the known Playwright webServer
  teardown issue (a Module 18 tooling caveat, not in this module's scope), fall
  back to the documented managed-server full-suite-equivalent and record it
  honestly. Do not claim exact `npm run validate` passed unless it actually did.
- Confirm Module 16 recovery, Module 17 cold-start offline, and Module 18
  accessibility behavior remain green.

## Handoff notes

- The dependency claim was verified against built output before being written:
  recharts/date-fns library code is not bundled, but their names appear inside
  the embedded `package.json` manifest. Phrasing in the docs is intentionally
  narrow.
- The embedded-`package.json` bundle-hygiene finding is the most actionable
  follow-up and is a good candidate for a small, isolated future change.
