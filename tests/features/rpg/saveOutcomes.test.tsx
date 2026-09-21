import { getLevelProgressDisplay } from '@/features/rpg/model/presentation';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as progressActions from '@/features/rpg/model/progressActions';
import * as readModels from '@/features/rpg/model/readModels';
import { RpgFocusPage } from '@/features/rpg/routes/RpgFocusPage';
import { RpgResourcePage } from '@/features/rpg/routes/RpgResourcePage';
import { StudySessionsSurface } from '@/features/sessions';
import * as database from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

const appState = vi.hoisted(() => ({
  coordination: { canWrite: true },
  runLocalMutation: vi.fn(async (mutation: () => Promise<unknown>) =>
    mutation(),
  ),
}));

vi.mock('@/lib/appState', () => ({ useAppState: () => appState }));

function renderRoute(route: string) {
  const refreshHud = vi.fn(() => readModels.loadRpgHudSummary());
  const router = createMemoryRouter(
    [
      {
        element: <Outlet context={{ refreshHud }} />,
        children: [
          { path: '/rpg/resource/:itemId', element: <RpgResourcePage /> },
          { path: '/rpg/focus', element: <RpgFocusPage /> },
          { path: '/sessions', element: <StudySessionsSurface /> },
        ],
      },
    ],
    { initialEntries: [route] },
  );
  return { ...render(<RouterProvider router={router} />), router, refreshHud };
}

async function prepareLiveSession(route = '/rpg/focus?itemId=week-4-lecture') {
  const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(3_000_000);
  const view = renderRoute(route);
  await screen.findByRole('button', { name: 'Start live session' });
  fireEvent.change(screen.getAllByLabelText('Mode')[0], {
    target: { value: 'debugging' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start live session' }));
  nowSpy.mockReturnValue(3_000_000 + 25 * 60_000);
  fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
  fireEvent.change(screen.getAllByLabelText('Notes')[0], {
    target: { value: 'Kept session note.' },
  });
  return view;
}

function deferredWrite() {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

function enterManualSession() {
  const heading = screen.getByRole('heading', {
    name: 'Manual session entry',
    hidden: true,
  });
  const form = heading.closest('section')!.querySelector('form')!;
  const controls = within(form);
  fireEvent.change(controls.getByLabelText('Mode'), {
    target: { value: 'debugging' },
  });
  fireEvent.change(controls.getByLabelText('Start date and time'), {
    target: { value: '2026-01-01T10:00' },
  });
  fireEvent.change(controls.getByLabelText('Duration'), {
    target: { value: '25' },
  });
  fireEvent.change(controls.getByLabelText('Notes'), {
    target: { value: 'Kept manual note.' },
  });
  return { controls, form };
}

describe('Confirmed save outcomes and read recovery', () => {
  beforeEach(async () => {
    appState.coordination.canWrite = true;
    appState.runLocalMutation.mockClear();
    await database.initializeDatabase({ seed: bundledCourseSeed });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['week-0-problem-set', 'accepted', 'started'],
    ['week-0-lecture', 'completed', 'blocked'],
  ] as const)(
    'corrects %s backwards without replaying rewards',
    async (itemId, originalStatus, correctedStatus) => {
      await database.upsertProgressAndAwardXp({
        itemId,
        status: originalStatus,
        confidence: 3,
        evidenceText: 'Synthetic submission note',
        evidenceType: 'self_report',
      });
      const before = await database.getDatabaseSnapshot();
      renderRoute('/rpg/resource/' + itemId);
      const progress = await screen.findByLabelText('Progress');
      expect(
        within(progress).queryByRole('option', {
          name: correctedStatus === 'started' ? 'Started' : 'Blocked',
        }),
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole('button', { name: 'Correct saved status' }),
      );
      expect(screen.getByRole('note')).toHaveTextContent(
        'XP and achievements already earned are not removed.',
      );
      fireEvent.change(progress, { target: { value: correctedStatus } });
      if (correctedStatus === 'blocked') {
        const info = screen.getByRole('button', {
          name: 'What does Blocked mean?',
        });
        fireEvent.click(info);
        expect(info).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText(/Blocked means you started/)).toBeVisible();
        fireEvent.click(info);
        expect(info).toHaveAttribute('aria-expanded', 'false');
      }
      fireEvent.click(
        screen.getByRole('button', { name: 'Save status correction' }),
      );
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Correct saved status' }),
        ).toBeEnabled(),
      );
      await waitFor(() =>
        expect(
          screen.getByText(
            'Local status: ' +
              (correctedStatus === 'started' ? 'Started' : 'Blocked'),
          ),
        ).toBeInTheDocument(),
      );
      const corrected = await database.getDatabaseSnapshot();
      expect(
        corrected.progressEntries.find((entry) => entry.itemId === itemId)
          ?.status,
      ).toBe(correctedStatus);
      expect(corrected.xpTransactions).toEqual(before.xpTransactions);
      expect(corrected.achievementUnlocks).toEqual(before.achievementUnlocks);
      expect(screen.getByText('Task XP earned')).toBeInTheDocument();
      await database.upsertProgressAndAwardXp({
        itemId,
        status: originalStatus,
        confidence: 3,
        evidenceText: 'Synthetic submission note',
        evidenceType: 'self_report',
      });
      expect((await database.getDatabaseSnapshot()).xpTransactions).toEqual(
        before.xpTransactions,
      );
    },
  );

  it.each(['resource', 'hub'] as const)(
    'keeps a committed Resource result when the %s refresh fails, then recovers without writing',
    async (failedRead) => {
      const save = vi.spyOn(progressActions, 'saveRpgStudyResourceProgress');
      const read = vi.spyOn(readModels, 'loadRpgStudyResourceSummary');
      const hubRead = vi.spyOn(readModels, 'loadRpgHudSummary');
      const errors = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      renderRoute('/rpg/resource/week-0-lecture');
      await screen.findByRole('heading', { name: 'Lecture 0: Scratch' });
      (failedRead === 'resource' ? read : hubRead).mockRejectedValueOnce(
        new Error('Injected summary read failure.'),
      );
      fireEvent.change(screen.getByLabelText('Add study note'), {
        target: { value: 'Kept resource note.' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Mark locally complete' }),
      );
      await waitFor(() => expect(errors).toHaveBeenCalledTimes(1));
      const result = await save.mock.results[0]!.value;
      expect(result.progressEntry.status).toBe('completed');
      expect(result.awardedTransactions.length).toBeGreaterThan(0);
      expect(result.unlockedAchievements.length).toBeGreaterThan(0);
      expect(
        screen.queryByRole('heading', { name: 'Progress saved' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Progress could not be saved locally. Try again.'),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText('Add study note')).toHaveValue(
        'Kept resource note.',
      );
      const snapshot = await database.getDatabaseSnapshot();
      expect(snapshot.progressEntries).toEqual([result.progressEntry]);
      expect(snapshot.xpTransactions).toEqual(
        expect.arrayContaining(result.awardedTransactions),
      );
      expect(snapshot.xpTransactions).toHaveLength(
        result.awardedTransactions.length,
      );
      expect(snapshot.achievementUnlocks).toEqual(
        expect.arrayContaining(result.unlockedAchievements),
      );
      expect(snapshot.achievementUnlocks).toHaveLength(
        result.unlockedAchievements.length,
      );
      expect(
        screen.getByText('Achievement unlocked: First Step'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /^Continue quest:/ }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/^At save: Level/)).toHaveTextContent(
        getLevelProgressDisplay(result.xpSummary).levelProgressLabel,
      );

      // Read recovery remains usable when another tab has taken write ownership.
      appState.coordination.canWrite = false;
      fireEvent.change(screen.getByLabelText('Add study note'), {
        target: { value: 'An unsaved follow-up note.' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Refresh progress summary' }),
      );
      await screen.findByText(`Level ${result.xpSummary.level} progress`);
      expect(screen.getByLabelText('Add study note')).toHaveValue(
        'An unsaved follow-up note.',
      );
      expect(
        screen.getByRole('button', { name: 'Save progress' }),
      ).toBeDisabled();
      expect(save).toHaveBeenCalledTimes(1);
      expect(appState.runLocalMutation).toHaveBeenCalledTimes(1);
      expect(await database.getDatabaseSnapshot()).toEqual(snapshot);
      expect(errors).toHaveBeenCalledTimes(1);
      expect(errors).toHaveBeenCalledWith(
        'Saved RPG resource summaries could not be refreshed.',
        expect.objectContaining({ message: 'Injected summary read failure.' }),
      );
    },
  );

  it('keeps a committed Focus result when the session ledger refresh fails', async () => {
    const save = vi.spyOn(database, 'addStudySessionAndAwardXp');
    const read = vi.spyOn(database, 'listStudySessions');
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await prepareLiveSession();
    // Saving a live session must not discard a separate manual-entry draft.
    const manual = enterManualSession();
    read.mockRejectedValueOnce(new Error('Injected ledger read failure.'));
    fireEvent.click(screen.getByRole('button', { name: 'Save study session' }));
    await waitFor(() => expect(errors).toHaveBeenCalledTimes(1));
    const result = await save.mock.results[0]!.value;
    expect(result.studySession.notes).toBe('Kept session note.');
    expect(result.awardedTransactions).toHaveLength(1);
    expect(
      result.unlockedAchievements.map(
        (unlock: { achievementId: string }) => unlock.achievementId,
      ),
    ).toEqual(['bug-hunter']);
    expect(
      screen.queryByRole('heading', { name: 'Session saved' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: 'Study sessions could not be opened',
      }),
    ).not.toBeInTheDocument();
    const snapshot = await database.getDatabaseSnapshot();
    expect(snapshot.studySessions).toEqual([result.studySession]);
    expect(snapshot.xpTransactions).toEqual(result.awardedTransactions);
    expect(snapshot.achievementUnlocks).toEqual(result.unlockedAchievements);
    expect(manual.controls.getByLabelText('Notes')).toHaveValue(
      'Kept manual note.',
    );
    appState.coordination.canWrite = false;
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh session history' }),
    );
    await screen.findByText('Review saved sessions (1)');
    expect(manual.controls.getByLabelText('Notes')).toHaveValue(
      'Kept manual note.',
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(await database.getDatabaseSnapshot()).toEqual(snapshot);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors).toHaveBeenCalledWith(
      'Saved session history could not be refreshed.',
      expect.objectContaining({ message: 'Injected ledger read failure.' }),
    );
  });

  it('labels failed Focus next-work refresh and offers a read-only retry', async () => {
    const save = vi.spyOn(database, 'addStudySessionAndAwardXp');
    const read = vi.spyOn(readModels, 'loadRpgHudSummary');
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await prepareLiveSession();
    read.mockRejectedValueOnce(new Error('Injected next-work read failure.'));
    fireEvent.click(screen.getByRole('button', { name: 'Save study session' }));
    await waitFor(() => expect(errors).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(
      screen.queryByRole('button', { name: 'Refresh progress summary' }),
    ).toBeInTheDocument();
    const snapshot = await database.getDatabaseSnapshot();
    expect(
      screen.getByText('Achievement unlocked: Bug Hunter'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /^Continue quest:/ }),
    ).not.toBeInTheDocument();
    appState.coordination.canWrite = false;
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh progress summary' }),
    );
    await screen.findByRole('link', {
      name: 'Start quest: Lecture 0: Scratch',
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(await database.getDatabaseSnapshot()).toEqual(snapshot);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors).toHaveBeenCalledWith(
      'RPG Focus next-quest feedback could not be refreshed.',
      expect.objectContaining({ message: 'Injected next-work read failure.' }),
    );
  });

  it('preserves Resource input after a true write failure and retries exactly once', async () => {
    const save = vi
      .spyOn(progressActions, 'saveRpgStudyResourceProgress')
      .mockRejectedValueOnce(new Error('Injected write failure.'));
    const read = vi.spyOn(readModels, 'loadRpgStudyResourceSummary');
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    renderRoute('/rpg/resource/week-0-lecture');
    await screen.findByRole('heading', { name: 'Lecture 0: Scratch' });
    const before = await database.getDatabaseSnapshot();
    fireEvent.change(screen.getByLabelText('Add study note'), {
      target: { value: 'Retry this note.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Mark locally complete' }),
    );
    await screen.findByText('Progress could not be saved locally. Try again.');
    expect(errors).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('heading', { name: 'Progress saved' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Add study note')).toHaveValue(
      'Retry this note.',
    );
    expect(read).toHaveBeenCalledTimes(1);
    expect(await database.getDatabaseSnapshot()).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Save progress' }));
    await screen.findByText(/^Level \d+ progress$/);
    const result = await save.mock.results[1]!.value;
    const after = await database.getDatabaseSnapshot();
    expect(save).toHaveBeenCalledTimes(2);
    expect(after.progressEntries).toEqual([result.progressEntry]);
    expect(after.xpTransactions).toHaveLength(
      result.awardedTransactions.length,
    );
    expect(after.achievementUnlocks).toHaveLength(
      result.unlockedAchievements.length,
    );
    expect(result.progressEntry.notes).toBe('Retry this note.');
  });

  it('makes only one Resource write for rapid submits or the unchanged saved form', async () => {
    const originalSave = progressActions.saveRpgStudyResourceProgress;
    const gate = deferredWrite();
    const save = vi
      .spyOn(progressActions, 'saveRpgStudyResourceProgress')
      .mockImplementationOnce(async (input) => {
        await gate.pending;
        return originalSave(input);
      });
    renderRoute('/rpg/resource/week-0-lecture');
    await screen.findByRole('heading', { name: 'Lecture 0: Scratch' });
    fireEvent.change(screen.getByLabelText('Progress'), {
      target: { value: 'completed' },
    });
    const form = screen
      .getByRole('button', { name: 'Save progress' })
      .closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      gate.release();
      await save.mock.results[0]!.value;
    });
    await screen.findByText(/^Level \d+ progress$/);
    const beforeRepeat = await database.getDatabaseSnapshot();
    fireEvent.submit(form);
    expect(save).toHaveBeenCalledTimes(1);
    expect(appState.runLocalMutation).toHaveBeenCalledTimes(1);
    expect(await database.getDatabaseSnapshot()).toEqual(beforeRepeat);
    expect(
      beforeRepeat.achievementUnlocks.map((unlock) => unlock.achievementId),
    ).toEqual(['first-step']);
  });

  it.each(['save', 'refresh'] as const)(
    'keeps the current Resource task and draft when an earlier task %s finishes after navigation',
    async (pendingStage) => {
      const originalSave = progressActions.saveRpgStudyResourceProgress;
      const originalRead = readModels.loadRpgStudyResourceSummary;
      const gate = deferredWrite();
      const save = vi.spyOn(progressActions, 'saveRpgStudyResourceProgress');
      const read = vi.spyOn(readModels, 'loadRpgStudyResourceSummary');
      const hubRead = vi.spyOn(readModels, 'loadRpgHudSummary');
      const { router } = renderRoute('/rpg/resource/week-0-lecture');
      await screen.findByRole('heading', { name: 'Lecture 0: Scratch' });
      if (pendingStage === 'save') {
        save.mockImplementationOnce(async (input) => {
          await gate.pending;
          return originalSave(input);
        });
      } else {
        read.mockImplementationOnce(async (itemId) => {
          const summary = await originalRead(itemId);
          await gate.pending;
          return summary;
        });
      }
      fireEvent.click(
        screen.getByRole('button', { name: 'Mark locally complete' }),
      );
      await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
      if (pendingStage === 'refresh') {
        await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
      }
      await act(async () => {
        await router.navigate('/rpg/resource/week-4-lecture');
      });
      await screen.findByRole('heading', { name: 'Lecture 4: Memory' });
      fireEvent.change(screen.getByLabelText('Add study note'), {
        target: { value: 'New task draft.' },
      });
      await act(async () => {
        gate.release();
        await save.mock.results[0]!.value;
        if (pendingStage === 'refresh') {
          await read.mock.results[1]!.value;
        }
      });
      if (pendingStage === 'refresh') {
        await act(async () => {
          await read.mock.results[1]!.value;
          await hubRead.mock.results[0]!.value;
        });
      }
      expect(router.state.location.pathname).toBe(
        '/rpg/resource/week-4-lecture',
      );
      expect(
        screen.queryByRole('heading', { name: 'Lecture 4: Memory' }),
      ).not.toBeNull();
      expect(screen.getByLabelText('Add study note')).toHaveValue(
        'New task draft.',
      );
      expect(
        screen.queryByRole('heading', { name: 'Progress saved' }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Save progress' }));
      await screen.findByText(/^Level \d+ progress$/);
      expect(save).toHaveBeenCalledTimes(2);
      expect(save.mock.calls[1]![0]).toMatchObject({
        itemId: 'week-4-lecture',
        notes: 'New task draft.',
      });
      const snapshot = await database.getDatabaseSnapshot();
      expect(
        snapshot.progressEntries.map((entry) => entry.itemId).sort(),
      ).toEqual(['week-0-lecture', 'week-4-lecture']);
    },
  );

  it.each(['rpg', 'classic'])(
    'preserves a new %s live draft when a previous task save finishes after query navigation',
    async (variant) => {
      const originalSave = database.addStudySessionAndAwardXp;
      const gate = deferredWrite();
      const save = vi
        .spyOn(database, 'addStudySessionAndAwardXp')
        .mockImplementationOnce(async (input) => {
          await gate.pending;
          return originalSave(input);
        });
      const path = variant === 'rpg' ? '/rpg/focus' : '/sessions';
      const { router, refreshHud } = await prepareLiveSession(
        `${path}?itemId=week-4-lecture`,
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Save study session' }),
      );
      await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
      await act(async () => {
        await router.navigate(`${path}?itemId=week-0-lecture`);
      });
      await screen.findByRole('button', { name: 'Start live session' });
      fireEvent.change(screen.getAllByLabelText('Mode')[0], {
        target: { value: 'debugging' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Start live session' }),
      );
      vi.mocked(Date.now).mockReturnValue(3_000_000 + 50 * 60_000);
      fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
      fireEvent.change(screen.getAllByLabelText('Notes')[0], {
        target: { value: 'New task session draft.' },
      });
      await act(async () => {
        gate.release();
        await save.mock.results[0]!.value;
      });
      expect(
        screen.queryByRole('button', { name: 'Save study session' }),
      ).not.toBeNull();
      expect(screen.getAllByLabelText('Notes')[0]).toHaveValue(
        'New task session draft.',
      );
      expect(
        screen.queryByRole('heading', { name: 'Session saved' }),
      ).not.toBeInTheDocument();
      if (variant === 'rpg') {
        expect(refreshHud).toHaveBeenCalledTimes(1);
      }
      fireEvent.click(
        screen.getByRole('button', { name: 'Save study session' }),
      );
      await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
      await screen.findByRole('button', { name: 'Start live session' });
      expect(save.mock.calls[1]![0]).toMatchObject({
        itemId: 'week-0-lecture',
        notes: 'New task session draft.',
      });
      const snapshot = await database.getDatabaseSnapshot();
      expect(
        snapshot.studySessions.map((session) => session.itemId).sort(),
      ).toEqual(['week-0-lecture', 'week-4-lecture']);
    },
  );

  it.each(['rpg', 'classic'])(
    'preserves a failed %s live session for retry and commits one result after rapid activation',
    async (variant) => {
      const originalSave = database.addStudySessionAndAwardXp;
      const gate = deferredWrite();
      const save = vi
        .spyOn(database, 'addStudySessionAndAwardXp')
        .mockRejectedValueOnce(new Error('Injected session write failure.'))
        .mockImplementationOnce(async (input) => {
          await gate.pending;
          return originalSave(input);
        });
      await prepareLiveSession(
        variant === 'rpg'
          ? '/rpg/focus?itemId=week-4-lecture'
          : '/sessions?itemId=week-4-lecture',
      );
      const before = await database.getDatabaseSnapshot();
      fireEvent.click(
        screen.getByRole('button', { name: 'Save study session' }),
      );
      await screen.findByText('Injected session write failure.');
      expect(screen.getAllByLabelText('Notes')[0]).toHaveValue(
        'Kept session note.',
      );
      expect(await database.getDatabaseSnapshot()).toEqual(before);
      const button = screen.getByRole('button', { name: 'Save study session' });
      act(() => {
        fireEvent.click(button);
        fireEvent.click(button);
      });
      expect(save).toHaveBeenCalledTimes(2);
      await act(async () => {
        gate.release();
        await save.mock.results[1]!.value;
      });
      await screen.findByRole('button', { name: 'Start live session' });
      const result = await save.mock.results[1]!.value;
      const after = await database.getDatabaseSnapshot();
      expect(save).toHaveBeenCalledTimes(2);
      expect(after.studySessions).toEqual([result.studySession]);
      expect(after.xpTransactions).toEqual(result.awardedTransactions);
      expect(after.achievementUnlocks).toEqual(result.unlockedAchievements);
      expect(
        result.unlockedAchievements.map(
          (unlock: { achievementId: string }) => unlock.achievementId,
        ),
      ).toEqual(['bug-hunter']);
      expect(after.progressEntries).toEqual(before.progressEntries);
    },
  );

  it.each(['rpg', 'classic'])(
    'saves a %s manual draft once and recovers its failed history refresh with reads',
    async (variant) => {
      const originalSave = database.addStudySessionAndAwardXp;
      const gate = deferredWrite();
      const save = vi
        .spyOn(database, 'addStudySessionAndAwardXp')
        .mockRejectedValueOnce(new Error('Injected manual write failure.'))
        .mockImplementationOnce(async (input) => {
          await gate.pending;
          return originalSave(input);
        });
      const read = vi.spyOn(database, 'listStudySessions');
      const errors = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      renderRoute(
        variant === 'rpg'
          ? '/rpg/focus?itemId=week-4-lecture'
          : '/sessions?itemId=week-4-lecture',
      );
      await screen.findByRole('button', { name: 'Start live session' });
      const manual = enterManualSession();
      const before = await database.getDatabaseSnapshot();
      fireEvent.submit(manual.form);
      await screen.findByText('Injected manual write failure.');
      expect(manual.controls.getByLabelText('Notes')).toHaveValue(
        'Kept manual note.',
      );
      expect(await database.getDatabaseSnapshot()).toEqual(before);
      read.mockRejectedValueOnce(
        new Error('Injected manual history read failure.'),
      );
      act(() => {
        fireEvent.submit(manual.form);
        fireEvent.submit(manual.form);
      });
      expect(save).toHaveBeenCalledTimes(2);
      await act(async () => {
        gate.release();
        await save.mock.results[1]!.value;
      });
      await screen.findByRole('button', { name: 'Refresh session history' });
      expect(errors).toHaveBeenCalledTimes(1);
      const result = await save.mock.results[1]!.value;
      const snapshot = await database.getDatabaseSnapshot();
      expect(snapshot.studySessions).toEqual([result.studySession]);
      expect(result.studySession.notes).toBe('Kept manual note.');
      expect(snapshot.xpTransactions).toEqual(result.awardedTransactions);
      expect(snapshot.achievementUnlocks).toEqual(result.unlockedAchievements);
      appState.coordination.canWrite = false;
      fireEvent.click(
        screen.getByRole('button', { name: 'Refresh session history' }),
      );
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: 'Refresh session history' }),
        ).not.toBeInTheDocument(),
      );
      expect(save).toHaveBeenCalledTimes(2);
      expect(await database.getDatabaseSnapshot()).toEqual(snapshot);
      expect(errors).toHaveBeenCalledTimes(1);
    },
  );
});
