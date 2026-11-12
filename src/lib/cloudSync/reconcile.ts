import type { BackupData } from '@/lib/backup';
import { SyncFailure, type CloudSyncStore, type SyncHead } from '@/lib/cloud';
import { sha256Hex } from '@/lib/validation';

import { readSyncBinding, writeSyncBinding, type SyncBinding } from './binding';
import {
  checkSyncUpload,
  decodeSyncSnapshot,
  hasAccountLearning,
  snapshotText,
  type SyncCatalogue,
} from './snapshot';

export type SyncConflict = {
  local: BackupData;
  localText: string;
  remote: BackupData | null;
  head: SyncHead;
};

export type SyncResult =
  | { status: 'ready' | 'ready-to-learn' | 'pending' | 'tab-open' }
  | { status: 'different-account' }
  | { status: 'unowned'; local: BackupData }
  | { status: 'conflict'; conflict: SyncConflict };

type Options = {
  userId: string;
  isCurrentAccount: () => boolean;
  signal: AbortSignal;
  store: CloudSyncStore;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  catalogue: SyncCatalogue;
  readLocal: () => Promise<BackupData>;
  mayReplaceLocal?: () => boolean;
  onTransfer?: () => void;
  replaceLocal: (
    snapshot: BackupData,
    assertCurrent: (snapshot: BackupData) => void,
    signal: AbortSignal,
  ) => Promise<void>;
};

export type SyncResolution = {
  conflict: SyncConflict;
  choice: 'local' | 'remote';
};

export async function reconcileLearning(
  options: Options,
  resolution?: SyncResolution,
): Promise<SyncResult> {
  const { userId, signal, store, storage, catalogue } = options;
  const assertAccount = () => {
    signal.throwIfAborted();
    if (!options.isCurrentAccount()) throw new SyncFailure('authentication');
  };
  const save = (binding: SyncBinding) => {
    assertAccount();
    writeSyncBinding(storage, binding);
    return binding;
  };
  const confirm = (head: SyncHead, hash: string) =>
    save({ userId, revision: head.revision, hash, initialized: true });

  assertAccount();
  let binding = readSyncBinding(storage);
  if (binding !== null && binding.userId !== userId)
    return { status: 'different-account' };
  const local = await options.readLocal();
  assertAccount();
  const hasData = hasAccountLearning(local, catalogue.context.programmeId);
  if (binding === null && hasData) return { status: 'unowned', local };

  const localText = snapshotText(local);
  const localHash = await sha256Hex(localText);
  assertAccount();
  const head = await store.head(userId, signal);
  assertAccount();

  async function settled(hash: string, empty = false): Promise<SyncResult> {
    const after = await options.readLocal();
    const afterHash = await sha256Hex(snapshotText(after));
    assertAccount();
    return {
      status:
        afterHash === hash ? (empty ? 'ready-to-learn' : 'ready') : 'pending',
    };
  }

  async function download() {
    if (head.hash === null) return null;
    assertAccount();
    options.onTransfer?.();
    const text = await store.download(userId, head, signal);
    assertAccount();
    return decodeSyncSnapshot(text, head.hash, catalogue);
  }

  async function pull(remote: BackupData) {
    assertAccount();
    // Claim a fresh browser before applying the first remote copy. A crash
    // between the IndexedDB commit and the watermark leaves an owned browser
    // whose identical hash can be confirmed on the next run.
    await options.replaceLocal(
      remote,
      (current) => {
        assertAccount();
        const currentBinding = readSyncBinding(storage);
        if (
          (currentBinding?.userId ?? null) !== (binding?.userId ?? null) ||
          snapshotText(current) !== localText
        ) {
          throw new SyncFailure('stale');
        }
        if (binding === null) {
          binding = save({
            userId,
            revision: 0,
            hash: localHash,
            initialized: false,
          });
        }
      },
      signal,
    );
    const hash = head.hash!;
    confirm(head, hash);
    return settled(hash);
  }

  async function push() {
    checkSyncUpload(local, localText, catalogue);
    assertAccount();
    options.onTransfer?.();
    // Write the exact candidate hash before sending bytes. A lost response
    // remains reconcilable even if the learner edits again or reloads.
    save({
      ...binding!,
      pending: { expectedRevision: head.revision, hash: localHash },
    });
    try {
      await store.upload(
        userId,
        head.revision,
        { text: localText, hash: localHash },
        signal,
      );
    } catch (error) {
      assertAccount();
      if (!(error instanceof SyncFailure) || error.code !== 'incompatible')
        throw error;
      // A malformed or partial GraphQL reply can follow a committed write.
      // Give the authoritative head one opportunity to confirm it.
      const observed = await store.head(userId, signal);
      if (
        observed.revision !== head.revision + 1 ||
        observed.hash !== localHash
      )
        throw error;
    }
    confirm({ revision: head.revision + 1, hash: localHash }, localHash);
    return settled(localHash);
  }

  if (resolution !== undefined) {
    const previous = resolution.conflict;
    if (
      localText !== previous.localText ||
      head.revision !== previous.head.revision ||
      head.hash !== previous.head.hash ||
      binding === null
    ) {
      throw new SyncFailure('stale');
    }
    if (resolution.choice === 'local') return push();
    if (previous.remote === null) throw new SyncFailure('incompatible');
    return pull(previous.remote);
  }

  if (head.hash === localHash) {
    confirm(head, localHash);
    return settled(localHash);
  }

  if (binding === null) {
    if (head.hash !== null && options.mayReplaceLocal?.() === false)
      return { status: 'tab-open' };
    const remote = await download();
    if (remote !== null) return pull(remote);
    const current = await options.readLocal();
    if (
      snapshotText(current) !== localText ||
      readSyncBinding(storage) !== null
    ) {
      throw new SyncFailure('stale');
    }
    confirm(head, localHash);
    return settled(localHash, true);
  }

  // Acknowledgment may have been lost after the CAS committed. Accept only
  // the exact pending hash at the exact next revision, then compare newer
  // local edits against that newly established baseline.
  if (
    binding.pending !== undefined &&
    head.revision === binding.pending.expectedRevision + 1 &&
    head.hash === binding.pending.hash
  ) {
    binding = confirm(head, binding.pending.hash);
  }

  const remoteIsBaseline =
    head.revision === binding.revision &&
    (head.hash === binding.hash || head.revision === 0);
  if (
    remoteIsBaseline &&
    (localHash === binding.hash || (!hasData && head.revision === 0))
  ) {
    confirm(head, localHash);
    return settled(localHash, head.revision === 0);
  }
  if (remoteIsBaseline && hasData) return push();
  if (
    head.revision > 0 &&
    (!hasData ||
      (localHash === binding.hash && head.revision > binding.revision))
  ) {
    if (options.mayReplaceLocal?.() === false) return { status: 'tab-open' };
    const remote = await download();
    if (remote !== null) return pull(remote);
  }

  return {
    status: 'conflict',
    conflict: { local, localText, remote: await download(), head },
  };
}
