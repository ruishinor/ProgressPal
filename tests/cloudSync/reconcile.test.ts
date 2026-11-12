import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { resolveSyncCatalogue } from '@/app/providers/programmeComposition';
import { SyncFailure, type CloudSyncStore } from '@/lib/cloud';
import { sha256Hex } from '@/lib/cloudBackup/payload';
import { readSyncBinding } from '@/lib/cloudSync/binding';
import { reconcileLearning } from '@/lib/cloudSync/reconcile';
import {
  checkSyncUpload,
  decodeSyncSnapshot,
  snapshotText,
} from '@/lib/cloudSync/snapshot';
import {
  addXpTransaction,
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  enrolInProgramme,
  getDatabaseSnapshot,
  initializeDatabase,
  recordBackupEvent,
  recordEvaluationResult,
  restoreDatabaseFromBackup,
  saveLearnerProfile,
  saveLessonPosition,
  submitExerciseAttempt,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import { saveActivityEntry } from '@/lib/db/activity';
import { gitGithubDefinition as git } from '@/programmes/git-github';
import { programvareutviklingDefinition as p2 } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import { createTestDatabase } from '../db/testDatabase';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';

const catalogue = resolveSyncCatalogue();
const contexts: ReturnType<typeof createTestDatabase>[] = [];
const now = () => '2026-11-12T10:00:00.000Z';

beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(async () => {
  vi.unstubAllGlobals();
  for (const context of contexts.splice(0)) await context.cleanup();
});

function transport() {
  let row: { revision: number; hash: string; text: string } | null = null;
  const store: CloudSyncStore = {
    head: vi.fn(async () => ({
      revision: row?.revision ?? 0,
      hash: row?.hash ?? null,
    })),
    download: vi.fn(async (_, head) => {
      if (row === null || row.revision !== head.revision)
        throw new SyncFailure('stale');
      return row.text;
    }),
    upload: vi.fn(async (_, revision, payload) => {
      if ((row?.revision ?? 0) !== revision) throw new SyncFailure('stale');
      row = { ...payload, revision: revision + 1 };
    }),
  };
  return store;
}

async function device(store: CloudSyncStore) {
  const context = createTestDatabase('sync', catalogue.context);
  contexts.push(context);
  const options = { db: context.db, now };
  await initializeDatabase({ ...options, seed: bundledCourseSeed });
  const records = new Map<string, string>();
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => records.set(key, value),
  };
  const lifetime = new AbortController();
  const sync = {
    userId: 'account-a',
    isCurrentAccount: () => !lifetime.signal.aborted,
    signal: lifetime.signal,
    store,
    storage,
    catalogue,
    readLocal: () => getDatabaseSnapshot(options),
    replaceLocal: async (
      ...[snapshot, assertCurrent, signal]: Parameters<
        Parameters<typeof reconcileLearning>[0]['replaceLocal']
      >
    ) => {
      await restoreDatabaseFromBackup(snapshot, {
        ...options,
        synchronization: { assertCurrent, signal },
      });
    },
  };
  const profile = (displayName: string) =>
    saveLearnerProfile(
      { ...defaultLearnerProfileValues, displayName },
      { ...options, completeOnboarding: true },
    );
  return { options, sync, profile, lifetime };
}

it('reconstructs cross-programme, Pathways, XP, evidence and Activity with no bundled catalogue or audit history in transit', async () => {
  const store = transport();
  const first = await device(store);
  await reconcileLearning(first.sync);
  await first.profile('Synthetic learner');
  const completion = {
    itemId: 'week-0-lecture',
    status: 'completed',
    confidence: 3,
  } as const;
  const scope = { catalogueId: cs50CatalogueId, policy: cs50Policy };
  const completed = await upsertProgressAndAwardXp(completion, {
    ...first.options,
    ...scope,
  });
  expect(
    completed.unlockedAchievements.map(({ achievementId }) => achievementId),
  ).toContain('first-step');
  await enrolAndSwitchActiveProgramme(p2.programmeId, {
    ...first.options,
    seed: p2.catalogue,
  });
  await enrolInProgramme(git.programmeId, first.options);
  await addXpTransaction(
    {
      programmeId: p2.programmeId,
      sourceType: 'synthetic-reward',
      sourceId: 'earned-once',
      xp: 17,
      reason: 'Synthetic',
      awardedAt: now(),
    },
    first.options,
  );
  const attempt = await submitExerciseAttempt(
    {
      id: 'attempt-sync-1',
      programmeId: git.programmeId,
      contentVersion: 1,
      subjectId: 'git-sync-reflection',
      contentHash: 'a'.repeat(64),
      responseMode: 'reflect',
      answer: { text: 'Jeg kontrollerte siste commit.' },
    },
    first.options,
  );
  await recordEvaluationResult(
    { id: 'result-sync-1', attemptId: attempt.record.id, outcome: 'recorded' },
    first.options,
  );
  // Pathways materializes its own catalogue before saving a lesson position.
  await initializeDatabase({ ...first.options, seed: git.catalogue });
  await saveLessonPosition(
    {
      programmeId: git.programmeId,
      itemId: 'git-m01-o05',
      unitId: 'git-m01-l05',
      contentVersion: 1,
      stepIndex: 3,
    },
    first.options,
  );
  await saveActivityEntry(
    { date: '2026-11-12', activityId: 'pushups', unit: 'reps', amount: 12 },
    first.options,
  );
  await recordBackupEvent(
    { type: 'export', fileName: 'device-a.json' },
    first.options,
  );
  const local = await first.sync.readLocal();
  const wire = snapshotText(local);
  expect(wire).not.toMatch(/courseItems|catalogueVersions|device-a\.json/);
  checkSyncUpload(local, wire, catalogue);
  expect(await reconcileLearning(first.sync)).toEqual({ status: 'ready' });

  const second = await device(store);
  await recordBackupEvent(
    { type: 'export', fileName: 'device-b.json' },
    second.options,
  );
  expect(await reconcileLearning(second.sync)).toEqual({ status: 'ready' });
  const restored = await second.sync.readLocal();
  expect(snapshotText(restored)).toBe(wire);
  expect(restored.courseItems.some(({ id }) => id === 'git-m01-o05')).toBe(
    true,
  );
  expect(restored.backups.map(({ fileName }) => fileName)).toEqual([
    'device-b.json',
  ]);
  expect(restored.xpTransactions).toEqual(local.xpTransactions);
  expect(restored.achievementUnlocks).toEqual(local.achievementUnlocks);
  const repeated = await upsertProgressAndAwardXp(completion, {
    ...second.options,
    ...scope,
  });
  expect(repeated.awardedTransactions).toEqual([]);
  expect(repeated.unlockedAchievements).toEqual([]);
  expect(restored.activityEntries).toEqual(local.activityEntries);
  expect(restored.learnerEvidence).toEqual(local.learnerEvidence);

  const downloads = vi.mocked(store.download).mock.calls.length;
  const writes = vi.mocked(store.upload).mock.calls.length;
  await recordBackupEvent(
    { type: 'export', fileName: 'unchanged.json' },
    second.options,
  );
  await reconcileLearning(second.sync);
  expect(store.download).toHaveBeenCalledTimes(downloads);
  expect(store.upload).toHaveBeenCalledTimes(writes);
});

it('reconciles a committed upload with a lost reply and a later local edit', async () => {
  const store = transport();
  const first = await device(store);
  await reconcileLearning(first.sync);
  await first.profile('First edit');
  const upload = vi.mocked(store.upload).getMockImplementation()!;
  vi.mocked(store.upload).mockImplementationOnce(async (...args) => {
    await upload(...args);
    await first.profile('Later edit');
    throw new SyncFailure('unavailable');
  });
  await expect(reconcileLearning(first.sync)).rejects.toMatchObject({
    code: 'unavailable',
  });
  expect(readSyncBinding(first.sync.storage)?.pending?.expectedRevision).toBe(
    0,
  );
  expect(await reconcileLearning(first.sync)).toEqual({ status: 'ready' });
  expect(readSyncBinding(first.sync.storage)).toMatchObject({ revision: 2 });
  expect((await first.sync.readLocal()).learnerProfile?.displayName).toBe(
    'Later edit',
  );
});

it('refuses the stale CAS and retains both versions until the learner chooses', async () => {
  const store = transport();
  const first = await device(store);
  await reconcileLearning(first.sync);
  await first.profile('Shared starting point');
  await reconcileLearning(first.sync);
  const second = await device(store);
  await reconcileLearning(second.sync);
  await first.profile('Change on A');
  await second.profile('Change on B');

  const upload = vi.mocked(store.upload).getMockImplementation()!;
  vi.mocked(store.upload).mockImplementationOnce(async (...args) => {
    await reconcileLearning(first.sync);
    await upload(...args);
  });
  await expect(reconcileLearning(second.sync)).rejects.toMatchObject({
    code: 'stale',
  });
  const result = await reconcileLearning(second.sync);
  expect(result.status).toBe('conflict');
  if (result.status !== 'conflict') throw new Error('Conflict expected');
  expect(result.conflict.local.learnerProfile?.displayName).toBe('Change on B');
  expect(result.conflict.remote?.learnerProfile?.displayName).toBe(
    'Change on A',
  );
  await reconcileLearning(second.sync, {
    conflict: result.conflict,
    choice: 'local',
  });
  await reconcileLearning(first.sync);
  expect((await first.sync.readLocal()).learnerProfile?.displayName).toBe(
    'Change on B',
  );
});

it('guards the IndexedDB transaction against edits and sign-out while a download is pending', async () => {
  const store = transport();
  const first = await device(store);
  await reconcileLearning(first.sync);
  await first.profile('Remote profile');
  await reconcileLearning(first.sync);

  const second = await device(store);
  const download = vi.mocked(store.download).getMockImplementation()!;
  vi.mocked(store.download).mockImplementationOnce(async (...args) => {
    const text = await download(...args);
    await second.profile('Unassociated local edit');
    return text;
  });
  await expect(reconcileLearning(second.sync)).rejects.toMatchObject({
    code: 'stale',
  });
  expect(readSyncBinding(second.sync.storage)).toBeNull();
  expect((await second.sync.readLocal()).learnerProfile?.displayName).toBe(
    'Unassociated local edit',
  );
  expect(await reconcileLearning(second.sync)).toMatchObject({
    status: 'unowned',
  });

  const third = await device(store);
  vi.mocked(store.download).mockImplementationOnce(async (...args) => {
    third.lifetime.abort();
    return download(...args);
  });
  await expect(reconcileLearning(third.sync)).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(readSyncBinding(third.sync.storage)).toBeNull();
  expect((await third.sync.readLocal()).learnerProfile?.displayName).toBe(
    'Learner',
  );
});

it('blocks transfers for a different account and rejects malformed or tampered snapshots', async () => {
  const store = transport();
  const first = await device(store);
  await reconcileLearning(first.sync);
  await first.profile('Private profile');
  expect(
    await reconcileLearning({ ...first.sync, userId: 'account-b' }),
  ).toEqual({ status: 'different-account' });
  expect(store.head).toHaveBeenCalledTimes(1);
  expect(store.upload).not.toHaveBeenCalled();
  const text = snapshotText(await first.sync.readLocal());
  await expect(
    decodeSyncSnapshot(text, '0'.repeat(64), catalogue),
  ).rejects.toMatchObject({ code: 'incompatible' });
  const wrongSchema = text.replace('"schema":5', '"schema":4');
  await expect(
    decodeSyncSnapshot(wrongSchema, await sha256Hex(wrongSchema), catalogue),
  ).rejects.toMatchObject({ code: 'incompatible' });
});
