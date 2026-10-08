import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BackupData } from '@/lib/backup';

import { gatewayFault, networkFault } from './fakeBackupStore';
import { createHarness } from './harness';
import { createLearnerDevice, type Device } from './support';

let device: Device;
let data: BackupData;

beforeAll(async () => {
  device = await createLearnerDevice('service');
  data = await device.readSnapshot();
});

afterAll(async () => {
  await device.cleanup();
});

describe('listBackups: metadata only, and unavailable is never "empty"', () => {
  it('cloud disabled and signed out refuse before any request', async () => {
    for (const [status, code] of [
      ['disabled', 'disabled'],
      ['signed-out', 'session-ended'],
    ] as const) {
      const h = createHarness({ data, state: { status } });

      await expect(h.service.listBackups()).rejects.toMatchObject({ code });
      expect(h.store.requests).toHaveLength(0);
    }
  });

  it('asks for the inventory once and for nothing else', async () => {
    const h = createHarness({ data });

    h.store.seed(0);
    await h.service.listBackups();

    expect(h.store.requests.map((request) => request.method)).toEqual([
      'listSlots',
    ]);
  });

  it('a successful empty inventory is "no remote backups"', async () => {
    const h = createHarness({ data });

    expect(await h.service.listBackups()).toEqual({
      kind: 'ok',
      slots: [],
      facts: { kind: 'no-remote-backups' },
    });
  });

  it.each([
    ['a gateway fault', gatewayFault],
    ['a dropped connection', networkFault],
    ['an expired session', { kind: 'unauthenticated' } as const],
    ['rate limiting', { kind: 'rate-limited' } as const],
    ['an unrecognisable answer', { kind: 'unexpected-response' } as const],
  ])(
    '%s is "unavailable" with the classified failure, never an empty list',
    async (_label, failure) => {
      const h = createHarness({ data });

      h.store.seed(0);
      h.store.fault('listSlots', { kind: 'fail', failure });

      expect(await h.service.listBackups()).toEqual({
        kind: 'unavailable',
        failure,
      });
    },
  );

  it("labels compatibility against THIS app's generation", async () => {
    const h = createHarness({ data });

    h.store.seed(0);
    h.store.seed(1, { schemaVersion: 3 });

    const result = await h.service.listBackups();

    expect(
      result.kind === 'ok' && result.slots.map((s) => s.compatible),
    ).toEqual([true, false]);
  });

  it('reports both facts when the newest backup is not restorable here but an older one is', async () => {
    const h = createHarness({ data });

    h.store.seed(0);
    h.store.seed(1, { schemaVersion: 5 });

    const result = await h.service.listBackups();

    expect(result).toMatchObject({
      kind: 'ok',
      facts: {
        kind: 'has-compatible-backup',
        latestCompatible: { slot: 0 },
        newerIncompatible: { slot: 1 },
      },
    });
  });

  it('does not wait for, or block, a backup in progress', async () => {
    const h = createHarness({ data });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = h.store.replaceSlot.bind(h.store);

    h.store.replaceSlot = async (write) => {
      await gate;

      return original(write);
    };

    const backup = h.service.backUpNow();
    const listed = await h.service.listBackups();

    expect(listed.kind).toBe('ok');

    release();
    expect((await backup).kind).toBe('stored');
  });
});
