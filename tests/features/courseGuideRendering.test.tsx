import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { initializeDatabase, saveLearnerProfile } from '@/lib/db';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

/** Seed the course catalog plus a completed-onboarding learner profile so the
 * app renders course pages instead of redirecting to first-run onboarding. */
async function setupSeededApp() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      avatarConfig: { face: 'square', hair: 'parted', topColor: 'ocean' },
      displayName: 'Alex',
      preferredTheme: 'dark',
      reducedMotion: true,
      targetMinutesPerWeek: 360,
      targetStudyDays: ['monday', 'thursday'],
    },
    { completeOnboarding: true },
  );
}

describe('course map guide summary', () => {
  it('shows the Week 0 guide summary on the course map', async () => {
    await setupSeededApp();

    await renderAppAtRoute('/course');

    const summary = await screen.findByTestId('course-unit-guide-week-0');
    expect(summary).toBeInTheDocument();
  });

  it('does not show a guide summary for a week without guide content', async () => {
    await setupSeededApp();

    await renderAppAtRoute('/course');

    await screen.findByTestId('course-unit-week-2');
    expect(
      screen.queryByTestId('course-unit-guide-week-2'),
    ).not.toBeInTheDocument();
  });
});

describe('content detail guide card', () => {
  it('shows the guide card on a Week 0 problem-set detail page', async () => {
    await setupSeededApp();

    await renderAppAtRoute('/course/week-0-problem-set');

    const guideCard = await screen.findByTestId('item-guide-card');
    expect(guideCard).toBeInTheDocument();
  });

  it('shows the guide card on a Week 1 lecture detail page', async () => {
    await setupSeededApp();

    await renderAppAtRoute('/course/week-1-lecture');

    expect(await screen.findByTestId('item-guide-card')).toBeInTheDocument();
  });

  it('renders a detail page without guide content and omits the guide card', async () => {
    await setupSeededApp();

    await renderAppAtRoute('/course/week-2-lecture');

    // The page itself still renders its header heading.
    expect(
      await screen.findByRole('heading', { name: /Week 2/ }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('item-guide-card')).not.toBeInTheDocument();
  });
});
