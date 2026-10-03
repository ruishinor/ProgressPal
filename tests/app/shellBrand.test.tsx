import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import {
  createProgrammeRegistry,
  getDefaultProgrammeDefinition,
  type ProgrammeDefinition,
  type ProgrammeRegistry,
} from '@/programmes';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

/**
 * OD-6 mechanism (Epic E §4.5 "Brand"): the shell brand is programme-aware
 * through programme terminology, with the existing brand as the default.
 * The mechanism is proven with a synthetic, validated definition; the real
 * Programvareutvikling definition carries no brand because the visible
 * string is an open owner decision.
 */

const injected = vi.hoisted(() => ({
  registry: null as ProgrammeRegistry | null,
}));

vi.mock('@/programmes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/programmes')>();

  return {
    ...actual,
    getProgrammeRegistry: () =>
      injected.registry ?? actual.getProgrammeRegistry(),
  };
});

const cs50 = getDefaultProgrammeDefinition();
const branded: ProgrammeDefinition = {
  ...programvareutviklingDefinition,
  content: {
    ...programvareutviklingDefinition.content,
    terminology: {
      ...programvareutviklingDefinition.content.terminology,
      shellBrand: 'Syntetisk merkenavn',
    },
  },
};

beforeEach(() => {
  injected.registry = createProgrammeRegistry({
    defaultProgrammeId: 'cs50x',
    definitions: [cs50, branded],
  });
  closeSharedDatabase();
  getSharedDatabase({
    programmeId: 'cs50x',
    authorizedCatalogues: [
      { courseId: cs50.catalogue.courseId, programmeId: 'cs50x' },
      {
        courseId: branded.catalogue.courseId,
        programmeId: branded.programmeId,
      },
    ],
  });
});

afterEach(() => {
  injected.registry = null;
});

async function onboard() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

describe('programme-aware shell brand', () => {
  it('keeps the existing brand while CS50 is active', async () => {
    await onboard();
    await renderAppAtRoute('/dashboard');

    await waitFor(() => {
      expect(
        screen.getAllByText('ProgressPal CS50 Edition').length,
      ).toBeGreaterThan(0);
    });
    expect(document.title).toContain('ProgressPal CS50 Edition');
  });

  it('shows a programme-owned brand, and not the CS50 brand, when that programme is active', async () => {
    await onboard();
    await enrolAndSwitchActiveProgramme(branded.programmeId, {
      seed: branded.catalogue,
    });
    await renderAppAtRoute('/dashboard');

    await waitFor(() => {
      expect(screen.getAllByText('Syntetisk merkenavn').length).toBeGreaterThan(
        0,
      );
    });
    expect(screen.queryByText('ProgressPal CS50 Edition')).toBeNull();
    expect(document.title).toContain('Syntetisk merkenavn');
  });

  it('carries the decided product brand in the real Programvareutvikling definition (OD-6)', () => {
    expect(programvareutviklingDefinition.content.terminology.shellBrand).toBe(
      'ProgressPal',
    );
  });
});
