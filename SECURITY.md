# Security Baseline

## Current Stage

- Module 13 complete.
- Application scaffold now includes a real local IndexedDB persistence layer
  with runtime validation, schema versioning, migration coverage, a bundled
  CS50x course catalog, a reusable local-only design system, a first-run
  onboarding or profile flow, a seeded course-map route, a content-detail
  write surface, local long-form media-progress persistence, study-session logging,
  a local XP engine with an immutable transaction ledger, and a local achievement
  engine that persists immutable unlocks, but backup/reset flows still do not exist.
- Current attack surface is the client bundle, local dev tooling, installed
  dependencies, persisted on-device data, migration logic, bundled catalog
  ingestion, architecture-boundary drift, malformed local-data ingestion, the
  onboarding and preference surfaces, the course-map plus content-detail
  and sessions rendering/write surfaces, the local XP transaction ledger, and the
  local achievement-unlock store plus read-only achievements rendering surface.

## Security Posture

- Offline-only by default.
- No authentication.
- No remote analytics.
- No external APIs.
- No cloud sync.
- No backend.
- User profile, notes, and progress data are now persisted locally in
  IndexedDB.
- Study-session notes and blockers are now persisted locally in IndexedDB.

## Module 01 Controls

- Added `npm audit --audit-level=moderate` to the validation suite and achieved
  zero vulnerabilities.
- Added Playwright plus axe smoke coverage for the placeholder shell.
- Kept placeholder pages static and text-only; no HTML injection paths exist
  yet.
- Added no network-dependent runtime code beyond the local dev and test server.
- Scoped lint and format tooling away from bundled support directories to reduce
  false-surface maintenance risk.

## Module 02 Controls

- Added path aliases and public feature entrypoints so the app shell no longer
  deep-imports arbitrary route files.
- Added ESLint import-boundary rules that keep shared components and shared
  library code from depending on feature or app composition layers.
- Added `dpdm` circular-dependency checks to detect architecture drift before
  domain logic arrives.
- Kept future `db`, `seed`, and validation folders in placeholder-only state so
  no early persistence or parsing surface was introduced.

## Module 03 Controls

- Added generic schema-parsing helpers and duplicate-detection utilities under
  `src/lib/validation`.
- Added strict runtime schemas for course seed data and persisted entity shapes
  before any local data is stored or imported.
- Restricted source URLs in content assets to absolute `http` or `https` text
  values only; nothing is fetched automatically.
- Added tests for duplicate IDs, invalid enum values, missing final-project
  coverage, invalid slice skips, invalid media-event ranges, duplicate study
  days, and reversed session timestamps.
- Added filesystem boundary tests that keep `src/lib/db` and `src/seed`
  implementation-free until their assigned modules.

## Module 04 Controls

- Added a versioned Dexie schema with an automated legacy fixture that upgrades
  version-one data to the current version-two shape.
- Added repository functions that validate app metadata, learner-profile
  updates, progress writes, study sessions, XP transactions, and database
  snapshots before persisting or returning data.
- Added startup initialization that creates only singleton metadata and a
  default learner profile, keeping seed-input handling centralized.
- Added idempotent course-catalog sync that inserts missing units and items from
  validated seed input without duplicating IDs.
- Added isolated `fake-indexeddb` coverage for initialization, repository
  behavior, and migration safety.
- Added Playwright coverage that confirms IndexedDB singleton records survive
  reload without browser warnings.

## Module 05 Controls

- Added `src/seed/cs50x-2026.json` as a first-party bundled catalog validated
  through `parseCourseSeed` before startup consumes it.
- Tightened the course-seed schema so `sourceYear`, `required`,
  `estimatedMinutes`, and `order` are required and can no longer fail later
  during Dexie materialization.
- Updated startup initialization to pass only the validated bundled seed into
  the database layer instead of leaving the catalog empty.
- Extended seed sync so newer bundle versions can update seed-managed unit and
  item fields without duplicating rows or touching learner progress data.
- Added direct tests for the bundled payload shape, startup seeding, seed
  re-sync behavior, and the narrowed `src/seed` public surface.
- Extended Playwright validation so startup must produce the expected seeded
  unit and item counts with zero console warnings.

## Module 06 Controls

- Added a first-party design system under `src/components/layout` and
  `src/components/ui` instead of introducing a heavy third-party UI runtime.
- Kept styling local with tokenized CSS files and no remote fonts, remote
  icons, or network-backed asset loading.
- Kept the home-route showcase state local-only. Dialog and toast examples do
  not persist data, fetch remote content, or imply backend behavior.
- Added unit tests that verify disabled and loading button states, progress
  clamping, status-pill variants, and form label plus invalid-state wiring.
- Expanded Playwright coverage to verify keyboard navigation, dialog escape
  handling, reduced-motion behavior, local toast rendering, and accessibility
  scans on both the dashboard placeholder and the Module 06 showcase route.
- Preserved plain-text rendering only. The new components do not introduce
  `dangerouslySetInnerHTML`, rich-text parsing, or raw HTML interpolation.

## Module 07 Controls

- Added a dedicated onboarding gate that relies only on local IndexedDB state;
  no remote identity, analytics, or avatar service is introduced.
- Constrained `learner_profile.avatarConfig` to supported face, hair, and
  top-color keys instead of accepting arbitrary JSON blobs from future local
  edits or imports.
- Moved app-state orchestration into `src/lib/appState/` so feature routes can
  consume the same local state without breaking import boundaries or bypassing
  validation.
- Applied stored theme and reduced-motion preferences through local document
  attributes only. No remote stylesheet, remote font, or inline HTML injection
  was added.
- Added tests for invalid avatar config, onboarding-completion metadata, legacy
  fallback behavior, reload persistence, not-found routing, and offline
  navigation after setup.
- Raised Vite's chunk warning threshold just enough to suppress a tooling
  warning; no insecure dynamic code loading or third-party asset host was added
  to solve the warning.

## Module 08 Controls

- Replaced the `/course` placeholder with a read-only projection over seeded
  catalog data and persisted `progress_entries`; the route does not add any new
  write surface.
- Added a dedicated course-map model so rollup semantics are explicit and
  testable instead of being hidden in JSX conditionals.
- Kept required-progress percentages conservative by excluding optional items
  from required completion and surfacing blocked items explicitly.
- Added tests for ordered rollups, mixed-status handling, repository progress
  listing, app-route rendering, and persisted progress visibility after reload.
- Preserved the offline-only boundary: no remote fetches, no external assets,
  and no new network dependencies were introduced to render the course map.

## Module 09 Controls

- Derived long-form `content_assets` and generated `content_slices` now stay
  local and deterministic; no remote media metadata or playback integration was
  introduced.
- Added immutable `media_progress_events` and `resume_points` repository
  support with runtime validation and exact duplicate-range rejection for the
  same asset.
- Used interval union for watched-time rollups so overlapping local event
  ranges do not inflate progress totals.
- Kept `/course` read-only even after adding long-form watched-time and resume
  summaries; no user-facing mutation form or detail route was introduced yet.
- Preserved explicit blocked or completed `progress_entries` while allowing
  media events to supply a conservative fallback started or completed hint if
  item-level state is missing.
- Added tests for slice generation, overlap-safe progress totals, media-event
  logging, legacy-complete compatibility, and Playwright reload visibility.

## Module 10 Controls

- Added a dedicated `/course/:itemId` detail route instead of turning the
  course map into an inline edit surface, which limits the active write scope
  to one item at a time.
- Added repository lookup helpers that validate unit and item IDs before
  returning local catalog rows to the detail route.
- Added manual timestamp parsing helpers that reject malformed `m:ss` or
  `h:mm:ss` input before watched-range writes reach persistence.
- Reused the existing repository validation and duplicate-range rejection for
  `logMediaProgress`, so the new detail form does not bypass Module 09's
  immutable-event rules.
- Prevented deceptive manual `completed` and `skipped_optional` overrides when
  a long-form item already has partial saved media-event history.
- Kept evidence, notes, and manual timestamps rendered as plain text only; the
  detail route introduces no HTML rendering, script execution, or remote media
  loading.
- Added tests for content-detail route definitions, allowed status
  transitions, evidence requirements, timestamp parsing, direct route
  rendering, and persisted watched-range logging after reload.

## Module 11 Controls

- Added a dedicated `/sessions` route instead of leaking session controls into
  `/course` or `/dashboard`.
- Kept every saved study session bound to one existing item and matching unit
  because the current runtime schema already requires both fields.
- Kept live timers in memory only until an explicit save, which avoids phantom
  persisted effort after tab close or reload.
- Reused the existing repository validation path by saving only through
  `addStudySession()` and reading only through the new `listStudySessions()`
  helper.
- Added architecture tests that prevent the sessions feature from importing XP
  or progress-engine write surfaces.
- Added repository and E2E coverage that proves session flows leave progress,
  media, slice, resume, XP, achievement, and backup stores unchanged.
- Kept all session notes and blockers rendered as plain text only; no HTML
  rendering, rich-text parsing, or remote content loading was added.

## Module 12 Controls

- Reused the existing `xp_transactions` store without changing store definitions, schema versions, or migration rules.
- Kept levels, total XP, and XP to next level as derived-only values computed from the immutable transaction ledger.
- Prevented passive XP generation: XP is only awarded via explicit, user-initiated progress, media logging, or study session saves.
- Prevented XP revocation and negative XP: downgrading a progress item status does not modify or delete historical XP transactions.
- Derived deterministic, collision-resistant XP transaction IDs from `{sourceType, sourceId}` pairs to guarantee idempotency and prevent double-award exploits.
- Conducted all XP evaluations and database updates inside single Dexie transactions to guarantee atomic execution.
- Added extensive Vitest unit and Playwright E2E coverage for XP engine calculations, repository wrappers, and reload safety.

## Module 13 Controls

- Kept achievement definitions as validated code parsed against
  `AchievementDefinitionSchema` at module load, so a malformed definition fails
  fast instead of reaching persistence.
- Persisted only `achievement_unlocks`, validated through `AchievementUnlockSchema`
  before write, and never wrote to `achievement_definitions` or
  `xp_transactions` from achievement evaluation.
- Evaluated achievements only inside the existing explicit-save transactions; no
  app-open, reload, navigation, route-load, or page-read path creates unlocks.
- Made unlocks deterministic and idempotent through a stable
  `unlock-<achievementId>` id, a check-before-insert guard, and the
  `&achievementId` unique index backstop, so re-saves and reloads cannot
  duplicate unlocks.
- Kept the pure engine free of any Dexie/database import (verified by an
  architecture test) and kept the `/achievements` page read-only with no
  evaluation or write-API imports.
- Rendered all achievement titles, descriptions, categories, and dates as plain
  text only; no HTML rendering, rich-text parsing, or remote content was added.
- Added repository and app tests proving achievement evaluation leaves source
  stores unmutated and writes zero XP transactions.

## Threat Model Baseline

- Dependency vulnerabilities are now relevant because the scaffold and lockfile
  exist.
- Route placeholders could accidentally imply implemented security or privacy
  behavior if copy is vague.
- Shared UI primitives can create misleading trust signals if placeholder
  labels, badges, or progress treatments imply real saved state before the
  underlying modules exist.
- Architecture drift can quietly widen the trusted surface if feature code
  starts leaking into shared layers.
- Malformed local course payloads, notes, blockers, and future import flows can
  now reach real persisted storage if repository or migration boundaries are
  bypassed.
- Stale or careless bundled-seed edits can now misrepresent the official course
  structure even though runtime validation still blocks malformed shapes.
- Long-form watched-time history now increases the sensitivity of local device
  data exposure because the app records finer-grained study behavior than
  earlier binary-only progress entries did.
- The content-detail route now lets a learner persist notes, evidence, and
  manual watched timestamps directly, so low-quality local input and accidental
  mis-logging are now concrete integrity risks rather than future-only ones.
- The sessions route now lets a learner persist effort notes and blockers
  directly, so local device exposure and low-quality self-report data remain
  integrity and privacy risks even without any remote attack surface.
- Local persistence makes device compromise, browser-profile theft, and unsafe
  reset or import flows concrete risks now rather than hypothetical future
  ones.
- Missing git history still weakens security audit traceability.

## Required Security Checks For Later Modules

- Search for `dangerouslySetInnerHTML`, `eval`, `new Function`, and unexpected
  remote URLs.
- Render user content as text unless a future module defines a safe sanitizer.
- Validate imports and backups with explicit schemas before applying them.
- Verify zero unexpected external network calls during runtime.
- Keep boundary checks current as new shared utilities, repositories, and
  feature modules are introduced.
- Add backup tamper-handling, reset confirmation, and migration tests once
  persistence exists.
- Re-run dependency audit after each dependency change.

## Open Risks

- Full cold-start offline behavior is not present yet; only in-session offline
  navigation after initial load was validated in Module 01.
- README.md and PRIVACY.md are still missing, so user-facing security and
  privacy expectations are not yet documented.
- The first broad formatter run touched bundled support directories before
  ignore rules were corrected; with no git metadata, exact collateral change
  tracking is limited.
- Import-boundary checks are lint-time only. They reduce accidental coupling but
  do not prevent deliberate misuse.
- Offline-only does not protect data on a compromised device; local-device
  trust remains an assumption, and IndexedDB data is not encrypted.
- No user-facing export, import, reset, or corruption-recovery flow exists yet,
  so local-data repair is still developer-mediated.
- Bundled `estimatedMinutes` values are local planning heuristics rather than
  authoritative CS50 timings. Module 09 now derives long-form slice timing from
  those heuristics, so later asset-level modules must avoid silently treating
  them as precise official media durations.
- Seed sync updates and inserts catalog rows but does not delete rows removed
  from a future bundle. Cleanup of retired catalog rows still needs an explicit
  policy.
- Theme and reduced-motion preferences are now wired locally, but later modules
  still need to preserve contrast, motion suppression, and focus visibility as
  denser product screens arrive.
- Onboarding completion and settings edits now have local persistence, but
  there is still no user-facing reset or recovery path if local profile data
  becomes corrupted or unwanted.
- Course-map projections now expose more persisted progress data on-screen, but
  there is still no user-facing redaction, export, or recovery flow if local
  status records become stale or sensitive on a shared device.
- Once a long-form asset has real media progress, its slice plan is frozen to
  protect saved effort. If later modules need verified duration corrections,
  they must reconcile that against existing event history deliberately.
- The detail route now accepts free-text notes, evidence, and manual
  timestamps, but there is still no per-field history, undo stack, or user
  repair flow beyond overwriting the current saved values locally.
- Achievement unlocks are immutable and append-only with no user-facing reset,
  revoke, or repair flow. Because evaluation runs over all accumulated history on
  each explicit save, deliberately seeded or imported local source data could
  unlock achievements; this is bounded today by the absence of any import flow
  but must be revisited when backup/import lands.
