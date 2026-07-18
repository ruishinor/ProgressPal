# RPG Shell Phase 1 Handoff - Persistent Hero HUD Foundation

## Module

RPG Shell Phase 1 - Persistent Hero HUD foundation.

## Status

Retroactively completed 2026-07-18; RPG v2 frozen per D-0074.

This handoff was committed as a 27-line stub with empty "Files changed" and
"uncommitted local work" — a D-0063 violation. It was reconstructed on
2026-07-18 strictly from repository history (commit `0287b99` and its merge
`75694b2`). Fields that history cannot substantiate are marked
"not recoverable from repository history".

## Purpose

Add a persistent Hero HUD to the RPG shell, following the next-phase direction
recorded in `docs/rpg-v2/modules/RPG-15-HANDOFF.md` (shell transformation:
persistent Hero HUD, collapsed/detail panels, quest-first loop, reward
feedback, asset foundation, campaign-map redesign). Merge pull request #27 is
titled "RPG Shell Phase 1: Persistent Hero HUD foundation".

## Commit

- Commit: `0287b9923670de4db99515c413c33f79da13f17d` — "rpg: add persistent
  hero HUD foundation" (RuishiNOR, 2026-06-24).
- Merged via pull request #27 from branch `rpg/real-shell-v2`, merge commit
  `75694b2c9c6ddad518d8a95c00ff1d50c1c47526` (2026-06-24).

## Files changed

Verified against `git show 0287b99 --stat` (7 files, 510 insertions, 1
deletion):

- `docs/rpg-v2/modules/RPG-SHELL-01-HANDOFF.md` (+27, new file — the original
  stub this reconstruction replaces)
- `src/features/rpg/model/readModels.ts` (+27)
- `src/features/rpg/model/types.ts` (+2)
- `src/features/rpg/shell/RpgShell.tsx` (+249, -1)
- `src/styles/rpg-shell.css` (+154)
- `tests/app/App.test.tsx` (+51)
- `tests/features/rpg/readModels.test.ts` (+1)

## What changed

Reconstructed from the commit diff:

- `src/features/rpg/model/readModels.ts`: added `getLevelProgressPercent`
  (with `roundToSingleDecimal` / `clampPercent` helpers) and exposed
  `xpSummary.levelProgressPercent` from `buildRpgHubSummary`.
- `src/features/rpg/model/types.ts`: added `levelProgressPercent: number` to
  the `xpSummary` of both `RpgHubSummary` and `RpgHeroProfileSummary`.
- `src/features/rpg/shell/RpgShell.tsx`: added the persistent Hero HUD — a
  HUD state machine (`loading` / `error` / `ready`) that loads
  `RpgHubSummary` via `loadRpgHubSummary`, hero-initials fallback
  (`getHeroInitials`), per-route context labels (`getRpgRouteContext`),
  `RpgProgressBar` rendering, and navigation via `rpgRoutePaths`
  (`Link` / `Outlet` / `useLocation`).
- `src/styles/rpg-shell.css`: added 154 lines of RPG shell / HUD styles.
- `tests/app/App.test.tsx`: added the `expectPersistentHeroHud` helper
  (asserts the "Persistent hero HUD" region, hero name, "Hero HUD" and
  "Level" labels, the "XP progress to level" progressbar, the
  `Route: <context>` label, and the "Continue quest" link href) and wired it
  into the RPG hub and RPG route shell tests.
- `tests/features/rpg/readModels.test.ts`: added the assertion
  `hub.xpSummary.levelProgressPercent === 10`.
- `docs/rpg-v2/modules/RPG-SHELL-01-HANDOFF.md`: the original handoff stub.

## Scope Discipline Check

Items below carried over from the original committed stub (commit `0287b99`);
they are part of repository history:

- Intended module: RPG Shell Phase 1 - Persistent Hero HUD foundation.
- Work mode: Next-module implementation.
- Files changed: reconstructed above from `git show 0287b99 --stat`.
- Why each changed file was necessary: per-file intent prose was empty in the
  original stub; the per-file purposes above are reconstructed from the diff
  only. Original author rationale beyond that: not recoverable from
  repository history.
- What was deliberately not added: not recoverable from repository history
  (the original stub left this field empty). The diff itself adds no
  dependency, asset, storage, or schema changes.
- New dependencies: none (per original stub; diff touches no manifest).
- New assets: none (per original stub; diff adds no asset files).
- New storage/schema: none (per original stub; diff touches no Dexie schema).
- Runtime network behavior changed: no (per original stub).
- Classic route behavior changed: no (per original stub).
- Source-of-truth reconciliation: no conflicts (per original stub).
- Warnings and anomalies (per original stub):
  - Git LF/CRLF notices: environment/line-ending warning.
  - Prettier CRLF issue: resolved with endOfLine auto.
  - Playwright parallel RC failure: concurrency/readiness anomaly; sequential
    pass.
- Validation cadence used: targeted tests + one required validation pass (per
  original stub). Exact commands, timings, and results of that validation:
  not recoverable from repository history.
- Commit status: committed as `0287b99` and merged via `75694b2` (PR #27);
  reconstructed and marked retroactively completed 2026-07-18; RPG v2 frozen
  per D-0074.
- Deferred tempting work (per original stub):
  - campaign map redesign;
  - collapsed panels;
  - reward feedback;
  - asset system;
  - shell-wide route promotion.
