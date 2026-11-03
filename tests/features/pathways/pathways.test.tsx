import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import { router } from '@/app/router/router';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  getDatabaseSnapshot,
  initializeDatabase,
  saveLearnerProfile,
  upsertProgress,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { gitGithubDefinition as git } from '@/programmes/git-github';
import { programvareutviklingDefinition as p2 } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

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
    const first = await screen.findByRole('link', {
      name: 'Start her: hvorfor bruke Git?',
    });
    expect((await getDatabaseSnapshot()).appMeta).toEqual(before.appMeta);
    fireEvent.click(first);
    await screen.findByRole('heading', {
      level: 1,
      name: 'Start her: hvorfor bruke Git?',
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Mark locally complete',
      }),
    );
    await screen.findByRole('button', { name: 'Reopen lesson' });
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
    fireEvent.click(
      await screen.findByRole('link', {
        name: 'Start her: hvorfor bruke Git?',
      }),
    );
    await screen.findByRole('button', { name: 'Reopen lesson' });
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
  await screen.findByRole('button', { name: 'Reopen lesson' });
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
