import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addStudySessionAndAwardXp,
  correctStudySessionAssignment,
  getDatabaseSnapshot,
  initializeDatabase,
} from '@/lib/db';
import { getSharedDatabase } from '@/lib/db/database';
import { bundledCourseSeed } from '@/seed';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';

const original = {
  id: 'correction-session',
  itemId: 'week-0-lecture',
  unitId: 'week-0',
  startedAt: '2026-09-17T10:00:00.000Z',
  endedAt: '2026-09-17T10:30:00.000Z',
  durationMinutes: 30,
  mode: 'watching' as const,
  notes: 'Synthetic study',
  blockers: [],
};

beforeEach(async () => {
  await initializeDatabase({ seed: bundledCourseSeed });
  await addStudySessionAndAwardXp(original, {
    catalogueId: cs50CatalogueId,
    policy: cs50Policy,
  });
});

describe('saved session assignment correction', () => {
  it('persists only attribution and reason changes, preserving rewards and source facts', async () => {
    const before = await getDatabaseSnapshot();
    const timestamp = '2026-09-18T10:00:00.000Z';
    await correctStudySessionAssignment(
      { sessionId: original.id, itemId: 'week-4-lecture' },
      { now: () => timestamp },
    );
    const after = await getDatabaseSnapshot();
    expect(after.studySessions).toEqual([
      {
        ...before.studySessions[0],
        itemId: 'week-4-lecture',
        unitId: 'week-4',
        updatedAt: timestamp,
      },
    ]);
    expect(after.xpTransactions).toEqual(
      before.xpTransactions.map((tx) => ({
        ...tx,
        reason: 'Logged 25+ minute study session for: Lecture 4: Memory',
      })),
    );
    expect(after.achievementUnlocks).toEqual(before.achievementUnlocks);
    expect(after.progressEntries).toEqual(before.progressEntries);
    await addStudySessionAndAwardXp(original, {
      catalogueId: cs50CatalogueId,
      policy: cs50Policy,
    });
    const repeated = await getDatabaseSnapshot();
    expect(repeated.xpTransactions).toEqual(after.xpTransactions);
    expect(repeated.studySessions).toEqual(after.studySessions);
  });

  it.each(['missing-task', ''])(
    'rejects invalid target %s without changing data',
    async (itemId) => {
      const before = await getDatabaseSnapshot();
      await expect(
        correctStudySessionAssignment({ sessionId: original.id, itemId }),
      ).rejects.toThrow();
      expect(await getDatabaseSnapshot()).toEqual(before);
    },
  );

  it('rolls back the session if updating its XP reason fails', async () => {
    const before = await getDatabaseSnapshot();
    const update = vi
      .spyOn(getSharedDatabase().xpTransactions, 'update')
      .mockRejectedValueOnce(new Error('Synthetic transaction failure'));
    await expect(
      correctStudySessionAssignment({
        sessionId: original.id,
        itemId: 'week-4-lecture',
      }),
    ).rejects.toThrow('Synthetic transaction failure');
    update.mockRestore();
    expect(await getDatabaseSnapshot()).toEqual(before);
  });

  it('corrects a short session without creating an XP transaction', async () => {
    await addStudySessionAndAwardXp(
      {
        ...original,
        id: 'short-session',
        durationMinutes: 5,
      },
      { catalogueId: cs50CatalogueId, policy: cs50Policy },
    );
    const before = await getDatabaseSnapshot();
    await correctStudySessionAssignment({
      sessionId: 'short-session',
      itemId: 'week-4-lecture',
    });
    const after = await getDatabaseSnapshot();
    expect(after.xpTransactions).toEqual(before.xpTransactions);
    expect(after.achievementUnlocks).toEqual(before.achievementUnlocks);
    expect(
      after.studySessions.find((session) => session.id === 'short-session'),
    ).toMatchObject({
      itemId: 'week-4-lecture',
      unitId: 'week-4',
      durationMinutes: 5,
    });
  });
});
