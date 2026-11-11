import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import { writeCloudPreferences } from '@/lib/cloud';
import * as database from '@/lib/db';
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

async function onboard() {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'Copy Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchSpy = vi.fn(async () => {
    throw new Error('no network in this file');
  });
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each([false, true])(
  'opening local routes with cloud enabled=%s',
  (cloudOn) => {
    beforeEach(() => {
      if (cloudOn)
        writeCloudPreferences({ enabled: true, trustedDevice: false });
    });

    afterEach(() => {
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('opens onboarding without a network request', async () => {
      closeSharedDatabase();
      getSharedDatabase(resolveDatabaseMigrationContext());
      await initializeDatabase({ seed: bundledCourseSeed });
      await renderAppAtRoute('/');
      const programmes = await screen.findByRole(
        'radiogroup',
        { name: /\S/ },
        { timeout: 15_000 },
      );
      expect(
        within(programmes)
          .getAllByRole('radio')
          .map((radio) => (radio as HTMLInputElement).value),
      ).toEqual(['cs50x', 'programvareutvikling']);
    }, 30_000);

    it('reads local startup data without a network request', async () => {
      await onboard();
      await renderAppAtRoute('/dashboard');
      expect(within(screen.getByRole('main')).getByRole('status')).toHaveClass(
        'loading-state',
      );
      await screen.findAllByRole(
        'progressbar',
        { name: /\S/ },
        { timeout: 15_000 },
      );
    }, 30_000);

    it('handles a local startup failure without a network request', async () => {
      await onboard();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.spyOn(database, 'getProfile').mockRejectedValue(
        new Error('Synthetic read failure'),
      );
      const { container } = await renderAppAtRoute('/settings');
      const alert = await within(container).findByRole(
        'alert',
        {},
        { timeout: 15_000 },
      );
      expect(
        within(alert).getByRole('button', { name: /\S/ }),
      ).toBeInTheDocument();
    }, 30_000);

    it('opens the CS50x dashboard without a network request', async () => {
      await onboard();
      await renderAppAtRoute('/dashboard');
      await screen.findAllByRole(
        'progressbar',
        { name: /\S/ },
        { timeout: 15_000 },
      );
    }, 30_000);

    it('loads the saved local profile without a network request', async () => {
      await onboard();
      await renderAppAtRoute('/profile');
      await within(screen.getByRole('main')).findByRole(
        'heading',
        { name: /Copy Learner/ },
        { timeout: 15_000 },
      );
    }, 30_000);

    it.each(['/settings', '/rpg/settings'])(
      'opens %s without a network request',
      async (route) => {
        await onboard();
        const { container } = await renderAppAtRoute(route);
        await waitFor(
          () =>
            expect(
              container.querySelector('input#reset-confirmation'),
            ).toBeInTheDocument(),
          { timeout: 15_000 },
        );
      },
      30_000,
    );

    it('opens the Programvareutvikling dashboard without a network request', async () => {
      await onboard();
      await enrolAndSwitchActiveProgramme(
        programvareutviklingDefinition.programmeId,
        { seed: programvareutviklingDefinition.catalogue },
      );
      await renderAppAtRoute('/dashboard');
      await screen.findAllByRole(
        'progressbar',
        { name: /\S/ },
        { timeout: 15_000 },
      );
    }, 45_000);
  },
);
