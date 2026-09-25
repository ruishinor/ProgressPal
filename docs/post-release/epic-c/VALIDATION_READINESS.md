# Epic C validation readiness

Current state: **C0 ACCEPTED — C1 READY FOR OWNER REVIEW**.

## C0 validation performed

C0 changed documentation only, so product suites were not rerun as C0
acceptance evidence. Each mechanism the analysis relies on was validated
directly.

| Check                   | Mechanism                                                                                                                                 | Outcome                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Baseline identity       | Commit/tree objects re-hashed; index tree recomputed; working files re-hashed with `.gitattributes` normalization; fresh `git write-tree` | PASS: `fd5e2d5` / `bc86fd3`, 464/464 files match, clean               |
| Remote and ancestry     | Loose/packed refs, `FETCH_HEAD`, reflog, six parent links parsed from objects                                                             | PASS: FF of `origin/master` `d4b945b`; not published as of last fetch |
| Handoff consistency     | Archive documents diffed against HEAD                                                                                                     | PASS: 13/13 identical; wrapper formatting defect noted                |
| Guard liveness          | `vitest run tests/architecture tests/domain tests/seed` on pinned Node 24.21.0 / npm 11.10.1 after `npm ci`                               | PASS: 12 files, 36 tests                                              |
| Ownership and ID claims | Probes P1–P5 against the real repositories and engines                                                                                    | Behaviour observed as recorded in `C0_EVIDENCE_PROBES.md`             |
| Guard-scope claims      | Probes P6 (local-only guard) and P7 (ESLint layering) with positive and negative cases                                                    | Gaps G-1 and G-2 confirmed                                            |
| Documentation format    | `npm run format:check` (repository Prettier 3)                                                                                            | PASS (see closure record)                                             |
| Whitespace              | `git diff --check` on the C0 commit                                                                                                       | PASS (see closure record)                                             |
| Scope                   | `git diff --name-only fd5e2d5..HEAD`                                                                                                      | only `docs/post-release/epic-c/*`                                     |

Not run, deliberately: lint/typecheck/build/unit/E2E/bundle/audit for product
behaviour. No production file changed, so those results would re-certify
Epic B, not C0.

## Readiness matrix for Epic C

| Story | Behavior oracle                       | Architecture guards (destination included)            | Persistence evidence                  | Visual evidence                 | Owner input                      | Ready    |
| ----- | ------------------------------------- | ----------------------------------------------------- | ------------------------------------- | ------------------------------- | -------------------------------- | -------- |
| C1    | Unchanged baseline code               | ESLint, circular, format, typecheck                   | None needed (read-only fixtures)      | V0 oracles created              | Authorization only               | **Yes**  |
| C2    | C1 link/guide tables                  | G-1, G-2, G-3, sharedContracts, localOnly, bundle     | Seed sync tests                       | Not needed (no visual change)   | None                             | After C1 |
| C3    | C1 golden XP/achievement tables       | Engine purity, G-7, sessions                          | Repository award paths, save outcomes | Not needed                      | None                             | After C2 |
| C4    | C1 label tables, App/RPG text tests   | Route contract, rpgFeature, a11y                      | None                                  | Text oracles; captures optional | OD-6 only if brand text changes  | After C3 |
| C5    | P3 red→green with test-only catalogue | Epic A read boundaries and access probes              | Read-only                             | Not needed                      | None                             | After C4 |
| C6    | MR-1..MR-15                           | Persistence, backup, coordination, multi-tab, offline | Schema-2 fixture set (MR-0d)          | Not needed                      | **OD-1..OD-5 + schema decision** | Blocked  |
| C7    | Isolation tests                       | Route contract, coordination, read boundaries         | C6 state                              | Captures for any new control    | **OD-3 + switching UX**          | Blocked  |
| C8    | V0 oracles                            | CSS/asset guards, CSP, service worker, bundle         | None                                  | Owner capture comparison        | **Visual identity decision**     | Deferred |
