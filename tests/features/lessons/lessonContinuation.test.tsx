import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  getLessonPosition,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { localCoordinationStorageKeys } from '@/lib/storage';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import type { FakeLockManager } from '../../lib/localDataCoordinationFakes';
import { p2Modules } from '../../programmes/p2Content';

/**
 * Learner feedback 2026-10-06: `Fortsett` after a section used to write the
 * next bookmark and nothing else, so on a fully expanded page it looked
 * inert. In a writable tab it still writes the bookmark and now moves focus
 * to the next section (a heading, or the first block when practice continues
 * without one). The product implementation also requests an instant browser
 * scroll; jsdom has no layout/scroll model, so this test owns the observable
 * contract here: durable position + focus target.
 */

const p2 = programvareutviklingDefinition;

beforeEach(() => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
});

afterEach(() => {
  localStorage.removeItem(localCoordinationStorageKeys.message);
  localStorage.removeItem(localCoordinationStorageKeys.revision);
});

async function onboard() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'Kari',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
  await enrolAndSwitchActiveProgramme(p2.programmeId, { seed: p2.catalogue });
}

async function openLesson(itemId: string) {
  await renderAppAtRoute(`/course/${itemId}`);
  return screen.findByRole('article', { name: /./ }, { timeout: 15_000 });
}

/** The mission step index a focus target carries in its id. */
const stepNumber = (element: Element | null) =>
  Number(element?.id.match(/-(?:step|group)-(\d+)$/)?.[1] ?? Number.NaN);

describe('Fortsett moves the learner to the next section', () => {
  it('saves the bookmark and focuses the first block of the practice that follows', async () => {
    await onboard();
    const lesson = await openLesson('s1-m01-o02');
    const button = within(lesson).getAllByRole('button', {
      name: 'Fortsett',
    })[0]!;

    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(stepNumber(document.activeElement)).toBe(6));
    const target = document.activeElement!;

    expect(target).toHaveAttribute('tabindex', '-1');
    expect(lesson).toContainElement(target as HTMLElement);
    await waitFor(async () =>
      expect(await getLessonPosition('s1-m01-o02')).toMatchObject({
        stepIndex: 6,
        unitId: 's1-m01-p02',
      }),
    );
  });

  it('focuses the heading of the next lesson when one follows', async () => {
    await onboard();
    const lesson = await openLesson('s1-m01-o04');
    const l05 = (
      p2Modules['S1-M01'] as unknown as {
        units: Array<{ unit_id: string; title_nb: string }>;
      }
    ).units.find((unit) => unit.unit_id === 'S1-M01-L05')!;
    const heading = within(lesson).getByRole('heading', {
      level: 2,
      name: l05.title_nb,
    });
    const before = heading.closest('section')!.previousElementSibling!;
    const button = within(before as HTMLElement).getByRole('button', {
      name: 'Fortsett',
    });

    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(document.activeElement).toBe(heading));
    await waitFor(async () =>
      expect(await getLessonPosition('s1-m01-o04')).toMatchObject({
        stepIndex: stepNumber(heading),
        unitId: 's1-m01-l05',
      }),
    );
  });

  it('keeps the keyboard path: the control is a native button in the tab order', async () => {
    await onboard();
    const lesson = await openLesson('s1-m01-o02');
    const button = within(lesson).getAllByRole('button', {
      name: 'Fortsett',
    })[0]!;

    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });

  it('keeps Fortsett disabled in a read-only tab and writes no bookmark', async () => {
    await onboard();
    const locks = navigator.locks as unknown as FakeLockManager;
    const releasePresence = await locks.hold(
      localCoordinationStorageKeys.presenceLock,
      'shared',
    );
    const releaseWriter = await locks.hold(
      localCoordinationStorageKeys.writerLock,
      'exclusive',
    );

    try {
      const lesson = await openLesson('s1-m01-o02');
      const button = within(lesson).getAllByRole('button', {
        name: 'Fortsett',
      })[0]!;

      await waitFor(() => expect(button).toBeDisabled());
      expect(await getLessonPosition('s1-m01-o02')).toBeNull();
    } finally {
      await releaseWriter();
      await releasePresence();
    }
  });
});
