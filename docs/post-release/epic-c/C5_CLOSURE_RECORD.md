# Epic C / C5 — closure record (programme-scoped catalogue reads)

## 1. State

**`C5_IMPLEMENTED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`**

- C5 was implemented on 2026-09-28 under a direct owner instruction: C5 from
  the C4 clarification tip `609cb607`, local commits only, review-ready state
  at most.
- The implementation candidate is `9c704f0f` (§2). Every required final gate
  passed on that exact commit (§7).
- **C5 is not accepted.** The owner decides whether to accept or reject the
  candidate.
- C6 has not started and is not authorized. Its prerequisites (C5 accepted,
  OD-1 to OD-5, a schema-change decision record, the C6 readiness record) are
  not met.
- Publication is deferred. Nothing was pushed, merged, tagged or deployed, and
  `origin/master` and Production are unchanged.

## 2. Identities

| Item                     | Value                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Owner authorization      | direct owner instruction, 2026-09-28: C5 from `609cb607`, local commits, review-ready at most        |
| Branch                   | `cx/epic-c5-programme-scoped-reads`                                                                  |
| Branch point             | `609cb60743cc20fb178c5eac2f4fc3120ae23ea6` (C4 clarification tip; tree `26b712db`, `src` `4eac5095`) |
| Implementation candidate | `9c704f0fd331a6f7f56d76087ddec053c50a072a` (tree `ac502d42`, parent `609cb607`)                      |
| Candidate `src` subtree  | `927a565cabbe33086cb080f491c0dde25b9a36ff`                                                           |
| Readiness record         | the documentation-only commit that adds this file (parent `9c704f0f`)                                |

## 3. What C5 implements

- **Explicit scope from composition.** The RPG read models resolve the active
  definition before any read transaction opens and pass its catalogue
  identity (`course_units.courseId`) and policy to `src/lib/db`
  (`withActiveProgramme`). Write paths receive the same scope from their
  composition sites (RPG progress action, Classic content detail, study
  sessions). `src/lib/**` still never imports `@/programmes`, and no lib
  reader has a default catalogue.
- **Scoped course state** (`readScopedCatalogue`, `readScopedCourseState`).
  Units are read by the `courseId` index. Items are bounded by those unit
  IDs; progress, content assets, slices and resume points by the scoped item
  IDs; media history by the scoped asset IDs. Each store is read once, in the
  caller's single read-only transaction. Used by the Map, HUD, Hub and Hero
  readers, and by XP preview (reward-source) context derived from them.
- **Fail closed.** A catalogue with no materialized unit throws; it is never
  read as an empty course. A module or resource whose unit belongs to another
  catalogue is not found (`null`). Routes therefore reach their existing
  error states.
- **Achievement catalogue context.** The unlock evaluator reads the active
  catalogue's units and items only, so `course-complete` and the unit and
  item-type rules evaluate against that catalogue. Progress, slices, media
  events and sessions stay whole-store, so activity achievements
  (`first-step`, `first-slice`, `clean-stop`, the session rules) and global
  unlock ownership (OD-2) are unchanged.
- **Stays global.** XP ledger and level (OD-1), unlocks (OD-2), sessions,
  insights and profile (OD-4), backup/export.

No schema, index or Dexie version change was needed: `course_units.courseId`,
`course_items.unitId` and the `itemId`/`assetId` indexes already bound every
scoped read.

## 4. P3 discriminating evidence

`tests/programmes/catalogueScope.test.tsx` materializes a test-only second
catalogue (`c5-alt-catalogue`; distinct catalogue, unit and item IDs) next to
CS50 through the real seed sync. Its definition passes the real definition
validation, is injected by module mock, and is never registered.

- **RED on the unchanged C4 source (11 of 13 failed).** Every failure was a
  catalogue-isolation failure: the CS50 map returned 16 units (14 CS50 + 2
  alternate); alternate modules and resources resolved under CS50; the
  alternate definition saw CS50 units; `course-complete` never unlocked
  because the evaluator waited on the other catalogue; and wrong or
  unmaterialized scopes rendered the full CS50 map, hub, hero, module and
  resource. The two passing tests were controls (production registry;
  global XP and sessions). One earlier run also failed on a test import
  (`loadRpgHudSummary` is not a public entrypoint export); that fixture error
  was fixed and was not counted as RED.
- **GREEN on the candidate (13 of 13).** CS50 requests see only CS50 units
  and items (map, HUD, hub, hero); the alternate definition sees only its own
  (map, hub, module, resource) in both directions; the XP total and session
  count stay global under either definition; `course-complete` unlocks with
  trigger `cs50x-2026`; the production registry is still `['cs50x-2026']`.
- **Actual routes fail closed.** With an unregistered, unmaterialized key and
  with a valid test definition whose catalogue is not materialized,
  `/rpg/map` shows "Campaign map could not be read" (no CS50 node, not
  "Campaign map is empty"); `/rpg`, `/rpg/hero` and `/rpg/week/week-0` show
  their existing error states; `/rpg/resource/week-0-lecture` shows no save
  form. With the alternate catalogue materialized and active, `/rpg/map`
  renders only its units.
- **Disposable mutation probes (not committed).** Reading units whole-store
  and dropping the module check failed 10 of 13; dropping only the resource
  check failed 3 of 13. The file was restored and checked byte-identical by
  SHA-256 after each probe.

## 5. Epic A read boundaries and C1 preservation

- Every Epic A suite passes: Map, Module, Resource, Hub/Hero/HUD, Focus,
  Badges, A7 route access, aggregate preservation and cursor errors. Store
  allowlists, one read-only transaction, zero writes, per-store query counts
  and budgets, history scan counts, zero materialized history rows, missing-ID
  semantics and failure propagation are unchanged.
- Deliberate test changes, each with the same assertions:
  - three scale fixtures (`a1`/`a2`/`a3` Map, Module, Resource) now
    materialize their synthetic catalogue under the active catalogue
    identity, because the loaders read only that catalogue;
  - two failure injections (`mapReadBoundary`, `readModels`) move from
    `courseUnits.toArray` to the scoped `courseUnits.where` query that the
    readers now use; the load still rejects with the same error and writes
    nothing.
- Test call sites for the scoped readers and write paths pass the CS50
  catalogue identity (`cs50CatalogueId`), as C3 added `policy`. No `expect`,
  expected value or fixture file changed (`tests/fixtures` unchanged). Every
  C1 suite passes.

## 6. Architecture

- `programmesLayer`, `programmePolicyOwnership` (G-7), `rpgFeature`,
  `routeDefinitions`, `achievementsFeature`, `sessionsFeature`, `localOnly`
  and `check:circular` pass.
- The active definition is resolved in feature composition, never inside a
  passive read transaction; lib code has no CS50 literal.

## 7. Final validation (implementation candidate `9c704f0f`)

| Check                    | Result                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `npm run lint`           | exit 0, 0 warnings                                                                        |
| `npm run format:check`   | exit 0                                                                                    |
| `npm run typecheck`      | exit 0                                                                                    |
| `npm test`               | exit 0; 86 files / 888 tests passed, 0 skipped (C4: 85 / 875)                             |
| `npm run check:circular` | exit 0, no cycle                                                                          |
| `npm run build`          | exit 0                                                                                    |
| `npm run check:bundle`   | exit 0, 0 violations; largest JS chunk 393,481 bytes (C4: 393,987)                        |
| `npm run test:e2e`       | exit 0; 90/90 passed, 0 skipped, 0 retries, 5.8 min; includes the axe accessibility specs |
| `git diff --check`       | exit 0                                                                                    |

- No test was skipped, retried or weakened, and no timeout changed.
- `verify:release` was not run, because publication is a separate decision.
- The E2E aggregate regenerated the 64 disposable C1 captures. All 64 are
  byte-identical (same-name per-PNG SHA-256) to the accepted inventory in
  `c1-visual-baseline-69b1db7.zip`. The ZIP was not regenerated and is
  unchanged (SHA-256 `cb404591…917c`).

## 8. Scope proof

`git diff 609cb607 9c704f0f` changes five `src` files
(`lib/db/repositories.ts`, `features/rpg/model/readModels.ts`,
`features/rpg/model/progressActions.ts`,
`features/course/routes/ContentDetailPage.tsx`,
`features/sessions/components/StudySessionsSurface.tsx`) and tests. It is
empty for `src/lib/db/database.ts`, `src/lib/backup`, `src/lib/domain`,
`src/lib/xp`, `src/lib/achievements`, `src/lib/routing`, `src/programmes`,
`src/seed`, `src/styles`, `src/components`, `src/app`, the RPG routes,
components, shell and assets, `tests/fixtures`, `e2e`, `public`, `scripts`,
`docs`, and every package, config and deployment file. No `programmeId`,
enrolment, active-key, schema, index, version, backup, route, copy, layout or
CSS change exists; the registry has one entry. No C6–C8 work was done.

## 9. Residual limits

- **Classic list-based surfaces are not scoped.** The Classic course map,
  dashboard and content detail still read through unscoped `list*`/`get*`
  calls. The live C5 `allowed_scope` names `src/lib/db` read paths and
  `features/rpg` read models, and the C0 C5 guard plan targets the RPG read
  paths; scoping the Classic surfaces would need new bounded list APIs and
  a change to how the frozen C1 transient error states are injected. With
  one materialized catalogue (production) the output is identical. If the
  owner wants Classic scoped, that is a bounded follow-up decision.
- The XP award path already evaluates only the saved item's unit and the
  policy's own milestone items. A save for an item outside the active
  catalogue is unreachable through RPG routes after C5; the unscoped Classic
  content-detail route can still open one, as before C5.
- Sessions (including RPG Focus) keep their whole-catalogue unit/item picker
  (OD-4).
- The evaluator fails closed if the active catalogue has no materialized
  unit; in production the bundled catalogue is always materialized at
  bootstrap.
- The render-time terminology reads added by C4 call the active-definition
  accessor during render; an accessor that throws would reach the router's
  default error handling, not a page error state. The registry itself rejects
  unregistered keys (C2).

## 10. Disposition

- **C5:** implemented and validated locally; ready for owner review; **not
  accepted**.
- **C6:** not started and not authorized; blocked on C5 acceptance and owner
  decisions OD-1 to OD-5.
- **Publication:** deferred; `origin/master` and Production are unchanged.
