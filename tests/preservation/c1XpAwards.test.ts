import { describe, expect, it } from 'vitest';

import {
  listXpTransactions,
  upsertProgressAndAwardXp,
  type UpsertProgressInput,
} from '@/lib/db';
import type { CourseItem, CourseUnit } from '@/lib/domain';

import committedXpTable from '../fixtures/preservation/c1-xp-awards.json';
import {
  createIncrementingClock,
  createSeededDatabase,
  readMaterializedCatalogue,
} from './c1Support';
import { buildC1XpRows, type C1Award, type C1XpRow } from './c1XpTable';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';

/**
 * Epic C / C1 evidence areas 3 and 5 — XP awards and persisted reward
 * identity over the real CS50 catalogue.
 *
 * Family: SEMANTIC ORACLE for every reachable status (sourceType, sourceId,
 * xp, reason, order, derived transaction ID); MUTATION for the ledger rows
 * written by the real `upsertProgressAndAwardXp` path.
 *
 * Every award row names the CS50 policy it exercises (C0 contract section
 * 4b): `type_amount`, `problem_set_workflow`, `week_bonus`,
 * `final_project_milestone`. All four move to CS50 configuration in C3; this
 * table must stay identical through that move.
 *
 * Authority: the committed table was produced by the baseline engine
 * (src/lib/xp/engine.ts at the C0 product baseline) and every row is checked
 * below against an independent restatement of the CS50 XP policy, so neither
 * the engine nor the fixture alone defines the expected values.
 */

const completeStatuses = new Set(['completed', 'submitted', 'accepted']);
const typeAmounts: Record<string, { label: string; xp: number }> = {
  lecture: { label: 'lecture', xp: 40 },
  notes: { label: 'notes', xp: 15 },
  practice: { label: 'practice', xp: 30 },
  reflection: { label: 'reflection', xp: 15 },
  section: { label: 'section', xp: 20 },
  shorts: { label: 'shorts', xp: 15 },
};

function award(
  policy: C1Award['policy'],
  sourceType: string,
  sourceId: string,
  xp: number,
  reason: string,
): C1Award {
  return {
    policy,
    reason,
    sourceId,
    sourceType,
    transactionId: `xp-${sourceType}-${sourceId}`,
    xp,
  };
}

/** Independent restatement of the CS50 XP policy (C0 contract section 4b). */
function policyAwards(
  row: C1XpRow,
  catalogue: { items: CourseItem[]; units: CourseUnit[] },
): C1Award[] {
  const item = catalogue.items.find(
    (candidate) => candidate.id === row.itemId,
  )!;
  const unit = catalogue.units.find(
    (candidate) => candidate.id === item.unitId,
  )!;
  const complete = completeStatuses.has(row.status);
  const awards: C1Award[] = [];

  const typeAmount = typeAmounts[item.type];
  if (complete && typeAmount !== undefined) {
    awards.push(
      award(
        'type_amount',
        `${item.type}_completed`,
        `${item.id}-completed`,
        typeAmount.xp,
        `Completed ${typeAmount.label}: ${item.title}`,
      ),
    );
  }

  if (item.type === 'problem_set') {
    if (['started', 'blocked', ...completeStatuses].includes(row.status)) {
      awards.push(
        award(
          'problem_set_workflow',
          'problem_set_started',
          `${item.id}-started`,
          20,
          `Started problem set: ${item.title}`,
        ),
      );
    }
    if (row.status === 'submitted' || row.status === 'accepted') {
      awards.push(
        award(
          'problem_set_workflow',
          'problem_set_submitted',
          `${item.id}-submitted`,
          75,
          `Submitted problem set: ${item.title}`,
        ),
      );
    }
    if (row.status === 'accepted') {
      awards.push(
        award(
          'problem_set_workflow',
          'problem_set_accepted',
          `${item.id}-accepted`,
          125,
          `Accepted problem set: ${item.title}`,
        ),
      );
    }
  }

  if (unit.type === 'week' && unit.required && complete) {
    const requiredItems = catalogue.items.filter(
      (candidate) => candidate.unitId === unit.id && candidate.required,
    );
    const othersComplete = row.context === `unit_complete:${unit.id}`;
    const unitComplete =
      requiredItems.length > 0 &&
      requiredItems.every(
        (candidate) => candidate.id === item.id || othersComplete,
      );
    if (unitComplete) {
      awards.push(
        award(
          'week_bonus',
          'week_completed',
          unit.id,
          150,
          `Completed all required items for ${unit.title}`,
        ),
      );
    }
  }

  if (item.id === 'final-project-build' && complete) {
    awards.push(
      award(
        'final_project_milestone',
        'final_project_build_completed',
        'final-project-build-completed',
        250,
        'Completed final project build',
      ),
    );
  }
  if (
    (row.context === 'fp_pair:readme_after_demo' ||
      row.context === 'fp_pair:demo_after_readme') &&
    complete
  ) {
    awards.push(
      award(
        'final_project_milestone',
        'final_project_readme_demo_completed',
        'final-project-readme-demo-combined',
        200,
        'Completed both final project README and video demo',
      ),
    );
  }

  return awards;
}

describe('C1 XP awards over the real CS50 catalogue (semantic)', () => {
  it('reproduces the committed baseline award table exactly', async () => {
    const context = await createSeededDatabase('xp-table');
    try {
      const catalogue = await readMaterializedCatalogue(context);
      expect(buildC1XpRows(catalogue)).toEqual(committedXpTable);
    } finally {
      await context.cleanup();
    }
  });

  it('matches the independent CS50 policy restatement on every row', async () => {
    const context = await createSeededDatabase('xp-policy');
    try {
      const catalogue = await readMaterializedCatalogue(context);
      const rows = committedXpTable as C1XpRow[];

      for (const row of rows) {
        expect(
          row.awards,
          `${row.context} ${row.itemId} ${row.status}`,
        ).toEqual(policyAwards(row, catalogue));
      }
    } finally {
      await context.cleanup();
    }
  });

  it('exercises every CS50 XP policy and every reachable CS50 source type', () => {
    const rows = committedXpTable as C1XpRow[];
    const awards = rows.flatMap((row) => row.awards);

    expect(new Set(awards.map((entry) => entry.policy))).toEqual(
      new Set([
        'type_amount',
        'problem_set_workflow',
        'week_bonus',
        'final_project_milestone',
      ]),
    );
    expect(
      [...new Set(awards.map((entry) => entry.sourceType))].sort(),
    ).toEqual([
      'final_project_build_completed',
      'final_project_readme_demo_completed',
      'lecture_completed',
      'practice_completed',
      'problem_set_accepted',
      'problem_set_started',
      'problem_set_submitted',
      'section_completed',
      'shorts_completed',
      'week_completed',
    ]);
    expect(
      rows
        .filter((row) => row.context.startsWith('unit_complete:'))
        .map((row) => row.context),
    ).toEqual([
      'unit_complete:week-0',
      'unit_complete:week-1',
      'unit_complete:week-2',
      'unit_complete:week-3',
      'unit_complete:week-4',
      'unit_complete:week-5',
      'unit_complete:week-6',
      'unit_complete:week-7',
      'unit_complete:week-8',
      'unit_complete:week-9',
      'unit_complete:week-10',
    ]);
    // Deterministic transaction identity: no CS50 award falls back to a hash.
    expect(
      awards.every(
        (entry) =>
          entry.transactionId === `xp-${entry.sourceType}-${entry.sourceId}`,
      ),
    ).toBe(true);
  });

  it('pins the final-project pair states', () => {
    const rows = committedXpTable as C1XpRow[];
    const pair = (context: string) =>
      rows
        .find((row) => row.context === context)!
        .awards.map((entry) => entry.sourceType);

    expect(pair('fp_pair:readme_only')).toEqual([]);
    expect(pair('fp_pair:demo_only')).toEqual([]);
    expect(pair('fp_pair:readme_after_demo')).toEqual([
      'final_project_readme_demo_completed',
    ]);
    expect(pair('fp_pair:demo_after_readme')).toEqual([
      'final_project_readme_demo_completed',
    ]);
  });
});

describe('C1 XP ledger through the real mutation path (mutation)', () => {
  it('persists exactly the frozen ledger rows and never re-awards', async () => {
    const context = await createSeededDatabase('xp-mutation');
    const now = createIncrementingClock('2026-09-19T13:00:00.000Z');
    const save = (input: Omit<UpsertProgressInput, 'confidence'>) =>
      upsertProgressAndAwardXp(
        { confidence: 3, ...input },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: context.db,
          now,
        },
      );
    const awarded = async (input: Omit<UpsertProgressInput, 'confidence'>) =>
      (await save(input)).awardedTransactions.map(
        (transaction) => transaction.id,
      );

    try {
      expect(
        await awarded({ itemId: 'week-0-lecture', status: 'completed' }),
      ).toEqual(['xp-lecture_completed-week-0-lecture-completed']);
      expect(
        await awarded({ itemId: 'week-0-problem-set', status: 'started' }),
      ).toEqual(['xp-problem_set_started-week-0-problem-set-started']);
      expect(
        await awarded({
          evidenceText: 'Synthetic C1 submission note.',
          itemId: 'week-0-problem-set',
          status: 'submitted',
        }),
      ).toEqual([
        'xp-problem_set_submitted-week-0-problem-set-submitted',
        'xp-week_completed-week-0',
      ]);
      expect(
        await awarded({
          evidenceText: 'Synthetic C1 submission note.',
          itemId: 'week-0-problem-set',
          status: 'accepted',
        }),
      ).toEqual(['xp-problem_set_accepted-week-0-problem-set-accepted']);
      expect(
        await awarded({ itemId: 'week-1-section', status: 'completed' }),
      ).toEqual(['xp-section_completed-week-1-section-completed']);
      expect(
        await awarded({ itemId: 'week-1-shorts', status: 'completed' }),
      ).toEqual(['xp-shorts_completed-week-1-shorts-completed']);
      expect(
        await awarded({ itemId: 'practice-debug', status: 'completed' }),
      ).toEqual(['xp-practice_completed-practice-debug-completed']);
      expect(
        await awarded({ itemId: 'week-10-seminars', status: 'completed' }),
      ).toEqual([]);
      expect(
        await awarded({ itemId: 'final-project-build', status: 'completed' }),
      ).toEqual([
        'xp-final_project_build_completed-final-project-build-completed',
      ]);
      expect(
        await awarded({ itemId: 'final-project-readme', status: 'completed' }),
      ).toEqual([]);
      expect(
        await awarded({
          itemId: 'final-project-video-demo',
          status: 'completed',
        }),
      ).toEqual([
        'xp-final_project_readme_demo_completed-final-project-readme-demo-combined',
      ]);

      // Re-saving already-rewarded states awards nothing.
      expect(
        await awarded({
          evidenceText: 'Synthetic C1 submission note, edited.',
          itemId: 'week-0-problem-set',
          status: 'accepted',
        }),
      ).toEqual([]);
      expect(
        await awarded({ itemId: 'week-0-lecture', status: 'completed' }),
      ).toEqual([]);

      const ledger = await listXpTransactions({
        db: context.db,
        programmeId: 'cs50x',
      });
      expect(
        ledger
          .map((transaction) => [
            transaction.id,
            transaction.sourceType,
            transaction.sourceId,
            transaction.xp,
            transaction.reason,
          ])
          .sort((left, right) =>
            String(left[0]).localeCompare(String(right[0])),
          ),
      ).toEqual(
        [
          [
            'xp-final_project_build_completed-final-project-build-completed',
            'final_project_build_completed',
            'final-project-build-completed',
            250,
            'Completed final project build',
          ],
          [
            'xp-final_project_readme_demo_completed-final-project-readme-demo-combined',
            'final_project_readme_demo_completed',
            'final-project-readme-demo-combined',
            200,
            'Completed both final project README and video demo',
          ],
          [
            'xp-lecture_completed-week-0-lecture-completed',
            'lecture_completed',
            'week-0-lecture-completed',
            40,
            'Completed lecture: Lecture 0: Scratch',
          ],
          [
            'xp-practice_completed-practice-debug-completed',
            'practice_completed',
            'practice-debug-completed',
            30,
            'Completed practice: After Week 1: Debug',
          ],
          [
            'xp-problem_set_accepted-week-0-problem-set-accepted',
            'problem_set_accepted',
            'week-0-problem-set-accepted',
            125,
            'Accepted problem set: Problem Set 0: Scratch',
          ],
          [
            'xp-problem_set_started-week-0-problem-set-started',
            'problem_set_started',
            'week-0-problem-set-started',
            20,
            'Started problem set: Problem Set 0: Scratch',
          ],
          [
            'xp-problem_set_submitted-week-0-problem-set-submitted',
            'problem_set_submitted',
            'week-0-problem-set-submitted',
            75,
            'Submitted problem set: Problem Set 0: Scratch',
          ],
          [
            'xp-section_completed-week-1-section-completed',
            'section_completed',
            'week-1-section-completed',
            20,
            'Completed section: Section: C',
          ],
          [
            'xp-shorts_completed-week-1-shorts-completed',
            'shorts_completed',
            'week-1-shorts-completed',
            15,
            'Completed shorts: Shorts: C',
          ],
          [
            'xp-week_completed-week-0',
            'week_completed',
            'week-0',
            150,
            'Completed all required items for Week 0: Scratch',
          ],
        ].sort((left, right) =>
          String(left[0]).localeCompare(String(right[0])),
        ),
      );
    } finally {
      await context.cleanup();
    }
  });
});
