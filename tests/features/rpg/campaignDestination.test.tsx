import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

/**
 * Follow-up 2026-10-11: a Campaign module node opens its module at the task it
 * leads to, focused (not at the top of a long page), and "Continue learning"
 * opens the lesson to continue with. A fresh learner's next lesson in a module
 * is its first one. Real routes, real programme, real route state.
 */

const p2 = programvareutviklingDefinition;

beforeEach(async () => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
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
});

describe('Campaign destinations', () => {
  it('"Continue learning" opens the lesson to continue with', async () => {
    await renderAppAtRoute('/rpg/map');

    const link = await screen.findByRole(
      'link',
      { name: 'Continue learning' },
      { timeout: 15_000 },
    );

    expect(link).toHaveAttribute('href', '/rpg/resource/s1-m01-o01');
  }, 30_000);

  it('a module node opens its module at the task it leads to', async () => {
    await renderAppAtRoute('/rpg/map');

    const node = await screen.findByTestId('rpg-module-s1-m02', undefined, {
      timeout: 15_000,
    });

    expect(within(node).getByRole('link')).toHaveAttribute(
      'href',
      '/rpg/week/s1-m02#s1-m02-o01',
    );
  }, 30_000);

  it('the module opens with that task focused', async () => {
    await renderAppAtRoute('/rpg/week/s1-m02#s1-m02-o01');

    await waitFor(
      () =>
        expect(document.activeElement).toHaveAttribute(
          'href',
          '/rpg/resource/s1-m02-o01',
        ),
      { timeout: 15_000 },
    );
    // The row says it is the next task, in text, for a learner who sees no
    // focus ring after a mouse click.
    expect(document.activeElement!.closest('li')).toHaveTextContent('Up next');
  }, 30_000);
});
