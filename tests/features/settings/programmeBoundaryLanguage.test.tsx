import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

/**
 * Follow-up 2026-10-11: the local-storage and boundary card on RPG Settings
 * is in one language per programme: Bokmål for Programvareutvikling 1,
 * English for CS50x (unchanged).
 */

const p2 = programvareutviklingDefinition;

beforeEach(async () => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'Kari',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
});

describe('the Settings boundary card language', () => {
  it('is entirely Bokmål for Programvareutvikling 1', async () => {
    await enrolAndSwitchActiveProgramme(p2.programmeId, { seed: p2.catalogue });
    await renderAppAtRoute('/rpg/settings');

    const card = (
      await screen.findByRole(
        'heading',
        { name: 'Lagring og framdrift' },
        { timeout: 15_000 },
      )
    ).closest('.card') as HTMLElement;
    const words = card.textContent ?? '';

    expect(
      screen.queryByRole('heading', {
        name: 'Local-first and course boundary',
      }),
    ).toBeNull();
    expect(within(card).queryByText(/^Rangering, merker/)).toBeNull();
    expect(words).not.toMatch(
      /\b(the|your|you|and|browser|device|account|analytics|uploaded|backup|storage)\b/i,
    );
    // The meaning stays: local, no account needed, nothing synced, manual
    // optional remote backup, storage can be cleared.
    expect(words).toMatch(/nettleser/i);
    expect(words).toMatch(/ikke konto/i);
    expect(words).toMatch(/synkroniseres/i);
    expect(words).toMatch(/manuell/i);
  }, 30_000);

  it('stays English for CS50x', async () => {
    await renderAppAtRoute('/rpg/settings');

    const card = (
      await screen.findByRole(
        'heading',
        { name: 'Local-first and course boundary' },
        { timeout: 15_000 },
      )
    ).closest('.card') as HTMLElement;

    expect(card.textContent).toContain('ProgressPal keeps your working data');
    expect(within(card).getByText(/^RPG ranks, badges/)).toBeInTheDocument();
  }, 30_000);
});
