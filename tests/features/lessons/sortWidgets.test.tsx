import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import type { LessonExercise } from '@/lib/domain';
import { localCoordinationStorageKeys } from '@/lib/storage';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import { p2Index, p2Modules } from '../../programmes/p2Content';

/**
 * Every ordering and matching exercise Programme #2 ships, answered through
 * the real widgets and judged by the real evaluator. The ordering widget is
 * shared by six exercises (one a checkpoint item) and the matching widget by
 * two, so a change to either has to hold for all of them, not only the two
 * the learner reported.
 */

const p2 = programvareutviklingDefinition;

type SortExercise = Extract<LessonExercise, { type: 'sort' }> & {
  id: string;
};

const sorts = Object.values(p2Modules)
  .flatMap(
    (module) =>
      (module as unknown as { units: Array<{ flow: Array<{ t: string }> }> })
        .units,
  )
  .flatMap((unit) => unit.flow)
  .filter(
    (block) =>
      block.t === 'exercise' &&
      (block as { type?: string }).type === 'sort' &&
      (block as { kind?: string }).kind !== 'classify',
  ) as unknown as SortExercise[];

/** The lesson (catalogue item) that holds an exercise. */
function itemOf(exercise: SortExercise) {
  const meta = p2Index.exercises.find(
    (entry) => entry.exerciseId === exercise.id,
  )!;
  const mission = p2Index.modules
    .flatMap((module) => module.missions)
    .find((entry) => entry.missionId === meta.missionId)!;

  return mission.itemId;
}

beforeEach(() => {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(localCoordinationStorageKeys.message);
  localStorage.removeItem(localCoordinationStorageKeys.revision);
});

async function openLesson(itemId: string) {
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
  await renderAppAtRoute(`/course/${itemId}`);
  return screen.findByRole('article', { name: /./ }, { timeout: 15_000 });
}

/** The exercise card holding the task, moving through stages when needed. */
async function cardFor(lesson: HTMLElement, exercise: SortExercise) {
  const find = () =>
    within(lesson)
      .queryAllByRole('group', { name: /^Oppgave \d+ · / })
      .find((card) =>
        exercise.kind === 'order'
          ? within(card).queryByRole('list', { name: 'Din rekkefølge' }) !==
              null &&
            exercise.items.every((item) =>
              (card.textContent ?? '').includes(item[0]!.replace(/[‹›`]/g, '')),
            )
          : within(card).queryAllByRole('combobox').length ===
              exercise.items.length &&
            (card.textContent ?? '').includes(exercise.items[0]![0]!),
      );

  for (let guard = 0; guard < 6; guard += 1) {
    const card = find();

    if (card !== undefined) {
      return card;
    }

    const next = within(lesson).queryByRole('button', {
      name: 'Neste etappe',
    });

    if (next === null) {
      break;
    }
    fireEvent.click(next);
    await waitFor(() => expect(find() ?? lesson).toBeTruthy());
  }

  throw new Error(`no card for ${exercise.id}`);
}

describe.each(sorts.map((exercise) => [exercise.id, exercise] as const))(
  '%s',
  (_id, exercise) => {
    it('is answered correctly through its widget and accepted by the evaluator', async () => {
      const lesson = await openLesson(itemOf(exercise));
      const card = await cardFor(lesson, exercise);

      // Controls stay disabled until this tab holds the local write lease.
      await waitFor(() =>
        expect(
          within(card).getByRole('button', { name: 'Sjekk svaret' }),
        ).toBeEnabled(),
      );

      if (exercise.kind === 'order') {
        for (const item of exercise.items) {
          fireEvent.click(
            within(card).getByRole('button', {
              name: `Legg til: ${item[0]!.replace(/[‹›`]/g, '')}`,
            }),
          );
        }
      } else {
        for (const [left, right] of exercise.items) {
          fireEvent.change(
            within(card).getByRole('combobox', {
              name: left!.replace(/[‹›`]/g, ''),
            }),
            { target: { value: right! } },
          );
        }
      }
      fireEvent.click(
        within(card).getByRole('button', { name: 'Sjekk svaret' }),
      );

      const result = await within(card).findByRole('status', {
        name: 'Resultat',
      });

      expect(result).toHaveTextContent('Riktig');
    }, 30_000);
  },
);

describe('ordering keeps keyboard focus inside the pool', () => {
  it('moves focus to the next step after one is chosen, and back to a removed step', async () => {
    const task = sorts.find((exercise) => exercise.id === 'S1-M01-P05-E06')!;
    const lesson = await openLesson('s1-m01-o04');
    const card = await cardFor(lesson, task);
    const pool = () =>
      within(card).getByRole('group', { name: 'Steg å plassere' });
    const first = within(pool()).getAllByRole('button')[0]!;
    const firstName = first
      .getAttribute('aria-label')!
      .replace('Legg til: ', '');

    first.focus();
    fireEvent.click(first);

    await waitFor(() =>
      expect(pool().contains(document.activeElement)).toBe(true),
    );
    expect(within(pool()).getAllByRole('button')).toHaveLength(9);

    fireEvent.click(
      within(card).getByRole('button', { name: `Fjern: ${firstName}` }),
    );

    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute(
        'aria-label',
        `Legg til: ${firstName}`,
      ),
    );
  });
});
