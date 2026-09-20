# Epic A / A2 readiness assessment

Result: **PASS — ready for A2 RED evidence and implementation work after this readiness record is integrated**

Story: **A2 — Module read boundary**

This result authorizes A2 only. It does not authorize A3, schema changes, UI changes, reward-rule changes, cloud/auth work, or integration to `master`.

## Accepted lineage assessed

Accepted product baseline:

- `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`

Accepted A1 implementation:

- commit: `ec651536e61a7e5d939506069887df32b81b5c0f`
- tree: `f401d82dc0d92fea9f3f18a7a1404eca8b3fa5a3`
- parent / accepted A0: `168ccfbca21dfbc5e66ec953a5dbdd42d47fa97d`

Epic A integration head assessed for A2 readiness:

- branch: `postrelease/01-read-architecture`
- HEAD before this readiness documentation: `8a50541c2ad34211c3974714659d016a6e534825`
- parent: accepted A1 commit `ec651536e61a7e5d939506069887df32b81b5c0f`

The reported integration working tree was clean. This readiness package must be committed documentation-only on that integration lineage. The A2 story branch must then be created from the resulting readiness commit, not directly from `8a50541...`, `master`, A0, or the A1 story branch.

## Readiness checks

| Check                                        | Result | Evidence / finding                                                                                                                          |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Product baseline remains identified          | PASS   | `origin/master` was rechecked during A1 closure and remained at the accepted baseline.                                                      |
| Integration lineage contains accepted A1     | PASS   | A1 was fast-forward integrated, then the documentation-only closure commit was added directly on top.                                       |
| A1 closure governance present                | PASS   | `A1_CLOSURE_RECORD.md`, updated `stories.yaml`, `VALIDATION_READINESS.md`, and A2 readiness handoff are present in the integration lineage. |
| Working tree clean after A1 integration      | PASS   | Owner output reported clean `postrelease/01-read-architecture`.                                                                             |
| Required toolchain proven                    | PASS   | Node `v24.19.0`, npm `11.10.1`; A1 exact-candidate release gate passed.                                                                     |
| Authoritative release path invocable         | PASS   | `npm run verify:release` passed on accepted A1 with release evidence bound to its exact SHA/tree.                                           |
| Frozen DB schema unchanged                   | PASS   | A1 did not modify `src/lib/db/database.ts`; A1 closure was documentation-only.                                                              |
| A1 measurement harness usable                | PASS   | Access-probe calibration and A1 Map boundary tests passed in focused and complete test suites.                                              |
| Current Module path still matches A2 premise | PASS   | `loadRpgModuleSummary(unitId)` still calls the generic `readSnapshot()` / `getDatabaseSnapshot()` path.                                     |

## Current Module problem confirmed

The current production Module loader remains broad:

```text
loadRpgModuleSummary(unitId)
  -> readSnapshot(options)
  -> getDatabaseSnapshot(options)
  -> one read transaction across all 14 stores
  -> materializes every non-singleton store, including complete
     media_progress_events, study_sessions, xp_transactions and backups
  -> buildRpgModuleSummary(snapshot, unitId)
```

This is still the exact A0/A2 architectural problem. A1 changed the Map loader only; it did not narrow Module.

The persistent `RpgShell` also continues to load the broad Hub summary. That shell work belongs to A4. A2 must measure and narrow the Module logical loader without pretending that the route-wide shell cost has already been solved.

## Schema/index suitability

The existing frozen schema already supports a narrow Module read without migration:

- `course_units`: keyed `&id`
- `course_items`: `unitId`, `[unitId+order]`
- `progress_entries`: unique `itemId`
- `content_assets`: `itemId`, `[itemId+order]`
- `content_slices`: `itemId`, `assetId`, `[assetId+order]`
- `media_progress_events`: `itemId`, `assetId`, `[assetId+createdAt]`
- `resume_points`: `itemId`, unique `assetId`
- `xp_transactions`: `sourceId`

No A2 schema/index change is justified by the current contract.

## Module data dependency analysis

The actual `RpgModuleSummary` output depends on:

1. the requested `CourseUnit`;
2. items belonging to that unit;
3. progress for those items;
4. long-form content state for assets belonging to those items;
5. earned XP source keys relevant to rewards that can be shown for those items.

The reward preview engine needs all items and progress **within the requested unit** for week-completion preview. The shared final-project preview logic does not require unrelated course progress. Therefore whole-course catalogue/progress reads are not required for Module reward labels.

The following stores cannot change Module output and are unrelated to its logical read:

- `app_meta`
- `learner_profile`
- `study_sessions`
- `achievement_definitions`
- `achievement_unlocks`
- `backups`

They must not be touched by the A2 Module loader.

## Readiness conclusion

A2 is not blocked by lineage, environment, schema, measurement tooling, or a changed production premise.

**Disposition: PASS.**

After this readiness documentation is committed to the Epic A integration branch, create `postrelease/a2-module-read-boundary` from that new readiness commit and begin with Module-specific RED access evidence before any A2 production edit.
