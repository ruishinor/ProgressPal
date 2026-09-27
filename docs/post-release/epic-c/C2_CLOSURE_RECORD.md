# Epic C / C2 — closure record (programme layer, registry, content ownership)

## 1. State

**`C2_ACCEPTED_CLOSED_LOCALLY`**

- On 2026-09-27 the owner directly accepted the C2 implementation candidate
  `35604093c01307937d3b2b958ed908abdf0fe76c`.
- The acceptance is recorded by a documentation-only acceptance commit on top
  of that candidate. That commit does not change the accepted implementation
  bytes.
- C3 has not started and is not authorized. Starting it needs a separate
  direct owner instruction.
- Publication is deferred. Nothing was pushed, merged, tagged or deployed, and
  `origin/master` and Production are unchanged.

## 2. Identities

| Item                | Value                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| Owner authorization | direct owner instruction, 2026-09-27: C2 from `db5f795`, local commits only     |
| Branch              | `cx/epic-c2-programme-layer`                                                    |
| Branch point        | `db5f795c562f5847a5ad7bffa737751e4d952382` (OD-9 record; `src` = C1 `a8f71739`) |
| Accepted candidate  | `35604093c01307937d3b2b958ed908abdf0fe76c` (parent `db5f795`; `src` `7b5b5a51`) |
| Acceptance commit   | the documentation-only commit recording acceptance (parent `35604093`)          |
| `master` / `origin` | `fd5e2d5` / `d4b945b`, unchanged                                                |

## 3. What C2 implements

New layer `src/programmes/`, with the public entrypoint `@/programmes`:

| Module                            | Role                                                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `definition.ts`                   | `ProgrammeDefinition` type: `definitionKey`, `catalogueId`, `title`, `catalogue` (a reference) and `content` (`externalResources`, `studyGuides`). `validateProgrammeDefinition` checks shape and cross-references, and fails closed |
| `cs50x-2026/index.ts`             | The CS50 definition. Its key equals the catalogue identity `cs50x-2026`, its title comes from the catalogue, and its catalogue is the bundled seed object referenced in place. It is validated at module load                        |
| `cs50x-2026/externalResources.ts` | CS50 unit/item link maps, moved from `features/course/cs50Links.ts` with values unchanged. The declared URL prefix is `https://cs50.harvard.edu/x/`                                                                                  |
| `cs50x-2026/studyGuides.ts`       | Study guides, moved from `features/course/guideContent.ts` with content and authoring rules unchanged                                                                                                                                |
| `registry.ts`                     | A one-entry registry. `getProgrammeDefinition(key)` throws for unregistered keys, `getActiveProgrammeDefinition()` requires exactly one registered definition, and `listRegisteredDefinitionKeys()` lists the keys                   |
| `README.md`                       | Scope and boundaries                                                                                                                                                                                                                 |

What the validation checks, all failing closed:

- The definition shape is strict Zod, run through `@/lib/validation`.
- `catalogueId` equals the catalogue's `courseId`.
- Every link and guide is keyed to a real catalogue unit or item.
- Every link URL starts with a declared https prefix.
- No guide text embeds a URL.

Compatibility: `features/course/cs50Links.ts` (`getCs50UnitLink`,
`getCs50ItemLink`, `Cs50Link`) and `features/course/guideContent.ts`
(`getUnitGuide`, `getItemGuide`, `UnitGuide`, `ItemGuide`) keep their
exported names, their lookup behaviour (`?? null` for unknown IDs) and the
returned values. They now read from the active definition. Their consumers
(`CourseUnitCard`, `ContentDetailPage`, `rpg/model/readModels.ts`) and every
existing test are unchanged.

The compatibility is consumer-facing, not a byte-identical module or type.
`Cs50Link` is now an alias of the programme-owned `ExternalResourceLink`,
whose fields are `readonly`.

Deliberately not done (and why):

- **Seed:** not relocated. The contract allows a reference in place, so G-3
  (`moduleBoundaries`) is unchanged and G-8 is not triggered.
- **Composition roots:** `lib/appState`, onboarding and settings keep
  importing `@/seed`. Passing the active definition from bootstrap is C5
  scope, so `src/lib/**` has no `@/programmes` exception.
- **`@/lib/achievements`:** not imported. The rules permit it, but it is C3
  scope.

## 4. Dependency rules (G-1) and negative probes

The rules below are added in `eslint.config.js` alongside each layer's
existing rule. Flat-config rule settings replace rather than merge, so the new
patterns sit inside each layer's existing rule:

- `src/programmes/**` may import only:
  - `@/lib/domain`, `@/lib/validation` and the `@/lib/achievements`
    entrypoint;
  - `@/seed`;
  - `zod`.
    It must not import:
  - app, components, features or styles;
  - `@/lib/db`, `@/lib/storage`, `@/lib/appState`, `@/lib/xp` or any other
    lib module;
  - deep `@/lib/*/*` or `@/seed/*` paths, including the seed JSON;
  - its own alias path;
  - asset files, including `?inline` and `?url`.
- `src/lib/**` and `src/components/**` must not import `@/programmes` or
  `@/programmes/*`, and `lib/appState` has no exception.
- `src/app/**` and `src/features/**` may import only the `@/programmes`
  entrypoint, never `@/programmes/*`.

Disposable probes (not committed) covered runtime imports, `import type` and
`export … from` for every rule. Every forbidden form was blocked, and every
allowed form passed as a positive control:

- `lib/achievements → @/programmes` was rejected (runtime, type-only and
  re-export forms).
- `lib/appState` was rejected.
- Components were rejected, for both runtime and type-only imports.
- Deep imports from app and features were rejected, while the entrypoint
  import was allowed.
- From the programme layer, all 16 forbidden specifiers were rejected and the
  4 permitted entrypoints were allowed.

ESLint covers the normal alias-based static import restrictions. It does not
see relative paths or dynamic `import()`. The committed
`tests/architecture/programmesLayer.test.ts` fills that gap:

- It reads source text and resolves specifiers to paths, including relative
  paths.
- It covers static `import`/`export … from` (including `import type`),
  side-effect imports, and dynamic `import()` with a string-literal
  specifier.
- It is a **bounded guard for the import forms in the current tree**, not an
  exhaustive TypeScript/JavaScript parser. It does not claim to catch computed
  dynamic imports, CommonJS `require`, or future syntax.
- If future import patterns need stronger coverage, use compiler, linter, AST
  or dependency-graph enforcement rather than extending its regular
  expressions.

Disposable probes confirmed it catches all of these:

- a relative type import from features;
- a relative re-export of `lib/db`;
- a relative `lib → programmes` type import;
- a deep relative import from features;
- a dynamic `import()` from components.

`npm run check:circular` passes.

## 5. Identity and persistence proof

- No persisted programme ownership identity was introduced. `programmeId`
  appears 0 times in `src/**/*.{ts,tsx}`; the only mention is the README note
  reserving it.
- Nothing is persisted: there is no enrolment, active-key storage, schema,
  IndexedDB version, backup field or migration.
- `git diff db5f795 -- src/lib src/seed src/styles public package.json
package-lock.json vite.config.ts tsconfig*.json playwright*.ts` is empty.
- The definition key is used only as an in-memory registry key.
- The registry lookup touches no store. The Epic A read-boundary guards pass,
  and the accessor is a pure in-memory lookup that is never a store read.

## 6. Guard map disposition

| Gap | Disposition                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G-1 | Closed: rules and architecture test above                                                                                                                                      |
| G-2 | Links stay in `.ts`, so the unchanged local-only scan covers them. The allowlist is not widened, and the definition declares the narrower prefix `https://cs50.harvard.edu/x/` |
| G-3 | Not triggered: the seed is not relocated                                                                                                                                       |
| G-8 | Not triggered: the seed is unchanged and imports only `@/lib/domain`. A seed → programmes import would be caught by `check:circular`                                           |

## 7. Preservation evidence

- **Baseline, before any change:** the focused C1/link/guide/architecture
  suites passed on `db5f795`, with 10 files and 63 tests.
- **After C2:** the same suites plus the two new files pass, with 12 files and
  79 tests. The C1 total link/guide lookup oracle
  (`c1LabelsAndCopy.test.tsx` against `c1-links-guides.json`) and the
  curriculum identity oracle are unchanged and green.
- **Retained C1 visual baseline:** the C2 E2E aggregate regenerated the 64 C1
  captures in the same environment. All 64 are **byte-identical** to the
  accepted inventory in `c1-visual-baseline-69b1db7.zip`. The ZIP itself is
  unchanged (SHA-256 `cb404591…917c`) and was not regenerated.

## 8. Validation (implementation candidate `35604093`)

These results are the implementation evidence of candidate `35604093`. The
documentation-only acceptance commit changes no code or test, so none was
rerun for acceptance.

| Check                    | Result                                              |
| ------------------------ | --------------------------------------------------- |
| `npm run lint`           | exit 0, 0 warnings                                  |
| `npm run format:check`   | exit 0                                              |
| `npm run typecheck`      | exit 0                                              |
| `npm test`               | exit 0; 82 files / 838 tests passed, 0 skipped      |
| `npm run check:circular` | exit 0, no cycle                                    |
| `npm run build`          | exit 0                                              |
| `npm run check:bundle`   | 0 violations; largest JS chunk 388,306 bytes        |
| `npm run test:e2e`       | exit 0; 90/90 passed, 0 skipped, 0 retries, 5.5 min |
| `git diff --check`       | exit 0                                              |

- No test was skipped, retried or weakened, and no timeout changed.
- The only edit to an existing test is a comment in `localOnly.test.ts`
  naming the new location of the link constants; its allowlist is unchanged.
- `verify:release` was not run, because publication is a separate decision.
- Bundle note: the chunk containing zod grew by about 0.2 kB because the
  definition schema uses more zod builders. No chunk was added and there is
  no lazy import.

## 9. Adversarial review (converged)

Material findings and their disposition:

1. **Flat-config rule override.** Separate overlapping blocks would silently
   replace existing layer rules, so the patterns were folded into each
   layer's rule. The probes prove both the old and the new patterns fire.
2. **Relative and dynamic escapes are invisible to ESLint.** Covered for the
   current tree's import forms by the bounded architecture test (§4), which
   was probed. It is not an exhaustive parser.
3. **Passive-read resolution.** The accessor is in-memory and never touches a
   store. The read-boundary suites pass.

No C3+ leakage: no XP, achievement, workflow, terminology, read-scope,
persistence, route, CSS or asset change was made.

Residual notes:

- Link/guide lookups keep their pre-existing plain-record semantics:
  prototype keys such as `constructor` are not guarded. That is unchanged
  behaviour; no seed ID can collide with one.
- The ESLint path patterns rely on the `@/` alias, as the existing rules do.
  The bounded architecture test covers relative and literal dynamic imports
  in the current tree (§4).

## 10. Disposition

- **C2:** accepted and closed locally. The owner accepted candidate
  `35604093` on 2026-09-27.
- **C3:** planned, not started and not authorized. Its prerequisite (C2
  accepted) is now met, but starting it needs a separate direct owner
  instruction.
- **OD-8 and OD-9:** resolved. Publication of Epic B/C is a separate, later
  release decision.
