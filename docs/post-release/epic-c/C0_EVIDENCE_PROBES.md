# Epic C / C0 — mechanism probe evidence

Status: **EXECUTED**. Probes ran against a detached checkout of HEAD
`fd5e2d5` (tree `bc86fd3`) in the C0 cloud workspace with Node `v24.21.0`,
npm `11.10.1` and `npm ci`. Probe files were scratch only: they are not part of
this commit and the probe checkout was discarded. They observe current
behaviour; they are not tests that Epic C should keep in this form.

## Results

| ID  | Question                                                    | Observed result                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Can a programme without a `final_project` unit be parsed?   | No. `parseCourseSeed` throws "Course seed must contain a final_project unit."                                                                                                                                                                                                                                             |
| P2  | What happens when a second seed reuses a CS50 unit ID?      | `week-0` is re-owned: `courseId` `cs50x-2026` → `other-programme`, title → "Module 0". `app_meta.seedVersion` 20260617 → 1 (downgrade). No error.                                                                                                                                                                         |
| P3  | Do reads scope to one programme?                            | No. With a second, non-colliding catalogue synced, `loadRpgCourseMapSummary` returns 16 units (baseline 14) and 28 required items (baseline 26); `getCourseMapReadData` returns course IDs `cs50x-2026` and `other-programme`.                                                                                            |
| P4  | Do XP identities carry a programme dimension?               | No. `deriveXpTransactionId('week_completed','week-0')` = `xp-week_completed-week-0`. Another programme's `final_project` unit task earns no milestone XP (milestones are CS50 item IDs). Completing another programme's `week`-typed unit awards `xp-week_completed-other-m0` (type-keyed rule applies to any programme). |
| P5  | Does backup validation reject duplicate XP source keys?     | No. Two XP rows with IDs `xp-a`/`xp-b` and the same `(study_session, session-1)` pass `assertBackupDataInvariants`.                                                                                                                                                                                                       |
| P6  | Does the local-only guard see URLs in data files?           | No. `src/c0probe-links.json` containing `https://example.invalid/x` → guard passes (2/2). The same URL in `src/c0probe-links.ts` → guard fails with `external URL https://example.invalid/x`.                                                                                                                             |
| P7  | Does a new `src/programmes/` directory inherit layer rules? | No. `src/lib/c0LibProbe.ts → @/programmes/probe → @/features/course/paths` passes `eslint --max-warnings 0` (exit 0). A direct `src/lib` → `@/features/...` import is rejected ("Library code must stay independent…").                                                                                                   |

Run summary: probe suite 5/5 assertions held; P6 and P7 executed as shown.
Baseline guard suites in the same environment: 12 files / 36 tests passed.

## Reproduction

```bash
git worktree add --detach ../c0-probe fd5e2d592bb6f5d1724509119147c48ba3a5df59
cd ../c0-probe && npm ci
# save the P1–P5 file below as tests/c0probe/c0Probes.test.ts
npx vitest run tests/c0probe --reporter=verbose --silent=false
# P6
printf '{"url":"https://example.invalid/x"}\n' > src/c0probe-links.json
npx vitest run tests/architecture/localOnly.test.ts   # passes
printf "export const probeUrl = 'https://example.invalid/x';\n" > src/c0probe-links.ts
npx vitest run tests/architecture/localOnly.test.ts   # fails on the .ts URL
# P7
mkdir -p src/programmes
printf "import { courseMapPath } from '@/features/course/paths';\nexport const probe = courseMapPath;\n" > src/programmes/probe.ts
printf "import { probe } from '@/programmes/probe';\nexport const libProbe = probe;\n" > src/lib/c0LibProbe.ts
npx eslint --max-warnings 0 src/programmes/probe.ts src/lib/c0LibProbe.ts   # exit 0
# then remove the worktree
```

## P1–P5 probe source

```ts
// C0 scratch probes. Not committed. Each probe observes current runtime
// mechanism behaviour that the C0 readiness analysis depends on.
import { afterEach, describe, expect, it } from 'vitest';

import {
  ensureCourseCatalogFromSeed,
  getAppMeta,
  getCourseMapReadData,
  initializeDatabase,
  listCourseUnits,
  upsertProgressAndAwardXp,
  listXpTransactions,
} from '@/lib/db';
import { assertBackupDataInvariants } from '@/lib/backup';
import { parseCourseSeed, type CourseSeed } from '@/lib/domain';
import { deriveXpTransactionId, evaluateProgressXp } from '@/lib/xp/engine';
import { loadRpgCourseMapSummary } from '@/features/rpg';
import { bundledCourseSeed } from '@/seed';

import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../db/testDatabase';

const otherProgrammeCollidingSeed: CourseSeed = {
  courseId: 'other-programme',
  title: 'Other Programme',
  dataVersion: 1,
  sourceCheckedDate: '2026-09-01',
  units: [
    {
      id: 'week-0',
      order: 0,
      title: 'Module 0',
      type: 'week',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'other-m0-task',
          type: 'practice',
          title: 'Task',
          required: true,
          estimatedMinutes: 30,
          order: 0,
        },
      ],
    },
    {
      id: 'other-final',
      order: 1,
      title: 'Capstone',
      type: 'final_project',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'other-final-task',
          type: 'project_task',
          title: 'Capstone task',
          required: true,
          estimatedMinutes: 30,
          order: 0,
        },
      ],
    },
  ],
};

const otherProgrammeUniqueSeed: CourseSeed = {
  ...otherProgrammeCollidingSeed,
  units: otherProgrammeCollidingSeed.units.map((unit) =>
    unit.id === 'week-0' ? { ...unit, id: 'other-m0' } : unit,
  ),
};

let ctx: TestDatabaseContext | null = null;
afterEach(async () => {
  await ctx?.cleanup();
  ctx = null;
});

describe('C0 probes', () => {
  it('P1 seed schema rejects a programme without a final_project unit', () => {
    const noFinal = {
      ...otherProgrammeUniqueSeed,
      units: otherProgrammeUniqueSeed.units.filter(
        (unit) => unit.type !== 'final_project',
      ),
    };
    expect(() => parseCourseSeed(noFinal)).toThrow(/final_project/);
  });

  it('P2 a colliding unit id from another seed silently re-owns the CS50 row', async () => {
    ctx = createTestDatabase('c0p2');
    await initializeDatabase({ db: ctx.db, seed: bundledCourseSeed });
    const before = (await getAppMeta({ db: ctx.db }))?.seedVersion;
    await ensureCourseCatalogFromSeed(otherProgrammeCollidingSeed, {
      db: ctx.db,
    });
    const week0 = (await listCourseUnits(undefined, { db: ctx.db })).find(
      (unit) => unit.id === 'week-0',
    );
    const after = (await getAppMeta({ db: ctx.db }))?.seedVersion;
    console.log(
      'P2',
      JSON.stringify({
        seedVersionBefore: before,
        seedVersionAfter: after,
        week0CourseId: week0?.courseId,
        week0Title: week0?.title,
      }),
    );
    expect(week0?.courseId).toBe('other-programme');
    expect(after).toBe(1);
  });

  it('P3 whole-store reads merge a second catalogue into CS50 map output', async () => {
    ctx = createTestDatabase('c0p3');
    await initializeDatabase({ db: ctx.db, seed: bundledCourseSeed });
    const baseline = await loadRpgCourseMapSummary({ db: ctx.db });
    await ensureCourseCatalogFromSeed(otherProgrammeUniqueSeed, {
      db: ctx.db,
    });
    const merged = await loadRpgCourseMapSummary({ db: ctx.db });
    const readData = await getCourseMapReadData({ db: ctx.db });
    console.log(
      'P3',
      JSON.stringify({
        baselineUnits: baseline.unitCount,
        mergedUnits: merged.unitCount,
        baselineRequired: baseline.requiredItemCount,
        mergedRequired: merged.requiredItemCount,
        readDataCourseIds: [
          ...new Set(readData.courseUnits.map((unit) => unit.courseId)),
        ].sort(),
      }),
    );
    expect(merged.unitCount).toBe(baseline.unitCount + 2);
  });

  it('P4 XP award identity carries no programme dimension', async () => {
    ctx = createTestDatabase('c0p4');
    await initializeDatabase({ db: ctx.db, seed: bundledCourseSeed });
    await ensureCourseCatalogFromSeed(otherProgrammeUniqueSeed, {
      db: ctx.db,
    });
    // Same unit-type rule, different programme: the id derivation is only
    // sourceType + sourceId.
    expect(deriveXpTransactionId('week_completed', 'week-0')).toBe(
      'xp-week_completed-week-0',
    );
    // Final-project milestone keys are fixed CS50 item ids.
    const awards = evaluateProgressXp({
      progressEntry: {
        id: 'p',
        itemId: 'other-final-task',
        status: 'completed',
        confidence: 0,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      item: {
        id: 'other-final-task',
        unitId: 'other-final',
        type: 'project_task',
        title: 'Capstone task',
        required: true,
        estimatedMinutes: 30,
        order: 0,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      unit: {
        id: 'other-final',
        courseId: 'other-programme',
        title: 'Capstone',
        order: 1,
        type: 'final_project',
        sourceYear: 2026,
        required: true,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      allUnitItems: [],
      allUnitProgress: [],
    });
    console.log('P4', JSON.stringify({ otherFinalTaskAwards: awards }));
    expect(awards).toEqual([]);
    const result = await upsertProgressAndAwardXp(
      { itemId: 'other-m0-task', status: 'completed', confidence: 0 },
      { db: ctx.db },
    );
    console.log(
      'P4b',
      JSON.stringify({
        awarded: result.awardedTransactions.map((tx) => tx.id),
        ledger: (await listXpTransactions({ db: ctx.db })).map((tx) => tx.id),
      }),
    );
  });

  it('P5 backup invariants accept two XP rows with the same source key', async () => {
    ctx = createTestDatabase('c0p5');
    await initializeDatabase({ db: ctx.db, seed: bundledCourseSeed });
    const base = {
      sourceType: 'study_session',
      sourceId: 'session-1',
      xp: 10,
      reason: 'r',
      awardedAt: '2026-09-01T00:00:00.000Z',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const data = {
      appMeta: null,
      learnerProfile: null,
      courseUnits: [],
      courseItems: [],
      progressEntries: [],
      contentAssets: [],
      contentSlices: [],
      mediaProgressEvents: [],
      resumePoints: [],
      studySessions: [],
      xpTransactions: [
        { ...base, id: 'xp-a' },
        { ...base, id: 'xp-b' },
      ],
      achievementDefinitions: [],
      achievementUnlocks: [],
      backups: [],
    };
    expect(() =>
      assertBackupDataInvariants(data, { expectedSchemaVersion: 2 }),
    ).not.toThrow();
  });
});
```
