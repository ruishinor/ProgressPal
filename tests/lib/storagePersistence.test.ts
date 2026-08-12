import { describe, expect, it, vi } from 'vitest';

import {
  inspectStoragePersistence,
  requestStoragePersistence,
  type StorageManagerPort,
} from '@/lib/storage';

describe('storage persistence reporting', () => {
  it('reports unsupported without the relevant browser API', async () => {
    await expect(inspectStoragePersistence(null)).resolves.toBe('unsupported');
    await expect(requestStoragePersistence(null)).resolves.toBe('unsupported');
  });

  it('distinguishes persistent and best-effort storage', async () => {
    await expect(
      inspectStoragePersistence({ persisted: vi.fn().mockResolvedValue(true) }),
    ).resolves.toBe('persistent');
    await expect(
      inspectStoragePersistence({
        persisted: vi.fn().mockResolvedValue(false),
      }),
    ).resolves.toBe('best-effort');
  });

  it('reports the result of an explicit persistence request', async () => {
    await expect(
      requestStoragePersistence({ persist: vi.fn().mockResolvedValue(true) }),
    ).resolves.toBe('persistent');
    await expect(
      requestStoragePersistence({ persist: vi.fn().mockResolvedValue(false) }),
    ).resolves.toBe('best-effort');
  });

  it('fails closed when the browser storage API rejects', async () => {
    const rejectingManager: StorageManagerPort = {
      persist: vi.fn().mockRejectedValue(new Error('denied')),
      persisted: vi.fn().mockRejectedValue(new Error('unavailable')),
    };

    await expect(inspectStoragePersistence(rejectingManager)).resolves.toBe(
      'error',
    );
    await expect(requestStoragePersistence(rejectingManager)).resolves.toBe(
      'error',
    );
  });
});
