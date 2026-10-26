import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildBackupEnvelope, serializeBackupEnvelope } from '@/lib/backup';
import type { NhostCloud } from '@/lib/cloud';
import {
  createCloudBackupService,
  type CloudBackupDependencies,
} from '@/lib/cloudBackup';

import {
  createSimulatedNhost,
  type SimulatedNhost,
} from '../../infra/simulatedNhostCore.mjs';
import {
  createCloud,
  enableCloud,
  learnerPassword,
} from '../cloud/cloudTestKit';
import {
  appVersion,
  createFreshDevice,
  createLearnerDevice,
  schemaVersion,
  sha256,
  type Device,
} from './support';

/**
 * The whole path, offline: the real backup service, the real Nhost adapter and
 * the real @nhost/nhost-js client, talking to the SIMULATED provider. The
 * simulation understands only the request documents the repository sends, so
 * every flow here also proves that those documents are ones it accepts. It
 * proves nothing about the real provider (that is the owner-run live step).
 */

const emailA = 'a@example.com';
const emailB = 'b@example.com';

let sim: SimulatedNhost;
let cloud: NhostCloud;
let fetchCalls: ReturnType<typeof vi.fn>;
const devices: Device[] = [];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  sim = createSimulatedNhost({ schemaVersion });
  fetchCalls = vi.fn(sim.fetch);
  vi.stubGlobal('fetch', fetchCalls);
  cloud = createCloud();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(devices.splice(0).map((device) => device.cleanup()));
});

async function signIn(email = emailA) {
  enableCloud();
  await cloud.account.signIn({ email, password: learnerPassword });
  sim.requests.length = 0;
  fetchCalls.mockClear();
}

async function learner() {
  const device = await createLearnerDevice('e2e-learner');

  devices.push(device);

  return device;
}

async function fresh() {
  const device = await createFreshDevice('e2e-fresh');

  devices.push(device);

  return device;
}

function serviceFor(
  device: Device,
  overrides: Partial<CloudBackupDependencies> = {},
) {
  return createCloudBackupService({
    account: cloud.account,
    store: cloud.backups,
    readSnapshot: device.readSnapshot,
    appVersion,
    schemaVersion,
    migrationContext: device.migrationContext,
    restoreLocal: device.restoreLocal,
    ...overrides,
  });
}

/** What kind of request each recorded GraphQL document was. */
const kinds = () =>
  sim.requests.map((request) =>
    request.query.startsWith('{ backup_slots(order_by')
      ? 'inventory'
      : request.query.startsWith('mutation Cas(')
        ? 'cas'
        : request.query.startsWith('{ backup_slots(where: {backup_id')
          ? 'find'
          : request.query.startsWith('{ backup_slots(where: {slot')
            ? 'download'
            : 'other',
  );

describe('nothing happens unless the learner asked and signed in', () => {
  it('cloud disabled: refuses and the network is never touched', async () => {
    const device = await learner();

    await expect(serviceFor(device).backUpNow()).rejects.toMatchObject({
      code: 'disabled',
    });
    await expect(serviceFor(device).listBackups()).rejects.toMatchObject({
      code: 'disabled',
    });
    expect(fetchCalls).not.toHaveBeenCalled();
  });

  it('signed out: refuses and no request is sent', async () => {
    enableCloud();

    const device = await learner();

    await expect(serviceFor(device).backUpNow()).rejects.toMatchObject({
      code: 'session-ended',
    });
    expect(fetchCalls).not.toHaveBeenCalled();
  });
});

describe('a manual backup, end to end', () => {
  it("stores the exact local export with the server's own hash, in two requests", async () => {
    const device = await learner();

    await signIn();

    const outcome = await serviceFor(device).backUpNow();
    const [row] = sim.rowsOf(emailA);

    expect(outcome).toMatchObject({ kind: 'stored', backup: { slot: 0 } });
    expect(sim.rowsOf(emailA)).toHaveLength(1);

    const expected = serializeBackupEnvelope(
      buildBackupEnvelope(await device.readSnapshot(), {
        appVersion,
        schemaVersion,
        exportedAt: String(row?.exported_at),
      }),
    ).contents;

    expect(row?.payload).toBe(expected);
    expect(row?.payload_sha256).toBe(`\\x${sha256(expected)}`);
    expect(kinds()).toEqual(['inventory', 'cas']);
  });

  it('seven backups keep five: slots 0..4, then the oldest again; the delete appears only when the ring is full', async () => {
    const device = await learner();

    await signIn();

    const slots: number[] = [];

    for (let index = 0; index < 7; index += 1) {
      const outcome = await serviceFor(device).backUpNow();

      slots.push(outcome.kind === 'stored' ? outcome.backup.slot : -1);
      expect(sim.rowsOf(emailA).length).toBeLessThanOrEqual(5);
    }

    const casDocuments = sim.requests
      .map((request) => request.query)
      .filter((query) => query.startsWith('mutation Cas('));

    expect(slots).toEqual([0, 1, 2, 3, 4, 0, 1]);
    expect(
      casDocuments.map((query) => query.includes('delete_backup_slots')),
    ).toEqual([false, false, false, false, false, true, true]);
  });

  it('the learner database is read, never written', async () => {
    const device = await learner();
    const before = await device.readSnapshot();

    await signIn();
    await serviceFor(device).backUpNow();

    expect(await device.readSnapshot()).toEqual(before);
  });
});

describe('restore, end to end', () => {
  it('another device lists the backup, verifies it and restores the same learner data', async () => {
    const source = await learner();
    const target = await fresh();

    await signIn();
    await serviceFor(source).backUpNow();

    const service = serviceFor(target);
    const listed = await service.listBackups();

    expect(listed).toMatchObject({
      kind: 'ok',
      facts: { kind: 'has-compatible-backup' },
    });

    const chosen = listed.kind === 'ok' ? listed.slots[0] : undefined;

    if (chosen === undefined) throw new Error('expected a listed backup');

    const prepared = await service.prepareRestore({
      slot: chosen.slot,
      backupId: chosen.backupId,
    });

    if (prepared.kind !== 'ready') throw new Error('expected ready');

    expect(prepared.prepared.localData).toBe('empty');
    expect(await service.confirmRestore(prepared.prepared)).toMatchObject({
      kind: 'restored',
    });

    const restored = await target.readSnapshot();
    const original = await source.readSnapshot();

    expect(restored.learnerProfile).toEqual(original.learnerProfile);
    expect(restored.progressEntries).toEqual(original.progressEntries);
    expect(kinds()).toEqual(['inventory', 'cas', 'inventory', 'download']);
  });

  it('damage at rest is caught by the hash before anything is parsed, and local data is unchanged', async () => {
    const source = await learner();
    const target = await fresh();

    await signIn();
    await serviceFor(source).backUpNow();
    sim.corrupt(emailA, 0, '{"tampered":true}');

    const before = await target.readSnapshot();
    const service = serviceFor(target);
    const [row] = sim.rowsOf(emailA);

    expect(
      await service.prepareRestore({
        slot: 0,
        backupId: String(row?.backup_id),
      }),
    ).toMatchObject({ kind: 'refused', reason: 'hash-mismatch' });
    expect(await target.readSnapshot()).toEqual(before);
  });

  it("one account cannot see or restore another account's backup", async () => {
    const source = await learner();
    const other = await fresh();

    await signIn(emailA);
    await serviceFor(source).backUpNow();

    const [row] = sim.rowsOf(emailA);

    await cloud.account.signOut();
    await signIn(emailB);

    const service = serviceFor(other);

    expect(await service.listBackups()).toMatchObject({
      kind: 'ok',
      facts: { kind: 'no-remote-backups' },
    });
    expect(
      await service.prepareRestore({
        slot: 0,
        backupId: String(row?.backup_id),
      }),
    ).toMatchObject({ kind: 'refused', reason: 'slot-changed' });
  });
});

describe('when the provider misbehaves', () => {
  it('a write that COMMITS and loses its answer is found again by id and hash: one row, no second write', async () => {
    const device = await learner();

    await signIn();
    sim.control.loseResponseAfterCommit = 1;

    expect(await serviceFor(device).backUpNow()).toMatchObject({
      kind: 'stored',
      reconciled: true,
    });
    expect(sim.rowsOf(emailA)).toHaveLength(1);
    expect(kinds()).toEqual(['inventory', 'cas', 'find']);
  });

  it('a gateway page BEFORE the commit: the id is absent, so the swap is retried once and stored', async () => {
    const device = await learner();

    await signIn();
    sim.control.gatewayBeforeCommit = 1;

    expect(await serviceFor(device).backUpNow()).toMatchObject({
      kind: 'stored',
      reconciled: false,
    });
    expect(sim.rowsOf(emailA)).toHaveLength(1);
    expect(kinds()).toEqual(['inventory', 'cas', 'find', 'inventory', 'cas']);
  });

  it('two gateway pages in a row are reported as unknown after exactly two writes', async () => {
    const device = await learner();

    await signIn();
    sim.control.gatewayBeforeCommit = 2;

    expect(await serviceFor(device).backUpNow()).toMatchObject({
      kind: 'outcome-unknown',
      lastCheck: 'absent',
    });
    expect(kinds().filter((kind) => kind === 'cas')).toHaveLength(2);
    expect(sim.rowsOf(emailA)).toHaveLength(0);
  });

  it('a provider outage is "unavailable", never an empty inventory, and nothing is written', async () => {
    const device = await learner();

    await signIn();
    sim.control.outage = true;

    expect(await serviceFor(device).listBackups()).toEqual({
      kind: 'unavailable',
      failure: { kind: 'provider-unavailable', httpStatus: null },
    });
    expect(await serviceFor(device).backUpNow()).toMatchObject({
      kind: 'not-stored',
      reason: 'inventory-unavailable',
    });
    expect(sim.rowsOf(emailA)).toHaveLength(0);
  });

  it('a stale client is refused by the generation gate and the existing backup is untouched', async () => {
    const device = await learner();

    await signIn();
    await serviceFor(device).backUpNow();

    const before = sim.rowsOf(emailA);
    const stale = await serviceFor(device, {
      schemaVersion: schemaVersion + 1,
    }).backUpNow();

    expect(stale).toMatchObject({
      kind: 'not-stored',
      reason: 'unsupported-generation',
    });
    expect(sim.rowsOf(emailA)).toEqual(before);
  });
});

describe('what leaves the browser', () => {
  it('the documents carry no token, no secret and no learner text; the payload travels only as a variable', async () => {
    const device = await learner();

    await signIn();
    await serviceFor(device).backUpNow();

    for (const request of sim.requests) {
      expect(request.query).not.toMatch(
        /eyJ|Synthetic Learner|expected_sha256 \}/,
      );
    }

    const cas = sim.requests.find((request) =>
      request.query.startsWith('mutation Cas('),
    );

    expect(JSON.stringify(cas?.variables)).toContain('Synthetic Learner');
    expect(Object.keys((cas?.variables?.new ?? {}) as object).sort()).toEqual([
      'app_version',
      'backup_id',
      'expected_sha256',
      'exported_at',
      'format_version',
      'payload',
      'schema_version',
      'slot',
    ]);
  });
});
