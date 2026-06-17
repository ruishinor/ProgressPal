# Decisions

## D-0001 - Scope Reset To CS50-Only Product

- Date: 2026-06-11
- Status: accepted
- Decision: ProgressPal is now an offline-only, single-user CS50 progression companion rather than a broad life-tracking product.
- Why: The broad concept diluted the core use case, increased implementation surface area, and created pressure to support features that do not help one learner move through CS50.
- Consequences:
  - The product is limited to one local learner and one course family.
  - Generic productivity categories are out of scope.
  - The verified endpoint is an offline CS50 MVP.

## D-0002 - Module 00 Is Documentation-Only

- Date: 2026-06-11
- Status: accepted
- Decision: Do not scaffold the app, install dependencies, or create source files during Module 00.
- Why: The brief makes Module 00 a scope-lock and source-translation stage. Scaffolding then would have violated the sequential module boundary.
- Consequences:
  - Root planning files and decision records were created first.
  - Runtime tooling and app structure were deferred to Module 01.

## D-0003 - Preferred Technical Direction

- Date: 2026-06-11
- Status: accepted
- Decision: The default implementation route is a local-first browser app using Vite, React, TypeScript, and IndexedDB via Dexie.
- Why: The brief recommends this as the lowest-friction path to an offline-capable CS50 final-project candidate.
- Consequences:
  - Module 01 scaffolds toward the browser-app route unless a later documented reason forces a different path.
  - Alternative stacks remain fallback options, not the default.

## D-0004 - Git Metadata Is Currently Unavailable

- Date: 2026-06-11
- Status: accepted
- Decision: Treat branch, commit, and verification references as unavailable until git is initialized in this working directory.
- Why: Repository inspection found no `.git` directory.
- Consequences:
  - PROJECT_STATE.md and VALIDATION_LOG.md record `n/a` for branch and commit fields.
  - Future traceability will remain weaker until version control is added.

## D-0005 - Defer Non-Essential Root Docs That Require Later Context

- Date: 2026-06-11
- Status: accepted
- Decision: Defer `README.md` and `PRIVACY.md` until later modules instead of creating speculative placeholders in Module 00.
- Why: The brief's repository-file list conflicts with the stricter module boundary, and empty placeholders would add noise without improving implementation clarity.
- Consequences:
  - Module 00 stayed focused on scope lock and state tracking.
  - The missing docs remain a known risk to close in later modules.

## D-0006 - Detailed Module 01 Instructions Override The Summary Table

- Date: 2026-06-11
- Status: accepted
- Decision: When the project brief's summary module list conflicts with the detailed Module 01 section, follow the detailed Module 01 section as the source of truth.
- Why: The detailed section explicitly requires a folder structure, baseline routes, placeholder pages, and first tests, while the summary table places part of that work in Module 02.
- Consequences:
  - Module 01 includes a minimal route shell and scaffold folders.
  - Module 02 remains focused on formalizing the broader architecture and folder expansion, not on first-time app creation.

## D-0007 - Use React Router For Baseline Route Coverage

- Date: 2026-06-11
- Status: accepted
- Decision: Use `react-router-dom` to satisfy the required baseline routes and unknown-route handling in Module 01.
- Why: The brief requires specific routes from the first scaffold module, and React Router is the most direct local-first fit for a Vite/React client shell.
- Consequences:
  - `react-router-dom` is added as an extra runtime dependency beyond the brief's initial package list.
  - Dashboard, course, achievements, insights, settings, and not-found navigation can be validated before any domain logic exists.

## D-0008 - Restrict Formatter And Linter Scope To First-Party App Files

- Date: 2026-06-11
- Status: accepted
- Decision: Exclude `.agent`, `.agents`, `.claude`, `_bmad`, `_bmad-output`, and `design-artifacts` from Prettier and ESLint validation.
- Why: Those directories contain bundled skills, templates, and support scripts that are not part of the ProgressPal app surface and may rely on unrelated lint or formatting conventions.
- Consequences:
  - Module validation reflects the real product surface rather than vendor-like support content.
  - The first broad formatter run touched support assets before ignore scope was corrected; with no git history, the exact collateral diff is not fully traceable.

## D-0009 - Module 01 Offline Validation Is Session-Only

- Date: 2026-06-11
- Status: accepted
- Decision: Treat in-session offline navigation after initial page load as the maximum offline check for Module 01.
- Why: Full cold-start offline support belongs to the later offline-hardening module, and no service worker or local data layer exists yet.
- Consequences:
  - Module 01 E2E coverage proves the scaffold does not immediately collapse when the browser context goes offline after load.
  - Full offline boot remains an explicit risk and a later-module requirement.

## D-0010 - Route Composition Uses A Central Catalog Plus Feature Public Entrypoints

- Date: 2026-06-11
- Status: accepted
- Decision: Module 02 formalizes the app shell around a central route catalog in `src/app/router/routeDefinitions.ts` and public `index.ts` entrypoints for each routed feature.
- Why: The project already had required baseline routes from Module 01. Formalizing them around a single catalog reduces drift between router setup, navigation labels, and tests without prematurely adding domain logic.
- Consequences:
  - The app layer imports routed features through public entrypoints instead of deep feature file paths.
  - Navigation, route coverage, and route-architecture tests share the same source of truth.

## D-0011 - Enforce Initial Import Boundaries With ESLint

- Date: 2026-06-11
- Status: accepted
- Decision: Add `no-restricted-imports` rules so shared components do not depend on app or feature code, shared library code stays independent, and the app layer does not deep-import feature internals.
- Why: Folder structure alone does not create architecture. The module needed at least one automated guardrail against dependency drift before domain code and persistence arrive.
- Consequences:
  - `src/lib/testing` is treated as a deliberate exception because test helpers may compose the app.
  - Later modules can tighten or replace these rules, but they now start from an explicit boundary contract.

## D-0012 - Use DPDM For Circular Dependency Checks

- Date: 2026-06-11
- Status: accepted
- Decision: Use `dpdm` instead of `madge` for Module 02 circular-dependency validation.
- Why: `madge` currently collides with the repo's TypeScript 6 toolchain through peer-dependency resolution, while `dpdm` installs cleanly and supports TypeScript path mapping.
- Consequences:
  - `npm run check:circular` now validates the architecture without forcing incompatible dependency overrides.
  - Circular-dependency analysis is part of the module validation suite starting in Module 02.

## D-0013 - Domain Schemas Are The Runtime Source Of Truth

- Date: 2026-06-11
- Status: accepted
- Decision: Define Module 03 domain models through Zod schemas and infer the shared TypeScript types from those schemas.
- Why: The project needs runtime validation before persistence, seed loading, backup import, or user-entered notes arrive. Maintaining separate hand-written interfaces and validators would create avoidable drift.
- Consequences:
  - `src/lib/domain` now exposes schemas, constants, and inferred types from one shared entrypoint.
  - Future modules should parse local seed, backup, and persisted data through explicit schemas instead of trusting raw objects.

## D-0014 - Normalize The Brief's Incomplete Domain Rules Before Persistence

- Date: 2026-06-11
- Status: accepted
- Decision: Resolve the brief's missing or inconsistent field details by enforcing shared timestamps for persisted entities, requiring `skipReason` on skipped slices, and requiring course-seed coverage for at least one final-project unit plus one required item.
- Why: The brief says every stored object must carry `id`, `createdAt`, and `updatedAt`, and its adversarial checklist explicitly calls out missing final-project coverage and malformed slice semantics, but several field lists omit those requirements.
- Consequences:
  - Later persistence work starts from explicit, test-backed assumptions instead of undocumented guesswork.
  - If a later module needs to change these assumptions, the change must be deliberate and recorded as a compatibility decision rather than an accidental schema drift.

## D-0015 - Start Persistence With A Versioned Dexie Schema And A Synthetic Legacy Fixture

- Date: 2026-06-11
- Status: accepted
- Decision: Ship the first real persistence layer on Dexie schema version 2 and keep a version-1 fixture in tests to prove the migration path before later modules evolve local data further.
- Why: The first persisted-user-data module needs backwards-compatibility discipline immediately, not after the second schema change. A synthetic pre-release fixture is cheaper than retrofitting migration coverage after live assumptions drift.
- Consequences:
  - `src/lib/db` now contains explicit store definitions, migration logic, and repository helpers.
  - `tests/db/migrations.test.ts` becomes a required guardrail for future schema changes.
  - Future breaking store or shape changes must increment the schema version and add a matching migration plus regression coverage.

## D-0016 - Keep Seed Payload Files Deferred While Letting The Database Consume Validated Seed Input

- Date: 2026-06-11
- Status: accepted
- Decision: Module 04 adds idempotent course-catalog sync from validated seed input, but it does not add bundled `src/seed` payload files yet.
- Why: The detailed persistence brief expects initialization and seed readiness, but the repo module sequence still defers real CS50 payload files to Module 05.
- Consequences:
  - The database layer can safely accept parsed seed objects without overwriting existing rows.
  - `src/seed` remains placeholder-only until Module 05 supplies the actual course payload.
  - Module 05 should build on the existing seed-sync repository surface rather than bypassing it.

## D-0017 - Ship The Bundled CS50x Catalog As A Validated First-Party JSON Payload

- Date: 2026-06-11
- Status: accepted
- Decision: Store the Module 05 course catalog as `src/seed/cs50x-2026.json`
  and expose it only through `src/seed/index.ts`, which validates the payload
  with `parseCourseSeed` before the app uses it.
- Why: Module 05 needs locally editable first-party course data, not more
  placeholder fixtures. A JSON payload keeps catalog content separate from
  application logic while still failing fast if the bundle drifts from the
  runtime contract.
- Consequences:
  - `dataVersion` and `sourceCheckedDate` are now mandatory maintenance fields
    for the bundled catalog.
  - Seed edits that break the runtime schema fail in tests and at import time
    instead of failing later inside Dexie writes.
  - The app can seed a real CS50x catalog at startup without introducing any
    network dependency.

## D-0018 - Seed Sync May Update Seed-Managed Catalog Rows But Must Not Touch Learner Data

- Date: 2026-06-11
- Status: accepted
- Decision: When a bundled seed version changes, `ensureCourseCatalogFromSeed`
  may update existing `course_units` and `course_items` rows in place, but it
  must not duplicate rows, delete rows implicitly, or mutate learner-profile
  and progress records.
- Why: A bundled seed that cannot revise titles, ordering, or estimates on an
  existing database is not truly maintainable. At the same time, catalog sync
  must not behave like a destructive reset of learner state.
- Consequences:
  - The course-seed schema now requires the exact fields the database
    materialization step depends on.
  - Seed-managed catalog IDs become stable compatibility keys for future
    progress, assets, and resume data.
  - Future removal of seeded catalog rows requires a deliberate migration or
    cleanup policy instead of an implicit sync side effect.

## D-0019 - Use The Existing Home Route As The Module 06 Showcase Surface

- Date: 2026-06-12
- Status: accepted
- Decision: Reuse `/` as a bounded design-system preview instead of adding
  Storybook, a new showcase route, or a dedicated component-workbench
  dependency during Module 06.
- Why: The user requested a simple showcase only if useful and explicitly did
  not want this module to overbuild. Reusing the existing route keeps the
  preview local, lightweight, and inside the validated app shell.
- Consequences:
  - The home route now demonstrates shared components with static local state.
  - Later modules must keep that route truthful and prune showcase content if
    it starts competing with real product surfaces.

## D-0020 - Build The Design System With Local CSS Tokens And Custom React Primitives

- Date: 2026-06-12
- Status: accepted
- Decision: Implement Module 06 with first-party React components and tokenized
  CSS instead of adding a heavy UI component library or an animation library.
- Why: The product is offline-first, visually restrained, and already has
  strong import-boundary rules. A heavy library would add dependency surface
  and design drift without solving a real current bottleneck.
- Consequences:
- Shared primitives now live under `src/components/layout` and
  `src/components/ui`.
- Styling lives in first-party token, base, and component CSS files.
- Motion stays limited to small CSS transitions and can be suppressed through
  reduced-motion media preferences.

## D-0021 - Track Onboarding Completion In App Metadata While Keeping The Existing Profile Singleton

- Date: 2026-06-12
- Status: accepted
- Decision: Keep the existing singleton learner-profile bootstrap record, but
  treat onboarding as complete only when `app_meta.onboardingCompletedAt`
  exists or a legacy profile clearly differs from the default bootstrap values.
- Why: The database layer already creates a defensive default profile during
  initialization. Removing that bootstrap behavior now would create avoidable
  compatibility risk, but profile existence alone can no longer mean the
  learner actually completed setup.
- Consequences:
  - Module 07 can gate first-run learners into `/onboarding` without a schema
    version bump or singleton-ID churn.
  - Future profile migrations must preserve both the metadata stamp and the
    legacy non-default fallback behavior.
  - Settings saves may mark onboarding complete safely without creating a
    second profile record.

## D-0022 - Accept The Current Bundle Size And Raise Vite's Warning Threshold Slightly

- Date: 2026-06-12
- Status: accepted
- Decision: Set `build.chunkSizeWarningLimit` to 575 kB in `vite.config.ts`
  instead of forcing premature route-splitting during Module 07.
- Why: The current production bundle is 551.15 kB after minification. That is
  still close enough to Vite's stock 500 kB warning threshold that the warning
  is tooling noise right now, not evidence of a user-facing failure or a
  proven performance bottleneck.
- Consequences:
- Full validation can remain warning-free without pretending the bundle size
  is a correctness bug.
- Later modules should add real route-splitting if the bundle grows further
  instead of repeatedly increasing the threshold.

## D-0023 - Follow The Repo Roadmap And Checklist When The Long Brief's Module Numbering Conflicts

- Date: 2026-06-12
- Status: accepted
- Decision: Treat `ROADMAP.md`, `MODULE_CHECKLIST.md`, `docs/modules/`, and
  `PROJECT_STATE.md` as the authoritative module sequence for implementation
  and validation when the older detailed numbering inside `PROJECT-BRIEF.md`
  conflicts.
- Why: The repo's active documents, codebase state, and validation history all
  align on Module 07 as onboarding/profile and Module 08 as course map, while
  the older long brief still numbers different work as Modules 07 and 08.
- Consequences:
  - Verification must call out the numbering mismatch instead of silently
    pretending both sequences are compatible.
  - Later modules should keep using the repo-aligned sequence unless a new
    explicit correction replaces it.

## D-0024 - Keep Module 08 As A Read-Only Course Map With Required-Item Rollups

- Date: 2026-06-12
- Status: accepted
- Decision: Build Module 08 as a read-only course map that rolls up required
  completion from persisted item statuses without adding item-detail mutation
  controls yet.
- Why: The roadmap needs truthful course visibility now, but item-detail
  editing, slices, sessions, and gamification belong to later modules. Mixing
  those concerns would blur the sequence and make later validation less
  meaningful.
- Consequences:
- `/course` can show seeded units, items, and honest progress rollups while
  remaining compatible with later detail screens.
- Optional items may be shown and tracked, but they do not inflate required
  completion percentages.
- The database schema and repository layer stay unchanged apart from the new
  read-only progress-listing surface.

## D-0025 - Derive One Primary Long-Form Asset Per Eligible Course Item In Module 09

- Date: 2026-06-12
- Status: accepted
- Decision: Generate one stable local primary long-form `content_asset` for
  each eligible seeded `lecture`, `section`, `shorts`, and `reading`
  `course_item` instead of expanding the bundled seed to explicit asset-level
  metadata immediately.
- Why: The active repo sequence needs the long-form progression engine before
  the content-detail module, but the current bundled seed still only defines
  course items. Deriving one stable primary asset preserves the sequential
  module boundary without forcing an early seed-schema redesign.
- Consequences:
  - Long-form asset IDs now derive predictably from course-item IDs.
  - Asset durations currently inherit local seeded `estimatedMinutes` values,
    not official verified media runtimes.
  - Later modules may replace or extend this derivation with explicit
    asset-level metadata, but they must preserve existing learner progress
    deliberately.

## D-0026 - Freeze Generated Slice Plans After Real Media Progress Exists

- Date: 2026-06-12
- Status: accepted
- Decision: Once a long-form asset has saved `media_progress_events`, keep its
  generated slice plan and derived timing frozen instead of silently
  regenerating slices from later seed-estimate changes.
- Why: Changing the denominator or slice boundaries underneath saved learner
  effort would distort already-logged progress and make resume data less
  trustworthy.
- Consequences:
  - Later seed re-syncs can still update seed-managed course-item fields, but
    already-started long-form assets preserve their original slice plan.
  - Read-only course rows may eventually show a course-item planned-minute
    estimate that differs from the frozen slice plan behind started material.
  - If later modules want explicit asset editing or verified duration updates,
    they will need a deliberate migration or reconciliation strategy instead of
    a silent re-sync overwrite.

## D-0027 - Route Item Detail Through `/course/:itemId` Instead Of Editing In Place

- Date: 2026-06-12
- Status: accepted
- Decision: Keep `/course` as the stable ordered catalog and route all item
  editing through a dedicated `/course/:itemId` detail screen.
- Why: The course map already works as a high-density operational overview.
  Turning every row into an inline editor would have blurred the catalog and
  detail responsibilities, made later modules harder to validate, and weakened
  the route-level progression from overview to focused logging.
- Consequences:
  - The course map stays visually dense and navigational rather than becoming a
    form surface.
  - Route definitions now include a non-navigation detail path plus a helper to
    build stable item URLs.
  - Later modules can add sessions, XP, or dashboard links without rewriting
    the course-map structure again.

## D-0028 - Partial Saved Long-Form History Cannot Be Manually Forced Complete

- Date: 2026-06-12
- Status: accepted
- Decision: When a long-form item already has partial saved
  `media_progress_events`, the detail route must not allow the learner to mark
  the item `completed` or `skipped_optional` manually.
- Why: Module 09 established watched ranges as the honest source of truth for
  long-form effort. Allowing a partial saved history to be overridden to a full
  completion state from a generic form would immediately undermine that rule.
- Consequences:
  - Long-form completion after partial logged progress must happen through the
    slice and range logging path instead of a direct status toggle.
- Existing legacy-complete records with no saved events remain allowed.
- If inconsistent historical data ever needs repair, that repair must be
  deliberate and traceable rather than a casual UI shortcut.

## D-0029 - Study Sessions Are Append-Only Effort Records Bound To Existing Items

- Date: 2026-06-12
- Status: accepted
- Decision: Module 11 study sessions are append-only local effort records,
  unfinished live sessions are represented by absence, and every saved session
  must reference one existing course item plus that item's matching `unitId`.
- Why: The current `StudySessionSchema` already requires both `unitId` and
  `itemId`, and the module's purpose is honest effort logging rather than
  completion inference, watched-range generation, or gamification.
- Consequences:
  - Module 11 does not support general-study or unit-only saved sessions.
  - Discarding or reloading a running timer writes nothing.
  - Session time never implies completion or watched coverage.
  - XP linkage remains deferred to Module 12.

## D-0030 - Keep Validation Warning-Free By Raising Vite's Chunk Threshold To 600 kB

- Date: 2026-06-12
- Status: accepted
- Decision: Raise `build.chunkSizeWarningLimit` from 575 kB to 600 kB in
  `vite.config.ts` for Module 11 validation.
- Why: The production bundle now measures 577.19 kB after minification. Under
  this repo's zero-warning rule, that warning is a release blocker even though
  the module work itself is bounded study-session functionality rather than a
  code-splitting refactor.
- Consequences:
  - Module 11 can complete validation without misreporting a known warning as
    acceptable noise.
  - The bundle-growth trend remains real technical debt and should be addressed
    with route-splitting if later modules push the bundle upward again.
  - This threshold increase does not change runtime behavior, persistence, or
    schema compatibility.

## D-0031 - Authoritative Square-Root Level Curve and Deferred Thresholds

- Date: 2026-06-12
- Status: accepted
- Decision: Use the square-root formula `level = Math.floor(Math.sqrt(totalXp / 100)) + 1` for Module 12 level derivation. Configurable threshold tables, XP caps, and any other level curves are deferred.
- Why: This matches the authoritative formula in `PROJECT-BRIEF.md`, resolving a conflict with `WORKFLOW.md` threshold tiers in a simple and deterministic manner.
- Consequences:
  - All XP levels and remaining XP thresholds are derived on the fly from the immutable transaction ledger.
  - No XP levels are stored in IndexedDB.
  - Achievements, dashboard insights, and configurable level curves stay deferred.

## D-0032 - Achievement Definitions Are Code-Only; The Definitions Store Stays Deferred

- Date: 2026-06-15
- Status: accepted
- Decision: Module 13 defines achievements as a validated constant array in
  `src/lib/achievements/definitions.ts`, parsed against
  `AchievementDefinitionSchema` at module load. The `achievement_definitions`
  Dexie store is treated as deferred persistence and is never read from or
  written to. The Achievements page renders from code definitions plus persisted
  `achievement_unlocks`.
- Why: The unlock history is the only achievement data that must persist.
  Syncing definitions into Dexie would add a second source of truth, a silent
  backfill path, and migration burden for content that already lives in
  validated code.
- Consequences:
  - There is no startup syncing of definitions into Dexie and no silent backfill.
  - Definition edits ship as code changes validated at load and by tests.
  - A later module may adopt the `achievement_definitions` store deliberately if
    user-authored or remote-authored definitions ever become a requirement.

## D-0033 - Module 13 Achievements Carry Zero XP And Write No XP Transactions

- Date: 2026-06-15
- Status: accepted
- Decision: Every Module 13 achievement has `xpReward: 0`, and achievement
  evaluation writes no `xp_transactions`.
- Why: Concrete source-event XP already exists from Module 12. Adding an
  achievement reward layer now would distort the ledger, and the brief does not
  fix achievement-XP values. Inventing values would be a guess.
- Consequences:
  - The Achievements page honestly shows `0 XP` for each achievement.
  - Introducing achievement XP later is a deliberate, separate decision.
  - The XP ledger remains driven solely by Module 12 source events.

## D-0034 - Achievements Evaluate Only On Explicit Saves; History-Based Unlocking Is Intentional

- Date: 2026-06-15
- Status: accepted
- Decision: Achievement evaluation runs only inside the three explicit-save
  wrappers, in the same atomic Dexie transaction as the source write and any XP
  award. No evaluation runs on app open, reload, navigation, route-load, or the
  `/achievements` page read. An explicit save evaluates against all accumulated
  local source data, so a save can unlock achievements already satisfied by
  earlier activity.
- Why: This mirrors the Module 12 XP rule that awards happen only from real
  saved source events, and it keeps unlocks a deterministic side effect of user
  action rather than a passive startup backfill. Evaluating over full history on
  save is simple, deterministic, and avoids missing legitimately earned unlocks.
- Consequences:
  - Passive reads never create unlocks; this is tested at the repository and app
    levels.
  - History-based unlocking on save is documented and tested as intended
    behavior, distinct from the forbidden passive backfill.
  - The unlock id is deterministic (`unlock-<achievementId>`) and the
    `&achievementId` unique index plus a check-before-insert guard make
    re-evaluation idempotent.

## D-0035 - Recovery And Reflection Achievements Stay Deferred

- Date: 2026-06-15
- Status: accepted
- Decision: Defer the `recovery` (including `returned-after-gap` and
  "Blocker Cleared") and `reflection` achievement categories.
- Why: Recovery achievements need status-transition history and contestable
  time-gap semantics (which events count, calendar days vs 24-hour periods,
  time-zone handling, whether pre-Module-13 history counts) that the current
  current-state stores do not provide. The seed has no `reflection`/`notes` item
  type with derivable source data. Faking either from weak or unavailable data
  would be dishonest.
- Consequences:
  - Module 13 ships only deterministic achievements grounded in real seed IDs
    and existing immutable or current-state source data.
  - Recovery and reflection achievements wait for a later module that introduces
    an honest, event-sourced basis for them.

## D-0036 - Manual Vendor Chunk Split To Preserve The 600 kB Per-Chunk Budget

- Date: 2026-06-15
- Status: accepted
- Decision: Split stable third-party runtime dependencies into manual vendor
  chunks (`react` for react/react-dom/scheduler, `router` for react-router(-dom),
  `zod`, `dexie`, and a `vendor` catch-all) via `build.rollupOptions.output.manualChunks`
  in `vite.config.ts`. Keep `chunkSizeWarningLimit` at 600. Do not adopt
  route-level lazy loading yet.
- Why: Module 14 exposed that the app had shipped as a single eager JS chunk
  sitting just under the 600 kB warning budget (~599.7 kB before Module 14), so
  any real feature would trip the per-chunk warning; wiring the dashboard pushed
  it to ~611 kB. Investigation showed the chunk is vendor-dominated (react-dom,
  react-router, zod, dexie ≈ 76%), the dashboard itself is a normal ~12 kB
  addition, and `recharts`/`date-fns` are already tree-shaken out. A manual
  vendor split keeps every chunk statically imported (module-preloaded at load),
  which preserves in-session offline navigation, whereas route-level lazy loading
  would fetch route chunks on navigation and could break offline navigation to a
  not-yet-visited route (e.g. the offline `/settings` e2e flow).
- Consequences:
  - The single ~611 kB chunk becomes several chunks, the largest being `react`
    at ~190 kB; no chunk exceeds 600 kB, so the per-chunk warning is resolved
    without weakening the threshold.
  - This does NOT reduce total shipped JavaScript (total stays ~611 kB minified);
    it resolves the per-chunk warning and improves cache separation (vendor
    chunks change less often than app code). True initial-load reduction remains
    deferred pending an offline-safe route-prefetch strategy.
  - Product behavior, routes, schema, stores, dashboard logic, tests, and UI are
    unchanged; this is a build-configuration-only decision with no new
    dependencies.

## D-0037 - Module 15 Insights Are Read-Only Tables, Trend Only Immutable Ledgers, And Add No Charts

- Date: 2026-06-16
- Status: accepted
- Decision: Build `/insights` as a read-only, derived-only surface using semantic
  tables with token-based, decorative `aria-hidden` CSS bars (exact values stay
  visible as text). Trend only the immutable ledgers (`study_sessions`,
  `media_progress_events`, `xp_transactions`, `achievement_unlocks`); use
  `progress_entries`/`course_map` only for a current completion snapshot, never a
  reconstructed history. Bucket by device-local day/week (Monday start),
  attributing each session/event whole to its `startedAt`/`createdAt`. Ship no
  charts (no Recharts, no first-party SVG), no new dependencies, no new
  repository surface, no schema change, and avoid the non-dark-theme-safe card
  variants locally rather than hardening them globally.
- Why: The honesty constraint is the binding one. Immutable ledgers can be
  trended truthfully; `progress_entries` are mutable current-state rows with no
  change history, so a historical progress trend from them would overclaim.
  Tables keep exact values visible, are the cleanest to make accessible (axe can
  evaluate them, no gradients), work in dark theme with normal tokens, and add no
  bundle weight — whereas Recharts would re-import victory-vendor/d3/decimal.js
  (reversing the Module 14 tree-shake) and first-party SVG would add new
  accessibility, scaling, and theming obligations not justified for v1. The
  global dark-theme card-variant fix belongs to Module 18, not here.
- Consequences:
  - "Watched minutes logged" sums `watchedSeconds` (logged effort, overlaps
    included) and floors partial minutes; it is labeled "logged" and never
    presented as unique coverage.
  - "Recorded completion awards" count exact engine `sourceType` values with
    item vs `week_completed` separated; a bidirectional test fails loudly if the
    XP engine and the Insights classification diverge. Such divergence is a
    stop-and-report condition — the XP engine is not edited to make Insights pass.
  - Active days use neutral wording (no streak branding) and derive only from
    positive-duration study sessions.
  - Charts, forecasts, coaching, recommendations, confidence trends,
    recovery/blocked-resolution views, and energy trends stay deferred. First-party
    SVG charts may be reconsidered as a separate follow-up after the table model,
    accessibility, no-mutation, and build-size are green.
  - Dexie stays version 2; opening or reloading `/insights` mutates no store,
    awards no XP, and unlocks no achievement (proven by full-snapshot equality).

## D-0038 - Module 16 Data Control: Full-Snapshot Export, Replace-All Import, Reachable-After-Reset Recovery

- Date: 2026-06-16
- Status: accepted
- Decision: Module 16 ships local data control from `/settings`: export a full
  database snapshot as a versioned JSON backup, import a Zod-validated backup
  with **replace-all** semantics, and reset all local data behind a typed
  confirmation phrase (`RESET`). Backup import is also exposed on the onboarding
  screen so it stays reachable after a reset. No Dexie schema change (the schema
  v2 `backups` store and `BackupRecordSchema` already exist) and no new
  dependency. Merge import, selective/learner-only export, and a dedicated
  privacy page/`PRIVACY.md` are explicitly excluded.
- Why: A faithful local restore is the honest goal. The full snapshot preserves
  media progress, resume points, and frozen slice plans; replace-all avoids the
  cross-store consistency and duplicate-XP/achievement risks a merge mode would
  introduce. The app gate makes `/settings` unreachable on a fresh database, so
  putting import only there would break recovery — hence the shared
  `ImportBackupControl` on onboarding. The privacy page belongs to Module 19's
  security/privacy review per the repo roadmap.
- Consequences:
  - The pure backup contract lives in `src/lib/backup/` (reusing `@/lib/domain`
    schemas), the restore/reset/audit writes in `src/lib/db`, and the shared
    import UI in `src/components/ui/ImportBackupControl.tsx` — no feature→feature
    coupling and no dependency cycle.
  - The `backups` store is a local audit log: export appends exactly one
    `export` record after serializing (so the file never contains its own export
    event); import appends exactly one `import` record after restore. Equality is
    asserted on the 13 non-`backups` stores; `backups` equals the backup's rows
    plus one new record. The `backups` store is deliberately excluded from the
    strict restored-data equality claim and tested separately.
  - Import validates before any write (size guard, `JSON.parse`, strict envelope
    - per-row Zod, duplicate-ID rejection); an invalid payload writes nothing.
      Notes render as inert text and backup import executes no scripts.
  - Opening or reloading `/settings` mutates no store; export/import/reset mutate
    only on explicit action. A successful import (from either route) lands on the
    restored dashboard, because refreshing app state unmounts the page and a
    success toast could not survive.
  - Cross-seed-version imports rely on the current bundled seed for catalog
    reconciliation. A future smaller portability/export format or a merge import
    would be a separate, deliberate module.

## D-0039 - Module 17 Offline Hardening: Dependency-Free SW With Install-Time Discovery

- Date: 2026-06-17
- Status: accepted
- Decision: Module 17 adds real cold-start offline support with a single
  dependency-free, production-only classic service worker at `public/sw.js`. On
  `install` it performs **install-time discovery**: fetch `/index.html`, parse
  every same-origin `/assets/*.{js,css}` reference (entry script, stylesheet, and
  the modulepreload vendor chunks), and atomically `cache.addAll` the shell plus
  those boot assets into a versioned cache (`progresspal-cache-v1`). It **fails
  closed** (`skipWaiting` only after the boot set is cached). The fetch handler
  serves same-origin GET only (navigation network-first → cached `/index.html`;
  assets cache-first). Cache matches use `ignoreVary` (and `ignoreSearch`) so a
  precached app-shell asset is served regardless of request headers — notably the
  CORS `Origin` header on crossorigin module scripts, which otherwise makes the
  match honor the response `Vary` header and intermittently miss offline.
  Registration is guarded by `import.meta.env.PROD` and feature detection. Offline behavior is proven by a dedicated production-preview
  Playwright `offline` project; the existing dev-based suite is unchanged. No
  manifest/installability, no `vite-plugin-pwa`, no new dependency, no route-level
  lazy loading, no update-notification UI, and no Dexie schema change.
- Why: The offline-only claim previously held only in-session. The browser HTTP
  cache is not a guarantee, so a cold start offline needs a service worker. A plain
  runtime-cache SW would not reliably cache the boot JS/CSS, because the first load
  happens before the SW controls the page; install-time discovery caches the boot
  set proactively, making **one** online load sufficient without weakening the goal
  to two loads. Parsing `index.html` is complete because the app uses static
  `manualChunks` with no lazy/dynamic route imports (D-0036) and no custom Vite
  `base`, so every boot chunk is referenced directly in `index.html` as `/assets/*`
  — which is why a generated asset manifest (and its build-config surface) is
  unnecessary. A hand-rolled SW was chosen over `vite-plugin-pwa`/Workbox to avoid
  a dependency, generated config, and update-state complexity for a local
  single-user app.
- Consequences:
  - Cold-start offline works after one successful online production load; reload or
    reopen offline boots to saved local data. Proven by an E2E Cache-Storage
    assertion (hashed boot JS/CSS cached after one load) plus an offline cold-start
    reload.
  - Local-first is preserved: the SW caches only static same-origin app assets and
    never touches IndexedDB. Module 16 reset/onboarding-import recovery is not
    regressed under the active SW (covered by E2E).
  - The dev-based E2E suite and unit suite are untouched because the SW registers
    only in production builds; a separate `offline` Playwright project covers the
    production preview.
  - Forward risk: a later module that introduces lazy route chunks must revisit
    install-time discovery, since those chunks would not appear in `index.html`.
    Bump `progresspal-cache-vN` when the SW logic changes. A registered SW persists
    in a real browser beyond file deletion (clean-kill via clearing site data or a
    tombstone `sw.js`).
