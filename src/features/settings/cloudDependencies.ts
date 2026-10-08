import type { BackupData, ParseBackupOptions } from '@/lib/backup';
import type { CloudAccountPort, CloudBackupStore } from '@/lib/cloud';

/**
 * What the Settings cloud card composes its backup service from. Production
 * passes nothing and gets the shared account, the shared store and the live
 * local database; a test passes fakes. `restoreLocal` is the raw existing
 * restore: the card itself wraps it in the app's local-mutation runner so app
 * state refreshes exactly as after a file import.
 */
export interface CloudSettingsDependencies {
  account: CloudAccountPort;
  store: CloudBackupStore;
  /** Reads the learner database for the export. Read only. */
  readSnapshot: () => Promise<BackupData>;
  migrationContext: ParseBackupOptions['migrationContext'];
  restoreLocal: (
    data: BackupData,
    options: { fileName: string },
  ) => Promise<unknown>;
}
