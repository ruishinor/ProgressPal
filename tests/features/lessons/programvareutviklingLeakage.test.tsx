import { screen, within } from '@testing-library/react';
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

describe('official resources are scoped to the active programme', () => {
  it('renders no CS50 official-resource link anywhere', async () => {
    const { unmount } = await renderAppAtRoute('/course');
    await screen.findByTestId('course-unit-s1-m01');
    const expectNoCs50Links = () => {
      const main = screen.getByRole('main');
      expect(
        within(main)
          .queryAllByRole('link')
          .filter((link) =>
            /cs50|harvard/i.test(link.getAttribute('href') ?? ''),
          ),
      ).toEqual([]);
    };
    expectNoCs50Links();
    unmount();
    for (const route of ['/course/s1-m01-o01', '/rpg/resource/s1-m01-o01']) {
      const view = await renderAppAtRoute(route);
      const lesson = await screen.findByRole(
        'article',
        { name: /\S/ },
        { timeout: 15_000 },
      );
      expect(lesson).toHaveAttribute('lang', 'nb');
      expectNoCs50Links();
      view.unmount();
    }
  });
});
