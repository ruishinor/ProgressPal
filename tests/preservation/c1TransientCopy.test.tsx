import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as database from '@/lib/db';
import {
  defaultLearnerProfileValues,
  initializeDatabase,
  saveLearnerProfile,
  upsertProgress,
} from '@/lib/db';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

/**
 * Epic C / C1 evidence area 8 (repair) — CS50 copy shown only in transient,
 * error or completion states, asserted in the REAL rendered state where the
 * learner sees it.
 *
 * Family: SEMANTIC ORACLE (CS50-owned copy, moved by C4). Each state is
 * produced through the real routes and components. Error states use the
 * existing test pattern of rejecting a real repository read
 * (`vi.spyOn(database, ...)`, as in tests/features/rpg/saveOutcomes.test.tsx);
 * no production test hook is added. The source-presence scan in
 * c1LabelsAndCopy.test.tsx is only secondary characterization.
 */

async function onboard() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'C1 Synthetic Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

async function expectRendered(value: string) {
  await waitFor(
    () => {
      expect((document.body.textContent ?? '').replace(/\s+/g, ' ')).toContain(
        value,
      );
    },
    { timeout: 15_000 },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('C1 transient-state CS50 copy in real rendered states (semantic, CS50-owned)', () => {
  it('shows the startup loading copy while the Classic shell prepares local data', async () => {
    await onboard();
    await renderAppAtRoute('/dashboard');
    // The first render is the real AppShell loading state (status "loading").
    expect(
      screen.getByText(
        'Preparing local profile data and the bundled CS50 catalog.',
      ),
    ).toBeInTheDocument();
  });

  // Owner decision 2026-10-03 supersedes the CS50 first-run description: a
  // fresh learner explicitly chooses a programme, and the first run presents
  // none as already chosen.
  it('shows the programme-neutral first-run onboarding copy on a fresh database', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await renderAppAtRoute('/');
    await expectRendered(
      'Choose a programme and set up a local learner profile. Everything stays on this device.',
    );
    expect(document.body.textContent).not.toContain(
      'Track CS50 work, sessions, XP, achievements, notes, and progress on this device.',
    );
  });

  const errorStates: Array<[route: string, heading: string, copy: string]> = [
    [
      '/dashboard',
      'Dashboard',
      'This page shows your CS50 progress on this device.',
    ],
    [
      '/course',
      'Course Map',
      'This page uses the built-in CS50 course list and your saved progress.',
    ],
    ['/insights', 'Insights', 'This page shows your CS50 study activity.'],
  ];

  for (const [route, heading, copy] of errorStates) {
    it(`shows the CS50 error-state copy on ${route} when its local read fails`, async () => {
      await onboard();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      // Epic C / C5: Course and Dashboard read the active catalogue through
      // getCatalogueCourseState; Insights still lists course units (OD-4).
      vi.spyOn(database, 'listCourseUnits').mockRejectedValue(
        new Error('Synthetic C1 read failure'),
      );
      vi.spyOn(database, 'getCatalogueCourseState').mockRejectedValue(
        new Error('Synthetic C1 read failure'),
      );
      await renderAppAtRoute(route);
      await screen.findByRole(
        'heading',
        { name: heading },
        { timeout: 15_000 },
      );
      await expectRendered(copy);
    }, 30_000);
  }

  it('shows the required-complete note on the RPG hub when every required task is complete', async () => {
    await onboard();
    const required = bundledCourseSeed.units
      .flatMap((unit) => unit.items)
      .filter((item) => item.required);
    for (const item of required) {
      await upsertProgress({
        confidence: 3,
        itemId: item.id,
        status: 'completed',
      });
    }
    await renderAppAtRoute('/rpg');
    await expectRendered(
      'All required tasks are marked complete locally. This does not confirm official CS50 completion.',
    );
  }, 60_000);

  it('offers the "Review official CS50x resource" link for a completed RPG resource', async () => {
    await onboard();
    await upsertProgress({
      confidence: 3,
      itemId: 'week-0-lecture',
      status: 'completed',
    });
    await renderAppAtRoute('/rpg/resource/week-0-lecture');
    expect(
      await screen.findByRole(
        'link',
        { name: 'Review official CS50x resource' },
        { timeout: 15_000 },
      ),
    ).toHaveAttribute('href', 'https://cs50.harvard.edu/x/weeks/0/');
  }, 30_000);
});
