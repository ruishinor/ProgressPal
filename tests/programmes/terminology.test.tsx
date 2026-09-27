import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMapNodeOrdinal } from '@/features/rpg/model/presentation';
import {
  defaultLearnerProfileValues,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import {
  getActiveProgrammeDefinition,
  type ProgrammeTerminology,
} from '@/programmes';
import { bundledCourseSeed } from '@/seed';

/**
 * Epic C / C4 discriminating evidence: rendered consumers read CS50
 * terminology from the active definition. A test-only terminology, injected
 * here and never registered, changes only the programme-owned strings; the
 * canonical unit-type label and the rank label stay shared. Production CS50
 * output is frozen by the C1 oracles in tests/preservation.
 */

const injected = vi.hoisted(() => ({
  terminology: null as ProgrammeTerminology | null,
}));

vi.mock('@/programmes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/programmes')>();

  return {
    ...actual,
    getActiveProgrammeDefinition: () => {
      const definition = actual.getActiveProgrammeDefinition();

      return injected.terminology === null
        ? definition
        : {
            ...definition,
            content: {
              ...definition.content,
              terminology: injected.terminology,
            },
          };
    },
  };
});

const cs50Terminology = getActiveProgrammeDefinition().content.terminology;

/** Test-only terminology: every C4-owned value differs from CS50. */
const testTerminology: ProgrammeTerminology = {
  unitNoun: { lowercase: 'module', capitalized: 'Module' },
  rpgIdentity: {
    guildLabel: 'Test Guild',
    classLabel: 'Test Class',
    pathLabel: 'Test Path',
  },
  unitMapOrdinals: {
    ...cs50Terminology.unitMapOrdinals,
    'week-3': 'III',
    'final-project': 'FP',
  },
  copy: {
    ...cs50Terminology.copy,
    courseMapEyebrow: 'Test course map',
    officialResourceOpenLabel: 'Open test resource',
  },
};

async function onboard() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'C4 Synthetic Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

async function renderReady(route: string, marker: string) {
  await onboard();
  await renderAppAtRoute(route);
  await waitFor(
    () => {
      expect(document.body.textContent ?? '').toContain(marker);
    },
    { timeout: 15_000 },
  );

  return (document.body.textContent ?? '').replace(/\s+/g, ' ');
}

function mapOrdinal(unitId: string) {
  return screen
    .getByTestId(`rpg-module-${unitId}`)
    .querySelector('.rpg-map__node-index')?.textContent;
}

afterEach(() => {
  injected.terminology = null;
});

describe('C4 map ordinal derivation', () => {
  it('takes the ordinal from the programme, never from the unit ID', () => {
    const ordinals = { 'week-3': 'III', 'week-4': '4' };

    expect(
      getMapNodeOrdinal({ id: 'week-3', requiredItemCount: 2 }, ordinals),
    ).toBe('III');
    // A `week-*` ID the programme does not label is not parsed.
    expect(
      getMapNodeOrdinal({ id: 'week-9', requiredItemCount: 2 }, ordinals),
    ).toBe('◆');
    expect(
      getMapNodeOrdinal({ id: 'week-9', requiredItemCount: 0 }, ordinals),
    ).toBe('+');
    expect(
      getMapNodeOrdinal({ id: 'constructor', requiredItemCount: 0 }, ordinals),
    ).toBe('+');
  });

  it('labels every CS50 catalogue unit and nothing else', () => {
    expect(Object.keys(cs50Terminology.unitMapOrdinals).sort()).toEqual(
      bundledCourseSeed.units.map((unit) => unit.id).sort(),
    );
  });
});

describe('C4 rendered consumers read the active programme terminology', () => {
  it(
    'renders the test-only map ordinals and unit noun; the unit-type label stays shared',
    { timeout: 30_000 },
    async () => {
      injected.terminology = testTerminology;
      const text = await renderReady('/rpg/map', 'open any module.');

      expect(mapOrdinal('week-3')).toBe('III');
      expect(mapOrdinal('final-project')).toBe('FP');
      expect(mapOrdinal('week-2')).toBe('2');
      expect(text).not.toContain('open any week');
      expect(
        within(screen.getByTestId('rpg-module-week-3')).getByText('Week'),
      ).toBeInTheDocument();
    },
  );

  it(
    'renders the CS50 map ordinals and unit noun without injection',
    { timeout: 30_000 },
    async () => {
      await renderReady('/rpg/map', 'open any week.');

      expect(mapOrdinal('week-3')).toBe('3');
      expect(mapOrdinal('final-project')).toBe('◆');
    },
  );

  it(
    'renders the test-only identity tuple with the shared rank label',
    { timeout: 30_000 },
    async () => {
      injected.terminology = testTerminology;
      const text = await renderReady('/rpg/hero', 'Test Guild');

      expect(text).toContain('Test Class');
      expect(text).toContain('Test Path');
      expect(text).toContain('New Learner');
      expect(text).not.toContain('Code Knights');
    },
  );

  it(
    'renders the test-only resource copy and unit noun on the RPG resource route',
    { timeout: 30_000 },
    async () => {
      injected.terminology = testTerminology;
      await renderReady('/rpg/resource/week-0-lecture', 'Back to module');

      expect(
        screen.getByRole('link', { name: 'Open test resource' }),
      ).toHaveAttribute('href', 'https://cs50.harvard.edu/x/weeks/0/');
      expect(screen.queryByText('Back to week')).not.toBeInTheDocument();
    },
  );

  it(
    'renders the test-only unit noun on the RPG module route',
    { timeout: 30_000 },
    async () => {
      injected.terminology = testTerminology;
      const moduleText = await renderReady('/rpg/week/week-0', 'RPG module');

      expect(moduleText).not.toContain('RPG week');
    },
  );

  it(
    'renders the test-only copy and unit noun on the Classic course map',
    { timeout: 30_000 },
    async () => {
      injected.terminology = testTerminology;
      const text = await renderReady('/course', 'Module progress');

      expect(text).toContain('Test course map');
      expect(text).not.toContain('Week progress');
      expect(text).not.toContain('CS50 course map');
    },
  );
});
