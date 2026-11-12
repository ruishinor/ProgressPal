export const maxSyncPayloadBytes = 4 * 1024 * 1024;

export type SyncHead = { revision: number; hash: string | null };

export type SyncFailureCode =
  | 'authentication'
  | 'unavailable'
  | 'rate-limited'
  | 'incompatible'
  | 'too-large'
  | 'stale';

export class SyncFailure extends Error {
  constructor(readonly code: SyncFailureCode) {
    super(code);
    this.name = 'SyncFailure';
  }
}

export interface CloudSyncStore {
  head(userId: string, signal: AbortSignal): Promise<SyncHead>;
  download(
    userId: string,
    head: SyncHead,
    signal: AbortSignal,
  ): Promise<string>;
  upload(
    userId: string,
    revision: number,
    payload: { text: string; hash: string },
    signal: AbortSignal,
  ): Promise<void>;
}
