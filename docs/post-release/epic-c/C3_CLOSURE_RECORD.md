# Epic C / C3 — closure record (CS50 reward, workflow and catalogue policy)

## 1. State

**`C3_IMPLEMENTED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`**

- C3 was implemented on 2026-09-27 under a direct owner instruction: C3 from
  the accepted C2 closure tip `be40f839`, local commits only.
- The implementation candidate is `78ae22e6` (§2). Every required final gate
  passed on that exact commit (§8).
- C3 is **not accepted**. Owner acceptance is a separate gate.
- C4 has not started and is not authorized.
- Publication is deferred. Nothing was pushed, merged, tagged or deployed, and
  `origin/master` and Production are unchanged.

## 2. Identities

| Item                     | Value                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Owner authorization      | direct owner instruction, 2026-09-27: C3 from `be40f839`, local commits only               |
| Branch                   | `cx/epic-c3-programme-policy`                                                              |
| Branch point             | `be40f839019a2ae0b652542d7418dd6cd5d87763` (C2 acceptance tip; `src` `7b5b5a51`)           |
| Concern 1 — catalogue    | `9d390bfef63aa45c823dd599c5aeafb613634bd4` (tree `6639b2f4`)                               |
| Concern 2 — XP           | `b83ff4777482acbc77f3b7a2815f3ae8a85b2916` (tree `4803f643`)                               |
| Concern 3 — workflow     | `e8b4addfbecd03d6b84ac116b50d2123e68d6b7c` (tree `6519d66e`)                               |
| Concern 4 — achievements | `78ae22e62e841af852ada6a0c1a937196d2f18ed` (tree `c84b0440`), **implementation candidate** |
| Candidate `src` subtree  | `090b87e44690e4bc8bb42f861d605abd8e16372c`                                                 |
| Readiness record         | the documentation-only commit adding this record (parent `78ae22e6`)                       |
| `master` / `origin`      | `fd5e2d5` / `d4b945b`, unchanged                                                           |

The candidate changes 55 paths from `be40f839` (6 added, 49 modified): 24
under `src/` and 31 under `tests/`. No other path changes.

## 3. What C3 implements

`ProgrammeDefinition` gains `policy: ProgrammePolicy`. The policy shapes are
neutral contracts in `@/lib/domain` (`programmePolicy.ts`), which both lib and
the programme layer may import. The CS50 values live in
`src/programmes/cs50x-2026/policy.ts` and `achievements.ts`.

| Policy                             | CS50 value                                                                                                                                                                          | Shared mechanism that receives it                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `catalogueRules.requiredUnitTypes` | `['final_project']`                                                                                                                                                                 | `findCatalogueRuleIssues` in definition validation; the generic seed parser no longer has the rule   |
| `xp.completionAwards`              | lecture 40, section 20, shorts 15, practice 30, notes 15, reflection 15                                                                                                             | `evaluateProgressXp`; identity `<type>_completed`, `<itemId>-completed`, `Completed <type>: <title>` |
| `xp.statusMilestones`              | `problem_set`: started (started, blocked, completed, submitted, accepted) 20; submitted (submitted, accepted) 75; accepted 125                                                      | identity `<type>_<milestone>`, `<itemId>-<milestone>`, `<reasonLabel>: <title>`                      |
| `xp.unitCompletionBonuses`         | `week` 150, required units only                                                                                                                                                     | identity `<unitType>_completed`, unit ID, `Completed all required items for <unit title>`            |
| `xp.itemMilestones`                | build 250 (`final_project_build_completed`, `final-project-build-completed`); README + video demo 200 (`final_project_readme_demo_completed`, `final-project-readme-demo-combined`) | single-item and all-of-items milestones; `getLinkedMilestoneItemIds` is the pair lookup              |
| `workflow`                         | sequence `lab`, `problem_set`; correction `problem_set` only                                                                                                                        | status-option producer (Classic and RPG); `getWorkflowTerminalStatus` for completion previews        |
| `achievements`                     | the 10 CS50-bound definitions composed with the 6 shared ones in the frozen 16-ID order                                                                                             | `evaluateAchievements(definitions, context)`; repository achievement views and unlock path           |

### Dependency direction

- `src/lib/**` never imports `src/programmes/**`. The XP engine, the
  achievement evaluator and the repository award and read paths take the
  policy as an explicit parameter (`ProgrammePolicyOptions`), with no
  default. A missing policy is a type error, and at runtime it throws instead
  of falling back.
- Pages that call repositories pass `getActiveProgrammeDefinition().policy`.
  `questRewards.ts`, `detailModel.ts` and the RPG read-model loaders source it
  from the active definition (the contract's "sourcing only" scope). The
  policy is resolved outside every passive read transaction.
- The programme layer imports only the permitted `@/lib/domain`,
  `@/lib/validation` and `@/lib/achievements` entrypoints. No ESLint rule
  changed, and `lib/appState` needed no `@/programmes` exception.
- `@/lib/achievements` keeps the six shared definitions
  (`sharedAchievementDefinitions`) and the composition mechanism. The former
  `achievementDefinitions` and `achievementDefinitionsById` exports are
  removed, so every consumer had to move to the composed catalogue (a type
  error otherwise) rather than silently receiving six definitions.

### Validation (all fail closed at definition load)

- The XP policy rejects duplicate derived `sourceType`s, duplicate milestone
  `sourceId`s and duplicate items within a milestone.
- The workflow rejects duplicates and a correction type without a sequence
  workflow.
- Milestone items and achievement unit and item references must be catalogue
  IDs, and the catalogue must satisfy the catalogue rules.
- The composed achievement catalogue rejects omitted, duplicated and unknown
  order IDs and programme IDs that collide with shared IDs. The definition
  rejects a missing or redefined shared achievement and an unsupported rule
  type.

### Internal re-encodings (no semantic change)

- `problem_set_status_count` became the programme-neutral
  `item_type_status_count`, with `itemType: 'problem_set'` in `pset-chain`'s
  rule config (C0 contract §4b, §7). Only the family-B rule-encoding
  characterization row changed, with the reason recorded inline.
- The final-project pair lookup now reads the linked milestone items' progress
  by ID, instead of every item of the first `final_project` unit. The
  evaluator only ever read the partner item, and both pair items are in the
  CS50 final-project unit, so every CS50 result is identical (C1 pair states).
- The completion preview's terminal status is derived from the workflow, so a
  `lab` previews at `accepted` instead of `completed`. CS50 has no lab items,
  and under the CS50 XP policy a lab earns no completion or status award. Both
  statuses count as complete, so a lab's previewed awards are identical either
  way.

### Not done (outside C3)

- Terminology and CS50 copy, including the `(shared with README + demo)`
  reward label (C4).
- Read scoping (C5); persisted identity, schema and backup format (C6+).
- `features/insights` still classifies CS50 `sourceType` vocabulary for its
  charts. It is unchanged, and its alignment test drives the engine with the
  CS50 policy.

## 4. Discriminating evidence

- **P1, RED then GREEN.** Before any change, `programmePolicy.test.ts` failed
  for the intended reason: `parseCourseSeed` threw `Course seed must contain a
final_project unit.` for a seed without one. After concern 1, the generic
  parser accepts that seed, a test-only definition without the rule
  validates, and the CS50 definition still rejects a catalogue without a
  `final_project` unit.
- **G-7, RED then GREEN.** `programmePolicyOwnership.test.ts` first failed
  with 36 CS50 literals in `lib/achievements/definitions.ts`,
  `lib/db/repositories.ts` and `lib/xp/engine.ts` (20 remained after concern
  2). It now finds none. It checks all 83 catalogue IDs, the 10 CS50
  achievement IDs and the 2 milestone `sourceId`s, cross-checks them against
  the definition, and has a positive control.
- **Policy isolation.** A test-only XP policy without the week bonus drops
  exactly the `week_completed` award for all 11 required CS50 weeks (engine).
  Through the real `upsertProgressAndAwardXp` path, it persists every CS50
  week-0 award except `xp-week_completed-week-0`.
- **Composed-catalogue validation.** Each of these is rejected: an omitted,
  duplicated or unknown order ID; an omitted shared ID; a shared-colliding
  ID; a twice-defined ID; an unsupported rule type; a missing or redefined
  shared achievement; an out-of-catalogue unit reference. A valid test-only
  catalogue composes in order.
- **Disposable mutation probes (not committed).**
  - Hard-coding the week bonus in the engine failed both isolation tests.
  - Widening the CS50 correction workflow to `lab` failed the frozen C1 lab
    correction oracle.
  - Swapping two IDs in the CS50 order failed the C1 order and view oracles.
  - Retargeting `pset-chain` to `lab` failed the C1 `pset-chain` unlock
    oracle.

  Each probe was reverted, and the file was checked byte-identical.

## 5. C1 semantic-oracle preservation

Every committed C1 fixture is byte-identical
(`git diff be40f839 -- tests/fixtures` is empty), and every C1 suite passes on
the candidate:

- the XP table (281 rows, 158 awards), the preview and label table (68 rows),
  reward identity and the real-path XP ledger;
- status reachability for every type × required combination, including the
  lab/problem-set correction asymmetry;
- the ordered 16-definition table, the RPG gallery and Classic view order and
  counts, and per-definition unlock behaviour with unlock IDs and trigger IDs;
- curriculum identity, labels and copy, transient copy, visual identity and
  the schema-2 baseline fixture.

The C1 harness edits are plumbing only:

- each call now passes the registered CS50 policy
  (`tests/programmes/cs50Policy.ts`);
- the 16-definition list is read from the registered catalogue;
- `finalProjectProgress` is renamed `milestoneProgress`.

The one oracle-adjacent change is the family-B `pset-chain` rule-encoding row
(§3). Outside the C1 harness:

- `courseSeedSchema.test.ts` no longer expects the generic parser to require
  `final_project`; that expectation moved to the programme test (P1);
- three `saveOutcomes` spies now forward the options the production caller
  passes.

## 6. Architecture guards

Source and destination guards all pass on the candidate:

- ESLint layer rules, with no rule change;
- `programmesLayer`, `achievementsFeature` (pure engine, no DB),
  `sessionsFeature`, `rpgFeature`, `sharedContracts`, `moduleBoundaries` and
  `localOnly`;
- the Epic A read-boundary suites;
- `check:circular`.

G-7 is new. It is a bounded source-text guard: it compares quoted string
literals, including those in comments, exactly. It is not a parser and does
not see identifiers assembled at runtime. The C2 limits of
`programmesLayer.test.ts` are unchanged.

## 7. Findings and repairs during C3

Failures were classified before any repair:

1. **Fixture, twice (test layer).** The P1 test-only definition inherited CS50
   XP milestones, and later CS50 achievements, that reference CS50 items. The
   new cross-reference validation rejected it correctly. The repair gave the
   test policy no CS50 references; product code was unchanged.
2. **Product, once: module initialization order under the CSP guard.**
   - **Defect.** `lib/domain/programmePolicy.ts` created Zod object schemas
     without importing `@/lib/validation`, which applies the jitless Zod
     configuration. On a cold import of `@/lib/domain`, it evaluated first,
     and Zod ran its dynamic-code capability probe through the `Function`
     constructor, failing `tests/lib/validationCsp.test.ts`.
   - **Scope.** The defect entered with concern 1, so commits `9d390bf`,
     `b83ff47` and `e8b4add` each fail that one test on their own. The
     concern gates had not included it; the full suite caught it before the
     concern 4 commit.
   - **Repair.** The module now uses `getDuplicateValues` from
     `@/lib/validation`, so the configuration always applies first. The fix is
     part of `78ae22e6`. History was not rewritten.

There was one product repair round, below the two-round reassessment
threshold.

## 8. Final validation (implementation candidate `78ae22e6`)

| Check                    | Result                                                     |
| ------------------------ | ---------------------------------------------------------- |
| `npm run lint`           | exit 0, 0 warnings                                         |
| `npm run format:check`   | exit 0                                                     |
| `npm run typecheck`      | exit 0                                                     |
| `npm test`               | exit 0; 84 files / 861 tests passed, 0 skipped             |
| `npm run check:circular` | exit 0, no cycle                                           |
| `npm run build`          | exit 0                                                     |
| `npm run check:bundle`   | 0 violations; largest JS chunk 391,144 bytes (C2: 388,306) |
| `npm run test:e2e`       | exit 0; 90/90 passed, 0 skipped, 0 retries, 6.0 min        |
| `git diff --check`       | exit 0                                                     |

- No test was skipped, retried or weakened, and no timeout changed.
- `verify:release` was not run, because publication is a separate decision.
- The bundle grew about 2.8 kB, from the policy schemas and the CS50 policy
  data. No chunk and no lazy import were added.
- The E2E aggregate regenerated the 64 disposable C1 captures. All 64 are
  byte-identical (same-name per-PNG SHA-256) to the accepted inventory in
  `c1-visual-baseline-69b1db7.zip`. The ZIP was not regenerated and is
  unchanged (SHA-256 `cb404591…917c`).

## 9. Scope proof

`git diff be40f839 78ae22e6` is empty for all of:

- `tests/fixtures`, `e2e`, `public`, `scripts`;
- `package.json`, `package-lock.json`, `eslint.config.js`, `vite.config.ts`,
  `tsconfig*.json`, `playwright*.ts`;
- `src/styles`, `src/seed`, `src/lib/db/database.ts`, `src/lib/backup`.

Therefore:

- there is no schema, Dexie version, backup-format, dependency, CSS, asset,
  route or URL-allowlist change;
- `programmeId` does not appear in source, and no enrolment or active-key
  state exists;
- no rendered copy changed (no C4), and no read is scoped (no C5).

## 10. Residual risks and limits

- G-7 and `programmesLayer.test.ts` are bounded text guards (§6).
- `features/insights` classifies CS50 `sourceType` vocabulary (§3), and the
  RPG reward label carries CS50 copy. Both are outside C3.
- `git archive` would still include the 15 MB retained ZIP (C2 backlog).
- As recorded in §7, the first three C3 commits are not individually green on
  the CSP test; only the candidate is.

## 11. Disposition

- **C3:** implemented and validated locally, ready for owner review, **not
  accepted**. The owner decides whether to accept candidate `78ae22e6`.
- **C4:** planned, not started and not authorized.
- **Publication:** deferred; `origin/master` and Production are unchanged.
