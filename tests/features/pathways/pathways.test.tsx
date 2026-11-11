import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as database from '@/lib/db';
import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import { router } from '@/app/router/router';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  enrolInProgramme,
  ensureCourseCatalogFromSeed,
  getDatabaseSnapshot,
  getProgress,
  initializeDatabase,
  saveLessonPosition,
  saveLearnerProfile,
  upsertProgress,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { gitGithubDefinition as git } from '@/programmes/git-github';
import { programvareutviklingDefinition as p2 } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

const lessonId = 'git-m01-o01';
const completeLabel = 'Marker som fullført lokalt';
const reopenLabel = 'Åpne leksjonen igjen';
const oldTimestamp = '2026-11-01T08:00:00.000Z';

async function toggleCompletion(name: string) {
  const button = await screen.findByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  const successor = await screen.findByRole('button', {
    name: name === completeLabel ? reopenLabel : completeLabel,
  });
  // Preparation can publish committed progress before the save's refresh settles.
  // Do not let test cleanup close the singleton while that refresh still runs.
  await waitFor(() => expect(successor).toBeEnabled());
  return (await getProgress(lessonId))!;
}

beforeEach(() => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
});
async function learner(id: string) {
  await initializeDatabase({ seed: bundledCourseSeed });
  if (id !== 'cs50x')
    await enrolAndSwitchActiveProgramme(id, {
      seed: id === git.programmeId ? git.catalogue : p2.catalogue,
    });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

it('opens the Git roadmap without enrolment or programme changes', async () => {
  await learner('programvareutvikling');
  const before = await getDatabaseSnapshot();
  await renderAppAtRoute('/rpg/pathways/git-github');
  await screen.findByRole('heading', {
    name: /Git & GitHub: fra første endring/,
  });
  await screen.findByText(/av 47 leksjoner markert som fullført/);
  expect(screen.getByText(/Nå kobler du lokal Git/)).toHaveTextContent(
    'Du trener på clone, fetch, pull og push',
  );
  expect(screen.getByText(/Når noe går galt, skal du først/)).toHaveTextContent(
    'blant annet restore, stash, reflog og revert',
  );
  fireEvent.click(screen.getByText('Leksjoner i M05 (8)'));
  expect(
    screen.getByRole('link', { name: 'Fra behov til et samarbeid om endring' }),
  ).toBeVisible();
  expect(await getDatabaseSnapshot()).toEqual(before);
});

it('waits for the completion refresh before the test can tear down its database', async () => {
  await learner('cs50x');
  await renderAppAtRoute('/pathways/git-github/' + lessonId);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: completeLabel })).toBeEnabled(),
  );
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const originalInitialize = database.initializeDatabase;
  const refresh = vi
    .spyOn(database, 'initializeDatabase')
    .mockImplementationOnce(async (options) => {
      await pending;
      return originalInitialize(options);
    });
  let settled = false;
  const completion = toggleCompletion(completeLabel).then((saved) => {
    settled = true;
    return saved;
  });
  try {
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const successor = await screen.findByRole('button', { name: reopenLabel });
    expect(successor).toBeDisabled();
    await act(async () => {
      expect((await getProgress(lessonId))?.status).toBe('completed');
    });
    expect(settled).toBe(false);
  } finally {
    await act(async () => {
      release();
      await refresh.mock.results[0]!.value;
    });
    await completion;
    refresh.mockRestore();
  }
  expect(screen.getByRole('button', { name: reopenLabel })).toBeEnabled();
});

it('records matching start and completion times on initial manual completion', async () => {
  await learner('cs50x');
  await renderAppAtRoute('/pathways/git-github/' + lessonId);
  await screen.findByRole('button', { name: completeLabel });
  const earliest = new Date().toISOString();
  const saved = await toggleCompletion(completeLabel);
  expect(saved.status).toBe('completed');
  expect(saved.startedAt).toBe(saved.completedAt);
  expect(saved.completedAt! >= earliest).toBe(true);
  expect(saved.completedAt! <= new Date().toISOString()).toBe(true);
  const localStatus = screen.getByRole('region', {
    name: 'Lokal leksjonsstatus',
  });
  expect(within(localStatus).getByRole('status')).toHaveTextContent(
    'Lokal status: Fullført',
  );
  expect(localStatus.closest('[lang]')).toHaveAttribute('lang', 'nb');
  expect(
    within(localStatus).getByText(
      'Du styrer selv når du vil markere leksjonen som gjennomgått.',
    ),
  ).toBeVisible();
});

it('clears the completion timestamp when reopening and retains the original start', async () => {
  await learner('cs50x');
  const original = await upsertProgress({
    itemId: lessonId,
    status: 'completed',
    confidence: 2,
    startedAt: oldTimestamp,
    completedAt: oldTimestamp,
  });
  await renderAppAtRoute('/rpg/pathways/git-github/' + lessonId);
  await screen.findByRole('button', { name: reopenLabel });
  expect(await getProgress(lessonId)).toEqual(original);
  const reopened = await toggleCompletion(reopenLabel);
  expect(reopened).toEqual({
    ...original,
    status: 'started',
    completedAt: undefined,
    updatedAt: reopened.updatedAt,
  });
  expect(
    within(
      screen.getByRole('region', { name: 'Lokal leksjonsstatus' }),
    ).getByRole('status'),
  ).toHaveTextContent('Lokal status: Ikke fullført');
});

it('records a fresh completion time after reopening while preserving identity and first start', async () => {
  await learner('cs50x');
  const original = await upsertProgress({
    itemId: lessonId,
    status: 'completed',
    confidence: 1,
    startedAt: oldTimestamp,
    completedAt: oldTimestamp,
  });
  await renderAppAtRoute('/rpg/pathways/git-github/' + lessonId);
  await toggleCompletion(reopenLabel);
  const earliest = new Date().toISOString();
  const saved = await toggleCompletion(completeLabel);
  expect(saved).toEqual({
    ...original,
    completedAt: saved.completedAt,
    updatedAt: saved.updatedAt,
  });
  expect(saved.completedAt).not.toBe(original.completedAt);
  expect(saved.completedAt! >= earliest).toBe(true);
  expect(saved.completedAt! <= new Date().toISOString()).toBe(true);
});

it.each(['started', 'blocked'] as const)(
  'replaces a stale completion time from %s while preserving progress, assessments and programme state',
  async (status) => {
    await learner('programvareutvikling');
    await upsertProgress({
      itemId: 'week-0-lecture',
      status: 'started',
      confidence: 3,
      notes: 'Other programme work',
    });
    await renderAppAtRoute('/pathways/git-github/' + lessonId);
    await screen.findByRole('button', { name: completeLabel });
    const task = within(screen.getByRole('group', { name: /^Oppgave 1 · / }));
    fireEvent.click(
      task.getByRole('radio', {
        name: /Lagring i Notisblokk oppdaterer filen/,
      }),
    );
    fireEvent.click(task.getByRole('button', { name: 'Sjekk svaret' }));
    await waitFor(() =>
      expect(task.getByRole('status', { name: 'Resultat' })).toHaveTextContent(
        'Svaret passer',
      ),
    );
    // Write after the route loads: saving must preserve the latest stored fields.
    const original = await upsertProgress({
      itemId: lessonId,
      status,
      confidence: 4,
      notes: 'Behold notatene mine',
      evidenceType: 'self_report',
      evidenceText: 'Eget arbeid, ikke en automatisk vurdering',
      startedAt: oldTimestamp,
      completedAt: oldTimestamp,
    });
    const before = await getDatabaseSnapshot();
    const earliest = new Date().toISOString();
    const saved = await toggleCompletion(completeLabel);
    expect(saved).toEqual({
      ...original,
      status: 'completed',
      completedAt: saved.completedAt,
      updatedAt: saved.updatedAt,
    });
    expect(saved.completedAt).toBeDefined();
    expect(saved.completedAt! >= earliest).toBe(true);
    expect(saved.completedAt).not.toBe(original.completedAt);
    const reopened = await toggleCompletion(reopenLabel);
    expect(reopened).toEqual({
      ...original,
      status: 'started',
      completedAt: undefined,
      updatedAt: reopened.updatedAt,
    });
    const after = await getDatabaseSnapshot();
    expect(
      after.progressEntries.filter((row) => row.itemId !== lessonId),
    ).toEqual(before.progressEntries.filter((row) => row.itemId !== lessonId));
    expect(after.learnerEvidence).toEqual(before.learnerEvidence);
    expect(after.learnerEvidence.length).toBeGreaterThan(0);
    expect(after.lessonPositions).toEqual(before.lessonPositions);
    expect(after.appMeta).toEqual(before.appMeta);
    expect(after.programmeEnrolments).toEqual(before.programmeEnrolments);
    expect(after.xpTransactions).toEqual(before.xpTransactions);
    expect(after.achievementUnlocks).toEqual(before.achievementUnlocks);
  },
);
it.each(['cs50x', 'programvareutvikling'])(
  'opens, saves and returns through both shells without switching %s',
  async (id) => {
    await learner(id);
    const before = await getDatabaseSnapshot();
    await renderAppAtRoute('/rpg');
    expect(
      await screen.findByRole('link', { name: 'Pathways' }),
    ).toHaveAttribute('href', '/rpg/pathways');
    await router.navigate('/rpg/pathways');
    fireEvent.click(await screen.findByRole('link', { name: 'Git & GitHub' }));
    await screen.findByText(/av 47 leksjoner markert som fullført/);
    const first = await screen.findByRole('link', {
      name: 'Start her: hvorfor bruke Git?',
    });
    expect((await getDatabaseSnapshot()).appMeta).toEqual(before.appMeta);
    fireEvent.click(first);
    await screen.findByRole('heading', {
      level: 1,
      name: 'Start her: hvorfor bruke Git?',
    });
    await toggleCompletion(completeLabel);
    const saved = await getDatabaseSnapshot();
    expect(saved.appMeta).toEqual(before.appMeta);
    expect(saved.xpTransactions).toEqual(before.xpTransactions);
    expect(saved.achievementUnlocks).toEqual(before.achievementUnlocks);
    fireEvent.click(screen.getByRole('link', { name: /^Tilbake til/ }));
    await screen.findByRole('heading', { name: 'Start with this quest' });
    await router.navigate('/dashboard');
    await screen.findByRole('link', { name: 'Course map' });
    expect(
      await screen.findByRole('link', { name: 'Pathways' }),
    ).toHaveAttribute('href', '/pathways');
    await router.navigate('/pathways');
    fireEvent.click(await screen.findByRole('link', { name: 'Git & GitHub' }));
    await screen.findByText(/av 47 leksjoner markert som fullført/);
    fireEvent.click(
      await screen.findByRole('link', {
        name: 'Start her: hvorfor bruke Git?',
      }),
    );
    await screen.findByRole('button', { name: 'Åpne leksjonen igjen' });
    expect((await getDatabaseSnapshot()).progressEntries).toEqual(
      saved.progressEntries,
    );
    expect((await getDatabaseSnapshot()).appMeta).toEqual(before.appMeta);
  },
  20_000,
);
it('retains legacy active Git work and offers both study programmes as recovery choices', async () => {
  await learner(git.programmeId);
  await upsertProgress({
    itemId: 'git-m01-o05',
    status: 'completed',
    confidence: 3,
    evidenceText: 'Existing learner work',
  });
  const before = await getDatabaseSnapshot();
  await renderAppAtRoute('/pathways/git-github/git-m01-o05');
  await screen.findByRole('button', { name: 'Åpne leksjonen igjen' });
  expect((await getDatabaseSnapshot()).progressEntries).toEqual(
    before.progressEntries,
  );
  expect((await getDatabaseSnapshot()).appMeta).toEqual(before.appMeta);
  await router.navigate('/settings');
  const select = await screen.findByLabelText('Programme to switch to');
  expect(select).toHaveTextContent('CS50x');
  expect(select).toHaveTextContent('Programvareutvikling');
  expect(select).not.toHaveTextContent('Git & GitHub');
  fireEvent.click(screen.getByRole('button', { name: 'Switch programme' }));
  await waitFor(async () =>
    expect((await getDatabaseSnapshot()).appMeta?.activeProgrammeId).toBe(
      'cs50x',
    ),
  );
  await screen.findByText('Active programme:', { exact: false });
  expect((await getDatabaseSnapshot()).progressEntries).toEqual(
    before.progressEntries,
  );
});
it('rejects another programme item at the direct Pathway route without preparing or writing Git data', async () => {
  await learner('cs50x');
  const before = await getDatabaseSnapshot();
  await renderAppAtRoute('/pathways/git-github/week-0-lecture');
  await screen.findByRole('heading', { name: 'Leksjonen finnes ikke' });
  expect((await getDatabaseSnapshot()).programmeEnrolments).toEqual(
    before.programmeEnrolments,
  );
  expect((await getDatabaseSnapshot()).progressEntries).toEqual(
    before.progressEntries,
  );
});

it('shows one next action, bookmarks and manual progress without writing on the overview', async () => {
  await learner('programvareutvikling');
  await ensureCourseCatalogFromSeed(git.catalogue);
  await enrolInProgramme(git.programmeId);
  await upsertProgress({
    itemId: 'git-m01-o01',
    status: 'completed',
    confidence: 0,
  });
  await saveLessonPosition({
    itemId: 'git-m02-o03',
    programmeId: git.programmeId,
    contentVersion: 1,
    unitId: 'git-m02-l03',
    stepIndex: 2,
  });
  const before = await getDatabaseSnapshot();
  await renderAppAtRoute('/pathways/git-github');
  expect(
    await screen.findByRole('link', {
      name: 'Fortsett: Les commits, HEAD og tidligere filer',
    }),
  ).toHaveAttribute('href', '/pathways/git-github/git-m02-o03');
  expect(
    screen.getByText(/1 av 47 leksjoner markert som fullført/),
  ).toBeVisible();
  expect(screen.getByText('Leksjoner i M02 (6)')).toBeVisible();
  const m02 = screen.getByText('Leksjoner i M02 (6)').closest('li');
  expect(m02).toHaveTextContent('Påbegynt');
  expect(await getDatabaseSnapshot()).toEqual(before);
});

it('prefers the latest unfinished lesson when several have started', async () => {
  await learner('cs50x');
  // Two writes may share one millisecond on a fast runner; make recency
  // explicit rather than depending on wall-clock precision.
  await upsertProgress(
    {
      itemId: 'git-m01-o02',
      status: 'started',
      confidence: 0,
    },
    { now: () => '2026-11-01T08:00:00.000Z' },
  );
  await upsertProgress(
    {
      itemId: 'git-m03-o01',
      status: 'started',
      confidence: 0,
    },
    { now: () => '2026-11-01T08:00:01.000Z' },
  );
  const before = await getDatabaseSnapshot();
  await renderAppAtRoute('/rpg/pathways/git-github');
  expect(
    await screen.findByRole('link', {
      name: 'Fortsett: Hvorfor arbeide med branches?',
    }),
  ).toHaveAttribute('href', '/rpg/pathways/git-github/git-m03-o01');
  expect(await getDatabaseSnapshot()).toEqual(before);
});

it('shows completion without a misleading continuation after all lessons are marked done', async () => {
  await learner('cs50x');
  for (const lesson of git.catalogue.units.flatMap((unit) => unit.items)) {
    await upsertProgress({
      itemId: lesson.id,
      status: 'completed',
      confidence: 0,
    });
  }
  const before = await getDatabaseSnapshot();
  await renderAppAtRoute('/pathways/git-github');
  await screen.findByText(/47 av 47 leksjoner markert som fullført/);
  expect(screen.getByText(/Alle leksjonene er markert fullført/)).toBeVisible();
  expect(
    screen.queryByRole('link', { name: /^(Fortsett:|Neste leksjon:)/ }),
  ).toBeNull();
  expect(await getDatabaseSnapshot()).toEqual(before);
}, 20_000);
