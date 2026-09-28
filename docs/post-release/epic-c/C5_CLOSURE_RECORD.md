# Epic C / C5 — closure record (programme-scoped catalogue reads)

## 1. State

**`C5_ACCEPTED_CLOSED_LOCALLY`**

- On 2026-09-28 the owner directly accepted repaired implementation
  candidate `7fd87fe5aea1ec3a0db1cd807e827fc33c3c6b04` and the documented
  residual boundaries (§10). The acceptance is recorded by a
  documentation-only acceptance commit, which does not change the accepted
  implementation bytes.

- C5 was implemented on 2026-09-28 under a direct owner instruction: C5 from
  the C4 clarification tip `609cb607`, local commits only, review-ready state
  at most.
- The first candidate, `9c704f0f`, was **not accepted by independent owner
  review** (§7). Its readiness record `3bdf71b2` is superseded by this
  revision. Both remain in history; the first candidate's validation does not
  certify the repaired bytes.
- The owner authorized one bounded repair round from `3bdf71b2`. The repaired
  implementation candidate is `7fd87fe5` (§2). Every required final gate
  passed on that exact commit (§8).
- C6 has not started and is not authorized. Its prerequisite "C5 accepted"
  is now met; OD-1 to OD-5, an accepted schema-change decision record and the
  C6 readiness record are not, and starting C6 needs a separate direct owner
  instruction.
- Publication is deferred. Nothing was pushed, merged, tagged or deployed, and
  `origin/master` and Production are unchanged.

## 2. Identities

| Item                      | Value                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Owner authorization       | direct owner instructions, 2026-09-28: C5 from `609cb607`; one bounded repair round from `3bdf71b2`     |
| Branch                    | `cx/epic-c5-programme-scoped-reads`                                                                     |
| Branch point              | `609cb60743cc20fb178c5eac2f4fc3120ae23ea6` (C4 clarification tip; tree `26b712db`, `src` `4eac5095`)    |
| First candidate           | `9c704f0fd331a6f7f56d76087ddec053c50a072a` (tree `ac502d42`, `src` `927a565c`): **not accepted**        |
| First readiness record    | `3bdf71b2337b673a5d98c28e80b1f1ca1b0df846` (docs only): **superseded**                                  |
| Accepted implementation   | `7fd87fe5aea1ec3a0db1cd807e827fc33c3c6b04` (tree `e376435d`, parent `3bdf71b2`): **accepted**           |
| Accepted `src` subtree    | `0eb3b51ca3fa87aec9349d29e4ce8358c82f5e6a`                                                              |
| Repaired readiness record | `83cc12e9de880e4e7de9e295942b60237c11f933` (docs only, parent `7fd87fe5`): pre-acceptance readiness tip |
| Acceptance record         | the documentation-only commit that records the acceptance (parent `83cc12e9`)                           |

## 3. What C5 implements

- **One resolution at bootstrap.** The app composition root
  (`app/providers/AppProviders.tsx`) resolves the active programme once and
  passes a neutral `ProgrammeScope` (catalogue, catalogue identity
  `course_units.courseId`, policy; `lib/domain`) to `AppStateProvider`. The
  provider resolves it once per mount, seeds **that** catalogue (not a
  hard-wired bundled seed), and exposes `programmeScope` in app state. A
  failed resolution is kept as the existing bootstrap error ("Local data
  could not be loaded."); no default programme is substituted.
- **Explicit scope in features.** RPG loaders and the RPG progress action
  take the scope as their first argument. RPG pages and the RPG shell,
  Classic Course, Dashboard and Content Detail, study sessions, achievements,
  insights, and reset/restore take it from app state and pass it explicitly.
  No feature derives a catalogue identity or read/write options from the
  programme accessor (§6).
- **Scoped reads** (`src/lib/db`). Units by the `courseId` index; items by
  those unit IDs; progress, assets, slices and resume points by the scoped
  item IDs; media history by the scoped asset IDs; one query per store in one
  read-only transaction. Used by the RPG Map, HUD, Hub and Hero readers
  (aggregated media) and by the Classic Course map and Dashboard
  (`getCatalogueCourseState`, raw media history). A catalogue with no
  materialized unit fails closed.
- **Foreign IDs.** An RPG module or resource of another catalogue is not
  found. Classic Content Detail loads the item and its unit first and treats
  an item of another catalogue as not found, before reading progress or
  assets. Progress and media saves reject an item of another catalogue
  before any write.
- **Achievement catalogue context.** The unlock evaluator reads the active
  catalogue's units and items only; progress, slices, media events and
  sessions stay whole-store, so activity achievements and global unlock
  ownership (OD-2) are unchanged.
- **Stays global.** XP ledger and level (OD-1), unlocks (OD-2), study
  sessions, the session item picker, insights and profile (OD-4),
  backup/export.

No schema, index or Dexie version change was needed.

## 4. P3 and repair evidence

`tests/programmes/catalogueScope.test.tsx` materializes a test-only second
catalogue (`c5-alt-catalogue`; distinct catalogue, unit and item IDs) next to
CS50 through the real seed sync. Its definition passes real definition
validation and is never registered.

- **RED (first candidate, on the unchanged C4 source).** 11 of 13 failed,
  each a catalogue-isolation failure (merged 16-unit CS50 map, foreign
  modules and resources resolving, `course-complete` waiting on the other
  catalogue, wrong scopes rendering CS50 data). That RED stands.
- **Readers (23 tests in the repaired file).** With both catalogues
  materialized, the CS50 scope sees only CS50 units and items (map, HUD, hub,
  hero) and the alternate scope only its own (map, hub, module, resource, and
  the Classic reader); foreign module and resource IDs are not found; a valid
  scope whose catalogue is not materialized fails closed; the XP total and
  session count stay global under either scope; `course-complete` unlocks
  with trigger `cs50x-2026`; the production registry is `['cs50x-2026']`.
- **Bootstrap.** A provider given a resolver resolves it exactly once,
  exposes its scope and seeds only its catalogue; a failing resolver yields
  the existing bootstrap error, no scope, and no seeded catalogue. Through
  the real app, an alternate definition injected at the composition root
  drives `/rpg/map` and the Classic `/course` to show only its catalogue, and
  the bootstrap materializes it.
- **Classic surfaces (CS50 active, both catalogues).** `/course` renders
  only CS50 unit cards. The Dashboard's course progress (`0 of 14` units),
  "What's next?" and saved-progress activity exclude the alternate catalogue
  while XP (`80 XP total`) and the study-session count (2) stay global.
  `/course/c5-alt-unit-a-lecture` renders the existing "Course content could
  not be opened" state with the existing not-found message, offers no save,
  and writes no progress, XP or unlock. Direct progress and media saves for
  the foreign item reject before any write (database snapshot unchanged); a
  CS50 save still awards `xp-lecture_completed-week-0-lecture-completed`.
- **Fail closed through the actual route.** With a composition scope whose
  catalogue identity has no materialized unit, `/rpg/map`, `/rpg`,
  `/rpg/hero`, `/rpg/week/week-0`, `/course`, `/dashboard` and
  `/course/week-0-lecture` render their existing error states (never a CS50
  or empty map), and `/rpg/resource/week-0-lecture` offers no save form.
- **Exact limit of the registry claim.** The unmaterialized-scope route cases
  inject a composition scope that bypasses definition validation; they do not
  exercise registry rejection of an unregistered key. Registry rejection is
  proven by `registry.test.ts` (`getProgrammeDefinition` throws for
  unregistered keys; `getActiveProgrammeDefinition` requires exactly one
  definition), and the repaired provider turns a resolution failure into the
  bootstrap error (above). A route-level test of an accessor failure is not
  claimed: C4 terminology is read during render, so such a failure reaches
  the router's default error handling. The C5 story requires an unregistered
  key **or** an unmaterialized catalogue to fail closed through the actual
  route; the unmaterialized side is proven.
- **Disposable mutation probes (not committed).** Dropping the Content Detail
  catalogue check and the save guard failed 3 of 23; reading units
  whole-store failed 13; not seeding the resolved catalogue at bootstrap
  failed 2. The first candidate's probes (whole-store units, module and
  resource checks) also failed their tests. Every file was restored and
  checked byte-identical by SHA-256.

## 5. Epic A read boundaries and C1 preservation

- Every Epic A suite passes: Map, Module, Resource, Hub/Hero/HUD, Focus,
  Badges, A7 route access, aggregate preservation and cursor errors. Store
  allowlists, one read-only transaction, zero writes, per-store query counts
  and budgets, history scan counts, zero materialized history rows, missing-ID
  semantics and failure propagation are unchanged.
- Deliberate test changes, each with the same assertions: the three A1–A3
  scale fixtures materialize under the active catalogue identity; the two
  Map/read-model failure injections target the scoped `courseUnits.where`
  query; the C1 transient error-state test also rejects
  `getCatalogueCourseState`, the reader Course and Dashboard now use
  (Insights still lists units and keeps its injection); app-state fixtures
  and mocks carry the CS50 scope; test call sites pass the scope as C3 added
  `policy`. No `expect`, expected value or fixture file changed
  (`tests/fixtures` unchanged). Every C1 suite passes.

## 6. Architecture

- `tests/architecture/programmeScopeComposition.test.ts` (with a positive
  control): only the composition root derives a catalogue identity from the
  programme accessor; no app or feature file builds read/write options from
  the accessor; nothing in `app`, `features`, `lib` or `components` imports
  the bundled seed.
- `programmesLayer` (no `src/lib` → `@/programmes`), G-7 (no CS50 literal in
  `src/lib`), `rpgFeature`, `routeDefinitions`, `achievementsFeature`,
  `sessionsFeature`, `localOnly` and `check:circular` pass. Lib readers have
  no default catalogue.

## 7. Independent review findings and repair

The owner did not accept `9c704f0f`:

- **A — scope not resolved once at bootstrap.** Feature helpers
  (`readModels`, `progressActions`, Content Detail, study sessions) each
  called the programme accessor for the catalogue identity and policy.
  Repaired by the single bootstrap resolution (§3).
- **B — Classic reads mixed.** The Classic Course map, the Dashboard's
  course context and Content Detail read unscoped, and Content Detail could
  open a foreign item and save it with the active programme's policy.
  Repaired (§3, §4).
- **Evidence wording.** The first record called an injected definition an
  "unregistered, unmaterialized definition key" route failure; it never
  exercised registry rejection. Corrected (§4).

Failures during the repair were test-side and classified before repair:
fixtures and mocks without the scope (A6 classic render, the final
presentation Insights render, save-spy argument positions), one wrong
progress status value and one over-broad argument-index edit in the
repair's own test changes. No
further product defect appeared.

## 8. Final validation (repaired candidate `7fd87fe5`)

| Check                    | Result                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `npm run lint`           | exit 0, 0 warnings                                                                        |
| `npm run format:check`   | exit 0                                                                                    |
| `npm run typecheck`      | exit 0                                                                                    |
| `npm test`               | exit 0; 87 files / 902 tests passed, 0 skipped (first candidate: 86 / 888)                |
| `npm run check:circular` | exit 0, no cycle                                                                          |
| `npm run build`          | exit 0                                                                                    |
| `npm run check:bundle`   | exit 0, 0 violations; largest JS chunk 395,321 bytes (C4: 393,987)                        |
| `npm run test:e2e`       | exit 0; 90/90 passed, 0 skipped, 0 retries, 6.6 min; includes the axe accessibility specs |
| `git diff --check`       | exit 0                                                                                    |

- No test was skipped, retried or weakened, and no timeout changed.
- This product validation belongs to the accepted implementation
  `7fd87fe5`. It was not rerun for the documentation-only readiness commit
  `83cc12e9` or the acceptance commit, which change no code, test,
  configuration or evidence.
- `verify:release` was not run, because publication is a separate decision.
- The E2E aggregate regenerated the 64 disposable C1 captures. All 64 are
  byte-identical (same-name per-PNG SHA-256) to the accepted inventory in
  `c1-visual-baseline-69b1db7.zip`. The ZIP was not regenerated and is
  unchanged (SHA-256 `cb404591…917c`).

## 9. Scope proof

`git diff 609cb607 7fd87fe5 -- src` changes 21 files: `lib/db`
(`repositories.ts`, `index.ts`), `lib/appState` (context and provider),
`lib/domain/programmePolicy.ts`, `app/providers/AppProviders.tsx`, the RPG
read models, progress action, pages and shell, and the Classic Course,
Dashboard, Content Detail, sessions, achievements, insights, onboarding and
settings surfaces. It is empty for `src/lib/db/database.ts`, `src/lib/backup`,
`src/lib/xp`, `src/lib/achievements`, `src/lib/routing`, `src/programmes`,
`src/seed`, `src/styles`, `src/components`, the router, shells and app routes,
the RPG components and assets, `tests/fixtures`, `e2e`, `public`, `scripts`,
and every package, config and deployment file; the repair commit changes no
documentation. No `className` changed. No `programmeId`, enrolment,
active-key storage, schema, index, version, backup, route, copy, layout or CSS
change exists, and the registry has one entry. No C6–C8 work was done.

## 10. Residual limits

The owner accepted these residual boundaries with the implementation on
2026-09-28. The acceptance authorizes no broader scoping, OD-4 decision or C6
work.

- Presentation and content lookups still use the programme accessor during
  render or in pure builders: C4 terminology, C2 links and guides, the C3
  status workflow for status options, achievement titles in save outcomes,
  badge counts and the reward label's policy. They supply no catalogue
  identity and no read/write options; with one registered definition they
  resolve the same definition as the bootstrap.
- With a second catalogue materialized, a global study session for an item of
  another catalogue is labelled by its item ID in the Dashboard's recent
  activity, because titles come from the active catalogue (OD-4 keeps
  sessions global). Production has one catalogue.
- The session item picker (including RPG Focus) lists every materialized
  catalogue's units and items (OD-4).
- The unlock evaluator fails closed if the active catalogue has no
  materialized unit; the bootstrap always materializes it first.
- Registry-rejection evidence is unit-level plus the provider bootstrap
  error (§4); the actual-route proof is for an unmaterialized catalogue.

## 11. Disposition

- **C5:** accepted and closed locally. The owner accepted implementation
  `7fd87fe5` and the §10 residual boundaries on 2026-09-28. First candidate
  `9c704f0f` was not accepted; its readiness record `3bdf71b2` is superseded;
  `83cc12e9` is the repaired pre-acceptance readiness tip.
- **C6:** not started and not authorized. Its "C5 accepted" prerequisite is
  met; it remains blocked on OD-1 to OD-5, an accepted schema-change decision
  record and the C6 readiness record, and needs a separate direct owner
  instruction.
- **Publication:** deferred; `origin/master` and Production are unchanged.
