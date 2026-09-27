# Programme layer

Epic C / C2–C4. Immutable, compile-time programme definitions and the
registry that lists them. Contract: `docs/post-release/epic-c/C0_PROGRAMME_DEFINITION_CONTRACT.md`.

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
- a one-entry registry with `getProgrammeDefinition` and
  `getActiveProgrammeDefinition`, both failing closed.

Boundaries (ESLint and `tests/architecture/programmesLayer.test.ts`):

- this layer imports only `@/lib/domain`, `@/lib/validation`, the
  `@/lib/achievements` entrypoint and `@/seed`, plus `zod`; no app, component,
  feature, DB, storage, app-state or asset imports;
- `src/lib/**` and `src/components/**` never import it; `src/app/**` and
  `src/features/**` use the `@/programmes` entrypoint only.

Policy shapes and shared mechanisms stay in `src/lib` (`@/lib/domain` policy
contracts, `@/lib/xp`, `@/lib/achievements`); lib receives policy as a
parameter and never imports this layer. Features and composition roots pass
`getActiveProgrammeDefinition().policy`.

Not here: scoped reads (C5), and any persisted programme identity,
enrolment, active key, schema or backup field (C6/C7). `programmeId` is reserved for the future
persisted ownership identity.
