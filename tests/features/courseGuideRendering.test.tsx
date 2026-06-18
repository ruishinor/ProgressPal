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

/**
 * Rendering coverage for the local CS50 guide content (representative first
 * pass: Week 0 and Week 1). These tests confirm that guide summaries surface
 * on the course map and that the read-only guide card surfaces on a
 * lecture/problem-set detail page, that pages without guide content still
 * render, and that no forbidden learner-facing vocabulary leaks into the
 * rendered guide.
 */

const FORBIDDEN_LEARNER_TERMS: readonly string[] = [
  'course item',
  'content detail',
  'progress record',
  'evidence',
  'confidence',
  'watched range',
  'slice',
  'local derived state',
  'item context',
  'asset tracking',
  'granular asset timeline',
  'mutable surface',
  'study ledger',
  'local ledger',
  'route',
  'schema-backed',
  'ledger',
  'audit',
];

describe('course map guide summary', () => {
  it('shows the Week 0 guide summary on the course map', async () => {
    await setupSeededApp();

    await renderAppAtRoute('/course');

    const summary = await screen.findByTestId('course-unit-guide-week-0');
    expect(summary).toBeInTheDocument();
    expect(summary.textContent ?? '').toMatch(/Scratch/);
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
    expect(
      within(guideCard).getByText('How to approach this'),
    ).toBeInTheDocument();
    expect(within(guideCard).getByText('What to do')).toBeInTheDocument();
    expect(within(guideCard).getByText('Done looks like')).toBeInTheDocument();
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

  it('renders no forbidden learner-facing terms inside the guide card', async () => {
    await setupSeededApp();

    await renderAppAtRoute('/course/week-0-problem-set');

    const guideCard = await screen.findByTestId('item-guide-card');
    const text = (guideCard.textContent ?? '').toLowerCase();

    for (const term of FORBIDDEN_LEARNER_TERMS) {
      const pattern = new RegExp(
        `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      );
      expect(pattern.test(text)).toBe(false);
    }
  });
});
