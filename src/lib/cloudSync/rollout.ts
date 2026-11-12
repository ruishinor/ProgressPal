export const accountSyncEnabled =
  import.meta.env.VITE_PROGRESSPAL_ACCOUNT_SYNC === 'true';

export const syncBindingKey = 'progresspal:sync:binding-v1';

export function hasAccountBinding() {
  try {
    return localStorage.getItem(syncBindingKey) !== null;
  } catch {
    return false;
  }
}
