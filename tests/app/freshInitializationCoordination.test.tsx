import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getDatabaseSnapshot,
  listProgrammeEnrolments,
  type DatabaseSnapshot,
} from '@/lib/db';
import { closeSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import {
  getLocalCoordinationStatus,
  localCoordinationStorageKeys,
} from '@/lib/storage';
import { bundledCourseSeed } from '@/seed';

import { cs50ProgrammeId } from '../programmes/cs50Policy';

/**
 * Epic C / C7 regression for D1 (self-staleness). The local coordinator marks
 * a tab stale after any committed write, its own included, and a stale tab may
 * not begin another write until it re-reads. Fresh application startup
 * therefore has to spend exactly one coordinated write scope for base
 * initialization plus the active programme's catalogue. A second, separate
 * lease would either be blocked until refresh (the observed ~5 s startup) or
 * show up as a second revision. The state, revision and coordination
 * assertions below are authoritative; no wall-clock timing is asserted.
 */

afterEach(() => {
  vi.restoreAllMocks();
  closeSharedDatabase();
});

function persistedRevision() {
  return Number(
    localStorage.getItem(localCoordinationStorageKeys.revision) ?? '0',
  );
}

describe('fresh application initialization under active coordination', () => {
  it('initializes the default programme in a single coordinated write without self-staleness', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const consoleWarn = vi.spyOn(console, 'warn');
    const revisionBefore = persistedRevision();

    await renderAppAtRoute('/onboarding');

    let snapshot: DatabaseSnapshot | null = null;

    await waitFor(
      async () => {
        snapshot = await getDatabaseSnapshot();
        const status = getLocalCoordinationStatus();

        expect(snapshot.appMeta?.activeProgrammeId).toBe(cs50ProgrammeId);
        expect(snapshot.courseUnits).toHaveLength(
          bundledCourseSeed.units.length,
        );
        // The tab acknowledged its own startup write and may write again.
        expect(status.stale).toBe(false);
        expect(status.canWrite).toBe(true);
      },
      { timeout: 15_000 },
    );

    const settled = snapshot as DatabaseSnapshot | null;

    // The default programme is active and enrolled, with only its catalogue.
    expect(
      (await listProgrammeEnrolments()).map((row) => row.programmeId),
    ).toEqual([cs50ProgrammeId]);
    expect(new Set(settled?.courseUnits.map((unit) => unit.courseId))).toEqual(
      new Set([bundledCourseSeed.courseId]),
    );
    expect(settled?.courseItems).toHaveLength(
      bundledCourseSeed.units.reduce(
        (total, unit) => total + unit.items.length,
        0,
      ),
    );

    // Exactly one logical write: base initialization and catalogue
    // materialization shared one lease, so the revision advanced once and the
    // tab never blocked itself on a second lease.
    expect(persistedRevision()).toBe(revisionBefore + 1);
    expect(getLocalCoordinationStatus().revision).toBe(revisionBefore + 1);

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  }, 30_000);
});
