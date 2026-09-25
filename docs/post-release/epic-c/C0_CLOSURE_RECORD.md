# Epic C / C0 — closure and readiness record

Disposition: **A. C0 ACCEPTED — C1 READY FOR OWNER REVIEW**

## Baseline

`master` at `fd5e2d592bb6f5d1724509119147c48ba3a5df59`, tree
`bc86fd392a5284d9db8821c31a27b8c95ec82a9a`, clean; a fast-forward of
`origin/master` `d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3` by the six Epic B
commits; Epic B not published as of the last fetch. Details and method:
`C0_IDENTITY_BASELINE.md`.

## Deliverables

| #   | Deliverable                                                          | Record                                                 |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Identity / baseline                                                  | `C0_IDENTITY_BASELINE.md`                              |
| 2   | Programme-specific semantic inventory                                | `C0_SEMANTIC_INVENTORY.md` §2, §4                      |
| 3   | Generic / shared semantic inventory                                  | `C0_SEMANTIC_INVENTORY.md` §3                          |
| 4   | ProgrammeDefinition ownership proposal                               | `C0_PROGRAMME_DEFINITION_PROPOSAL.md`                  |
| 5   | Persisted ownership / versioning analysis                            | `C0_PERSISTENCE_OWNERSHIP_ANALYSIS.md`                 |
| 6   | Migration-readiness contract                                         | `C0_MIGRATION_READINESS_CONTRACT.md`                   |
| 7   | Visual-preservation prerequisites                                    | `C0_VISUAL_PRESERVATION.md`                            |
| 8   | Architecture / dependency guard map (incl. destination-layer guards) | `C0_GUARD_MAP.md`                                      |
| 9   | Deferred concerns, owner decisions, residual limits                  | `C0_DECISIONS_AND_DEFERRALS.md`                        |
| 10  | C1+ story decomposition                                              | `C0_STORY_DECOMPOSITION.md`, `stories.yaml`, `SPEC.md` |
| 11  | Validation / readiness matrix                                        | `VALIDATION_READINESS.md`                              |
| 12  | Closure / readiness                                                  | this record                                            |
| 13  | Next-story handoff                                                   | `NEXT_STORY_HANDOFF_C1.md`                             |
| —   | Mechanism probe evidence                                             | `C0_EVIDENCE_PROBES.md`                                |
| —   | Proposed Lessons Learned additions                                   | `C0_LESSONS_LEARNED_ADDENDUM.md`                       |

## Key findings

1. [F] The structure is already `Programme → Unit → Item`; no deeper
   hierarchy is needed.
2. [F] CS50 policy leaks into the generic engine in four places: final-project
   item IDs in XP and repositories, `week-N` unit IDs in achievements, the
   `final_project` requirement in the generic seed schema, and the global
   `final_project` unit lookup.
3. [F] Programme ownership is explicit only on `course_units`. Probes show a
   colliding second catalogue silently re-owns CS50 rows and downgrades the
   single `seedVersion` (P2), and all reads merge catalogues (P3).
4. [F] XP and unlock identities have no programme dimension (P4); backup
   validation does not reject duplicate XP source keys (P5).
5. [F] Two guard gaps would let an Epic C move pass green while escaping
   protection: the local-only URL guard ignores data files (P6) and a new
   directory has no layer rule (P7).
6. [F] No automated oracle exists for appearance, exhaustive XP awards or
   achievement satisfaction over the real catalogue; C1 fills that gap before
   any production change.
7. [D] The target direction holds, split by consumer layer, with rules passed
   into engines and the active programme passed explicitly.

## Why the disposition is A

- The C1 contract is complete, needs no owner product decision, changes no
  production code and has explicit stop conditions.
- C2–C5 are specified and need no schema change or product decision.
- Every product decision that changes the persistence shape (OD-1 to OD-5) is
  recorded and gates C6 only. Migration is not authorized.
- The residual limits (R-1 Bootstrap not supplied, R-2 live remote not
  queried, R-3 cloud probe platform) do not affect C1's safety; R-1 is flagged
  for owner reconciliation before C1 authorization.

## C0 validation

| Command / check                                                                               | Outcome                                         |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Object/index/worktree identity verification                                                   | PASS                                            |
| `vitest run tests/architecture tests/domain tests/seed` (Node 24.21.0, npm 11.10.1, `npm ci`) | PASS, 12 files / 36 tests                       |
| Probes P1–P7                                                                                  | Executed; results in `C0_EVIDENCE_PROBES.md`    |
| `npm run format:check` on the C0 tree                                                         | PASS                                            |
| `git diff --check` for the C0 commit                                                          | PASS                                            |
| `git diff --name-only` for the C0 commit                                                      | 16 files, all under `docs/post-release/epic-c/` |

## Behaviour freeze

No production application code, test, configuration, schema, route, style,
asset, dependency or lockfile changed. Displayed values, ordering, labels,
completion, XP, achievements, unlocks, saves, reloads, routes and Classic/RPG
shared capabilities are untouched.

## Publication boundary and owner effort

Committed locally on `cx/epic-c0-programme-readiness` with parent
`fd5e2d5`. `master`, its checkout and the working tree were not changed. No
push, merge, tag, deployment or remote change occurred. Owner effort during
C0: **0** clarification or debugging requests.

C1 is not started. It begins only on explicit owner authorization within the
boundary in `NEXT_STORY_HANDOFF_C1.md`.
