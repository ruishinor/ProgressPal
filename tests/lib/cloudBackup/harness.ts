import type { BackupData } from '@/lib/backup';
import type { CloudAccountState } from '@/lib/cloud';
import {
  createCloudBackupService,
  type CloudBackupDependencies,
} from '@/lib/cloudBackup';

import { FakeBackupStore } from './fakeBackupStore';
import { appVersion, schemaVersion } from './support';

export const fixedNow = new Date('2026-10-08T10:00:00.000Z');

export const signedIn: CloudAccountState = {
  status: 'signed-in',
  userId: 'user-1',
  email: 'learner@example.com',
};

export const idFor = (n: number) =>
  `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;

export interface HarnessOptions {
  data: BackupData;
  state?: CloudAccountState;
  overrides?: Partial<CloudBackupDependencies>;
}

/**
 * One service wired to an in-memory store, with every collaborator observable.
 * `readSnapshot` serves a fixed snapshot; `restoreLocal` records its calls.
 */
export function createHarness(options: HarnessOptions) {
  const store = new FakeBackupStore();
  const account = { state: options.state ?? signedIn };
  const reads = { snapshot: 0 };
  const restores: Array<{
    data: BackupData;
    options: { fileName: string };
  }> = [];
  let issued = 0;

  const service = createCloudBackupService({
    account: { getState: () => account.state },
    store,
    readSnapshot: async () => {
      reads.snapshot += 1;

      return options.data;
    },
    appVersion,
    schemaVersion,
    restoreLocal: async (data, restoreOptions) => {
      restores.push({ data, options: restoreOptions });
    },
    now: () => fixedNow,
    newBackupId: () => idFor((issued += 1)),
    ...options.overrides,
  });

  return { store, account, service, reads, restores };
}
