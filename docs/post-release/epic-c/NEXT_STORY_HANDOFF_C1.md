# C1 handoff — baseline preservation evidence

Status: **Not started. C1 begins only after the owner reviews and accepts
C0 `PASS_READY_FOR_C1`.** This handoff does not itself authorize C1.

## 1. Goal

Capture, from the unchanged accepted baseline, the evidence that C2–C8 will be
judged against, before any programme-platform refactor changes ownership. C1
adds tests, fixtures, one capture-only spec and documentation. It changes no
product behaviour.

## 2. Baseline and branch

- Start a new local branch (suggested `cx/epic-c1-baseline-evidence`) from the
  owner-accepted C0 reconciliation commit on `cx/epic-c0-v7-reconciliation`
  (the commit that adds this file). Its ancestry is `fd5e2d5` (accepted Epic B,
  `master`) → `137ffde` (original C0) → reconciliation commit; all three share
  product tree bytes outside `docs/post-release/epic-c/**`.
- Record in the C1 closure record: branch, starting commit/tree, and that
  `master` and both C0 branches are unchanged.
- Epic B remote publication (OD-9) does not gate C1, because C1 adds no
  production code. It gates C2.

## 3. Allowed and forbidden scope

C1 may:

- add new test files and fixtures under `tests/**`;
- add one new capture-only Playwright spec under `e2e/` (B2–B4 pattern);
- add documentation under `docs/post-release/epic-c/**` (closure record,
  visual baseline manifest).

C1 must not:

- change any file under `src/**`, `public/**` or `scripts/**`;
- modify, skip, weaken or rewrite any existing test, spec or guard;
- change configuration (`eslint.config.js`, `vite.config.ts`, `tsconfig*`,
  `playwright*`, `package*.json`, `vercel.json`), schema, seed data, CSS or
  assets;
- add a dependency;
- push, merge, tag, deploy or alter any remote.

## 4. Evidence to add

Map existing coverage first (`VALIDATION_READINESS.md` §3) and add only what
is missing. Each addition records its primary role: **semantic** (A),
**characterization** (B), **mutation**, **migration**, **visual** (D).
Expected values for semantic oracles come from the rule source or seed
authority and are owner-reviewed at C1 closure; they are not merely whatever
the code returned.

1. **Curriculum identity and ordering** (semantic). Committed ordered table of
   unit IDs/types/required/order and item IDs/types/required/order per unit,
   reviewed against `src/seed/cs50x-2026.json`; asserted through runtime
   consumers (course map model and RPG map summary ordering), not only the
   parsed seed.
2. **Status reachability** (semantic). For every item type × required flag
   present in the CS50 seed, the statuses reachable through the Classic status
   sequence, the correction path and RPG status actions, derived from the real
   option producers (`features/course/detailModel.ts` and RPG mutation
   controls). Include the lab/problem_set asymmetry (X-2) even though the seed
   has no `lab` item.
3. **XP awards over the real catalogue** (semantic for reachable states). For
   every CS50 item and every reachable status from item 2: `evaluateProgressXp`
   output with the real unit and unit items (`sourceType`, `sourceId`, `xp`,
   `reason`, order); unit-completion awards for every required `week` unit;
   final-project pair states (README only, demo only, both). Drive a
   representative subset through the real mutation path
   (`upsertProgressAndAwardXp`) and assert the persisted ledger rows
   (mutation). Unreachable engine inputs, if kept, are labelled
   characterization and kept in a separate table; they are not platform
   semantics. XP rules for types absent from the CS50 seed (`notes`,
   `reflection`) stay covered by the existing synthetic engine tests.
4. **Preview XP** (semantic for the displayed label). `evaluateCompletionPreviewXp`
   and the RPG reward label (`questRewards`) for every CS50 item from a fresh
   state and after its award is earned.
5. **Persisted reward identity** (semantic). For every reachable award from
   item 3: `sourceType`, `sourceId`, derived transaction ID; for every
   achievement satisfied in item 6: unlock ID and trigger source ID.
6. **Achievements** (definition snapshot = characterization; satisfaction =
   semantic). Serialized `achievementDefinitions` (all fields, in order), and
   the satisfied set with trigger IDs through the real evaluation path for
   staged real-catalogue states: none; week 0 complete; three problem sets
   submitted; final-project build; README + demo; all required complete; plus
   the programme-neutral achievements where staging is cheap (first slice,
   clean stop, deep sessions, debugging session).
7. **Baseline-built schema-2 fixture** (migration). Build a synthetic
   progressed database with the real repositories (content listed in
   `C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §7 "Required fixtures"), export it
   through the real backup export, commit it under `tests/fixtures/backups/`,
   and assert it parses, restores and round-trips at the baseline. Synthetic
   data only.
8. **Links, guides and labels** (characterization). Total lookup table of
   `getCs50UnitLink`/`getCs50ItemLink` and `getUnitGuide`/`getItemGuide` for
   every seed unit and item ID (including nulls); label tables only where not
   already pinned: item/unit type labels, achievement category labels and
   order, session-mode labels, RPG guild/class/path labels, map ordinal text
   per unit, rank labels at their thresholds.
9. **Asset and token identity** (visual — identity only). SHA-256 of every
   file in `src/features/rpg/assets/**`; the achievement ID → asset mapping and
   fallback; custom-property names and values parsed from
   `src/styles/tokens.css` (light and dark) and `src/styles/rpg-tokens.css`.
   Recorded as necessary but not sufficient: it does not prove rendered
   parity.
10. **Retained visual baseline** (visual). One capture-only spec implementing
    `C0_VISUAL_PRESERVATION_PLAN.md` §4–§5: fixed clock, synthetic states,
    both viewports, Classic light/dark, exact filenames. Immediately after the
    baseline run, seal the captures into one ZIP, write the committed manifest
    (per-file SHA-256, route, state, viewport, theme, Playwright/Chromium
    versions, OS/font environment, baseline commit/tree, ZIP SHA-256), and
    present the set for owner review. Retention location is OD-8, decided at
    C1 acceptance.

Avoid broad ambiguous snapshots and tests of private structure. Prefer
explicit tables whose rows name what they protect.

## 5. Validation

- Baseline first: run the existing suite once before adding C1 files; a
  baseline failure is a stop condition, classified by layer.
- Focused: every new test file, plus the suites of the runtime consumers it
  exercises (`xpEngine`, `achievementsEngine`, `repositories`, `backup`,
  `backupCompatibility`, `cs50Links`, `guideContent`, `courseDetailModel`,
  RPG read-model and presentation tests).
- Aggregate: `npm run lint`, `npm run format:check`, `npm run typecheck`,
  `npm test` (no skips or retries), `npm run check:circular`,
  `npm run test:e2e` (the new capture spec runs in the managed suite).
- `git diff --check` as a separate gate.
- Path scope: `git diff --name-status <C0 commit>..HEAD` lists only added
  files under `tests/**`, the one added `e2e/` spec, and
  `docs/post-release/epic-c/**`; no existing file outside
  `docs/post-release/epic-c/**` is modified.
- The closure record states exact counts, commands, outcomes, the ZIP SHA-256,
  owner-effort metrics and the evidence role of every addition.

## 6. Stop conditions

Stop and report instead of continuing if: an oracle cannot be produced
without changing `src/**`; the baseline suite fails before C1 changes; a
fixture would contain real learner data; reachability of a status combination
cannot be derived from source; captures cannot be made deterministic enough to
record the state they show; or any existing test would need modification.

## 7. What owner acceptance of C0 authorizes

Accepting C0 `PASS_READY_FOR_C1` authorizes exactly one thing: starting C1
within §2–§6 above, as a local branch ending in a clean local commit for owner
review. It does not authorize C2+, any `src/**` change, schema change, push,
merge, tag, deployment, remote mutation or Epic B publication, and it does not
answer any owner decision in `SPEC.md` §6.
