import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        name: 'Start tracking CS50 locally',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument();
  });

  it('shows the quick-start first run with local-first copy and actions', async () => {
    await renderAppAtRoute('/');

    expect(
      await screen.findByRole('heading', {
        name: 'Start tracking CS50 locally',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Everything stays in this browser. No account, no cloud sync, no analytics. You can export, import, or reset it later.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Use default learner' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Customize first' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Already have a backup?' }),
    ).toBeInTheDocument();
  });

  it('creates a default local profile and opens the dashboard from quick start', async () => {
    const user = userEvent.setup();
    await renderAppAtRoute('/');

    await user.click(
      await screen.findByRole('button', { name: 'Use default learner' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();

    const snapshot = await getDatabaseSnapshot();

    expect(snapshot.appMeta?.onboardingCompletedAt).toEqual(expect.any(String));
    expect(snapshot.learnerProfile?.displayName).toBe('Learner');
    expect(snapshot.learnerProfile?.targetMinutesPerWeek).toBe(300);
  });

  it('reveals the detailed form from customize first and saves a custom profile', async () => {
    const user = userEvent.setup();
    await renderAppAtRoute('/');

    await user.click(
      await screen.findByRole('button', { name: 'Customize first' }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'Create your local learner profile',
      }),
    ).toBeInTheDocument();

    const displayName = screen.getByLabelText('Display name');

    await user.clear(displayName);
    await user.type(displayName, 'Casey');
    await user.click(
      screen.getByRole('button', { name: 'Save and open dashboard' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();

    const snapshot = await getDatabaseSnapshot();

    expect(snapshot.learnerProfile?.displayName).toBe('Casey');
  });

  it('does not render forbidden learner-facing terms during onboarding', async () => {
    const user = userEvent.setup();
    await renderAppAtRoute('/');

    await screen.findByRole('heading', {
      name: 'Start tracking CS50 locally',
    });
    await user.click(screen.getByRole('button', { name: 'Customize first' }));
    await screen.findByRole('heading', {
      name: 'Create your local learner profile',
    });

    const body = document.body.textContent ?? '';

    expect(body).not.toMatch(/\bledger\b/i);
    expect(body).not.toMatch(/\baudit\b/i);
    expect(body).not.toMatch(/\bschema-backed\b/i);
    expect(body).not.toMatch(/\bevidence\b/i);
    expect(body).not.toMatch(/\bConfidence\b/);
    expect(body).not.toMatch(/\bwatched range\b/i);
    expect(body).not.toMatch(/\bProgress record\b/i);
    expect(body).not.toMatch(/\bCourse item\b/i);
    expect(body).not.toMatch(/\bContent detail\b/i);
    expect(body).not.toMatch(/\bmutable surface\b/i);
    expect(body).not.toMatch(/\bgranular asset timeline\b/i);
    expect(body).not.toMatch(/\bdemo\b/i);
  });

  it('exposes the primary quick-start action to keyboard users', async () => {
    const user = userEvent.setup();
    await renderAppAtRoute('/');

    await screen.findByRole('heading', {
      name: 'Start tracking CS50 locally',
    });

    const useDefault = screen.getByRole('button', {
      name: 'Use default learner',
    });

    useDefault.focus();
    expect(useDefault).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
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

  // UX-02: Lecture page learner-first tests

  it('lecture page renders Log Lecture heading and primary form labels', async () => {
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

    await renderAppAtRoute('/course/week-0-lecture');

    expect(
      await screen.findByRole('heading', { name: 'Log Lecture' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Started at')).toBeInTheDocument();
    expect(screen.getByLabelText('Stopped at')).toBeInTheDocument();
    expect(screen.getByLabelText('Session Notes')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save session' }),
    ).toBeInTheDocument();
  });

  it('lecture page does not render forbidden learner-facing terms', async () => {
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

    await renderAppAtRoute('/course/week-0-lecture');
    await screen.findByRole('heading', { name: 'Log Lecture' });

    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/\bwatched range\b/i);
    expect(body).not.toMatch(/\bslice timeline\b/i);
    expect(body).not.toMatch(/\bUse next slice\b/i);
    expect(body).not.toMatch(/\bProgress record\b/i);
    expect(body).not.toMatch(/\bCourse item\b/i);
    expect(body).not.toMatch(/\bContent detail\b/i);
    expect(body).not.toMatch(/\bHow sure are you\b/i);
    expect(body).not.toMatch(/\bSubmission note\b/i);
  });

  it('saving a lecture session shows inline confirmation with minutes and XP', async () => {
    const user = userEvent.setup();

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

    await renderAppAtRoute('/course/week-0-lecture');
    await screen.findByRole('button', { name: 'Save session' });

    const startInput = screen.getByLabelText('Started at');
    const endInput = screen.getByLabelText('Stopped at');

    fireEvent.change(startInput, { target: { value: '0:00' } });
    fireEvent.change(endInput, { target: { value: '20:00' } });

    await user.click(screen.getByRole('button', { name: 'Save session' }));

    expect(
      await screen.findByRole('heading', { name: 'Session saved' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/20 min added/i)).toBeInTheDocument();
  });

  it('previous notes from this lecture appear when a prior session with notes exists', async () => {
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
    await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        notes: 'Recursion finally clicked here.',
        startSecond: 0,
        stoppedBecause: 'reached_limit',
      },
      { now: () => '2026-06-18T09:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-lecture');

    expect(
      await screen.findByRole('heading', {
        name: 'Previous notes from this lecture',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Recursion finally clicked here.'),
    ).toBeInTheDocument();
  });

  it('lecture page shows video segments card but hides segment list by default', async () => {
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
    await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        startSecond: 0,
        stoppedBecause: 'reached_limit',
      },
      { now: () => '2026-06-18T10:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-lecture');

    expect(await screen.findByText('Video segments')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show all segments' }),
    ).toBeInTheDocument();
    // Segment detail list is not rendered until the toggle is clicked
    expect(
      document.querySelector('.slice-detail-list'),
    ).not.toBeInTheDocument();
  });

  it('keyboard user can reach the Log Lecture form fields and the segments toggle', async () => {
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
    await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 600,
        energyAfter: 3,
        energyBefore: 3,
        startSecond: 0,
        stoppedBecause: 'reached_limit',
      },
      { now: () => '2026-06-18T11:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-lecture');
    await screen.findByRole('button', { name: 'Save session' });

    // All interactive form elements are in the document and enabled
    expect(screen.getByLabelText('Started at')).not.toBeDisabled();
    expect(screen.getByLabelText('Stopped at')).not.toBeDisabled();
    expect(screen.getByLabelText('Session Notes')).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save session' }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Show all segments' }),
    ).not.toBeDisabled();
  });

  // UX-03: Problem set page learner-first tests

  it('problem set page renders Problem Set Progress heading and primary form labels', async () => {
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

    await renderAppAtRoute('/course/week-0-problem-set');

    expect(
      await screen.findByRole('heading', { name: 'Problem Set Progress' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Progress')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save progress' }),
    ).toBeInTheDocument();
  });

  it('problem set page does not render forbidden learner-facing terms', async () => {
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

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Problem Set Progress' });

    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/\bEvidence\b/);
    expect(body).not.toMatch(/\bProgress record\b/i);
    expect(body).not.toMatch(/\bCourse item\b/i);
    expect(body).not.toMatch(/\bContent detail\b/i);
  });

  it('problem set page hides submission field when status is started', async () => {
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

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Problem Set Progress' });

    // Default status is Started; submission field must not appear
    expect(
      screen.queryByLabelText('Where did you submit it?'),
    ).not.toBeInTheDocument();
  });

  it('problem set page shows submission field when saved status is submitted', async () => {
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
    await upsertProgress(
      {
        itemId: 'week-0-problem-set',
        status: 'submitted',
        confidence: 3,
      },
      { now: () => '2026-06-18T10:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Problem Set Progress' });

    // Status is submitted; submission field must appear
    expect(
      screen.getByLabelText('Where did you submit it?'),
    ).toBeInTheDocument();
  });

  it('saving problem set progress shows inline Progress saved confirmation with What is next', async () => {
    const user = userEvent.setup();

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

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('button', { name: 'Save progress' });

    await user.click(screen.getByRole('button', { name: 'Save progress' }));

    expect(
      await screen.findByRole('heading', { name: 'Progress saved' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/What'?s next/i)).toBeInTheDocument();
    // problem_set_started milestone awards +20 XP on first save
    expect(screen.getAllByText(/\+20 XP/).length).toBeGreaterThan(0);
  });

  it('problem set saved progress card shows saved note above the editing form', async () => {
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
    await upsertProgress(
      {
        itemId: 'week-0-problem-set',
        status: 'started',
        confidence: 2,
        notes: 'Got stuck on the sprite animation.',
      },
      { now: () => '2026-06-18T12:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-problem-set');

    const savedProgressHeading = await screen.findByRole('heading', {
      name: 'Saved progress',
    });
    expect(savedProgressHeading).toBeInTheDocument();
    const savedProgressCard = savedProgressHeading.closest('section');
    expect(
      within(savedProgressCard!).getByText(
        'Got stuck on the sprite animation.',
      ),
    ).toBeInTheDocument();
  });

  it('problem set saved progress card shows current status alongside saved note', async () => {
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
    await upsertProgress(
      {
        itemId: 'week-0-problem-set',
        status: 'started',
        confidence: 3,
        notes: 'Finished scratch task 1.',
      },
      { now: () => '2026-06-18T12:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-problem-set');

    const savedProgressHeading = await screen.findByRole('heading', {
      name: 'Saved progress',
    });
    const savedProgressCard = savedProgressHeading.closest('section');
    expect(within(savedProgressCard!).getByText('Started')).toBeInTheDocument();
    expect(
      within(savedProgressCard!).getByText('Finished scratch task 1.'),
    ).toBeInTheDocument();
  });

  it('saving a correction to existing problem set progress shows Progress updated', async () => {
    const user = userEvent.setup();
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
    await upsertProgressAndAwardXp(
      {
        itemId: 'week-0-problem-set',
        status: 'started',
        confidence: 2,
        notes: 'Initial save.',
      },
      { now: () => '2026-06-18T11:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('button', { name: 'Save progress' });

    await user.click(screen.getByRole('button', { name: 'Save progress' }));

    expect(
      await screen.findByRole('heading', { name: 'Progress updated' }),
    ).toBeInTheDocument();
  });

  it('saving problem set progress a second time does not add duplicate XP or achievements', async () => {
    const user = userEvent.setup();
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
    await upsertProgressAndAwardXp(
      {
        itemId: 'week-0-problem-set',
        status: 'started',
        confidence: 2,
        notes: 'First save.',
      },
      { now: () => '2026-06-18T11:00:00.000Z' },
    );
    const snapshotAfterFirst = await getDatabaseSnapshot();

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('button', { name: 'Save progress' });

    await user.click(screen.getByRole('button', { name: 'Save progress' }));
    await screen.findByRole('heading', { name: 'Progress updated' });

    const snapshotAfterSecond = await getDatabaseSnapshot();
    expect(snapshotAfterSecond.xpTransactions).toEqual(
      snapshotAfterFirst.xpTransactions,
    );
    expect(snapshotAfterSecond.achievementUnlocks).toEqual(
      snapshotAfterFirst.achievementUnlocks,
    );
  });

  it('passive render of problem set detail page does not mutate any store', async () => {
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
    await upsertProgressAndAwardXp(
      {
        itemId: 'week-0-problem-set',
        status: 'started',
        confidence: 2,
        notes: 'Setup note.',
      },
      { now: () => '2026-06-18T11:00:00.000Z' },
    );
    const before = await getDatabaseSnapshot();

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Saved progress' });
    const afterRender = await getDatabaseSnapshot();

    // Simulate a reload: unmount then remount at the same route.
    // Store contents must be byte-for-byte identical on both the first render
    // and the reload — a delete-and-reinsert mutation would change updatedAt
    // and fail here.
    cleanup();
    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Saved progress' });
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
      expect(afterRender[store]).toEqual(before[store]);
      expect(afterReload[store]).toEqual(before[store]);
    }
  });

  it('editing a correction to a submitted problem set updates the record without duplicating XP or achievements', async () => {
    const user = userEvent.setup();
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
    await upsertProgressAndAwardXp(
      {
        itemId: 'week-0-problem-set',
        status: 'submitted',
        confidence: 3,
        notes: 'Submitted first attempt.',
        evidenceText: 'submit50 run.',
      },
      { now: () => '2026-06-18T11:00:00.000Z' },
    );
    const snapshotBeforeEdit = await getDatabaseSnapshot();

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Saved progress' });

    // The page-load uses startTransition, so the heading appears after the
    // first render commit while the form-initialization useEffect fires in a
    // second pass. We must wait for that second pass before asserting or
    // changing form values, otherwise the notes field still shows '' (its
    // initial controlled-component default). waitFor retries until the
    // form pre-fill render completes.
    //
    // fireEvent.change sets event.target.value to the full replacement string,
    // so the post-assertion proving the new value ≠ original + new is
    // sufficient evidence of replacement, not append.
    const notesField = screen.getByLabelText('Notes');
    await waitFor(() =>
      expect(notesField).toHaveValue('Submitted first attempt.'),
    ); // confirms seed and form pre-fill completed
    fireEvent.change(notesField, { target: { value: 'Corrected attempt.' } });
    expect(notesField).toHaveValue('Corrected attempt.'); // proves replacement, not append

    const submissionField = screen.getByLabelText('Where did you submit it?');
    await waitFor(() => expect(submissionField).toHaveValue('submit50 run.')); // confirms seed and form pre-fill completed
    fireEvent.change(submissionField, { target: { value: 'submit50 final.' } });
    expect(submissionField).toHaveValue('submit50 final.'); // proves replacement, not append

    await user.click(screen.getByRole('button', { name: 'Save progress' }));

    expect(
      await screen.findByRole('heading', { name: 'Progress updated' }),
    ).toBeInTheDocument();

    const snapshotAfterEdit = await getDatabaseSnapshot();

    // Record was updated in-place — not duplicated
    expect(snapshotAfterEdit.progressEntries).toHaveLength(
      snapshotBeforeEdit.progressEntries.length,
    );
    const correctedEntry = snapshotAfterEdit.progressEntries.find(
      (e) => e.itemId === 'week-0-problem-set',
    );
    expect(correctedEntry?.notes).toBe('Corrected attempt.');
    expect(correctedEntry?.evidenceText).toBe('submit50 final.');

    // No new XP or achievements from a correction to the same status
    expect(snapshotAfterEdit.xpTransactions).toEqual(
      snapshotBeforeEdit.xpTransactions,
    );
    expect(snapshotAfterEdit.achievementUnlocks).toEqual(
      snapshotBeforeEdit.achievementUnlocks,
    );
  });

  it('keyboard user can reach progress selector, notes, submission field, save button, and official link', async () => {
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
    // Pre-seed submitted so the Submission card is visible for keyboard access check
    await upsertProgress(
      {
        itemId: 'week-0-problem-set',
        status: 'submitted',
        confidence: 3,
      },
      { now: () => '2026-06-18T10:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Problem Set Progress' });

    expect(screen.getByLabelText('Progress')).not.toBeDisabled();
    expect(screen.getByLabelText('Notes')).not.toBeDisabled();
    expect(
      screen.getByLabelText('Where did you submit it?'),
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save progress' }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole('link', { name: 'Problem Set 0 on CS50.harvard.edu' }),
    ).toBeInTheDocument();
  });

  it('problem set page shows submission card when saved status is accepted', async () => {
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
    await upsertProgress(
      {
        itemId: 'week-0-problem-set',
        status: 'accepted',
        confidence: 4,
      },
      { now: () => '2026-06-18T10:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Problem Set Progress' });

    expect(
      screen.getByRole('heading', { name: 'Submission' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Where did you submit it?'),
    ).toBeInTheDocument();
  });

  it('problem set submission card shows when live selector changes to submitted or accepted', async () => {
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
    // Pre-seed completed so status options include submitted/accepted
    await upsertProgress(
      {
        itemId: 'week-0-problem-set',
        status: 'completed',
        confidence: 3,
      },
      { now: () => '2026-06-18T10:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Problem Set Progress' });

    // Initial status 'completed' — Submission card is hidden
    expect(
      screen.queryByRole('heading', { name: 'Submission' }),
    ).not.toBeInTheDocument();

    // Change live selector to 'submitted' — Submission card appears
    fireEvent.change(screen.getByLabelText('Progress'), {
      target: { value: 'submitted' },
    });
    // Use findByRole so React has time to flush the state update
    expect(
      await screen.findByRole('heading', { name: 'Submission' }),
    ).toBeInTheDocument();

    // Change live selector to 'accepted' — Submission card remains visible
    fireEvent.change(screen.getByLabelText('Progress'), {
      target: { value: 'accepted' },
    });
    expect(
      await screen.findByRole('heading', { name: 'Submission' }),
    ).toBeInTheDocument();
  });

  it('problem set submission card hides when live selector changes away from submitted', async () => {
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
    await upsertProgress(
      {
        itemId: 'week-0-problem-set',
        status: 'completed',
        confidence: 3,
      },
      { now: () => '2026-06-18T10:00:00.000Z' },
    );

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('heading', { name: 'Problem Set Progress' });

    // Change to submitted — await the card appearing
    fireEvent.change(screen.getByLabelText('Progress'), {
      target: { value: 'submitted' },
    });
    await screen.findByRole('heading', { name: 'Submission' });

    // Change back to completed — await the card disappearing
    fireEvent.change(screen.getByLabelText('Progress'), {
      target: { value: 'completed' },
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Submission' }),
      ).not.toBeInTheDocument();
    });
  });

  it('problem set progress save shows achievement unlock when awarded', async () => {
    const user = userEvent.setup();
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

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('button', { name: 'Save progress' });

    // Select 'completed' — triggers the First Step achievement (first task completed)
    fireEvent.change(screen.getByLabelText('Progress'), {
      target: { value: 'completed' },
    });
    await user.click(screen.getByRole('button', { name: 'Save progress' }));

    await screen.findByRole('heading', { name: 'Progress saved' });
    expect(screen.getByText(/First Step/)).toBeInTheDocument();
  });

  it('lecture page log form and save feedback are unaffected by UX-03', async () => {
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

    await renderAppAtRoute('/course/week-0-lecture');

    await screen.findByRole('heading', {
      name: 'Week 0: Scratch - Lecture 0: Scratch',
    });
    // Lectures keep "Status" label — UX-03 only renamed this to "Progress" for problem sets
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    // Submission card is problem-set-only; must not appear on lecture pages
    expect(
      screen.queryByRole('heading', { name: 'Submission' }),
    ).not.toBeInTheDocument();
  });

  // UX-04: Strengthen the gamified progress loop

  it('lecture save confirmation shows Course map link', async () => {
    const user = userEvent.setup();

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

    await renderAppAtRoute('/course/week-0-lecture');
    await screen.findByRole('button', { name: 'Save session' });

    fireEvent.change(screen.getByLabelText('Started at'), {
      target: { value: '0:00' },
    });
    fireEvent.change(screen.getByLabelText('Stopped at'), {
      target: { value: '20:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Save session' }));

    await screen.findByRole('heading', { name: 'Session saved' });
    expect(
      screen.getByRole('link', { name: 'Course map' }),
    ).toBeInTheDocument();
  });

  it('lecture save confirmation shows XP earned on its own line when awarded', async () => {
    const user = userEvent.setup();

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

    await renderAppAtRoute('/course/week-0-lecture');
    await screen.findByRole('button', { name: 'Save session' });

    fireEvent.change(screen.getByLabelText('Started at'), {
      target: { value: '0:00' },
    });
    fireEvent.change(screen.getByLabelText('Stopped at'), {
      target: { value: '20:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Save session' }));

    await screen.findByRole('heading', { name: 'Session saved' });
    // 20 min triggers media_clean_stop (5 XP) + 2 unique 10-min blocks (8 XP) = 13 XP
    expect(screen.getByText(/\+\d+ XP earned/)).toBeInTheDocument();
  });

  it('achievements page shows level badge alongside unlock count', async () => {
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
    // Seed some XP so a level is established
    await upsertProgressAndAwardXp(
      { itemId: 'week-0-problem-set', status: 'started', confidence: 3 },
      { now: () => '2026-06-18T10:00:00.000Z' },
    );

    await renderAppAtRoute('/achievements');

    // Wait for the ready state: Level badge only appears after the async load resolves
    expect(await screen.findByText(/Level \d+/)).toBeInTheDocument();
  });

  it('course map page shows level badge from XP summary', async () => {
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
    // Seed some XP so a level is established
    await upsertProgressAndAwardXp(
      { itemId: 'week-0-problem-set', status: 'started', confidence: 3 },
      { now: () => '2026-06-18T10:00:00.000Z' },
    );

    await renderAppAtRoute('/course');

    // Wait for the ready state: Level badge only appears after the async load resolves
    expect(await screen.findByText(/Level \d+/)).toBeInTheDocument();
  });

  it('problem set save confirmation shows XP on its own line with "earned" wording', async () => {
    const user = userEvent.setup();

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

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('button', { name: 'Save progress' });

    await user.click(screen.getByRole('button', { name: 'Save progress' }));

    await screen.findByRole('heading', { name: 'Progress saved' });
    // problem_set_started awards +20 XP; confirm it uses the new "earned" wording
    expect(screen.getByText(/\+20 XP earned/)).toBeInTheDocument();
  });

  it('problem set save confirmation shows achievement name on its own line', async () => {
    const user = userEvent.setup();

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

    await renderAppAtRoute('/course/week-0-problem-set');
    await screen.findByRole('button', { name: 'Save progress' });

    fireEvent.change(screen.getByLabelText('Progress'), {
      target: { value: 'completed' },
    });
    await user.click(screen.getByRole('button', { name: 'Save progress' }));

    await screen.findByRole('heading', { name: 'Progress saved' });
    // First Step achievement unlocked; text should appear as "Achievement unlocked: First Step"
    expect(
      screen.getByText(/Achievement unlocked:.*First Step/),
    ).toBeInTheDocument();
  });
});

describe('RPG routes', () => {
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

  async function seedOnboardedLearner() {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(learnerProfileInput, { completeOnboarding: true });
  }

  async function seedOnboardedLearnerWithRpgHistory() {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 35 * 60_000).toISOString();
    const endedAt = new Date(now.getTime() - 5 * 60_000).toISOString();

    await seedOnboardedLearner();
    await upsertProgressAndAwardXp({
      completedAt: now.toISOString(),
      confidence: 3,
      evidenceText: undefined,
      evidenceType: undefined,
      itemId: 'week-0-lecture',
      notes: 'Completed from the RPG route fixture.',
      startedAt,
      status: 'completed',
    });
    await upsertProgress({
      completedAt: undefined,
      confidence: 2,
      evidenceText: undefined,
      evidenceType: undefined,
      itemId: 'week-4-lecture',
      notes: 'Current RPG hub fixture.',
      startedAt,
      status: 'started',
    });
    await addStudySessionAndAwardXp({
      durationMinutes: 30,
      endedAt,
      itemId: 'week-4-lecture',
      mode: 'watching',
      notes: 'Hub fixture session.',
      startedAt,
      unitId: 'week-4',
    });
  }

  async function seedOnboardedLearnerWithRpgMapProgress() {
    const completedAt = '2026-06-21T10:00:00.000Z';
    const startedAt = '2026-06-21T09:00:00.000Z';
    const weekZero = bundledCourseSeed.units.find(
      (unit) => unit.id === 'week-0',
    );

    await seedOnboardedLearner();

    if (weekZero === undefined) {
      throw new Error('Week 0 seed unit is required for RPG map tests.');
    }

    for (const item of weekZero.items.filter(
      (candidate) => candidate.required,
    )) {
      await upsertProgress({
        completedAt,
        confidence: 3,
        evidenceText: undefined,
        evidenceType: undefined,
        itemId: item.id,
        notes: 'Completed from the RPG map fixture.',
        startedAt,
        status: 'completed',
      });
    }

    await upsertProgress({
      completedAt: undefined,
      confidence: 2,
      evidenceText: undefined,
      evidenceType: undefined,
      itemId: 'week-4-lecture',
      notes: 'Current RPG map fixture.',
      startedAt: '2026-06-21T11:00:00.000Z',
      status: 'started',
    });
  }

  function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function waitForRpgRouteReady(route: string) {
    if (route === '/rpg') {
      await screen.findByRole('link', { name: 'Open RPG map' });
      return;
    }

    if (route === '/rpg/map') {
      await screen.findByTestId('rpg-module-week-4');
      return;
    }

    if (route === '/rpg/week/week-4') {
      await screen.findByTestId('rpg-resource-week-4-lecture');
      return;
    }

    if (route === '/rpg/resource/week-0-lecture') {
      await screen.findByRole('link', { name: 'Back to parent week' });
      return;
    }

    if (route.startsWith('/rpg/focus')) {
      await screen.findByRole('heading', { name: 'Focus' });
      return;
    }

    const stubHeadings: Record<string, string> = {
      '/rpg/badges': 'Badges',
      '/rpg/focus': 'Focus',
      '/rpg/hero': 'Hero',
      '/rpg/log': 'Log',
      '/rpg/settings': 'RPG Settings',
    };

    await screen.findByRole('heading', { name: stubHeadings[route] });
  }

  function expectRpgShellWithBottomNav(activeLabel: string) {
    const rpgShell = screen.getByTestId('rpg-shell');
    expect(rpgShell).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Skip to RPG content' }),
    ).toHaveAttribute('href', '#rpg-main-content');
    expect(within(rpgShell).getByRole('main')).toHaveAttribute(
      'id',
      'rpg-main-content',
    );

    const bottomNav = screen.getByRole('navigation', {
      name: 'RPG bottom navigation',
    });
    const expectedItems = [
      ['Hub', '/rpg'],
      ['Map', '/rpg/map'],
      ['Focus', '/rpg/focus'],
      ['Hero', '/rpg/hero'],
      ['Badges', '/rpg/badges'],
      ['Log', '/rpg/log'],
      ['Settings', '/rpg/settings'],
    ];

    for (const [label, href] of expectedItems) {
      expect(
        within(bottomNav).getByRole('link', { name: label }),
      ).toHaveAttribute('href', href);
    }

    expect(
      within(bottomNav).getByRole('link', { name: activeLabel }),
    ).toHaveAttribute('aria-current', 'page');
  }

  it('renders the RPG hub shell', async () => {
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg');

    const mapLink = await screen.findByRole('link', { name: 'Open RPG map' });

    expect(
      screen.getByRole('heading', { name: 'RPG Hub' }),
    ).toBeInTheDocument();
    expect(mapLink).toHaveAttribute('href', '/rpg/map');
    expectRpgShellWithBottomNav('Hub');
  });

  it('renders the RPG quest hub from real local data', async () => {
    await seedOnboardedLearnerWithRpgHistory();

    await renderAppAtRoute('/rpg');

    const continueLink = await screen.findByRole('link', {
      name: 'Continue current quest',
    });

    expect(continueLink).toHaveAttribute(
      'href',
      '/rpg/resource/week-4-lecture',
    );
    expect(screen.getByText("Alex's status")).toBeInTheDocument();
    expect(screen.getByText('Rank:')).toBeInTheDocument();
    expect(screen.getByText('Initiate')).toBeInTheDocument();
    expect(screen.getByText('CS Foundations')).toBeInTheDocument();
    expect(screen.getByText('Generalist')).toBeInTheDocument();
    expect(screen.getByText('Guild: Code Knights')).toBeInTheDocument();
    expect(screen.getByText('Week 4: Memory')).toBeInTheDocument();
    expect(screen.getByText('Lecture 4: Memory')).toBeInTheDocument();
    expect(screen.getByText("This week's local progress")).toBeInTheDocument();
    expect(screen.getByText('Recent saved activity')).toBeInTheDocument();
    expect(
      screen.getByText(/Saved study session - Lecture 4: Memory/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Saved progress - Lecture 4: Memory/),
    ).toBeInTheDocument();

    const forbiddenCopy = [
      /daily reward/i,
      /energy/i,
      /streak/i,
      /locked adventure/i,
      /official cs50 completion/i,
      /customize guild/i,
      /choose your path/i,
      /CS50 Knights/i,
    ];

    for (const pattern of forbiddenCopy) {
      expect(screen.queryByText(pattern)).not.toBeInTheDocument();
    }
  });

  it('renders a useful empty RPG hub state for a new local user', async () => {
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg');

    expect(
      await screen.findByRole('heading', { name: 'No saved RPG activity yet' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No recent saved activity yet. Saved progress, study sessions, and XP events will appear here after you record them locally.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continue current quest' }),
    ).toHaveAttribute('href', '/rpg/resource/week-0-lecture');
  });

  it('renders the RPG campaign map from all current CS50x seed units', async () => {
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg/map');

    const weekFourModule = await screen.findByTestId('rpg-module-week-4');

    expect(
      screen.getByRole('heading', { name: 'Campaign Map' }),
    ).toBeInTheDocument();
    expect(weekFourModule).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Plain module list' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${bundledCourseSeed.units.length} modules`),
    ).toBeInTheDocument();

    for (const unit of bundledCourseSeed.units) {
      const module = screen.getByTestId(`rpg-module-${unit.id}`);

      expect(within(module).getByText(unit.title)).toBeInTheDocument();
      expect(
        within(module).getByRole('link', {
          name: new RegExp(`^Open ${escapeRegExp(unit.title)},`),
        }),
      ).toHaveAttribute('href', `/rpg/week/${unit.id}`);
      expect(screen.getByRole('link', { name: unit.title })).toHaveAttribute(
        'href',
        `/rpg/week/${unit.id}`,
      );
    }

    expectRpgShellWithBottomNav('Map');
  });

  it('renders RPG campaign map progress, current module, completed modules, and available modules as text', async () => {
    await seedOnboardedLearnerWithRpgMapProgress();

    await renderAppAtRoute('/rpg/map');

    await screen.findByTestId('rpg-module-week-4');

    expect(
      screen.getByText('Current module: Week 4: Memory'),
    ).toBeInTheDocument();

    const weekZeroModule = screen.getByTestId('rpg-module-week-0');
    expect(within(weekZeroModule).getByText('Completed')).toBeInTheDocument();
    expect(within(weekZeroModule).getByText('100%')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Status: Completed. Availability: Available. Progress: 2 of 2 required complete (100%).',
      ),
    ).toBeInTheDocument();

    const weekFourModule = screen.getByTestId('rpg-module-week-4');
    expect(
      within(weekFourModule).getByText('Current module'),
    ).toBeInTheDocument();
    expect(within(weekFourModule).getByText('In progress')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Status: In progress. Availability: Available. Progress: 0 of 2 required complete (0%).',
      ),
    ).toBeInTheDocument();

    const weekOneModule = screen.getByTestId('rpg-module-week-1');
    expect(
      within(weekOneModule).getByText('Available - 4 quests - 11h'),
    ).toBeInTheDocument();
    expect(within(weekOneModule).getByText('Not started')).toBeInTheDocument();
  });

  it('keeps the RPG campaign map semantic and free of fake future course support', async () => {
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg/map');

    await screen.findByTestId('rpg-module-week-4');

    const campaignNodes = screen.getByRole('list', {
      name: 'Campaign map nodes',
    });
    const nodeLinks = within(campaignNodes).getAllByRole('link');

    expect(nodeLinks).toHaveLength(bundledCourseSeed.units.length);

    for (const link of nodeLinks) {
      expect(link).toHaveAccessibleName();
      expect(link.getAttribute('href')).toMatch(/^\/rpg\/week\//);
    }

    const forbiddenCopy = [
      /CS50P/i,
      /CS50AI/i,
      /CS50W/i,
      /CS50SQL/i,
      /locked adventure/i,
      /official CS50 campaign/i,
      /Harvard campaign/i,
      /course art/i,
    ];

    for (const pattern of forbiddenCopy) {
      expect(screen.queryByText(pattern)).not.toBeInTheDocument();
    }
  });

  it('renders the RPG Week 4 detail slice from real task data', async () => {
    const weekFourSeed = bundledCourseSeed.units.find(
      (unit) => unit.id === 'week-4',
    );

    if (weekFourSeed === undefined) {
      throw new Error('Week 4 seed unit is required for RPG week tests.');
    }

    await seedOnboardedLearnerWithRpgHistory();

    await renderAppAtRoute('/rpg/week/week-4');

    expect(
      await screen.findByRole('heading', { name: 'Week 4: Memory' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to RPG map' }),
    ).toHaveAttribute('href', '/rpg/map');
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('0 of 2 required complete')).toBeInTheDocument();

    for (const item of weekFourSeed.items) {
      const row = screen.getByTestId(`rpg-resource-${item.id}`);
      const resourceLinkName =
        item.id === 'week-4-lecture' ? 'Resume resource' : 'Open resource';

      expect(within(row).getByText(item.title)).toBeInTheDocument();
      if (item.required) {
        expect(within(row).getByText('Required')).toBeInTheDocument();
      } else {
        expect(within(row).getAllByText('Optional').length).toBeGreaterThan(0);
      }
      expect(
        within(row).getByRole('link', { name: resourceLinkName }),
      ).toHaveAttribute('href', `/rpg/resource/${item.id}`);
      expect(
        within(row).getByRole('link', { name: 'Start focus session' }),
      ).toHaveAttribute('href', `/rpg/focus?itemId=${item.id}`);
    }

    expect(
      within(screen.getByTestId('rpg-resource-week-4-lecture')).getByText(
        'Started',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('rpg-resource-week-4-problem-set')).getByText(
        'Not started',
      ),
    ).toBeInTheDocument();
    expectRpgShellWithBottomNav('Map');
  });

  it('renders an RPG week not-found state', async () => {
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg/week/not-a-real-unit');

    expect(
      await screen.findByRole('heading', { name: 'RPG week not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No RPG week was found for "not-a-real-unit".'),
    ).toBeInTheDocument();
    expectRpgShellWithBottomNav('Map');
  });

  it('renders the RPG resource shell', async () => {
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg/resource/week-0-lecture');

    expect(
      await screen.findByRole('heading', { name: 'Lecture 0: Scratch' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Week 0: Scratch').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Back to parent week' }),
    ).toHaveAttribute('href', '/rpg/week/week-0');
    expectRpgShellWithBottomNav('Map');
  });

  it('renders an RPG resource not-found state', async () => {
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg/resource/not-a-real-item');

    expect(
      await screen.findByRole('heading', { name: 'RPG resource not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No RPG resource was found for "not-a-real-item".'),
    ).toBeInTheDocument();
    expectRpgShellWithBottomNav('Map');
  });

  it('renders the RPG shell stub routes', async () => {
    await seedOnboardedLearner();

    const routes = [
      ['/rpg/focus', 'Focus', 'Focus'],
      ['/rpg/hero', 'Hero', 'Hero'],
      ['/rpg/badges', 'Badges', 'Badges'],
      ['/rpg/log', 'Log', 'Log'],
      ['/rpg/settings', 'RPG Settings', 'Settings'],
    ] as const;

    for (const [route, heading, activeLabel] of routes) {
      cleanup();
      await renderAppAtRoute(route);
      expect(
        await screen.findByRole('heading', { name: heading }),
      ).toBeInTheDocument();
      expectRpgShellWithBottomNav(activeLabel);
    }
  });

  it('supports keyboard navigation through the RPG bottom nav', async () => {
    const user = userEvent.setup();
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg');
    await screen.findByRole('link', { name: 'Open RPG map' });

    const bottomNav = screen.getByRole('navigation', {
      name: 'RPG bottom navigation',
    });
    const hubLink = within(bottomNav).getByRole('link', { name: 'Hub' });
    const mapLink = within(bottomNav).getByRole('link', { name: 'Map' });

    hubLink.focus();
    expect(hubLink).toHaveFocus();

    await user.keyboard('{Tab}');
    expect(mapLink).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(await screen.findByTestId('rpg-module-week-4')).toBeInTheDocument();
    expect(mapLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mutate local stores during passive RPG route navigation', async () => {
    await seedOnboardedLearner();

    const beforeSnapshot = await getDatabaseSnapshot();
    const readOnlyRoutes = [
      '/rpg',
      '/rpg/map',
      '/rpg/week/week-4',
      '/rpg/resource/week-0-lecture',
      '/rpg/focus',
      '/rpg/focus?itemId=week-4-lecture',
      '/rpg/hero',
      '/rpg/badges',
      '/rpg/log',
      '/rpg/settings',
    ];

    for (const route of readOnlyRoutes) {
      cleanup();
      await renderAppAtRoute(route);
      await waitForRpgRouteReady(route);
      expect(await getDatabaseSnapshot()).toEqual(beforeSnapshot);
    }
  });

  it('keeps RPG hidden from primary navigation', async () => {
    await seedOnboardedLearner();

    await renderAppAtRoute('/rpg');
    await screen.findByRole('heading', { name: 'RPG Hub' });

    const primaryNavigation = screen.getByRole('navigation', {
      name: 'Primary',
    });

    expect(
      within(primaryNavigation).queryByRole('link', { name: 'RPG' }),
    ).not.toBeInTheDocument();
    expect(
      within(primaryNavigation).getByRole('link', { name: 'Dashboard' }),
    ).toBeInTheDocument();
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

  // UX-04: Dashboard reward-loop visibility

  it('dashboard XP card shows level and progress-to-next-level when XP exists', async () => {
    await seedOnboardedLearnerWithHistory();

    await renderAppAtRoute('/dashboard');
    await screen.findByRole('heading', { name: 'XP' });

    // Level badge in card metric
    expect(screen.getAllByText(/Level \d+/).length).toBeGreaterThan(0);
    // Progress bar helper text
    expect(screen.getByText(/XP to level \d+/)).toBeInTheDocument();
  });

  it('dashboard XP card empty state offers a course map link', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(learnerProfileInput, {
      completeOnboarding: true,
    });

    await renderAppAtRoute('/dashboard');
    await screen.findByRole('heading', { name: 'XP' });

    expect(screen.getByText(/No XP earned yet/)).toBeInTheDocument();
    // Should have a link to the course map so learner knows where to earn XP
    expect(
      screen.getByRole('link', { name: 'Open course map' }),
    ).toBeInTheDocument();
  });

  it('dashboard XP card shows achievements-unlocked link when XP and achievements exist', async () => {
    await seedOnboardedLearnerWithHistory();

    await renderAppAtRoute('/dashboard');
    await screen.findByRole('heading', { name: 'XP' });

    // seedOnboardedLearnerWithHistory creates XP (so !isEmpty) and at least one
    // achievement unlock (immutability test confirms achievementUnlocks.length > 0).
    // The XP card must show a link with text matching "achievement(s) unlocked".
    expect(
      await screen.findByRole('link', { name: /achievements? unlocked/ }),
    ).toBeInTheDocument();
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
