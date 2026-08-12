export type StoragePersistenceStatus =
  | 'checking'
  | 'persistent'
  | 'best-effort'
  | 'unsupported'
  | 'error';

export type StorageManagerPort = {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
};

function getBrowserStorageManager(): StorageManagerPort | null {
  if (typeof navigator === 'undefined' || navigator.storage === undefined) {
    return null;
  }

  return navigator.storage;
}

export async function inspectStoragePersistence(
  storageManager: StorageManagerPort | null = getBrowserStorageManager(),
): Promise<StoragePersistenceStatus> {
  if (storageManager?.persisted === undefined) {
    return 'unsupported';
  }

  try {
    return (await storageManager.persisted()) ? 'persistent' : 'best-effort';
  } catch {
    return 'error';
  }
}

export async function requestStoragePersistence(
  storageManager: StorageManagerPort | null = getBrowserStorageManager(),
): Promise<StoragePersistenceStatus> {
  if (storageManager?.persist === undefined) {
    return 'unsupported';
  }

  try {
    return (await storageManager.persist()) ? 'persistent' : 'best-effort';
  } catch {
    return 'error';
  }
}
