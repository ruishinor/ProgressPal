import { describe, expect, it } from 'vitest';

import type { RemoteBackupSlot } from '@/lib/cloud';
import { chooseTargetSlot, classifyInventory } from '@/lib/cloudBackup';

const current = { formatVersion: 1, schemaVersion: 4 };

const idOf = (slot: number) => `00000000-0000-4000-8000-00000000000${slot}`;

function slotRow(
  slot: number,
  storedAt: string,
  overrides: Partial<RemoteBackupSlot> = {},
): RemoteBackupSlot {
  return {
    slot,
    backupId: idOf(slot),
    formatVersion: 1,
    schemaVersion: 4,
    appVersion: '1.7.1',
    exportedAt: '2026-10-01T00:00:00.000Z',
    storedAt,
    payloadBytes: 100 + slot,
    ...overrides,
  };
}

const at = (second: number, fraction = '') =>
  `2026-10-08T12:00:${String(second).padStart(2, '0')}${fraction}+00:00`;

describe('chooseTargetSlot: free slot first, then the oldest by server time', () => {
  it('starts at slot 0 on an empty inventory and observes nothing', () => {
    expect(chooseTargetSlot([])).toEqual({ slot: 0, observedBackupId: null });
  });

  it('takes the lowest empty slot', () => {
    expect(chooseTargetSlot([slotRow(0, at(1)), slotRow(1, at(2))])).toEqual({
      slot: 2,
      observedBackupId: null,
    });
  });

  it('fills a gap before replacing anything, even when an older backup exists', () => {
    expect(
      chooseTargetSlot([
        slotRow(0, at(1)),
        slotRow(2, at(2)),
        slotRow(3, at(3)),
        slotRow(4, at(4)),
      ]),
    ).toEqual({ slot: 1, observedBackupId: null });
  });

  it('takes the last free slot rather than evicting the oldest', () => {
    expect(
      chooseTargetSlot([
        slotRow(0, at(1)),
        slotRow(1, at(2)),
        slotRow(2, at(3)),
        slotRow(3, at(4)),
      ]),
    ).toEqual({ slot: 4, observedBackupId: null });
  });

  it('with five backups replaces the oldest by server time and observes exactly that occupant', () => {
    expect(
      chooseTargetSlot([
        slotRow(0, at(30)),
        slotRow(1, at(10)),
        slotRow(2, at(50)),
        slotRow(3, at(20)),
        slotRow(4, at(40)),
      ]),
    ).toEqual({ slot: 1, observedBackupId: idOf(1) });
  });

  it('does not depend on the order the rows arrive in', () => {
    const rows = [
      slotRow(0, at(30)),
      slotRow(1, at(10)),
      slotRow(2, at(50)),
      slotRow(3, at(20)),
      slotRow(4, at(40)),
    ];

    expect(chooseTargetSlot([...rows].reverse())).toEqual(
      chooseTargetSlot(rows),
    );
  });

  it("never consults the uploader's own exported_at claim", () => {
    const rows = [
      slotRow(0, at(10), { exportedAt: '2030-01-01T00:00:00.000Z' }),
      slotRow(1, at(20), { exportedAt: '2000-01-01T00:00:00.000Z' }),
      slotRow(2, at(30), { exportedAt: '2001-01-01T00:00:00.000Z' }),
      slotRow(3, at(40), { exportedAt: '2002-01-01T00:00:00.000Z' }),
      slotRow(4, at(50), { exportedAt: '2003-01-01T00:00:00.000Z' }),
    ];

    // Oldest by exported_at would be slot 1; oldest by server time is slot 0.
    expect(chooseTargetSlot(rows).slot).toBe(0);
  });

  it('is decided by sub-millisecond server time', () => {
    const rows = [
      slotRow(0, at(5, '.000900')),
      slotRow(1, at(5, '.000100')),
      slotRow(2, at(5, '.000500')),
      slotRow(3, at(5, '.00075')),
      slotRow(4, at(5, '.000200')),
    ];

    expect(chooseTargetSlot(rows).slot).toBe(1);
  });

  it('breaks an exact tie toward the lowest slot', () => {
    const rows = [0, 1, 2, 3, 4].map((slot) => slotRow(slot, at(7)));

    expect(chooseTargetSlot(rows)).toEqual({
      slot: 0,
      observedBackupId: idOf(0),
    });
  });

  it('is generation-agnostic: eviction picks the oldest even when it is the only compatible one', () => {
    const rows = [
      slotRow(0, at(10)),
      slotRow(1, at(20), { schemaVersion: 3 }),
      slotRow(2, at(30), { schemaVersion: 3 }),
      slotRow(3, at(40), { schemaVersion: 3 }),
      slotRow(4, at(50), { schemaVersion: 3 }),
    ];

    expect(chooseTargetSlot(rows)).toEqual({
      slot: 0,
      observedBackupId: idOf(0),
    });
  });
});

describe('classifyInventory: facts only (Epic F section 8.1)', () => {
  it('a successful empty inventory is "no remote backups"', () => {
    expect(classifyInventory([], current)).toEqual({
      slots: [],
      facts: { kind: 'no-remote-backups' },
    });
  });

  it('marks each slot compatible only when format AND schema equal the current ones', () => {
    const { slots } = classifyInventory(
      [
        slotRow(0, at(1)),
        slotRow(1, at(2), { schemaVersion: 3 }),
        slotRow(2, at(3), { formatVersion: 2 }),
        slotRow(3, at(4), { formatVersion: 2, schemaVersion: 5 }),
      ],
      current,
    );

    expect(slots.map((slot) => slot.compatible)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it('returns the slots in slot order with every metadata field kept', () => {
    const { slots } = classifyInventory(
      [slotRow(3, at(3)), slotRow(1, at(1))],
      current,
    );

    expect(slots.map((slot) => slot.slot)).toEqual([1, 3]);
    expect(slots[0]).toEqual({ ...slotRow(1, at(1)), compatible: true });
  });

  it('latest compatible is the greatest server time, not the highest slot', () => {
    const { facts } = classifyInventory(
      [slotRow(0, at(50)), slotRow(1, at(10)), slotRow(4, at(20))],
      current,
    );

    expect(facts).toEqual({
      kind: 'has-compatible-backup',
      latestCompatible: { ...slotRow(0, at(50)), compatible: true },
      newerIncompatible: null,
    });
  });

  it('shows BOTH facts when the newest slot is incompatible but an older compatible one exists', () => {
    const { facts } = classifyInventory(
      [
        slotRow(0, at(10)),
        slotRow(1, at(20)),
        slotRow(2, at(30), { schemaVersion: 5 }),
      ],
      current,
    );

    expect(facts).toEqual({
      kind: 'has-compatible-backup',
      latestCompatible: { ...slotRow(1, at(20)), compatible: true },
      newerIncompatible: {
        ...slotRow(2, at(30), { schemaVersion: 5 }),
        compatible: false,
      },
    });
    expect(facts.kind).not.toBe('no-compatible-backup');
  });

  it('an incompatible slot that is OLDER than the latest compatible one is not reported as newer', () => {
    const { facts } = classifyInventory(
      [slotRow(0, at(10), { schemaVersion: 3 }), slotRow(1, at(20))],
      current,
    );

    expect(facts).toMatchObject({
      kind: 'has-compatible-backup',
      newerIncompatible: null,
    });
  });

  it('only incompatible slots: "no compatible backup", with how many exist and the newest', () => {
    const { facts } = classifyInventory(
      [
        slotRow(0, at(10), { schemaVersion: 3 }),
        slotRow(1, at(40), { schemaVersion: 3 }),
        slotRow(2, at(20), { formatVersion: 2 }),
      ],
      current,
    );

    expect(facts).toEqual({
      kind: 'no-compatible-backup',
      slotCount: 3,
      newest: {
        ...slotRow(1, at(40), { schemaVersion: 3 }),
        compatible: false,
      },
    });
  });

  it("never uses the uploader's exported_at to decide which slot is the latest", () => {
    const { facts } = classifyInventory(
      [
        slotRow(0, at(10), { exportedAt: '2099-01-01T00:00:00.000Z' }),
        slotRow(1, at(20), { exportedAt: '2000-01-01T00:00:00.000Z' }),
      ],
      current,
    );

    expect(facts).toMatchObject({
      latestCompatible: { slot: 1 },
    });
  });
});
