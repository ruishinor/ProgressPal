# Programme layer

Epic C / C2. Immutable, compile-time programme definitions and the registry
that lists them. Contract: `docs/post-release/epic-c/C0_PROGRAMME_DEFINITION_CONTRACT.md`.

Current responsibilities:

- one production definition, `cs50x-2026` (`cs50x-2026/`), whose definition
  key equals its catalogue identity for compatibility through C5;
- a reference to the existing bundled catalogue (`@/seed`), used in place and
  never copied or migrated here;
- CS50 content: official external resource links with their declared URL
  prefix, and the locally authored study guides;
- a one-entry registry with `getProgrammeDefinition` and
  `getActiveProgrammeDefinition`, both failing closed.

Boundaries (ESLint and `tests/architecture/programmesLayer.test.ts`):

- this layer imports only `@/lib/domain`, `@/lib/validation`, the
  `@/lib/achievements` entrypoint and `@/seed`, plus `zod`; no app, component,
  feature, DB, storage, app-state or asset imports;
- `src/lib/**` and `src/components/**` never import it; `src/app/**` and
  `src/features/**` use the `@/programmes` entrypoint only.

Not here: XP, achievement, workflow or catalogue policy (C3), terminology (C4),
scoped reads (C5), and any persisted programme identity, enrolment, active
key, schema or backup field (C6/C7). `programmeId` is reserved for the future
persisted ownership identity.
