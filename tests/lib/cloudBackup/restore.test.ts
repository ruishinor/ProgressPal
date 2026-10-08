import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  BackupValidationError,
  parseBackupFile,
  summarizeBackup,
  type BackupData,
} from '@/lib/backup';
import {
  hasLearnerData,
  produceBackupPayload,
  type PreparedCloudRestore,
} from '@/lib/cloudBackup';
import { upsertProgress } from '@/lib/db';
import { LocalWriteBlockedError } from '@/lib/storage';

import { gatewayFault, networkFault, sha256Of } from './fakeBackupStore';
import { createHarness, idFor } from './harness';
import {
  appVersion,
  createFreshDevice,
  createLearnerDevice,
  schemaVersion,
  type Device,
} from './support';
import { createClock } from '../../db/testDatabase';

/**
 * G6, restore. The source and target "devices" are real fake-indexeddb
 * databases and the real parser and atomic restore are used: only the
 * provider is a model.
 */

let source: Device;
let sourceData: BackupData;
let payloadText: string;
const devices: Device[] = [];

beforeAll(async () => {
  source = await createLearnerDevice('restore-source');
  sourceData = await source.readSnapshot();
  payloadText = (
    await produceBackupPayload({
      data: sourceData,
      appVersion,
      schemaVersion,
      exportedAt: '2026-10-08T09:50:00.000Z',
    })
  ).contents;
});

afterAll(async () => {
  await source.cleanup();
});

afterEach(async () => {
  await Promise.all(devices.splice(0).map((device) => device.cleanup()));
});

async function target(kind: 'fresh' | 'learner'): Promise<Device> {
  const device =
    kind === 'fresh'
      ? await createFreshDevice('restore-target')
      : await createLearnerDevice('restore-target');

  devices.push(device);

  return device;
}

function restoreSetup(device: Device) {
  const restoreLocal = vi.fn(device.restoreLocal);
  const readSnapshot = vi.fn(device.readSnapshot);
  const h = createHarness({
    data: sourceData,
    overrides: {
      readSnapshot,
      restoreLocal,
      migrationContext: device.migrationContext,
    },
  });
  const row = h.store.seed(2, { payload: payloadText, backupId: idFor(50) });

  return { ...h, row, restoreLocal, readSnapshot };
}

const choice = (row: { slot: number; backupId: string }) => ({
  slot: row.slot,
  backupId: row.backupId,
});

async function prepared(
  setup: ReturnType<typeof restoreSetup>,
): Promise<PreparedCloudRestore> {
  const result = await setup.service.prepareRestore(choice(setup.row));

  if (result.kind !== 'ready') {
    throw new Error(`expected ready, got ${JSON.stringify(result)}`);
  }

  return result.prepared;
}

describe('hasLearnerData: the one local fact the safeguard depends on', () => {
  it('a freshly initialised database has none', async () => {
    const fresh = await target('fresh');

    expect(hasLearnerData(await fresh.readSnapshot())).toBe(false);
  });

  it('a device that finished onboarding and logged progress has some', async () => {
    const learner = await target('learner');

    expect(hasLearnerData(await learner.readSnapshot())).toBe(true);
  });

  it('a completed onboarding alone counts', async () => {
    const fresh = await target('fresh');
    const snapshot = await fresh.readSnapshot();

    expect(
      hasLearnerData({
        ...snapshot,
        appMeta: {
          ...(snapshot.appMeta as NonNullable<BackupData['appMeta']>),
          onboardingCompletedAt: '2026-10-08T09:30:00.000Z',
        },
      }),
    ).toBe(true);
  });

  it.each([
    'progressEntries',
    'studySessions',
    'xpTransactions',
    'achievementUnlocks',
    'mediaProgressEvents',
    'resumePoints',
    'learnerEvidence',
    'lessonPositions',
  ] as const)('any row in %s counts', async (store) => {
    const fresh = await target('fresh');
    const snapshot = await fresh.readSnapshot();

    expect(hasLearnerData({ ...snapshot, [store]: [{}] as never })).toBe(true);
  });

  it.each([
    'courseUnits',
    'courseItems',
    'achievementDefinitions',
    'catalogueVersions',
    'programmeEnrolments',
    'contentAssets',
    'contentSlices',
    'backups',
  ] as const)(
    'rows in %s alone do not count (catalogue and audit, not learner activity)',
    async (store) => {
      const fresh = await target('fresh');
      const snapshot = await fresh.readSnapshot();

      expect(hasLearnerData({ ...snapshot, [store]: [{}] as never })).toBe(
        false,
      );
    },
  );
});

describe('prepareRestore: verify first, write nothing', () => {
  it('downloads the chosen slot, verifies it, and hands back a preview of the existing summary', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    const result = await setup.service.prepareRestore(choice(setup.row));

    expect(result.kind).toBe('ready');

    const envelope = parseBackupFile(payloadText, {
      expectedSchemaVersion: schemaVersion,
      migrationContext: fresh.migrationContext,
    });

    expect(result.kind === 'ready' && result.prepared).toMatchObject({
      summary: summarizeBackup(envelope),
      integrity: 'hash-verified-and-parsed',
      localData: 'empty',
      slot: {
        slot: 2,
        backupId: idFor(50),
        schemaVersion,
        formatVersion: 1,
        storedAt: setup.row.storedAt,
      },
    });
  });

  it('asks for that one payload only: no inventory, no other slot', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);

    setup.store.requests.length = 0;
    await setup.service.prepareRestore(choice(setup.row));

    expect(setup.store.requests).toEqual([
      { method: 'downloadBackup', argument: { slot: 2, backupId: idFor(50) } },
    ]);
  });

  it('writes nothing locally and calls no restore', async () => {
    const fresh = await target('fresh');
    const before = await fresh.readSnapshot();
    const setup = restoreSetup(fresh);

    await prepared(setup);

    expect(await fresh.readSnapshot()).toEqual(before);
    expect(setup.restoreLocal).not.toHaveBeenCalled();
  });

  it('what it returns carries neither the payload nor the parsed data', async () => {
    const fresh = await target('fresh');
    const result = await prepared(restoreSetup(fresh));

    expect('payload' in result).toBe(false);
    expect('envelope' in result).toBe(false);
    expect('data' in result).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('reports a local learner database as such, so the caller can warn unconditionally', async () => {
    const learner = await target('learner');

    expect((await prepared(restoreSetup(learner))).localData).toBe(
      'has-learner-data',
    );
  });
});

describe('prepareRestore refusals leave local data untouched, each for its own reason', () => {
  async function expectRefused(
    setup: ReturnType<typeof restoreSetup>,
    device: Device,
    expected: Record<string, unknown>,
  ) {
    const before = await device.readSnapshot();
    const result = await setup.service.prepareRestore(choice(setup.row));

    expect(result).toMatchObject({ kind: 'refused', ...expected });
    expect(await device.readSnapshot()).toEqual(before);
    expect(setup.restoreLocal).not.toHaveBeenCalled();
  }

  it.each([
    ['a gateway fault', gatewayFault],
    ['a dropped connection', networkFault],
    ['an expired session', { kind: 'unauthenticated' } as const],
    ['rate limiting', { kind: 'rate-limited' } as const],
    ['an unrecognisable answer', { kind: 'unexpected-response' } as const],
  ])(
    '%s is "unavailable", never an empty or corrupt backup',
    async (_label, failure) => {
      const fresh = await target('fresh');
      const setup = restoreSetup(fresh);

      setup.store.fault('downloadBackup', { kind: 'fail', failure });

      await expectRefused(setup, fresh, {
        reason: 'unavailable',
        failure,
        message: null,
      });
    },
  );

  it('a slot that no longer holds the chosen backup is "slot-changed"', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);

    setup.store.rows.delete(2);
    setup.store.seed(2, { payload: 'a newer backup', backupId: idFor(60) });

    await expectRefused(setup, fresh, { reason: 'slot-changed' });
  });

  it.each([
    ['an older data version', { schemaVersion: schemaVersion - 1 }],
    ['a newer data version', { schemaVersion: schemaVersion + 1 }],
    ['another file format', { formatVersion: 2 }],
  ])(
    '%s is "incompatible" and is not even hashed',
    async (_label, overrides) => {
      const fresh = await target('fresh');
      const setup = restoreSetup(fresh);

      setup.store.rows.set(2, { ...setup.row, ...overrides });

      await expectRefused(setup, fresh, { reason: 'incompatible' });
    },
  );

  it('a payload that does not match the cloud-owned hash is refused as "hash-mismatch" even though it would parse', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);

    setup.store.rows.set(2, {
      ...setup.row,
      payloadSha256: sha256Of('some other text'),
    });

    await expectRefused(setup, fresh, { reason: 'hash-mismatch' });
  });

  it('the hash is judged before the parser: a hash mismatch on garbage is still "hash-mismatch"', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);

    setup.store.rows.set(2, {
      ...setup.row,
      payload: 'not json at all',
      payloadSha256: sha256Of('something else'),
    });

    await expectRefused(setup, fresh, { reason: 'hash-mismatch' });
  });

  it('a hash that matches but is not a backup is "invalid-backup", with the parser\'s own learner-safe message', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);

    setup.store.rows.delete(2);

    const garbage = setup.store.seed(2, {
      payload: 'not json at all',
      backupId: idFor(51),
    });
    let expectedMessage = '';

    try {
      parseBackupFile('not json at all', {
        expectedSchemaVersion: schemaVersion,
      });
    } catch (error) {
      expectedMessage = (error as BackupValidationError).message;
    }

    const result = await setup.service.prepareRestore(choice(garbage));

    expect(result).toEqual({
      kind: 'refused',
      reason: 'invalid-backup',
      failure: null,
      message: expectedMessage,
    });
    expect(expectedMessage).toMatch(/not valid JSON/);
    expect(setup.restoreLocal).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a different data version inside the payload than the row declares',
      (base: Record<string, unknown>) => ({ ...base, schemaVersion: 3 }),
      /different data version/,
    ],
    [
      'an unknown field (the parser is strict)',
      (base: Record<string, unknown>) => ({ ...base, extra: 1 }),
      /malformed|cannot be imported|not a ProgressPal backup/,
    ],
    [
      'another file format',
      (base: Record<string, unknown>) => ({ ...base, format: 'x' }),
      /not a ProgressPal backup/,
    ],
  ])(
    'a declared-compatible slot whose payload is %s is refused after the hash gate',
    async (_label, mutate, message) => {
      const fresh = await target('fresh');
      const setup = restoreSetup(fresh);
      const text = JSON.stringify(
        mutate(JSON.parse(payloadText) as Record<string, unknown>),
      );

      setup.store.rows.delete(2);

      const row = setup.store.seed(2, { payload: text, backupId: idFor(52) });
      const result = await setup.service.prepareRestore(choice(row));

      expect(result).toMatchObject({
        kind: 'refused',
        reason: 'invalid-backup',
      });
      expect(result.kind === 'refused' ? result.message : '').toMatch(message);
      expect(setup.restoreLocal).not.toHaveBeenCalled();
    },
  );

  it('an unreadable local database is refused rather than guessed about', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);

    setup.readSnapshot.mockRejectedValueOnce(
      new Error('IndexedDB unavailable'),
    );

    await expectRefused(setup, fresh, { reason: 'local-state-unreadable' });
  });
});

describe('confirmRestore: the existing atomic restore, and nothing else', () => {
  it('replaces local data with exactly the verified backup, through the existing restore, once', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    const result = await setup.service.confirmRestore(await prepared(setup), {
      acknowledgedReplacingLocalData: false,
    });

    expect(result).toEqual({ kind: 'restored', backupId: idFor(50), slot: 2 });
    expect(setup.restoreLocal).toHaveBeenCalledTimes(1);

    const [data, options] = setup.restoreLocal.mock.calls[0] as [
      BackupData,
      { fileName: string },
    ];

    expect(data).toEqual(JSON.parse(payloadText).data);
    expect(options).toEqual({ fileName: `cloud-backup-${idFor(50)}.json` });

    const restored = await fresh.readSnapshot();

    expect(restored.progressEntries).toEqual(sourceData.progressEntries);
    expect(restored.learnerProfile).toEqual(sourceData.learnerProfile);
    expect(restored.appMeta?.onboardingCompletedAt).toBe(
      sourceData.appMeta?.onboardingCompletedAt,
    );
    expect(
      restored.backups.some(
        (record) =>
          record.type === 'import' &&
          record.fileName === `cloud-backup-${idFor(50)}.json`,
      ),
    ).toBe(true);
  });

  it('needs no provider once the backup is verified', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    const ready = await prepared(setup);

    setup.account.state = { status: 'signed-out' };
    setup.store.requests.length = 0;

    expect((await setup.service.confirmRestore(ready)).kind).toBe('restored');
    expect(setup.store.requests).toHaveLength(0);
  });

  it('with learner data on this device it refuses to replace it without an explicit acknowledgement', async () => {
    const learner = await target('learner');
    const before = await learner.readSnapshot();
    const setup = restoreSetup(learner);
    const ready = await prepared(setup);

    expect(await setup.service.confirmRestore(ready)).toEqual({
      kind: 'refused',
      reason: 'acknowledgement-required',
    });
    expect(
      await setup.service.confirmRestore(ready, {
        acknowledgedReplacingLocalData: false,
      }),
    ).toEqual({ kind: 'refused', reason: 'acknowledgement-required' });
    expect(setup.restoreLocal).not.toHaveBeenCalled();
    expect(await learner.readSnapshot()).toEqual(before);
  });

  it('with the acknowledgement it replaces the local learner data', async () => {
    const learner = await target('learner');
    const setup = restoreSetup(learner);
    const ready = await prepared(setup);

    expect(
      await setup.service.confirmRestore(ready, {
        acknowledgedReplacingLocalData: true,
      }),
    ).toMatchObject({ kind: 'restored' });
    expect((await learner.readSnapshot()).learnerProfile).toEqual(
      sourceData.learnerProfile,
    );
  });

  it('judges the local fact again at confirmation, not as it was at preview', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    const ready = await prepared(setup);

    expect(ready.localData).toBe('empty');

    // The learner (or another tab) logs progress between preview and confirmation.
    await upsertProgress(
      {
        itemId: 'week-0-lecture',
        status: 'started',
        startedAt: '2026-10-08T11:00:00.000Z',
        completedAt: undefined,
        confidence: 0.5,
        notes: 'late progress',
        evidenceType: undefined,
        evidenceText: undefined,
      },
      { db: fresh.context.db, now: createClock('2026-10-08T11:00:00.000Z') },
    );

    expect(await setup.service.confirmRestore(ready)).toEqual({
      kind: 'refused',
      reason: 'acknowledgement-required',
    });
    expect(setup.restoreLocal).not.toHaveBeenCalled();
  });

  it('refuses anything that was not produced by a successful preparation', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    const ready = await prepared(setup);

    for (const forged of [
      { ...ready },
      structuredClone(ready),
      JSON.parse(JSON.stringify(ready)),
      Object.create(ready),
    ] as PreparedCloudRestore[]) {
      expect(
        await setup.service.confirmRestore(forged, {
          acknowledgedReplacingLocalData: true,
        }),
      ).toEqual({ kind: 'refused', reason: 'not-prepared' });
    }

    expect(setup.restoreLocal).not.toHaveBeenCalled();
  });

  it('a preparation can be confirmed only once', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    const ready = await prepared(setup);

    expect((await setup.service.confirmRestore(ready)).kind).toBe('restored');
    expect(await setup.service.confirmRestore(ready)).toEqual({
      kind: 'refused',
      reason: 'not-prepared',
    });
    expect(setup.restoreLocal).toHaveBeenCalledTimes(1);
  });

  it('a restore that fails leaves local data unchanged and the preparation usable again', async () => {
    const fresh = await target('fresh');
    const before = await fresh.readSnapshot();
    const failing = vi
      .fn(fresh.restoreLocal)
      .mockRejectedValueOnce(new Error('transaction aborted'));
    const setup = createHarness({
      data: sourceData,
      overrides: {
        readSnapshot: fresh.readSnapshot,
        restoreLocal: failing,
        migrationContext: fresh.migrationContext,
      },
    });
    const row = setup.store.seed(2, {
      payload: payloadText,
      backupId: idFor(50),
    });
    const result = await setup.service.prepareRestore(choice(row));

    if (result.kind !== 'ready') throw new Error('expected ready');

    expect(await setup.service.confirmRestore(result.prepared)).toEqual({
      kind: 'failed',
      reason: 'restore-failed',
    });
    expect(await fresh.readSnapshot()).toEqual(before);
    expect((await setup.service.confirmRestore(result.prepared)).kind).toBe(
      'restored',
    );
  });

  it('another tab holding the write lease is reported as its own outcome', async () => {
    const fresh = await target('fresh');
    const failing = vi.fn(async () => {
      throw new LocalWriteBlockedError('write-active', true);
    });
    const setup = createHarness({
      data: sourceData,
      overrides: {
        readSnapshot: fresh.readSnapshot,
        restoreLocal: failing,
        migrationContext: fresh.migrationContext,
      },
    });
    const row = setup.store.seed(2, {
      payload: payloadText,
      backupId: idFor(50),
    });
    const result = await setup.service.prepareRestore(choice(row));

    if (result.kind !== 'ready') throw new Error('expected ready');

    expect(await setup.service.confirmRestore(result.prepared)).toEqual({
      kind: 'failed',
      reason: 'local-write-blocked',
    });
  });

  it('an unreadable local database at confirmation is refused', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    const ready = await prepared(setup);

    setup.readSnapshot.mockRejectedValueOnce(
      new Error('IndexedDB unavailable'),
    );

    expect(await setup.service.confirmRestore(ready)).toEqual({
      kind: 'refused',
      reason: 'local-state-unreadable',
    });
    expect(setup.restoreLocal).not.toHaveBeenCalled();
  });
});

describe('facts only: no recency inference between the cloud copy and this device', () => {
  async function run(storedAt: string, exportedAt: string) {
    const learner = await target('learner');
    const setup = restoreSetup(learner);

    setup.store.rows.set(2, { ...setup.row, storedAt, exportedAt });

    const preview = await setup.service.prepareRestore(choice(setup.row));

    if (preview.kind !== 'ready') throw new Error('expected ready');

    const refusal = await setup.service.confirmRestore(preview.prepared);
    const done = await setup.service.confirmRestore(preview.prepared, {
      acknowledgedReplacingLocalData: true,
    });

    return {
      localData: preview.prepared.localData,
      integrity: preview.prepared.integrity,
      refusal,
      done: done.kind,
    };
  }

  it('a cloud copy far older and one far newer than this device are treated identically', async () => {
    const old = await run(
      '2000-01-01T00:00:00.000001+00:00',
      '2000-01-01T00:00:00.000Z',
    );
    const recent = await run(
      '2099-01-01T00:00:00.000001+00:00',
      '2099-01-01T00:00:00.000Z',
    );

    expect(recent).toEqual(old);
    expect(old).toEqual({
      localData: 'has-learner-data',
      integrity: 'hash-verified-and-parsed',
      refusal: { kind: 'refused', reason: 'acknowledgement-required' },
      done: 'restored',
    });
  });

  it('what the caller receives never says which side is newer', async () => {
    const fresh = await target('learner');
    const result = await prepared(restoreSetup(fresh));
    const keys = Object.keys(result).sort();

    expect(keys).toEqual(['integrity', 'localData', 'slot', 'summary']);
    expect(JSON.stringify(result)).not.toMatch(
      /newer|older|latest|up.to.date|current/i,
    );
  });
});

describe('one cloud operation at a time', () => {
  it('preparing a restore while a backup runs is turned away', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = setup.store.listSlots.bind(setup.store);

    setup.store.listSlots = async () => {
      await gate;

      return original();
    };

    const backup = setup.service.backUpNow();

    expect(await setup.service.prepareRestore(choice(setup.row))).toEqual({
      kind: 'busy',
    });

    release();
    await backup;
  });

  it('confirming while a preparation is downloading is turned away', async () => {
    const fresh = await target('fresh');
    const setup = restoreSetup(fresh);
    const ready = await prepared(setup);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = setup.store.downloadBackup.bind(setup.store);

    setup.store.downloadBackup = async (slot, id) => {
      await gate;

      return original(slot, id);
    };

    const second = setup.service.prepareRestore(choice(setup.row));

    expect(await setup.service.confirmRestore(ready)).toEqual({ kind: 'busy' });
    expect(setup.restoreLocal).not.toHaveBeenCalled();

    release();
    await second;
  });
});

describe('preconditions', () => {
  it('preparing needs cloud on and a session: disabled and signed out refuse before any request', async () => {
    for (const [status, code] of [
      ['disabled', 'disabled'],
      ['signed-out', 'session-ended'],
    ] as const) {
      const fresh = await target('fresh');
      const setup = restoreSetup(fresh);

      setup.account.state = { status };
      setup.store.requests.length = 0;

      await expect(
        setup.service.prepareRestore(choice(setup.row)),
      ).rejects.toMatchObject({ code });
      expect(setup.store.requests).toHaveLength(0);
    }
  });
});
