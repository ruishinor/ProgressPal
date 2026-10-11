import { describe, expect, it } from 'vitest';

import { buildRpgCourseMapSummary } from '@/features/rpg/model/readModels';
import { getDatabaseSnapshot, initializeDatabase } from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

/**
 * Follow-up 2026-10-11, characterization: the task a module leads to (and
 * "Continue learning" opens) is chosen by the rule the hub's recommendation
 * already used: a required task under way, else the first not blocked, else
 * (all blocked) the first left. Completed and optional tasks are never chosen,
 * and a module with no required task left leads nowhere in particular.
 */

type Status = 'completed' | 'blocked' | 'started';

async function nextByModule(statuses: Record<string, Status>) {
  await initializeDatabase({ seed: bundledCourseSeed });
  const snapshot = await getDatabaseSnapshot();

  snapshot.progressEntries = Object.entries(statuses).map(
    ([itemId, status]) => ({
      id: `fixture-${itemId}`,
      itemId,
      status,
      confidence: 3,
      createdAt: '2026-09-16T08:00:00Z',
      updatedAt: '2026-09-16T08:00:00Z',
    }),
  );

  const summary = buildRpgCourseMapSummary(snapshot);

  return {
    summary,
    required: (unitId: string) =>
      summary.modules
        .find((module) => module.id === unitId)!
        .quests.filter((quest) => quest.required)
        .map((quest) => quest.id),
    next: (unitId: string) =>
      summary.modules.find((module) => module.id === unitId)!.nextQuestId,
  };
}

describe('the task a module leads to', () => {
  it('is the first required task for a learner who has not started', async () => {
    const { required, next } = await nextByModule({});

    expect(next('week-0')).toBe(required('week-0')[0]);
  });

  it('moves past completed tasks', async () => {
    const probe = await nextByModule({});
    const [first, second] = probe.required('week-0');
    const { next } = await nextByModule({ [first!]: 'completed' });

    expect(next('week-0')).toBe(second);
  });

  it('prefers a task under way over an earlier one not started', async () => {
    const probe = await nextByModule({});
    const required = probe.required('week-0');
    const { next } = await nextByModule({ [required[1]!]: 'started' });

    expect(next('week-0')).toBe(required[1]);
  });

  it('skips a blocked task while another can be done, and shows it when none can', async () => {
    const probe = await nextByModule({});
    const required = probe.required('week-0');
    const skipped = await nextByModule({ [required[0]!]: 'blocked' });

    expect(skipped.next('week-0')).toBe(required[1]);

    const allBlocked = await nextByModule(
      Object.fromEntries(required.map((id) => [id, 'blocked' as const])),
    );

    expect(allBlocked.next('week-0')).toBe(required[0]);
  });

  it('is nothing when every required task is complete', async () => {
    const probe = await nextByModule({});
    const required = probe.required('week-0');
    const { next } = await nextByModule(
      Object.fromEntries(required.map((id) => [id, 'completed' as const])),
    );

    expect(next('week-0')).toBeNull();
  });

  it('agrees with the recommendation: the current module leads to the recommended task', async () => {
    const { summary } = await nextByModule({});

    expect(summary.currentModule?.nextQuestId).toBe(
      summary.currentModule?.quests.find((quest) => quest.required)?.id,
    );
  });
});
