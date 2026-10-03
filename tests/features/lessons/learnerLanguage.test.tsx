import { screen, waitFor } from '@testing-library/react';
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
import { p2Index as manifest } from '../../programmes/p2Content';

/**
 * Owner decision 2026-10-03 (Epic E continuation §9, §19): learners never see
 * internal assessment, research or platform jargon merely because the data
 * model uses it. This reads what is actually rendered on the
 * Programvareutvikling surfaces (every M01/M02 lesson, the RPG and Classic
 * programme pages) and the programme's own interface copy, which renders in
 * the lesson's other states (feedback, hints, retry, unavailable). Real
 * software-development terms (commit, test, terminal, Python, error ...) are
 * curriculum and stay.
 */

const p2 = programvareutviklingDefinition;

const internalJargon = [
  /\bevidens\w*/i,
  /\bevidence\b/i,
  /selvrapport\w*/i,
  /observatør\w*/i,
  /\bmastery\b/i,
  /\bmestring\w*/i,
  /\bgate\b/i,
  /kvalifiser\w*|\bqualifying\b/i,
  /\bunsupported\b/i,
  /kriteri\w*|\bcriterion\b/i,
  /\bevaluator\w*/i,
  /\bruntime\b/i,
  /\bschema\b/i,
  /\bpayload\b/i,
  /not_evaluable|evaluator_error|critical-gate|mastery_gate/i,
];

function findJargon(text: string) {
  return internalJargon
    .map((pattern) => text.match(pattern)?.[0])
    .filter((match): match is string => match !== undefined);
}

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
  await enrolAndSwitchActiveProgramme(p2.programmeId, { seed: p2.catalogue });
});

const lessonItemIds = manifest.modules.flatMap((module) =>
  module.missions.map((mission) => mission.itemId),
);

describe('no internal jargon on rendered Programvareutvikling surfaces', () => {
  it.each(lessonItemIds)('lesson %s', async (itemId) => {
    await renderAppAtRoute(`/course/${itemId}`);
    const lesson = await screen.findByRole(
      'article',
      { name: /./ },
      { timeout: 15_000 },
    );

    expect(findJargon(lesson.textContent ?? ''), itemId).toEqual([]);
  });

  it.each([
    '/rpg',
    '/rpg/map',
    '/rpg/week/s1-m01',
    '/rpg/hero',
    '/rpg/settings',
    '/dashboard',
    '/course',
    '/settings',
  ])('page %s', async (route) => {
    await renderAppAtRoute(route);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading|Laster/i)).toBeNull();
        expect(
          screen.queryByText(/Preparing RPG|Opening local data/),
        ).toBeNull();
        expect(
          document.querySelector('main')?.textContent?.length ?? 0,
        ).toBeGreaterThan(40);
      },
      { timeout: 15_000 },
    );

    expect(findJargon(document.body.textContent ?? ''), route).toEqual([]);
  });

  it("the programme's own interface copy, shown in every lesson state", () => {
    const lessonCopy = p2.content.lessons!.copy!;
    const strings = [
      ...Object.values(lessonCopy.text),
      ...Object.values(lessonCopy.surfaceLabels),
      ...Object.values(lessonCopy.unitKindLabels),
      ...Object.values(lessonCopy.calloutLabels),
      ...Object.values(lessonCopy.exerciseTypeLabels),
      ...Object.values(p2.content.terminology.copy),
    ];

    expect(
      strings.flatMap((text) =>
        findJargon(text).map((match) => `${match}: ${text}`),
      ),
    ).toEqual([]);
  });

  it('replaces the D-2 observer sentence with the plain statement', async () => {
    await renderAppAtRoute('/course/s1-m01-chk');
    const lesson = await screen.findByRole(
      'article',
      { name: /./ },
      { timeout: 15_000 },
    );

    expect(lesson).toHaveTextContent(
      'ProgressPal kan sjekke teksten du limer inn, men kan ikke se Git-historikken på maskinen din.',
    );
    expect(lesson.textContent).not.toMatch(/beviset er|Observatøren/);
  });
});
