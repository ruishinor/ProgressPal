import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  addStudySessionAndAwardXp,
  getDatabaseSnapshot,
  initializeDatabase,
  logMediaProgress,
  logMediaProgressAndAwardXp,
  saveLearnerProfile,
  upsertProgress,
  upsertProgressAndAwardXp,
  type SaveLearnerProfileInput,
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
      within(weekZeroUnit).getByText('1 of 2 required tasks complete'),
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
        '20 min logged · 1 of 8 segments complete · Resume at 20:00',
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
      await screen.findByRole('heading', {
        name: 'Week 0: Scratch - Lecture 0: Scratch',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/20 min logged/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Video segments')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Save session' }),
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
      expect(
        screen.getAllByLabelText('What were you working on?'),
      ).toHaveLength(2);
    });

    const unitSelectors = screen.getAllByLabelText('Unit');
    const itemSelectors = screen.getAllByLabelText('What were you working on?');

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

describe('Dashboard route', () => {
  const learnerProfileInput: SaveLearnerProfileInput = {
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
  };

  // Seed an onboarded learner plus a non-trivial explicit-save history across
  // every relevant store, so later snapshot equality is a meaningful proof
  // rather than a comparison of empty arrays.
  async function seedOnboardedLearnerWithHistory() {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(learnerProfileInput, { completeOnboarding: true });

    await logMediaProgressAndAwardXp(
      {
        assetId: 'week-0-lecture-asset',
        startSecond: 0,
        endSecond: 1200,
        energyBefore: 4,
        energyAfter: 3,
        stoppedBecause: 'reached_limit',
      },
      { now: () => '2026-06-12T10:00:00.000Z' },
    );
    await upsertProgressAndAwardXp(
      { itemId: 'week-0-pset', status: 'submitted', confidence: 4 },
      { now: () => '2026-06-12T11:00:00.000Z' },
    );
    await addStudySessionAndAwardXp(
      {
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-12T08:00:00.000Z',
        endedAt: '2026-06-12T08:45:00.000Z',
        durationMinutes: 45,
        mode: 'debugging',
      },
      { now: () => '2026-06-12T08:45:00.000Z' },
    );
  }

  it('renders the derived dashboard sections after onboarding', async () => {
    await seedOnboardedLearnerWithHistory();

    await renderAppAtRoute('/dashboard');

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();

    for (const cardTitle of [
      'Course progress',
      "What's next?",
      'XP',
      'Achievements',
      'Resume lecture',
      'Needs attention',
      'Study sessions',
      'Recent activity',
    ]) {
      expect(
        await screen.findByRole('heading', { name: cardTitle }),
      ).toBeInTheDocument();
    }
  });

  it('does not mutate any local store when the dashboard renders or reloads', async () => {
    await seedOnboardedLearnerWithHistory();

    const before = await getDatabaseSnapshot();

    expect(before.xpTransactions.length).toBeGreaterThan(0);
    expect(before.achievementUnlocks.length).toBeGreaterThan(0);
    expect(before.studySessions).toHaveLength(1);
    expect(before.mediaProgressEvents).toHaveLength(1);
    expect(before.resumePoints.length).toBeGreaterThan(0);
    expect(before.contentSlices.length).toBeGreaterThan(0);

    await renderAppAtRoute('/dashboard');
    await screen.findByRole('heading', { name: 'Course progress' });
    const afterRender = await getDatabaseSnapshot();

    // Simulate a reload: unmount the mounted app, then mount it again at the
    // same route. Allowed bootstrap initialization is idempotent for an
    // already-initialized database, so store contents must be byte-for-byte
    // identical across both the first render and the reload.
    cleanup();
    await renderAppAtRoute('/dashboard');
    await screen.findByRole('heading', { name: 'Course progress' });
    const afterReload = await getDatabaseSnapshot();

    const trackedStores = [
      'xpTransactions',
      'achievementUnlocks',
      'progressEntries',
      'studySessions',
      'mediaProgressEvents',
      'contentAssets',
      'contentSlices',
      'resumePoints',
      'learnerProfile',
      'appMeta',
      'courseUnits',
      'courseItems',
    ] as const;

    for (const store of trackedStores) {
      // Full serialized content comparison, not just counts: a
      // delete-and-reinsert mutation would change updatedAt and fail here.
      expect(afterRender[store]).toEqual(before[store]);
      expect(afterReload[store]).toEqual(before[store]);
    }

    // Explicit guarantees: dashboard reads award no XP and unlock no
    // achievements on either the first render or the reload.
    expect(afterRender.xpTransactions).toEqual(before.xpTransactions);
    expect(afterRender.achievementUnlocks).toEqual(before.achievementUnlocks);
    expect(afterReload.xpTransactions).toEqual(before.xpTransactions);
    expect(afterReload.achievementUnlocks).toEqual(before.achievementUnlocks);
  });
});

describe('Insights route', () => {
  const learnerProfileInput: SaveLearnerProfileInput = {
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
  };

  // Seed an onboarded learner plus a non-trivial explicit-save history across
  // the immutable ledgers Insights reads, so snapshot equality is a meaningful
  // proof rather than a comparison of empty arrays.
  async function seedOnboardedLearnerWithHistory() {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(learnerProfileInput, { completeOnboarding: true });

    await logMediaProgressAndAwardXp(
      {
        assetId: 'week-0-lecture-asset',
        startSecond: 0,
        endSecond: 1200,
        energyBefore: 4,
        energyAfter: 3,
        stoppedBecause: 'reached_limit',
      },
      { now: () => '2026-06-12T10:00:00.000Z' },
    );
    await upsertProgressAndAwardXp(
      { itemId: 'week-0-pset', status: 'submitted', confidence: 4 },
      { now: () => '2026-06-12T11:00:00.000Z' },
    );
    await addStudySessionAndAwardXp(
      {
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-12T08:00:00.000Z',
        endedAt: '2026-06-12T08:45:00.000Z',
        durationMinutes: 45,
        mode: 'debugging',
      },
      { now: () => '2026-06-12T08:45:00.000Z' },
    );
  }

  it('renders the derived insights sections after onboarding', async () => {
    await seedOnboardedLearnerWithHistory();

    await renderAppAtRoute('/insights');

    expect(
      await screen.findByRole('heading', { name: 'Insights' }),
    ).toBeInTheDocument();

    for (const cardTitle of [
      'Course progress',
      'Effort over time',
      'XP over time',
      'Study mode breakdown',
      'Active days',
      'Recorded completion awards',
      'Achievement timeline',
    ]) {
      expect(
        await screen.findByRole('heading', { name: cardTitle }),
      ).toBeInTheDocument();
    }
  });

  it('does not mutate any local store when insights renders or reloads', async () => {
    await seedOnboardedLearnerWithHistory();

    const before = await getDatabaseSnapshot();

    expect(before.xpTransactions.length).toBeGreaterThan(0);
    expect(before.achievementUnlocks.length).toBeGreaterThan(0);
    expect(before.studySessions).toHaveLength(1);
    expect(before.mediaProgressEvents).toHaveLength(1);

    await renderAppAtRoute('/insights');
    await screen.findByRole('heading', { name: 'Insights' });
    await screen.findByRole('heading', { name: 'Effort over time' });
    const afterRender = await getDatabaseSnapshot();

    // Simulate a reload: unmount, then mount again at the same route. Allowed
    // bootstrap initialization is idempotent for an already-initialized
    // database, so store contents must be byte-for-byte identical.
    cleanup();
    await renderAppAtRoute('/insights');
    await screen.findByRole('heading', { name: 'Insights' });
    await screen.findByRole('heading', { name: 'Effort over time' });
    const afterReload = await getDatabaseSnapshot();

    // Full-snapshot equality across EVERY store getDatabaseSnapshot returns
    // (achievementDefinitions, achievementUnlocks, appMeta, backups,
    // contentAssets, contentSlices, courseItems, courseUnits, learnerProfile,
    // mediaProgressEvents, progressEntries, resumePoints, studySessions,
    // xpTransactions), before/after first render and after reload. A
    // delete-and-reinsert would change updatedAt and fail here.
    expect(afterRender).toEqual(before);
    expect(afterReload).toEqual(before);
  });
});

describe('Settings route', () => {
  const learnerProfileInput: SaveLearnerProfileInput = {
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
  };

  async function seedOnboardedLearnerWithHistory() {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(learnerProfileInput, { completeOnboarding: true });

    await addStudySessionAndAwardXp(
      {
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-12T08:00:00.000Z',
        endedAt: '2026-06-12T08:45:00.000Z',
        durationMinutes: 45,
        mode: 'debugging',
      },
      { now: () => '2026-06-12T08:45:00.000Z' },
    );
    await upsertProgressAndAwardXp(
      { itemId: 'week-0-pset', status: 'submitted', confidence: 4 },
      { now: () => '2026-06-12T11:00:00.000Z' },
    );
  }

  it('renders the data-control surface with reset gated by a confirmation phrase', async () => {
    await seedOnboardedLearnerWithHistory();

    await renderAppAtRoute('/settings');

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();

    for (const cardTitle of [
      'Export a backup',
      'Import a backup',
      'Reset local data',
    ]) {
      expect(
        screen.getByRole('heading', { name: cardTitle }),
      ).toBeInTheDocument();
    }

    expect(screen.getByLabelText('Backup file')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reset all local data' }),
    ).toBeDisabled();
  });

  it('does not mutate any local store when settings renders or reloads', async () => {
    await seedOnboardedLearnerWithHistory();

    const before = await getDatabaseSnapshot();

    expect(before.xpTransactions.length).toBeGreaterThan(0);
    expect(before.studySessions).toHaveLength(1);
    expect(before.backups).toHaveLength(0);

    await renderAppAtRoute('/settings');
    await screen.findByRole('heading', { name: 'Settings' });
    const afterRender = await getDatabaseSnapshot();

    cleanup();
    await renderAppAtRoute('/settings');
    await screen.findByRole('heading', { name: 'Settings' });
    const afterReload = await getDatabaseSnapshot();

    // Opening or reloading /settings is a pure read: export/import/reset mutate
    // only on explicit action, so every store stays byte-for-byte identical.
    expect(afterRender).toEqual(before);
    expect(afterReload).toEqual(before);
  });
});
