import {
  backupSlotCount,
  compareStoredAt,
  type CloudBackupStore,
  type RemoteBackupSlot,
} from '@/lib/cloud';

import type {
  BackupGeneration,
  CloudInventoryResult,
  InventoryFacts,
  InventorySlot,
} from './types';

/**
 * Slot choice and inventory facts. Pure: no request, no clock.
 *
 * Ordering is by `storedAt`, the server's time for the insert, and nothing
 * else. `exportedAt` is the uploading device's own claim and is never read
 * here, so a device with a wrong clock can neither pick which slot is replaced
 * nor appear to hold the "latest" backup.
 */

/** Earlier server time first; an exact tie goes to the lower slot number. */
function byAge(a: RemoteBackupSlot, b: RemoteBackupSlot): number {
  return compareStoredAt(a.storedAt, b.storedAt) || a.slot - b.slot;
}

/** The greatest server time; an exact tie goes to the higher slot number. */
function newestOf<T extends RemoteBackupSlot>(slots: readonly T[]): T {
  return slots.reduce((newest, slot) =>
    byAge(slot, newest) > 0 ? slot : newest,
  );
}

/**
 * Free slot first (the lowest empty one); with all five taken, the oldest by
 * server time, observed by its identity so the replacement can delete exactly
 * that occupant and no other. Eviction is deliberately generation-agnostic:
 * what keeps the only restorable backup safe is the server's generation gate.
 */
export function chooseTargetSlot(slots: readonly RemoteBackupSlot[]): {
  slot: number;
  observedBackupId: string | null;
} {
  const taken = new Set(slots.map((slot) => slot.slot));

  for (let slot = 0; slot < backupSlotCount; slot += 1) {
    if (!taken.has(slot)) {
      return { slot, observedBackupId: null };
    }
  }

  const oldest = slots.reduce((earliest, slot) =>
    byAge(slot, earliest) < 0 ? slot : earliest,
  );

  return { slot: oldest.slot, observedBackupId: oldest.backupId };
}

export function isCompatible(
  slot: RemoteBackupSlot,
  current: BackupGeneration,
): boolean {
  return (
    slot.formatVersion === current.formatVersion &&
    slot.schemaVersion === current.schemaVersion
  );
}

/**
 * The facts a successful inventory supports, and no more. "Latest" is the
 * greatest server time; it never means most complete or equal to a device.
 */
export function classifyInventory(
  slots: readonly RemoteBackupSlot[],
  current: BackupGeneration,
): { slots: InventorySlot[]; facts: InventoryFacts } {
  const classified: InventorySlot[] = slots
    .map((slot) => ({ ...slot, compatible: isCompatible(slot, current) }))
    .sort((a, b) => a.slot - b.slot);

  if (classified.length === 0) {
    return { slots: classified, facts: { kind: 'no-remote-backups' } };
  }

  const newest = newestOf(classified);
  const compatible = classified.filter((slot) => slot.compatible);

  if (compatible.length === 0) {
    return {
      slots: classified,
      facts: {
        kind: 'no-compatible-backup',
        slotCount: classified.length,
        newest,
      },
    };
  }

  const latestCompatible = newestOf(compatible);

  return {
    slots: classified,
    facts: {
      kind: 'has-compatible-backup',
      latestCompatible,
      // Only a slot that is strictly newer AND not restorable here is worth a
      // second statement; an equal time is not "newer".
      newerIncompatible:
        !newest.compatible &&
        compareStoredAt(newest.storedAt, latestCompatible.storedAt) > 0
          ? newest
          : null,
    },
  };
}

/** Reads the inventory (metadata only). A failure is "unavailable", never empty. */
export async function readInventory(
  store: CloudBackupStore,
  current: BackupGeneration,
): Promise<CloudInventoryResult> {
  const listed = await store.listSlots();

  return listed.ok
    ? { kind: 'ok', ...classifyInventory(listed.value, current) }
    : { kind: 'unavailable', failure: listed.failure };
}
