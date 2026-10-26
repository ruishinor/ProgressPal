# Activity implementation handoff — local, uncommitted

## Source and authorization

Final inventory: 50 modified tracked files, 17 new untracked files, zero staged changes. All implementation changes remain in this managed worktree for review.

Worktree: `C:/Users/alex_/.codex/worktrees/8939/ProgressPal`. Starting and final local HEAD: `c7f04b816cfa8b155df0b4a6986ddac86668ba77`; starting tree `2608a6fdc3ce6004a140626dc882d876f6f70215`. Detached HEAD is intentional. Origin is `https://github.com/ruishinor/ProgressPal.git`. The worktree was initially clean. The original checkout and other worktrees were not modified; no additional worktree or branch was created. No commit, push, merge, tag, infrastructure application, deployment or application-version change was performed.

The owner supplied `ProgressPal-Movement-Initial-Overall-Prompt.md` after preliminary investigation. Its persistence gate was observed, then the owner authorized local schema-5/provider preparation. The later **Owner Decision Update — Schema 5 and Backup Compatibility** supersedes the earlier conversion authorization: no new schema-4 exported-backup conversion remains. The owner separately authorized the JavaScript gzip ceiling of at most 445,000 B after one focused duplication/dependency pass. Historical lessons were used as guidance, not as authority to reopen unrelated work.

Node 24.19.0 and npm 11.10.1 are in use. The sandboxed `git ls-remote` failed; the later approved read-only retry verified remote `master` at the exact starting HEAD. Production deployment was not independently checked. The exact supplied starting commit is present locally. Two sandboxed installs failed with npm's “Exit handler never called”; the subsequent approved `npm ci --no-audit` completed successfully. Manifests and lockfile are unchanged.

## Delivered scope

P0 implementation:

- `/rpg/movement`, reached from the subordinate Activity Level/Aktivitetsnivå link in the existing HUD and Hero profile. The original five primary destinations and educational progression presentation remain.
- Push-ups, squats, kickbacks, walking, running, cycling and custom activities. Repetitions, duration and distance retain distinct identities. Stored units are exact integer repetitions, seconds and metres; display units are repetitions, minutes and kilometres.
- Optional daily goals: create, edit, disable and remove, with no required onboarding setup or defaults. Logging works without goals; aggregate completion counts satisfied goals rather than mixing quantities.
- Individually identifiable entries, including multiple entries per day; manual historical dates; replacement edits; explicit deletion confirmation; retained excess volume; history rendered in pages of 20.
- Daily totals, inclusive rolling 28-calendar-day totals and lifetime totals per activity/unit. Custom rename preserves identity. Removal archives a definition and disables current goals while retaining historical entries and goal references.
- Activity Level starts at 1 and adds one level for each seven distinct participating dates. Entries on one date count once regardless of volume. Correction/deletion recalculates progression. No study XP, achievements, mastery, attempts, educational level curve or Focus-session mechanism is changed.

P1: recent seven-day participation/goal states, current/best participation streak, and off-by-default movement reminders. Reminders run only in the mounted RPG shell, count visible/focused time with input in the preceding minute, pause/reset across hidden or unfocused use, support dismiss/postpone/disable, and never log activity or request notification permission. Planned rest days are deferred. P2 and fitness-app expansion are deferred.

The Activity screen follows the active programme's existing language context (English for CS50x, Bokmål for Programvareutvikling), without an application-wide localization system. Errors retain entered values and report failure; success follows the authoritative mutation. Controls respect the existing write coordinator. The default date tracks local today until explicitly selected; saved dates remain fixed across timezone changes. Goal changes affect today and future configuration; prior daily snapshots retain their targets. Backfilled dates without known goal context receive no invented goals.

## Data integrity and compatibility

Owner-authorized additive Dexie schema 5, native IndexedDB version 50, same database name. Four new stores start empty on live v4 upgrade:

- `activity_entries`: individual records, indexed by date/activity/measurement; the HUD reads only distinct date-index keys.
- `activity_definitions`: custom identities, names, immutable measurement choices and archival state; built-ins are static definitions.
- `activity_settings`: singleton goals and reminder preference, absent until explicitly saved.
- `activity_days`: goal context for a calendar date; no duplicated totals or level counters.

Existing educational rows are unchanged except app metadata's schema number. Complete schema-5 export/import, direct atomic restore, reset and rollback include all four stores. Shapes, unique identities, references, unit compatibility and exact numeric totals are validated. Invalid restore preflight occurs before destructive writes. New backups also disclose/count Activity entries in existing recovery surfaces.

Schema-4 and earlier exports are refused before writes by this candidate. No old backup file/row is rewritten, migrated or cleaned up. No actual learner backups were inspected, and no dependency on valuable data existing only in an old backup was observed. The local live database upgrade is separate from exported-backup restore.

The provider migration is prepared under `infra/nhost/migrations/default/1792886400000_activity_generation_5/`, **not applied**. Existing table-creation SQL is preserved. The future gate accepts only format 1/schema 5; old rows remain but are incompatible with the new client. The guarded down migration refuses to lower the generation while schema-5 rows exist. Full rollout order, upload-unavailability window, effects on older cached clients, historical validation-harness limitation and downgrade constraints are documented in `infra/nhost/README.md`. No schema-5 live-cloud operation is claimed.

## Material source changes

Presentation: `src/features/rpg/activity/`, the optional secondary-statistic slot in `RpgHeroIdentity`, its shell/profile composition, registered route/path helpers and `src/styles/activity.css`. Shared RPG components, design tokens, five-item navigation and static import/offline architecture are retained. The identity component remains independently renderable; Activity reads belong to its consuming pages/shell.

Domain/storage: `src/lib/domain/activity.ts`, `src/lib/activity/model.ts`, `src/lib/db/activity.ts`, database declarations/constants, and complete snapshot/restore/reset plumbing in `repositories.ts`. Backup validation, summaries, local/cloud recovery previews and disclosures include Activity. Provider changes are candidate constants and versioned SQL only. No new dependencies, assets, runtime external requests, schema-4 conversion, separate persistence system or speculative abstractions.

Tests add Activity behavior/migration/reminder/browser coverage and update current-schema expectations and provider simulations. Existing educational integrity/access tests retain their original assertions; Activity-only index/settings reads are explicitly separated without allowing educational ledger materialization.

## Verification

This document is implementation evidence, not an independent review or release certificate.

| Check                                               | Observed result                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci --no-audit` with the approved local runtime | PASS, exit 0; 333 locked packages installed. No manifest/lock change.                                                                                                                                                                                                                                                                                                                                  |
| `npm run typecheck`                                 | PASS, exit 0 after correcting browser-scope annotations in the new E2E test.                                                                                                                                                                                                                                                                                                                           |
| `npm run lint`                                      | PASS, exit 0 on the final product source.                                                                                                                                                                                                                                                                                                                                                              |
| `npm run format:check`                              | PASS, exit 0 after formatting the changed schema fixture.                                                                                                                                                                                                                                                                                                                                              |
| `npm run check:circular`                            | PASS, exit 0; no cycles.                                                                                                                                                                                                                                                                                                                                                                               |
| Focused storage/backup/generation/architecture run  | PASS, 12 files / 275 tests, exit 0.                                                                                                                                                                                                                                                                                                                                                                    |
| `npm test` (one broad regression run)               | Initial FAIL, exit 1: 199 files, 3,450 tests; 3,418 passed and 32 failed. The seven failing files were investigated and corrected, not waived. See closure below.                                                                                                                                                                                                                                      |
| Focused closure of actual failures and new behavior | Final PASS: the final eight-file closure ran 78/78 tests, exit 0. The preceding 13-file run already passed the Settings app/export-race, programme lifecycle, recovery and coordination files; its four remaining failures were the stale error-message assertion subsequently closed in the eight-file run. No unresolved unit failure remains identified. A second full-suite run was not performed. |
| Initial Activity browser pass                       | PASS, 5/5, exit 0 after selector corrections. The final results below include the later programme-switching and Settings file-recovery additions.                                                                                                                                                                                                                                                      |

Final verification results after the last product changes:

| Check                            | Result                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Final Activity/backup delta      | PASS, 4 files / 47 tests, exit 0: Activity storage, save feedback, reminders and educational backup preservation. Includes the midnight-consistency correction and archived-goal invariant.                                                                                                            |
| Production compilation           | PASS: the final managed E2E runner built the latest source with Vite's production configuration. The earlier explicit npm build also exited 0.                                                                                                                                                         |
| Broad browser regression         | Initial FAIL, exit 1: 270 passed / 1 failed, no retries or skips, 44.6 minutes. The single assertion expected Settings immediately after Hero and omitted the new Activity tab stop. All six offline checks passed.                                                                                    |
| Final browser closure            | PASS, 7/7, exit 0, 29.3 seconds: Activity file export/import replacement, deletion focus, custom history, programme/language switching, axe/light/dark/320/1440 px/enlarged text, read-only tabs, offline reload and updated keyboard order with visible focus. No second broad E2E run was performed. |
| Bundle budget                    | PASS, exit 0, no warnings/violations: JS gzip 438,335 B; largest JS raw chunk 488,902 B; CSS gzip 14,420 B; curriculum gzip 126,984 B; runtime gzip 6,398,912 B. Report: artifacts/activity-bundle-budget.json.                                                                                        |
| Final types/lint/circular checks | PASS, exit 0 for each on the final source.                                                                                                                                                                                                                                                             |

Final browser closure command:

```text
npm run test:e2e -- e2e/activity.spec.ts e2e/rpg-primary-nav-layout.spec.ts --grep "Activity|custom distance|logical keyboard path|read-only"
```

Final unit delta command:

```text
npm test -- tests/db/activity.test.ts tests/features/rpg/activityPage.test.tsx tests/features/rpg/activityReminder.test.tsx tests/lib/backupSchemaV4.test.ts
```

Build-size decision: the first complete Activity build measured 438,135 B JS gzip against the old 435,000 B ceiling. One focused pass checked units/helpers/UI reuse, imports and dependencies; no unintended dependency or code inclusion was found. Final correctness/integrity changes leave 438,335 B (+200 B from that first measurement). The authorized ceiling is 445,000 B; every other budget is unchanged. No lazy loading, artificial chunk splitting, functionality reduction or broad byte-saving refactor was used. The 429,198 B pre-Activity figure in existing records is historical evidence, not a fresh baseline build by this session.

Final review also corrected today's consistency fallback across midnight, retained keyboard focus after deletion, and centralized the rule that current enabled goals cannot reference archived activities while historical snapshots may. Desktop/mobile screenshots were visually inspected. Physical-device testing and independent owner product/visual acceptance were not performed. Node color-environment warnings and slow-file notices are non-blocking; no test parallelism or retry policy changed.

Functional P0 criteria are met by this local evidence. P1 consistency/reminders are implemented; planned rest days and P2 remain deferred. This is not an all-green release certificate: broad-run failures and their focused closures are reported explicitly, and the dependency audit still fails. Each expensive broad run was performed once; only affected deltas were rerun.

The eight-file final unit closure command was:

```text
npm test -- tests/domain/moduleBoundaries.test.ts tests/lib/backupSchemaV4.test.ts tests/db/activity.test.ts tests/features/rpg/activityPage.test.tsx tests/features/rpg/activityReminder.test.tsx tests/features/rpg/components.test.tsx tests/features/rpg/a6BadgesReadBoundary.test.tsx tests/features/rpg/a7RouteAccess.test.tsx
```

Verified behavior includes 8+7+5 individual saves, correction to 19, deletion recalculation, distinct-date progression, large quantities, separate units, inclusive 28-day boundaries, leap/DST-adjacent dates, automatic versus explicit dates across midnight, custom rename/archive, historical goal meaning, read-only mutation refusal, failed-save input retention, pending-submit guards, all-store restore rollback, populated native-40 → native-50 migration with unchanged educational XP/levels, and index-only HUD reads. Reminder tests exercise default-off, recent interaction, hidden/focus cleanup, postpone/dismiss, disable failures and unmount cleanup.

The broad run caught one real presentation regression: embedding the stateful Activity reader in the previously independent identity primitive. The final component accepts an optional rendered statistic; the shell/profile owns the reader. Other failures were stale schema-4 expectations, a database-file allowlist, and provider simulations still modelling generation 4. These were updated narrowly while preserving integrity and educational read-boundary assertions.

Known baseline release blocker: `npm run audit` exits 1 with two high-severity dependency findings: runtime `zod@4.4.3` and `undici@7.30.0` through development-only `jsdom@29.1.1`. Both versions are unchanged from HEAD. No automatic dependency upgrade was attempted. The native release gate was not run, and no independent-review evidence was authored.

## Owner review and recovery

Keep this managed worktree: the implementation is uncommitted. In this chat, use Codex's diff/review controls to inspect the changes, then run `npm run dev` in this worktree and open `/rpg/movement` with a synthetic profile. Review the desktop/mobile screenshots under `artifacts/activity-*.png` and inspect the actual logging, goal and history interactions. Screenshots are observations, not owner acceptance.

Use a separate browser profile/origin for local review; valuable production browser data was not used. A database upgraded to version 50 cannot be opened by older code. Never clear learner data merely to force a downgrade. Preserve appropriate exports and use forward recovery or a deliberately selected backup/profile. Later branch creation, commits, independent exact-delta review, dependency remediation, release certification, provider rollout and publication require separate owner authorization.
