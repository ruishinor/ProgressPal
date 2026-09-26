import type {
  CourseItem,
  CourseUnit,
  ProgressEntry,
  ProgressStatus,
} from '@/lib/domain';
import {
  deriveXpTransactionId,
  evaluateCompletionPreviewXp,
  evaluateProgressXp,
  type PotentialXpAward,
} from '@/lib/xp/engine';

import { c1Timestamp } from './c1Support';

/**
 * Epic C / C1 XP evidence builder (test-only). Evaluates the REAL XP engine
 * over the REAL materialized CS50 catalogue for every reachable status and the
 * unit-completion / final-project pair contexts. The committed fixture
 * `tests/fixtures/preservation/c1-xp-awards.json` was produced by this builder
 * at the product baseline; `c1XpAwards.test.ts` compares live output to it and
 * checks every row against an independent restatement of the CS50 policy.
 */

export type C1Award = PotentialXpAward & {
  policy:
    | 'type_amount'
    | 'problem_set_workflow'
    | 'week_bonus'
    | 'final_project_milestone';
  transactionId: string;
};

export type C1XpRow = {
  awards: C1Award[];
  context: string;
  itemId: string;
  status: ProgressStatus;
};

export type C1PreviewRow = {
  awards: C1Award[];
  itemId: string;
};

/**
 * Reachable saved statuses per item type x required, excluding
 * `not_started` (pinned by c1StatusReachability.test.ts).
 */
export const c1ReachableSavedStatuses: Record<string, ProgressStatus[]> = {
  'lecture|false': ['started', 'blocked', 'completed', 'skipped_optional'],
  'lecture|true': ['started', 'blocked', 'completed'],
  'practice|false': ['started', 'blocked', 'completed', 'skipped_optional'],
  'problem_set|true': [
    'started',
    'blocked',
    'completed',
    'submitted',
    'accepted',
  ],
  'project_task|true': ['started', 'blocked', 'completed'],
  'reading|false': ['started', 'blocked', 'completed', 'skipped_optional'],
  'section|false': ['started', 'blocked', 'completed', 'skipped_optional'],
  'shorts|false': ['started', 'blocked', 'completed', 'skipped_optional'],
};

export function classifyAward(sourceType: string): C1Award['policy'] {
  if (sourceType === 'week_completed') return 'week_bonus';
  if (sourceType.startsWith('problem_set_')) return 'problem_set_workflow';
  if (sourceType.startsWith('final_project_')) return 'final_project_milestone';
  return 'type_amount';
}

function toC1Awards(awards: readonly PotentialXpAward[]): C1Award[] {
  return awards.map((award) => ({
    policy: classifyAward(award.sourceType),
    reason: award.reason,
    sourceId: award.sourceId,
    sourceType: award.sourceType,
    transactionId: deriveXpTransactionId(award.sourceType, award.sourceId),
    xp: award.xp,
  }));
}

function progress(itemId: string, status: ProgressStatus): ProgressEntry {
  return {
    confidence: 0,
    createdAt: c1Timestamp,
    id: `c1-progress-${itemId}`,
    itemId,
    status,
    updatedAt: c1Timestamp,
  };
}

export function buildC1XpRows(catalogue: {
  items: readonly CourseItem[];
  units: readonly CourseUnit[];
}): C1XpRow[] {
  const unitsById = new Map(catalogue.units.map((unit) => [unit.id, unit]));
  const itemsByUnit = (unitId: string) =>
    catalogue.items.filter((item) => item.unitId === unitId);
  const rows: C1XpRow[] = [];

  const evaluate = (
    item: CourseItem,
    status: ProgressStatus,
    others: readonly ProgressEntry[],
    finalProjectProgress?: readonly ProgressEntry[],
  ) => {
    const unit = unitsById.get(item.unitId)!;
    return toC1Awards(
      evaluateProgressXp({
        allUnitItems: itemsByUnit(unit.id),
        allUnitProgress: [...others],
        item,
        progressEntry: progress(item.id, status),
        unit,
        ...(finalProjectProgress === undefined
          ? {}
          : { finalProjectProgress: [...finalProjectProgress] }),
      }),
    );
  };

  // 1. Every item x every reachable saved status, no other progress.
  for (const item of catalogue.items) {
    for (const status of c1ReachableSavedStatuses[
      `${item.type}|${item.required}`
    ]!) {
      rows.push({
        awards: evaluate(item, status, []),
        context: 'isolated',
        itemId: item.id,
        status,
      });
    }
  }

  // 2. Every required week unit: completing its last required item while
  //    every other required item is complete.
  for (const unit of catalogue.units) {
    if (unit.type !== 'week' || !unit.required) continue;
    const required = itemsByUnit(unit.id).filter((item) => item.required);
    const last = required[required.length - 1]!;
    rows.push({
      awards: evaluate(
        last,
        'completed',
        required
          .filter((item) => item.id !== last.id)
          .map((item) => progress(item.id, 'completed')),
      ),
      context: `unit_complete:${unit.id}`,
      itemId: last.id,
      status: 'completed',
    });
  }

  // 3. Final-project pair states.
  const readme = catalogue.items.find(
    (item) => item.id === 'final-project-readme',
  )!;
  const demo = catalogue.items.find(
    (item) => item.id === 'final-project-video-demo',
  )!;
  const fpContexts: Array<[string, CourseItem, ProgressEntry[]]> = [
    ['fp_pair:readme_only', readme, []],
    ['fp_pair:demo_only', demo, []],
    ['fp_pair:readme_after_demo', readme, [progress(demo.id, 'completed')]],
    ['fp_pair:demo_after_readme', demo, [progress(readme.id, 'completed')]],
  ];
  for (const [context, item, pair] of fpContexts) {
    rows.push({
      awards: evaluate(item, 'completed', pair, pair),
      context,
      itemId: item.id,
      status: 'completed',
    });
  }

  return rows;
}

export function buildC1PreviewRows(catalogue: {
  items: readonly CourseItem[];
  units: readonly CourseUnit[];
}): C1PreviewRow[] {
  const unitsById = new Map(catalogue.units.map((unit) => [unit.id, unit]));

  return catalogue.items.map((item) => ({
    awards: toC1Awards(
      evaluateCompletionPreviewXp({
        allCourseItems: catalogue.items,
        allProgress: [],
        item,
        unit: unitsById.get(item.unitId)!,
      }),
    ),
    itemId: item.id,
  }));
}
