# Consolidated integration handoff — 2026-10-27

**HOLD — integrated product checkpoint, not a frozen review-ready release candidate.** The build exceeds the unchanged JavaScript gzip budget. No full certification, independent approval, publication or provider change has occurred.

## Identity and provenance

- Worktree: `C:/Users/alex_/.codex/worktrees/utviklerblikk-activity-integration/ProgressPal`.
- Branch: `integration/utviklerblikk-activity-20261027`.
- Released baseline and read-only remote master: `d14ebf6a508b94d362baf6892627da4895a9a947`. Origin: `https://github.com/ruishinor/ProgressPal.git`.
- Integration starting commit: `83a7031f9064bf909d890487bed8061d60f880b9`, including Activity `1259e12561a66c8e5134aaf9695b2477bfaf561d`, v1.9.1 identity and corrected cache test. Ancestry from the released baseline through both commits was checked.
- UX/UU merge `c8a81ed` retains `e72def9a0101f23623293a73e4fac092a4b26a60`, `fc910a5f61a23f90678ab1f966eb174f20d8c388` and `c304b77a4dc734142c1a91c85b391b45d5d96396`.
- SQL/MySQL merge `4a74f08` retains `8a0b60f58b528a8c546f74d22abac0e843e38fd3` and `09df6bc3ffc7b8ce3980992a773f2550f015ced6`.
- Both learning branches diverge at `c7f04b816cfa8b155df0b4a6986ddac86668ba77`; their unique histories contain only the stated three/two commits. No unrelated lineage was imported.
- Activity-only evidence commit `1ef1357fb00f6c6329aa91e5a9200c5bc72ed81d` was not merged. Its payload `a7c4ef05ad7ed74072275e92c91175c4b42a69b6` does not approve this combination. Existing historical release-review files remain historical; none was authored or rebound by this task.
- Exact final checkpoint commit, root tree, payload tree and clean status are recorded after this document's commit in [checkpoint.json](../artifacts/consolidated-integration/checkpoint.json). This avoids self-reference. These identities identify a held checkpoint, not final review approval.

## Merge resolutions and bounded corrections

The UX merge conflicted only in `docs/CURRENT_STATE.md`: retained the newer Activity/release record and incoming UX provenance, then reconciled final state once after both functional merges.

The SQL merge conflicted in four files: `CURRENT_STATE.md`, `tenkSomEnUtvikler.ts`, `microlearningBoundary.test.ts`, and `utviklerblikkContent.test.ts`. Registry resolution retains all original categories and appends UX/UU, then SQL/MySQL, with both session arrays. The architecture guard now discovers the actual 13 bank files; its import allowlist and forbidden-API assertions are unchanged. Shared content tests assert all six exact category names/summaries and exact ordered registrations, retain the original 24-session fingerprint and UX answer-key assertions, and check equality with both incoming banks plus unique session/card IDs.

Git automatically accepted an identical 30-activity/five-category domain expectation from both branches; corrected it to the actual 36/six contract. SQL's own registration test now selects category index 5 and session offset 30, retaining the exact SQL IDs, content and arithmetic assertions. Neither incoming content file was edited; Git comparison against its source tip is clean.

Two stale assertions inherited from the v1.9.1 base still expected v1.9.0: `tests/db/databaseInitialization.test.ts` and `e2e/settings.spec.ts`. The version unit test reproduced the mismatch (received 1.9.1, expected 1.9.0); both assertions now match the retained executable identity. No product version or cache identity changed. A registry comment records both new banks.

## Verified inventory

| Category, in final order   | Stable category ID           | Activities | Stable activity IDs                                                                                                                 |
| -------------------------- | ---------------------------- | ---------: | ----------------------------------------------------------------------------------------------------------------------------------- |
| Generelt                   | `generelt`                   |          6 | `tsu-behov-eller-losning`, `tsu-kravtyper`, `tsu-informasjon-funksjon`, `tsu-data-mangler`, `tsu-handling-atferd`, `tsu-rolle-fase` |
| Scrum                      | `scrum`                      |          6 | `tsu-scrum-s01`, `tsu-scrum-s02`, `tsu-scrum-s03`, `tsu-scrum-s04`, `tsu-scrum-s05`, `tsu-scrum-s06`                                |
| Smidig samarbeid           | `smidig-samarbeid`           |          6 | `tsu-smidig-a01`, `tsu-smidig-a02`, `tsu-smidig-a03`, `tsu-smidig-a04`, `tsu-smidig-a05`, `tsu-smidig-a06`                          |
| Kanban                     | `kanban`                     |          6 | `tsu-kanban-k01`, `tsu-kanban-k02`, `tsu-kanban-k03`, `tsu-kanban-k04`, `tsu-kanban-k05`, `tsu-kanban-k06`                          |
| UX og universell utforming | `ux-og-universell-utforming` |          6 | `tsu-ux-uu-u01`, `tsu-ux-uu-u02`, `tsu-ux-uu-u03`, `tsu-ux-uu-u04`, `tsu-ux-uu-u05`, `tsu-ux-uu-u06`                                |
| Databaser – SQL/MySQL      | `sql-mysql`                  |          6 | `tsu-sql-01`, `tsu-sql-02`, `tsu-sql-03`, `tsu-sql-04`, `tsu-sql-05`, `tsu-sql-06`                                                  |

Total: **36 activities**. [Actual registered inventory](../artifacts/consolidated-integration/inventory.json) includes all titles and card counts, extracted through Vite's source loader. Existing programme validation checks registration/source/domain compatibility. Combined tests compare the original 24-session SHA-256 `a821664d3910121bf9376984393596de7a99265240f408668cfccabf36f30ead` and preserve specific malformed-input and boundary assertions.

## Checks and evidence

Logs are local, gitignored files under [artifacts/consolidated-integration](../artifacts/consolidated-integration/). They are available in this worktree and are not independent-review evidence.

| Check                                | Result and evidence                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact dependencies                   | `npm ci --prefer-offline`: 333 packages installed, audit reported 0 vulnerabilities; [log](../artifacts/consolidated-integration/npm-ci-retry.log). Node 24.19.0, npm 11.10.1.                                                                                                                                                                                                  |
| UX-only merge contract               | 82/82 tests, three files; [log](../artifacts/consolidated-integration/ux-merge-tests-retry.log).                                                                                                                                                                                                                                                                                |
| Combined content/domain/architecture | 90/90 tests, four files: Utviklerblikk content, SQL content, microlearning track domain, microlearning boundary; [log](../artifacts/consolidated-integration/combined-source-tests.log).                                                                                                                                                                                        |
| Activity and service worker          | 53/53 tests, four files: Activity page, indicator, service-worker architecture and cache behavior; [log](../artifacts/consolidated-integration/activity-sw-tests.log).                                                                                                                                                                                                          |
| Version/cache correction             | Reproduced stale unit expectation in [before log](../artifacts/consolidated-integration/version-before.log); 35/35 tests afterward across database initialization and the two already-counted SW files; [after log](../artifacts/consolidated-integration/version-after.log). Five database tests add to the 143 combined/Activity tests: **148 distinct tests in nine files**. |
| Corrected version browser assertion  | Managed production-preview runner, Chromium: 1/1 passed, no skip/retry; [log](../artifacts/consolidated-integration/version-e2e.log). Existing NO_COLOR/FORCE_COLOR environment warning is a non-product harness warning.                                                                                                                                                       |
| Lint and TypeScript                  | Full repository commands passed; [lint](../artifacts/consolidated-integration/lint.log), [typecheck](../artifacts/consolidated-integration/typecheck.log). Final changed-file lint is recorded separately.                                                                                                                                                                      |
| Formatting                           | Initial full check flagged only the merged CURRENT_STATE document; final reconciliation is formatted and the full check rerun. See [final check](../artifacts/consolidated-integration/final-format-check.log).                                                                                                                                                                 |
| Production build                     | Passed using native build; [log](../artifacts/consolidated-integration/build.log). Managed version E2E also built the same product successfully.                                                                                                                                                                                                                                |
| Native bundle checker                | **FAIL: JS gzip only**; [report](../artifacts/consolidated-integration/bundle.json), [full log](../artifacts/consolidated-integration/bundle.log). No policy altered.                                                                                                                                                                                                           |
| Source preservation                  | All three original worktrees remain clean at the expected heads; [read-only record](../artifacts/consolidated-integration/source-preservation.log). No other worktree or pre-existing process was reset, cleaned, stopped or reused. No release runner was observed.                                                                                                            |

The first sandboxed install failed inside npm (exit handler never called), and the first sandboxed Vitest attempt failed on temp-file rename permissions before collecting tests. The same locked install/focused tests passed with normal local access. These were tooling/environment failures, not product failures; original logs are retained.

## Bundle HOLD and one inspection

All measurements below are from `npm run check:bundle`, whose Node gzip measurements are authoritative (Vite's display differs).

| Budget                   | Actual bytes | Existing ceiling | Headroom / overage |
| ------------------------ | -----------: | ---------------: | -----------------: |
| Total JavaScript gzip    |      459,055 |          448,000 |    **11,055 over** |
| Largest raw JS chunk     |      496,204 |          500,000 |    3,796 remaining |
| CSS gzip                 |       15,789 |           40,000 |   24,211 remaining |
| Packaged curriculum gzip |      126,984 |          150,000 |   23,016 remaining |
| Python runtime gzip      |    6,398,912 |        7,000,000 |  601,088 remaining |

`content-utviklerblikk-DagaIHDV.js`: **152,565 B raw / 44,814 B gzip**. Entry `index-DULFeWCZ.js`: **496,204 B raw / 174,264 B gzip**. The owner-supplied prior Activity total was 447,522 B; combined total is 11,533 B higher. This comparison uses the supplied prior measurement, not a fresh rebuild of an original worktree.

One bounded source/build inspection found the two new banks each imported and registered once, using type-only domain imports and the unchanged existing static content chunk. No accidental application imports, duplicated bank registrations, dynamic imports, dependencies or alternate delivery paths were added. No removable duplication was demonstrated. The new content is the expected additional payload. Activity/RPG source, CSS, icons, service worker, `src/lib`, package/lockfile, Vite configuration and budget scripts compare unchanged against `83a7031`.

**Proposed authorization: JS gzip ceiling 465,000 B**, covering the 11,055 B overage with 5,945 B remaining (about 1.3% of measured payload). Keep every other limit unchanged. This proposal is not applied. No content/hint/explanation was removed and no optimization experiment was started.

## Product, visual and offline status

**Verified by source/tests:** exact bank/category relationships and keys; original content fingerprint; pure-data architecture; existing retry/explanation content contracts; accepted seven Activity PNGs, ECG identity/fallback and separate completion mapping preserved byte-for-byte with Activity/HUD/navigation/styles and offline asset list. Educational XP/mastery, persistent stores, schema, backup/cloud behavior and renderer are unchanged by integration.

**Not verified in the combined browser:** UX/UU and SQL journeys, keyboard retry/navigation for these categories, 320px and 390px mobile, desktop, light/dark, enlarged text including 320px/200%, actual reading order/readability, and cold offline learning/icon journeys. No new combined screenshots were captured. The extensive matrix was intentionally deferred at the early budget HOLD. The single browser check above verifies only the corrected settings/version assertion. Unit cache/asset guards are not a substitute for browser offline verification.

Original accepted Activity reference: [Activity visual handoff](ACTIVITY_VISUAL_REFINEMENT_HANDOFF.md), including screenshot paths under the **original Activity worktree's** `artifacts/activity-approved-integration/`. Those images were not regenerated or presented as integrated rendering evidence. Learning source handoffs: [UX/UU](utviklerblikk-ux-uu.md), [SQL/MySQL](utviklerblikk-sql-mysql.md); their dated branch counts/audit facts are historical, not current combined results. This task did not independently re-evaluate every pedagogical statement or legal/standards claim. No content correction was justified by the source integration checks.

## Version, certification and exact next action

Package/lockfile (including root package identity) and `progresspal-cache-v1.9.1` remain aligned. Active old-version expectations were inspected; the two executable assertions above were corrected. Historical backup fixtures retain their old input versions deliberately. **Recommend an owner decision on v1.10.0** because the combined scope adds twelve educational activities and two discoverable categories; do not change identity without authorization.

Executable timeout hierarchy checked: Playwright 75 minutes, managed E2E 76, release E2E command 83, hosted job 130. The release runner's other default command ceiling is 32 minutes. Executable settings outrank older prose. `verify:release` was not invoked. No independent approval was manufactured, copied or rebound. Nhost/schema-5 provider rollout remains entirely separate.

Next actions, in order:

1. Owner decides the proposed 465,000 B JS gzip ceiling (or supplies another bounded direction), and the release version. Current outcome remains **HOLD** until the budget is resolved.
2. Apply only authorized policy/identity changes together and run the directly affected budget/version/cache checks.
3. Complete the integrated learning/Activity browser matrix and offline checks using the existing targeted specs, inspect representative screenshots for readability, and resolve only confirmed defects. The existing SQL/UX specs retain their original assertions.
4. Complete one consolidated focused verification and final diff inspection, commit/freeze the final payload, calculate its payload identity, then hand it to a separate independent reviewer. Any change after that review requires correct rebinding.
5. Certification is a separate subsequent phase in a clean exact-commit worktree after genuine review evidence. No publication is authorized by this handoff or by eventual certification.
