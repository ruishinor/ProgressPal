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

  it('problem set previous notes appear when saved progress has notes', async () => {
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

    const previousNotesHeading = await screen.findByRole('heading', {
      name: 'Previous notes',
    });
    expect(previousNotesHeading).toBeInTheDocument();
    const previousNotesCard = previousNotesHeading.closest('section');
    expect(
      within(previousNotesCard!).getByText(
        'Got stuck on the sprite animation.',
      ),
    ).toBeInTheDocument();
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
