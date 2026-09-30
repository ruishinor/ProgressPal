# Programme layer

Epic C / C2–C4, C7. Immutable, compile-time programme definitions and the
validated registry that lists them. Contract: `docs/post-release/epic-c/C0_PROGRAMME_DEFINITION_CONTRACT.md`.

Current responsibilities:

- one production definition, `cs50x-2026` (`cs50x-2026/`), whose definition
  key equals its catalogue identity for compatibility through C5;
- a reference to the existing bundled catalogue (`@/seed`), used in place and
  never copied or migrated here;
- CS50 core policy (C3, `cs50x-2026/policy.ts`, `cs50x-2026/achievements.ts`):
  catalogue rules (a `final_project` unit is required), XP policy (completion
  XP by item type, problem-set status milestones, the required-week bonus,
  final-project milestones), the submission workflow, and the ten CS50-bound
  achievements composed with the six shared ones in CS50 display order;
- CS50 content: official external resource links with their declared URL
  prefix, the locally authored study guides, and CS50 terminology (C4,
  `cs50x-2026/terminology.ts`): programme copy, the unit noun "week", the RPG
  identity tuple and the campaign-map ordinal of every catalogue unit.
  Canonical vocabulary labels and rank labels stay shared in their feature
  modules; the brand text is outside Epic C (OD-6);
- a validated, immutable registry (C7, `createProgrammeRegistry`) that holds
  several definitions with an explicit default/bootstrap programme, looks
  definitions up by `definitionKey` and by `programmeId` and fails closed on
  an unknown one. Construction is all-or-nothing and rejects cross-definition
  collisions in definition key, programme ID, catalogue, unit ID, item ID,
  XP reward source key (generated and fixed, from the shared derivation in
  `@/lib/domain`) and any achievement ID that is not one of the six shared
  ones. Long-form asset, slice and resume IDs are pure functions of the item
  ID, so item-ID uniqueness covers them. Production registers CS50 only, built
  through the same validated path (`getProgrammeRegistry`);
- there is no "active definition" here. The active programme is the persisted
  `app_meta.activeProgrammeId`; the application composition root
  (`src/app/providers/programmeComposition.ts`, the only reader of the
  registry) resolves that ID to a runtime `ProgrammeScope` and authorizes
  every registered catalogue for the database. `getDefaultProgrammeDefinition`
  is the explicit default/bootstrap definition, for composition and the
  CS50-default compatibility entrypoints only;
- a stable persisted programme ownership identity, `programmeId` (Epic C /
  C6, OD-5: `cs50x` for the `cs50x-2026` definition), distinct from
  `definitionKey`/`catalogueId` and validated on every definition.

Boundaries (ESLint and `tests/architecture/programmesLayer.test.ts`):

- this layer imports only `@/lib/domain`, `@/lib/validation`, the
  `@/lib/achievements` entrypoint and `@/seed`, plus `zod`; no app, component,
  feature, DB, storage, app-state or asset imports;
- `src/lib/**` and `src/components/**` never import it; `src/app/**` and
  `src/features/**` use the `@/programmes` entrypoint only. The composition
  root derives the database migration context (Epic C / C6) from
  `programmeId`/`catalogueId` here and passes it into `src/lib/db` as plain
  data; `src/lib` never imports this layer.

Policy shapes and shared mechanisms stay in `src/lib` (`@/lib/domain` policy
contracts, `@/lib/xp`, `@/lib/achievements`); lib receives policy as a
parameter and never imports this layer. Runtime features receive policy,
content and identity from the active programme scope in app state and pass it
explicitly to shared read and write paths.

Not here: scoped reads (C5), persisted enrolment and the active key (C6, C7
mutations live in `src/lib/db`), and any real second programme.
