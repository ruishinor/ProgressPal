import { z } from 'zod';

import { SyncFailure } from '@/lib/cloud';

import { syncBindingKey } from './rollout';

const hash = z.string().regex(/^[0-9a-f]{64}$/);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const bindingSchema = z.strictObject({
  userId: z.string().min(1),
  revision,
  hash,
  initialized: z.boolean(),
  pending: z.strictObject({ expectedRevision: revision, hash }).optional(),
});

export type SyncBinding = z.infer<typeof bindingSchema>;

export function readSyncBinding(storage: Pick<Storage, 'getItem'>) {
  try {
    const raw = storage.getItem(syncBindingKey);
    return raw === null ? null : bindingSchema.parse(JSON.parse(raw));
  } catch {
    // An unreadable owner is a safety failure, never an unowned browser.
    throw new SyncFailure('incompatible');
  }
}

export function writeSyncBinding(
  storage: Pick<Storage, 'setItem'>,
  binding: SyncBinding,
) {
  try {
    storage.setItem(syncBindingKey, JSON.stringify(binding));
  } catch {
    throw new SyncFailure('incompatible');
  }
}
