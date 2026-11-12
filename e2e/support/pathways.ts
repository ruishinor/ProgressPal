import type { Page } from '@playwright/test';
/** Read only synthetic test state. No application API bypass for mutations. */
export async function pathwayState(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const read = <T>(name: string) =>
        new Promise<T[]>((resolve, reject) => {
          const request = db.transaction(name).objectStore(name).getAll();
          request.onsuccess = () => resolve(request.result as T[]);
          request.onerror = () => reject(request.error);
        });
      const [
        appMeta,
        evidence,
        xp,
        achievements,
        enrolments,
        progress,
        positions,
      ] = await Promise.all([
        read<{ activeProgrammeId: string }>('app_meta'),
        read<{ programmeId: string; kind: string; outcome?: string }>(
          'learner_evidence',
        ),
        read('xp_transactions'),
        read('achievement_unlocks'),
        read('programme_enrolments'),
        read('progress_entries'),
        read('lesson_positions'),
      ]);
      return {
        appMeta,
        activeProgrammeId: appMeta[0]!.activeProgrammeId,
        evidence,
        xp,
        achievements,
        enrolments,
        progress,
        positions,
      };
    } finally {
      db.close();
    }
  });
}
