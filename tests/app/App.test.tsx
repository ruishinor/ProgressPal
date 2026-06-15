import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  getDatabaseSnapshot,
  initializeDatabase,
  logMediaProgress,
  saveLearnerProfile,
  upsertProgress,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

describe('App', () => {
  it('redirects a fresh run to onboarding', async () => {
    await renderAppAtRoute('/');

    expect(
      await screen.findByRole('heading', {
        name: 'Create your local learner profile',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument();
  });

  it('renders the saved profile route after onboarding is complete', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'thursday'],
      },
      { completeOnboarding: true },
    );

    await renderAppAtRoute('/');

    expect(
      await screen.findByRole('heading', { name: 'Local profile for Alex' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Edit profile' }),
    ).toBeInTheDocument();
  });

  it('renders the course map with seeded units and saved progress rollups', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'thursday'],
      },
      { completeOnboarding: true },
    );
    await upsertProgress(
      {
        itemId: 'week-0-lecture',
        status: 'completed',
        startedAt: '2026-06-11T10:00:00.000Z',
        completedAt: '2026-06-11T12:00:00.000Z',
        confidence: 1,
        notes: 'Completed locally.',
        evidenceType: 'self_report',
        evidenceText: 'Watched and reviewed.',
      },
      { now: () => '2026-06-11T12:00:00.000Z' },
    );

    await renderAppAtRoute('/course');

    expect(
      await screen.findByRole('heading', { name: 'Course Map' }),
    ).toBeInTheDocument();
    const weekZeroUnit = await screen.findByTestId('course-unit-week-0');

    expect(
      within(weekZeroUnit).getByText('1 of 2 required items complete'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('course-item-week-0-lecture')).getByText(
        'Completed',
      ),
    ).toBeInTheDocument();
  });

  it('renders read-only long-form summaries from persisted media progress', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'thursday'],
      },
      { completeOnboarding: true },
    );
    await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        notes: 'Reached a clean stopping point.',
        startSecond: 0,
        stoppedBecause: 'reached_limit',
      },
      { now: () => '2026-06-12T12:00:00.000Z' },
    );

    await renderAppAtRoute('/course');

    const lectureRow = await screen.findByTestId('course-item-week-0-lecture');

    expect(
      within(lectureRow).getByText(
        '20 min logged · 1 of 8 slices complete · Resume at 20:00',
      ),
    ).toBeInTheDocument();
    expect(within(lectureRow).getByText('Started')).toBeInTheDocument();
  });

  it('renders the content-detail route for a long-form item with saved progress', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'thursday'],
      },
      { completeOnboarding: true },
    );
    await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        notes: 'Saved from the detail route test.',
        startSecond: 0,
        stoppedBecause: 'reached_limit',
      },
      { now: () => '2026-06-12T12:15:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-lecture');

    expect(
      await screen.findByRole('heading', { name: 'Week 0: Scratch - Lecture' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/20 min logged/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Slice timeline')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Save watched range' }),
    ).toBeInTheDocument();
  });

  it('renders the sessions route with prefilled item selection from the query string', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'thursday'],
      },
      { completeOnboarding: true },
    );

    await renderAppAtRoute('/sessions?itemId=week-0-lecture');

    expect(
      await screen.findByRole('heading', { name: 'Study sessions' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Start live session' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByLabelText('Unit')).toHaveLength(2);
      expect(screen.getAllByLabelText('Item')).toHaveLength(2);
    });

    const unitSelectors = screen.getAllByLabelText('Unit');
    const itemSelectors = screen.getAllByLabelText('Item');

    for (const unitSelector of unitSelectors) {
      expect(unitSelector).toBeDisabled();
      expect(unitSelector).toHaveValue('week-0');
    }

    for (const itemSelector of itemSelectors) {
      expect(itemSelector).toHaveValue('week-0-lecture');
    }

    expect(screen.getByText(/unit stays locked/i)).toBeInTheDocument();
  });

  it('adds the permitted study-session link to the content-detail route only', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'thursday'],
      },
      { completeOnboarding: true },
    );

    await renderAppAtRoute('/course/week-0-lecture');

    expect(
      await screen.findByRole('link', { name: 'Log a study session' }),
    ).toHaveAttribute('href', '/sessions?itemId=week-0-lecture');
  });

  it('renders the achievements route with unlocked and locked states', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'thursday'],
      },
      { completeOnboarding: true },
    );
    // An explicit save that completes one item unlocks "First Step".
    await upsertProgressAndAwardXp(
      {
        itemId: 'week-0-lecture',
        status: 'completed',
        confidence: 5,
      },
      { now: () => '2026-06-12T12:00:00.000Z' },
    );

    await renderAppAtRoute('/achievements');

    expect(
      await screen.findByRole('heading', { name: 'Achievements' }),
    ).toBeInTheDocument();

    const unlockedCard = await screen.findByTestId('achievement-first-step');
    expect(within(unlockedCard).getByText('Unlocked')).toBeInTheDocument();
    expect(
      within(unlockedCard).getByText(/Unlocked 2026-06-12/),
    ).toBeInTheDocument();

    // An achievement whose criteria are not met stays locked.
    const lockedCard = screen.getByTestId('achievement-course-complete');
    expect(within(lockedCard).getByText('Locked')).toBeInTheDocument();
  });

  it('does not create achievement unlocks merely by opening the achievements route', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'thursday'],
      },
      { completeOnboarding: true },
    );
    // Persist a completed item via the plain writer (no evaluation).
    await upsertProgress(
      {
        itemId: 'week-0-lecture',
        status: 'completed',
        confidence: 5,
      },
      { now: () => '2026-06-12T12:00:00.000Z' },
    );

    const beforeSnapshot = await getDatabaseSnapshot();

    await renderAppAtRoute('/achievements');

    expect(
      await screen.findByRole('heading', { name: 'Achievements' }),
    ).toBeInTheDocument();

    const afterSnapshot = await getDatabaseSnapshot();
    expect(afterSnapshot.achievementUnlocks).toEqual(
      beforeSnapshot.achievementUnlocks,
    );
    expect(afterSnapshot.achievementUnlocks).toHaveLength(0);
  });

  it('does not mutate progress, media, slice, resume, or xp stores just by opening the sessions route', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });

    const beforeSnapshot = await getDatabaseSnapshot();

    await renderAppAtRoute('/sessions?itemId=week-0-lecture');

    const afterSnapshot = await getDatabaseSnapshot();

    expect(afterSnapshot.progressEntries).toEqual(
      beforeSnapshot.progressEntries,
    );
    expect(afterSnapshot.mediaProgressEvents).toEqual(
      beforeSnapshot.mediaProgressEvents,
    );
    expect(afterSnapshot.contentSlices).toEqual(beforeSnapshot.contentSlices);
    expect(afterSnapshot.resumePoints).toEqual(beforeSnapshot.resumePoints);
    expect(afterSnapshot.xpTransactions).toEqual(beforeSnapshot.xpTransactions);
  });
});
