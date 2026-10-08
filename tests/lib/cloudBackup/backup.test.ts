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
  buildBackupEnvelope,
  serializeBackupEnvelope,
  type BackupData,
} from '@/lib/backup';
import { CloudError, remoteBackupPayloadCeilingBytes } from '@/lib/cloud';

import {
  gatewayFault,
  networkFault,
  sha256Of,
  type FakeBackupStore,
} from './fakeBackupStore';
import { createHarness, fixedNow, idFor } from './harness';
import {
  appVersion,
  createLearnerDevice,
  schemaVersion,
  type Device,
} from './support';

/**
 * G5, manual backup. Every test drives the real service against an in-memory
 * model of the table; the real provider is never contacted.
 */

let device: Device;
let data: BackupData;

beforeAll(async () => {
  device = await createLearnerDevice('backup-domain');
  data = await device.readSnapshot();
});

afterAll(async () => {
  await device.cleanup();
});

afterEach(() => {
  vi.useRealTimers();
});

const expectedText = (snapshot: BackupData = data) =>
  serializeBackupEnvelope(
    buildBackupEnvelope(snapshot, {
      appVersion,
      schemaVersion,
      exportedAt: fixedNow.toISOString(),
    }),
  ).contents;

const lastWrite = (store: FakeBackupStore) =>
  store.requests.filter((request) => request.method === 'replaceSlot').at(-1)
    ?.argument as {
    slot: number;
    observedBackupId: string | null;
    backupId: string;
    payload: string;
    expectedSha256: string;
    formatVersion: number;
    schemaVersion: number;
    appVersion: string;
    exportedAt: string;
  };

/** `data` with the profile name padded so the export is exactly `bytes` long. */
function dataOfExactSize(bytes: number): BackupData {
  const profile = data.learnerProfile as NonNullable<
    BackupData['learnerProfile']
  >;
  const named = (displayName: string): BackupData => ({
    ...data,
    learnerProfile: { ...profile, displayName },
  });
  const skeleton = Buffer.byteLength(expectedText(named('')), 'utf8');

  if (bytes < skeleton) {
    throw new RangeError('target is smaller than the skeleton');
  }

  // One ASCII letter is one byte and needs no JSON escaping, so this is exact.
  return named('x'.repeat(bytes - skeleton));
}

describe('before anything is sent', () => {
  it('cloud disabled: refuses, reads nothing, sends nothing', async () => {
    const h = createHarness({ data, state: { status: 'disabled' } });

    await expect(h.service.backUpNow()).rejects.toMatchObject({
      name: 'CloudError',
      code: 'disabled',
    });
    expect(h.reads.snapshot).toBe(0);
    expect(h.store.requests).toHaveLength(0);
  });

  it('signed out: refuses, reads nothing, sends nothing', async () => {
    const h = createHarness({ data, state: { status: 'signed-out' } });
    const error = await h.service.backUpNow().then(
      () => null,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(CloudError);
    expect((error as CloudError).code).toBe('session-ended');
    expect(h.reads.snapshot).toBe(0);
    expect(h.store.requests).toHaveLength(0);
  });

  it('creating the service does no work and starts no timer', () => {
    vi.useFakeTimers();

    const h = createHarness({ data });

    expect(h.reads.snapshot).toBe(0);
    expect(h.store.requests).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a backup happens only when asked: nothing runs by itself afterwards', async () => {
    vi.useFakeTimers();

    const h = createHarness({ data });

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(h.store.requests).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('the payload is the exact local file export', () => {
  it('uploads precisely the bytes the file backup would contain, hashed over that very string', async () => {
    const h = createHarness({ data });
    const outcome = await h.service.backUpNow();
    const write = lastWrite(h.store);

    expect(outcome.kind).toBe('stored');
    expect(write.payload).toBe(expectedText());
    expect(write.expectedSha256).toBe(sha256Of(write.payload));
  });

  it("declares the envelope's own generation, app version and export time", async () => {
    const h = createHarness({ data });

    await h.service.backUpNow();

    expect(lastWrite(h.store)).toMatchObject({
      formatVersion: 1,
      schemaVersion,
      appVersion,
      exportedAt: fixedNow.toISOString(),
    });
  });

  it('sends the identity it will later reconcile by', async () => {
    const h = createHarness({ data });

    await h.service.backUpNow();

    expect(lastWrite(h.store).backupId).toBe(idFor(1));
  });

  it('reads the learner database but writes nothing to it (no audit row, unlike the file export)', async () => {
    const own = await createLearnerDevice('backup-no-write');

    try {
      const before = await own.readSnapshot();
      const h = createHarness({
        data,
        overrides: { readSnapshot: own.readSnapshot },
      });

      expect((await h.service.backUpNow()).kind).toBe('stored');
      expect(await own.readSnapshot()).toEqual(before);
    } finally {
      await own.cleanup();
    }
  });

  it('a failed backup does not touch the learner database either', async () => {
    const own = await createLearnerDevice('backup-no-write-failed');

    try {
      const before = await own.readSnapshot();
      const h = createHarness({
        data,
        overrides: { readSnapshot: own.readSnapshot },
      });

      h.store.fault('replaceSlot', {
        kind: 'fail',
        failure: {
          kind: 'rejected',
          reason: 'unsupported-generation',
          constraint: 'backup_slots_generation_gate',
        },
      });

      expect((await h.service.backUpNow()).kind).toBe('not-stored');
      expect(await own.readSnapshot()).toEqual(before);
    } finally {
      await own.cleanup();
    }
  });
});

describe('the 10 MiB remote ceiling is enforced locally first', () => {
  it('accepts a payload of exactly the ceiling', async () => {
    const h = createHarness({
      data: dataOfExactSize(remoteBackupPayloadCeilingBytes),
    });
    const outcome = await h.service.backUpNow();

    expect(Buffer.byteLength(lastWrite(h.store).payload, 'utf8')).toBe(
      remoteBackupPayloadCeilingBytes,
    );
    expect(outcome.kind).toBe('stored');
  });

  it('refuses one byte more, with no request at all', async () => {
    const h = createHarness({
      data: dataOfExactSize(remoteBackupPayloadCeilingBytes + 1),
    });

    expect(await h.service.backUpNow()).toEqual({
      kind: 'not-stored',
      reason: 'payload-over-remote-ceiling',
      failure: null,
    });
    expect(h.store.requests).toHaveLength(0);
  });

  it('counts UTF-8 bytes, not characters', async () => {
    const wide = {
      ...data,
      learnerProfile: {
        ...(data.learnerProfile as NonNullable<BackupData['learnerProfile']>),
        displayName: 'é'.repeat(6 * 1024 * 1024),
      },
    } as BackupData;
    const h = createHarness({ data: wide });

    expect((await h.service.backUpNow()).kind).toBe('not-stored');
    expect(h.store.requests).toHaveLength(0);
  });

  it('a backup over the local 25 MiB file limit is refused the same way, unchanged limit', async () => {
    const h = createHarness({
      data: dataOfExactSize(26 * 1024 * 1024),
    });

    expect(await h.service.backUpNow()).toEqual({
      kind: 'not-stored',
      reason: 'payload-over-remote-ceiling',
      failure: null,
    });
    expect(h.store.requests).toHaveLength(0);
  });

  it('a snapshot that cannot be read is a local failure, nothing is sent', async () => {
    const h = createHarness({
      data,
      overrides: {
        readSnapshot: async () => {
          throw new Error('IndexedDB unavailable');
        },
      },
    });

    expect(await h.service.backUpNow()).toEqual({
      kind: 'not-stored',
      reason: 'local-export-failed',
      failure: null,
    });
    expect(h.store.requests).toHaveLength(0);
  });
});

describe('five slots: free slot first, then the oldest by server time', () => {
  it('first backup goes to slot 0 and replaces nothing', async () => {
    const h = createHarness({ data });
    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({
      kind: 'stored',
      reconciled: false,
      backup: { slot: 0, replacedBackupId: null, backupId: idFor(1) },
    });
    expect(lastWrite(h.store).observedBackupId).toBeNull();
  });

  it('fills a free slot even when an older backup exists elsewhere', async () => {
    const h = createHarness({ data });

    h.store.seed(0);
    h.store.seed(2);
    h.store.seed(3);
    h.store.seed(4);

    expect(await h.service.backUpNow()).toMatchObject({
      kind: 'stored',
      backup: { slot: 1, replacedBackupId: null },
    });
    expect(h.store.rows.size).toBe(5);
  });

  it('with all five slots taken, replaces exactly the oldest and says which backup it replaced', async () => {
    const h = createHarness({ data });

    for (const slot of [0, 1, 2, 3, 4]) h.store.seed(slot);
    // Make slot 3 the oldest by server time, whatever its number.
    h.store.rows.set(3, {
      ...h.store.rows.get(3)!,
      storedAt: '2026-10-01T00:00:00.000001+00:00',
    });

    const oldest = h.store.rows.get(3)!;
    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({
      kind: 'stored',
      backup: { slot: 3, replacedBackupId: oldest.backupId },
    });
    expect(lastWrite(h.store).observedBackupId).toBe(oldest.backupId);
    expect(h.store.rows.size).toBe(5);
    expect(
      [...h.store.rows.values()].some((r) => r.backupId === oldest.backupId),
    ).toBe(false);
  });

  it("never orders by the uploader's exported_at", async () => {
    const h = createHarness({ data });

    for (const slot of [0, 1, 2, 3, 4]) {
      h.store.seed(slot, { exportedAt: `2030-0${slot + 1}-01T00:00:00.000Z` });
    }
    // Slot 0 is the oldest by server time but claims the NEWEST export time.
    // An implementation that ordered by exported_at would pick slot 1.
    h.store.rows.set(0, {
      ...h.store.rows.get(0)!,
      exportedAt: '2099-01-01T00:00:00.000Z',
    });

    expect(await h.service.backUpNow()).toMatchObject({
      kind: 'stored',
      backup: { slot: 0 },
    });
  });

  it('keeps at most five backups through a long series, always replacing the oldest first', async () => {
    const h = createHarness({ data });
    const slots: number[] = [];

    for (let index = 0; index < 8; index += 1) {
      const outcome = await h.service.backUpNow();

      expect(outcome.kind).toBe('stored');
      slots.push(outcome.kind === 'stored' ? outcome.backup.slot : -1);
      expect(h.store.rows.size).toBeLessThanOrEqual(5);
    }

    expect(slots).toEqual([0, 1, 2, 3, 4, 0, 1, 2]);
  });

  it('is generation-agnostic when choosing: it does not skip an incompatible oldest slot', async () => {
    const h = createHarness({ data });

    for (const slot of [0, 1, 2, 3, 4]) h.store.seed(slot);
    h.store.rows.set(0, { ...h.store.rows.get(0)!, schemaVersion: 3 });

    expect(await h.service.backUpNow()).toMatchObject({
      kind: 'stored',
      backup: { slot: 0 },
    });
  });
});

describe('one request, one transaction', () => {
  it('a backup is one inventory read and one combined delete-and-insert, nothing else', async () => {
    const h = createHarness({ data });

    for (const slot of [0, 1, 2, 3, 4]) h.store.seed(slot);
    await h.service.backUpNow();

    expect(h.store.requests.map((request) => request.method)).toEqual([
      'listSlots',
      'replaceSlot',
    ]);
  });

  it('an empty slot is written with no delete part', async () => {
    const h = createHarness({ data });

    await h.service.backUpNow();

    expect(lastWrite(h.store).observedBackupId).toBeNull();
  });
});

describe("success is claimed only on the server's own confirmation", () => {
  it("reports the server's time and hash, not the client's", async () => {
    const h = createHarness({ data });
    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({
      kind: 'stored',
      backup: {
        payloadSha256: sha256Of(expectedText()),
        payloadBytes: Buffer.byteLength(expectedText(), 'utf8'),
        storedAt: h.store.rows.get(0)?.storedAt,
      },
    });
  });

  it('a committed row whose server hash differs is an integrity violation, never a success', async () => {
    const h = createHarness({ data });

    h.store.hashDrift = true;

    const outcome = await h.service.backUpNow();

    expect(outcome.kind).toBe('integrity-violation');
    expect(h.store.count('replaceSlot')).toBe(1);
  });

  it('on an integrity violation it re-reads the inventory and takes NO destructive or retry action', async () => {
    const h = createHarness({ data });

    for (const slot of [0, 1, 2, 3, 4]) h.store.seed(slot);
    h.store.hashDrift = true;

    const outcome = await h.service.backUpNow();

    expect(outcome.kind).toBe('integrity-violation');
    expect(h.store.requests.map((request) => request.method)).toEqual([
      'listSlots',
      'replaceSlot',
      'listSlots',
    ]);
    expect(
      outcome.kind === 'integrity-violation' && outcome.inventory,
    ).toMatchObject({
      kind: 'ok',
    });
  });

  it('surfaces only bounded diagnostics: the id, the slot and eight hex characters of each hash', async () => {
    const h = createHarness({ data });

    h.store.hashDrift = true;

    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({
      kind: 'integrity-violation',
      diagnostics: {
        backupId: idFor(1),
        slot: 0,
        expectedHashPrefix: sha256Of(expectedText()).slice(0, 8),
        storedHashPrefix: expect.stringMatching(/^[0-9a-f]{8}$/),
      },
    });

    const diagnostics =
      outcome.kind === 'integrity-violation' ? outcome.diagnostics : null;

    expect(Object.keys(diagnostics ?? {}).sort()).toEqual([
      'backupId',
      'expectedHashPrefix',
      'slot',
      'storedHashPrefix',
    ]);
    expect(JSON.stringify(outcome)).not.toContain(sha256Of(expectedText()));
    expect(JSON.stringify(outcome)).not.toContain('Synthetic Learner');
  });
});

describe('a database refusal is final: it is reported, never silently retried', () => {
  it.each([
    ['unsupported-generation', 'backup_slots_generation_gate'],
    ['integrity-mismatch', 'backup_slots_exact_bytes_gate'],
    ['payload-too-large', 'backup_slots_payload_ceiling'],
    ['slot-out-of-range', 'backup_slots_slot_range'],
    ['other-constraint', 'backup_slots_app_version_length'],
  ] as const)(
    '%s: one write, no retry, no reconciliation',
    async (reason, constraint) => {
      const h = createHarness({ data });
      const failure = { kind: 'rejected', reason, constraint } as const;

      h.store.fault('replaceSlot', { kind: 'fail', failure });

      expect(await h.service.backUpNow()).toEqual({
        kind: 'not-stored',
        reason,
        failure,
      });
      expect(h.store.count('replaceSlot')).toBe(1);
      expect(h.store.count('findBackup')).toBe(0);
      expect(h.store.count('listSlots')).toBe(1);
    },
  );

  it('the real generation gate: a stale client is refused and the five backups are untouched', async () => {
    const h = createHarness({ data });

    for (const slot of [0, 1, 2, 3, 4]) h.store.seed(slot);

    const before = [...h.store.rows.values()].map((row) => ({ ...row }));

    h.store.generation = { formatVersion: 1, schemaVersion: schemaVersion + 1 };

    expect(await h.service.backUpNow()).toMatchObject({
      kind: 'not-stored',
      reason: 'unsupported-generation',
    });
    expect([...h.store.rows.values()]).toEqual(before);
    expect(h.store.count('replaceSlot')).toBe(1);
  });

  it('platform refusals that happen before the database runs are reported as such', async () => {
    for (const failure of [
      { kind: 'unauthenticated' },
      { kind: 'rate-limited' },
    ] as const) {
      const h = createHarness({ data });

      h.store.fault('replaceSlot', { kind: 'fail', failure });

      expect(await h.service.backUpNow()).toEqual({
        kind: 'not-stored',
        reason: failure.kind,
        failure,
      });
      expect(h.store.count('replaceSlot')).toBe(1);
      expect(h.store.count('findBackup')).toBe(0);
    }
  });

  it('an unreadable inventory means nothing is written', async () => {
    const h = createHarness({ data });

    h.store.fault('listSlots', { kind: 'fail', failure: gatewayFault });

    expect(await h.service.backUpNow()).toEqual({
      kind: 'not-stored',
      reason: 'inventory-unavailable',
      failure: gatewayFault,
    });
    expect(h.store.count('replaceSlot')).toBe(0);
  });

  it.each([
    ['unauthenticated', { kind: 'unauthenticated' }],
    ['rate-limited', { kind: 'rate-limited' }],
  ] as const)(
    'an inventory read refused as %s names that reason',
    async (reason, failure) => {
      const h = createHarness({ data });

      h.store.fault('listSlots', { kind: 'fail', failure });

      expect(await h.service.backUpNow()).toMatchObject({
        kind: 'not-stored',
        reason,
      });
      expect(h.store.count('replaceSlot')).toBe(0);
    },
  );
});

describe('a lost race: re-read and retry at most once, then say so', () => {
  it('another writer takes the free slot first: the retry uses the next free slot and keeps both backups', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', {
      kind: 'race',
      run: (store) => {
        store.seed(0);
      },
    });

    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({
      kind: 'stored',
      reconciled: false,
      backup: { slot: 1, backupId: idFor(1) },
    });
    expect(h.store.rows.size).toBe(2);
    expect(h.store.count('replaceSlot')).toBe(2);
    expect(h.store.count('listSlots')).toBe(2);
  });

  it('keeps the SAME identity for the retry', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', {
      kind: 'race',
      run: (store) => {
        store.seed(0);
      },
    });
    await h.service.backUpNow();

    const writes = h.store.requests
      .filter((request) => request.method === 'replaceSlot')
      .map((request) => (request.argument as { backupId: string }).backupId);

    expect(writes).toEqual([idFor(1), idFor(1)]);
  });

  it('a slower writer never overwrites a newer backup it did not see', async () => {
    const h = createHarness({ data });

    for (const slot of [0, 1, 2, 3, 4]) h.store.seed(slot);

    const observed = h.store.rows.get(0)!;
    let newer = '';

    h.store.fault('replaceSlot', {
      kind: 'race',
      run: (store) => {
        // Another device replaces the very occupant we observed.
        store.rows.delete(0);
        newer = store.seed(0, {
          backupId: idFor(99),
          payload: 'newer',
        }).backupId;
      },
    });

    const outcome = await h.service.backUpNow();

    expect(newer).toBe(idFor(99));
    expect(observed.backupId).not.toBe(newer);
    // The first attempt rolled back; the retry replaced the now-oldest slot, not the newer one.
    expect(outcome).toMatchObject({ kind: 'stored', backup: { slot: 1 } });
    expect(h.store.rows.get(0)?.backupId).toBe(newer);
    expect(h.store.rows.size).toBe(5);
  });

  it('losing twice is reported honestly, after exactly two writes', async () => {
    const h = createHarness({ data });

    h.store.fault(
      'replaceSlot',
      { kind: 'race', run: (store) => void store.seed(0) },
      { kind: 'race', run: (store) => void store.seed(1) },
    );

    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({ kind: 'not-stored', reason: 'lost-race' });
    expect(h.store.count('replaceSlot')).toBe(2);
    expect(h.store.count('listSlots')).toBe(2);
    expect(h.store.rows.size).toBe(2);
  });
});

describe('outcome unknown: reconciled by identity AND hash, never by identity alone', () => {
  it('a write that COMMITTED but lost its answer is found by id with the matching hash: success, no second write', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', {
      kind: 'commit-then-fail',
      failure: gatewayFault,
    });

    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({
      kind: 'stored',
      reconciled: true,
      backup: {
        backupId: idFor(1),
        slot: 0,
        payloadSha256: sha256Of(expectedText()),
      },
    });
    expect(h.store.count('replaceSlot')).toBe(1);
    expect(h.store.count('findBackup')).toBe(1);
    expect(h.store.rows.size).toBe(1);
  });

  it('a lost answer from a dropped connection reconciles the same way', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', {
      kind: 'commit-then-fail',
      failure: networkFault,
    });

    expect(await h.service.backUpNow()).toMatchObject({
      kind: 'stored',
      reconciled: true,
    });
  });

  it('an unrecognisable answer is treated as unknown, not as success or failure', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', {
      kind: 'commit-then-fail',
      failure: { kind: 'unexpected-response' },
    });

    expect(await h.service.backUpNow()).toMatchObject({
      kind: 'stored',
      reconciled: true,
    });
  });

  it('the id is present but the server hash differs: NOT a success; integrity violation, inventory re-read, no destructive action', async () => {
    const h = createHarness({ data });

    for (const slot of [1, 2, 3, 4]) h.store.seed(slot);
    h.store.hashDrift = true;
    h.store.fault('replaceSlot', {
      kind: 'commit-then-fail',
      failure: gatewayFault,
    });

    const outcome = await h.service.backUpNow();
    const rowsAfter = [...h.store.rows.values()].map((row) => row.slot);

    expect(outcome.kind).toBe('integrity-violation');
    expect(outcome).toMatchObject({
      diagnostics: { backupId: idFor(1), slot: 0 },
      inventory: { kind: 'ok' },
    });
    expect(h.store.count('replaceSlot')).toBe(1);
    expect(rowsAfter.sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('the write did not happen: the id is absent, so the inventory is re-read and the swap retried once, with the same id', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', { kind: 'fail', failure: gatewayFault });

    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({
      kind: 'stored',
      reconciled: false,
      backup: { backupId: idFor(1) },
    });
    expect(h.store.requests.map((request) => request.method)).toEqual([
      'listSlots',
      'replaceSlot',
      'findBackup',
      'listSlots',
      'replaceSlot',
    ]);
    expect(h.store.rows.size).toBe(1);
  });

  it('absent twice: bounded at two writes, then honest "outcome unknown" with what is needed to check later', async () => {
    const h = createHarness({ data });

    h.store.fault(
      'replaceSlot',
      { kind: 'fail', failure: gatewayFault },
      { kind: 'fail', failure: gatewayFault },
    );

    const outcome = await h.service.backUpNow();

    expect(outcome).toEqual({
      kind: 'outcome-unknown',
      attempt: {
        backupId: idFor(1),
        expectedSha256: sha256Of(expectedText()),
        slot: 0,
        payloadBytes: Buffer.byteLength(expectedText(), 'utf8'),
      },
      lastCheck: 'absent',
      failure: gatewayFault,
    });
    expect(h.store.count('replaceSlot')).toBe(2);
    expect(h.store.count('findBackup')).toBe(2);
  });

  it('the check itself cannot reach the provider: no blind second write, outcome unknown', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', {
      kind: 'commit-then-fail',
      failure: gatewayFault,
    });
    h.store.fault('findBackup', { kind: 'fail', failure: networkFault });

    const outcome = await h.service.backUpNow();

    expect(outcome).toMatchObject({
      kind: 'outcome-unknown',
      lastCheck: 'unreachable',
      attempt: { backupId: idFor(1) },
    });
    expect(h.store.count('replaceSlot')).toBe(1);
    // The write did commit; the service must not have written it a second time.
    expect(h.store.rows.size).toBe(1);
  });

  it('an unknown outcome can be checked again later and then resolves to success', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', {
      kind: 'commit-then-fail',
      failure: gatewayFault,
    });
    h.store.fault('findBackup', { kind: 'fail', failure: networkFault });

    const unknown = await h.service.backUpNow();

    if (unknown.kind !== 'outcome-unknown') {
      throw new Error('expected an unknown outcome');
    }

    expect(await h.service.checkAttempt(unknown.attempt)).toMatchObject({
      kind: 'stored',
      reconciled: true,
      backup: {
        backupId: idFor(1),
        payloadSha256: unknown.attempt.expectedSha256,
      },
    });
    expect(h.store.count('replaceSlot')).toBe(1);
  });

  it('checking an attempt whose id is absent says so and writes nothing', async () => {
    const h = createHarness({ data });
    const outcome = await h.service.checkAttempt({
      backupId: idFor(7),
      expectedSha256: sha256Of('x'),
      slot: 2,
      payloadBytes: 1,
    });

    expect(outcome).toMatchObject({
      kind: 'outcome-unknown',
      lastCheck: 'absent',
    });
    expect(h.store.count('replaceSlot')).toBe(0);
  });

  it('checking an attempt whose id has the wrong hash is an integrity violation', async () => {
    const h = createHarness({ data });

    h.store.seed(2, { backupId: idFor(7), payload: 'other text' });

    expect(
      await h.service.checkAttempt({
        backupId: idFor(7),
        expectedSha256: sha256Of('the bytes this device sent'),
        slot: 2,
        payloadBytes: 1,
      }),
    ).toMatchObject({
      kind: 'integrity-violation',
      diagnostics: { backupId: idFor(7), slot: 2 },
    });
  });

  it('the first answer was lost and the late write lands in the slot the retry targets: reconciled by id, not reported as a lost race', async () => {
    const h = createHarness({ data });

    h.store.fault(
      'replaceSlot',
      { kind: 'fail', failure: gatewayFault },
      {
        kind: 'race',
        run: (store) => {
          // The first request finally arrives and commits, just before the retry.
          const first = lastWrite(store);

          store.seed(first.slot, {
            backupId: first.backupId,
            payload: first.payload,
          });
        },
      },
    );

    expect(await h.service.backUpNow()).toMatchObject({
      kind: 'stored',
      reconciled: true,
      backup: { backupId: idFor(1) },
    });
    expect(h.store.rows.size).toBe(1);
  });

  it('a duplicate-identity refusal means the id exists: it is checked by hash, not retried', async () => {
    const h = createHarness({ data });

    h.store.fault('replaceSlot', {
      kind: 'race',
      run: (store) => {
        const attempt = lastWrite(store);

        store.seed(3, { backupId: attempt.backupId, payload: attempt.payload });
      },
    });

    expect(await h.service.backUpNow()).toMatchObject({
      kind: 'stored',
      reconciled: true,
      backup: { backupId: idFor(1), slot: 3 },
    });
    expect(h.store.count('replaceSlot')).toBe(1);
  });
});

describe('only one cloud operation at a time', () => {
  it('a second backup requested while one is running is turned away, not queued or doubled', async () => {
    const h = createHarness({ data });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = h.store.listSlots.bind(h.store);

    h.store.listSlots = async () => {
      await gate;

      return original();
    };

    const first = h.service.backUpNow();
    const second = await h.service.backUpNow();

    expect(second).toEqual({ kind: 'busy' });

    release();

    expect((await first).kind).toBe('stored');
    expect(h.store.count('replaceSlot')).toBe(1);
  });

  it('a failed backup does not leave the service stuck busy', async () => {
    const h = createHarness({ data });

    h.store.fault('listSlots', { kind: 'throw', error: new Error('boom') });

    await expect(h.service.backUpNow()).rejects.toThrow('boom');
    expect((await h.service.backUpNow()).kind).toBe('stored');
  });
});

describe('what the service never does', () => {
  it('uses no timer for any retry: the bound is a count, not a delay', async () => {
    vi.useFakeTimers();

    const h = createHarness({ data });

    h.store.fault(
      'replaceSlot',
      { kind: 'fail', failure: gatewayFault },
      { kind: 'fail', failure: gatewayFault },
    );

    const outcome = await h.service.backUpNow();

    expect(outcome.kind).toBe('outcome-unknown');
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never puts the learner's data in a failure outcome", async () => {
    const h = createHarness({ data });

    h.store.fault(
      'replaceSlot',
      { kind: 'fail', failure: gatewayFault },
      { kind: 'fail', failure: gatewayFault },
    );

    expect(JSON.stringify(await h.service.backUpNow())).not.toContain(
      'Synthetic Learner',
    );
  });
});
