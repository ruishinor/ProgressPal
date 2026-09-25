# Epic C / C0 — decisions, owner questions and deferred concerns

Status: **RECORDED**. Labels: [D] proposed decision, [O] unresolved owner
decision, [X] deferred concern, [R] residual C0 limitation.

## 1. Architectural decisions proposed by C0 (for owner acceptance with C1)

| ID   | Decision                                                                                                                                                       | Basis                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D-1  | Target direction retained: active programme → validated definition → shared engine → shared shell, split into core / content / presentation by consumer layer. | Layer rules, pure engines, `?inline` assets                |
| D-2  | Structure stays `Programme → Unit → Item`; no deeper hierarchy.                                                                                                | Every consumer is two-level                                |
| D-3  | Rules are passed into lib engines; only composition roots import `@/programmes`.                                                                               | `seed` injection pattern; engine purity guards             |
| D-4  | New `src/programmes/` layer with ESLint rules created in the same commit.                                                                                      | Probe P7                                                   |
| D-5  | Active programme resolved at bootstrap and passed explicitly; never read inside passive RPG read transactions.                                                 | Epic A store allowlists                                    |
| D-6  | Single database forever; name is an opaque legacy identifier (P-1).                                                                                            | Profile, ledger, coordination and backup are database-wide |
| D-7  | CS50 identifiers frozen; new programmes must be globally unique, registry fails closed (P-2, P-3).                                                             | Probe P2; derived IDs; routes                              |
| D-8  | Catalogue version becomes per programme; no silent downgrade (P-5).                                                                                            | Probe P2                                                   |
| D-9  | Persisted values (IDs, source keys, reasons, amounts) are invariant under every extraction story; golden oracles captured before change.                       | XP dedupe by source key                                    |
| D-10 | Pixel baselines are review captures, not committed snapshots; deterministic token/asset oracles are committed.                                                 | Cross-platform fonts                                       |

## 2. Unresolved owner decisions (gate C6/C7; do not gate C1–C5)

| ID   | Question                                                                                                                                                                    | Why it matters                                                                                   | Options seen in source            |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------- |
| OD-1 | Are XP and level learner-global across programmes, or per programme?                                                                                                        | Decides whether `xp_transactions` needs stored programme ownership and what the HUD level means. | Today: one ledger, one level.     |
| OD-2 | Are the five programme-neutral achievements (`first-step`, `first-slice`, `clean-stop`, `three-deep-sessions`, `bug-hunter`) earned once per learner or once per programme? | Unique `achievementId` index; unlock IDs.                                                        | Today: once globally.             |
| OD-3 | Enrolment model: one active programme at a time? concurrent enrolments? what does onboarding choose for a fresh database?                                                   | Enrolment/active state shape and migration default (MR-2).                                       | Today: implicit single enrolment. |
| OD-4 | Are study sessions, insights, weekly targets and the learner profile global or programme-scoped?                                                                            | Read scoping of sessions/insights; profile shape.                                                | Today: global.                    |
| OD-5 | Is a new CS50x edition (for example 2027) a new programme or a new catalogue version of the same programme, and does progress carry over?                                   | `courseId` embeds the year; catalogue sync is additive and never deletes.                        | Not addressed in source.          |
| OD-6 | Product brand "ProgressPal CS50 Edition": keep, or make it programme-neutral?                                                                                               | Brand/title copy (C4). Does not affect the database name (D-6).                                  | Today: CS50 Edition.              |
| OD-7 | Which second programme, with what content licence and link hosts?                                                                                                           | Content and allowlist policy.                                                                    | Out of Epic C engineering scope.  |

C0 does not ask these now because none of them changes C1–C5. They must be
answered, and recorded as accepted decisions, before C6 begins.

## 3. Deferred concerns

| ID  | Concern                                                                                                                                              | Deferred to                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| X-1 | Long-form eligibility map (lecture/reading/section/shorts) may need to become programme policy.                                                      | Only if a registered programme needs a different mapping |
| X-2 | `lab` vs `problem_set` asymmetry between the status sequence and the correction path. Frozen; reproduce exactly when moved.                          | C4                                                       |
| X-3 | Vestigial `weekFour` / `RPG_WEEK_FOUR_UNIT_ID` in RPG summaries (exported, tested, not rendered). Removing it is a contract change, not a C0 action. | Owner-approved cleanup, not Epic C by default            |
| X-4 | Route segment `week` in `/rpg/week/:unitId` is CS50 vocabulary inside a frozen route contract.                                                       | Kept; any rename needs a route decision                  |
| X-5 | Closed type vocabularies (`week`, `final_project`, `problem_set`, session mode `final_project`) are persisted enums; renaming is a data migration.   | Kept; programmes supply labels                           |
| X-6 | Multi-tab upgrade behaviour (no explicit `versionchange`/`blocked` handling).                                                                        | C6 (MR-13)                                               |
| X-7 | Firebase/cloud persistence.                                                                                                                          | Out of scope                                             |
| X-8 | Repository hygiene: ≈850 MB of unreachable loose objects and an abandoned temp pack in `.git`.                                                       | Owner housekeeping; unrelated to Epic C                  |
| X-9 | Seed sync never deletes removed catalogue rows; per-programme sync must decide orphan handling.                                                      | C6                                                       |

## 4. Residual C0 limitations

| ID  | Limitation                                                                                    | Effect                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | The Bootstrap v7.0 and its Lessons Learned register were not among the supplied files.        | C0 followed the controls stated in the C0 task and repository evidence. Owner review should reconcile this story plan with the Bootstrap's Epic C specification before authorizing C1. |
| R-2 | The live remote could not be queried.                                                         | "Not published" is proven as of the last fetch (2026-09-25T23:23:44+02:00).                                                                                                            |
| R-3 | Probes ran in the cloud workspace on the pinned Node/npm, not on the owner's Windows machine. | Probe results concern platform-independent logic; they are C0 analysis evidence, not certification.                                                                                    |
