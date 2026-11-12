import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as database from '@/lib/db';
import {
  defaultLearnerProfileValues,
  initializeDatabase,
  saveLearnerProfile,
  upsertProgress,
} from '@/lib/db';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

async function onboard() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'C1 Synthetic Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CS50 startup, route failures and completion states', () => {
  it.each(['/dashboard', '/course', '/insights'])(
    'exposes an alert when local data fails to load on %s',
    async (route) => {
      await onboard();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      // Epic C / C5: Course and Dashboard read the active catalogue through
      // getCatalogueCourseState; Insights still lists course units (OD-4).
      vi.spyOn(database, 'listCourseUnits').mockRejectedValue(
        new Error('Synthetic C1 read failure'),
      );
      vi.spyOn(database, 'getCatalogueCourseState').mockRejectedValue(
        new Error('Synthetic C1 read failure'),
      );
      await renderAppAtRoute(route);
      const main = screen.getByRole('main');
      expect(
        await within(main).findByRole('alert', {}, { timeout: 15_000 }),
      ).toBeVisible();
    },
    30_000,
  );
  it('offers Campaign instead of another quest on RPG Home when every required task is complete', async () => {
    await onboard();
    const required = bundledCourseSeed.units
      .flatMap((unit) => unit.items)
      .filter((item) => item.required);
    for (const item of required) {
      await upsertProgress({
        confidence: 3,
        itemId: item.id,
        status: 'completed',
      });
    }
    await renderAppAtRoute('/rpg');
    const campaign = await screen.findByRole(
      'link',
      { name: 'Open Campaign' },
      { timeout: 15_000 },
    );
    expect(campaign).toHaveAttribute('href', '/rpg/map');
    expect(
      campaign
        .closest('.rpg-hub__quest-panel')
        ?.querySelector('a[href^="/rpg/resource/"]'),
    ).toBeNull();
  }, 60_000);

  it('offers the "Review official CS50x resource" link for a completed RPG resource', async () => {
    await onboard();
    await upsertProgress({
      confidence: 3,
      itemId: 'week-0-lecture',
      status: 'completed',
    });
    await renderAppAtRoute('/rpg/resource/week-0-lecture');
    expect(
      await screen.findByRole(
        'link',
        { name: /official CS50x resource/ },
        { timeout: 15_000 },
      ),
    ).toHaveAttribute('href', 'https://cs50.harvard.edu/x/weeks/0/');
  }, 30_000);
});
