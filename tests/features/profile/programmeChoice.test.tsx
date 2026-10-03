import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  getRequiredAppMeta,
  initializeDatabase,
  listProgrammeEnrolments,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

/**
 * Owner decision 2026-10-03 (Epic E continuation §11): a genuinely fresh
 * learner explicitly chooses the programme to start with; nothing is chosen
 * for them. Existing learners are never re-prompted, and a restored backup's
 * programme state is never overwritten by an onboarding choice.
 */

const p2 = programvareutviklingDefinition;

beforeEach(() => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
});

async function openFreshOnboarding() {
  await renderAppAtRoute('/');
  return screen.findByRole(
    'radiogroup',
    { name: /choose your programme/i },
    { timeout: 15_000 },
  );
}

describe('fresh onboarding: an explicit programme choice', () => {
  it('offers both real programmes and selects neither for the learner', async () => {
    const group = await openFreshOnboarding();
    const options = within(group).getAllByRole('radio');

    expect(
      within(group).getByRole('radio', { name: /CS50x/ }),
    ).not.toBeChecked();
    expect(
      within(group).getByRole('radio', { name: /Programvareutvikling/ }),
    ).not.toBeChecked();
    expect(options).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'Use default learner' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Customize first' }),
    ).toBeDisabled();
    // No programme is presented as already chosen.
    expect(document.body.textContent ?? '').not.toMatch(/CS50 Edition/);
  });

  it('starts Programvareutvikling when the learner chooses it, with no leftover CS50 enrolment', async () => {
    const group = await openFreshOnboarding();

    fireEvent.click(
      within(group).getByRole('radio', { name: /Programvareutvikling/ }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Use default learner' }),
    );

    await waitFor(
      async () => {
        const appMeta = await getRequiredAppMeta();
        expect(appMeta.onboardingCompletedAt).toEqual(expect.any(String));
        expect(appMeta.activeProgrammeId).toBe(p2.programmeId);
      },
      { timeout: 15_000 },
    );
    expect(
      (await listProgrammeEnrolments()).map((row) => row.programmeId),
    ).toEqual([p2.programmeId]);
  });

  it('starts CS50 when the learner chooses it', async () => {
    const group = await openFreshOnboarding();

    fireEvent.click(within(group).getByRole('radio', { name: /CS50x/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Use default learner' }),
    );

    await waitFor(
      async () => {
        const appMeta = await getRequiredAppMeta();
        expect(appMeta.onboardingCompletedAt).toEqual(expect.any(String));
        expect(appMeta.activeProgrammeId).toBe('cs50x');
      },
      { timeout: 15_000 },
    );
    expect(
      (await listProgrammeEnrolments()).map((row) => row.programmeId),
    ).toEqual(['cs50x']);
  });
});

describe('existing and restored learners keep their programme state', () => {
  it('never shows the programme choice to an onboarded learner', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );
    await renderAppAtRoute('/rpg');

    await screen.findByRole(
      'heading',
      { name: 'RPG Hub' },
      { timeout: 15_000 },
    );
    expect(
      screen.queryByRole('radiogroup', { name: /choose your programme/i }),
    ).toBeNull();
    expect((await getRequiredAppMeta()).activeProgrammeId).toBe('cs50x');
  });

  it('ignores a starting-programme choice once onboarding is complete, as after a restore', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await enrolAndSwitchActiveProgramme(p2.programmeId, { seed: p2.catalogue });
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );

    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      {
        completeOnboarding: true,
        startingProgramme: { programmeId: 'cs50x', seed: bundledCourseSeed },
      },
    );

    expect((await getRequiredAppMeta()).activeProgrammeId).toBe(p2.programmeId);
    expect(
      (await listProgrammeEnrolments()).map((row) => row.programmeId),
    ).toEqual(['cs50x', p2.programmeId]);
  });
});
