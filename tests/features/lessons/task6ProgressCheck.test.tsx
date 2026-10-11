import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import { lessonSteps } from '@/features/lessons/model';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  getDatabaseSnapshot,
  initializeDatabase,
  listLearnerEvidence,
  listXpTransactions,
  saveLearnerProfile,
  saveLessonPosition,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import type { LessonExercise } from '@/lib/domain';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import { p2Index, p2Modules } from '../../programmes/p2Content';

/**
 * Task 6 (S1-M01-P05-E06, ten steps of the development process) after the
 * owner's 2026-10-10 review: the learner can check their work so far twice,
 * at four and at seven placed steps, and hears only how many placed steps
 * stand right, never which. The check is formative and local: no attempt, no
 * result, no XP, no mastery. "Sjekk svaret" still needs all ten steps and
 * goes through the normal evaluation. Placed steps can be moved up or down
 * without clearing the others. Every other ordering and matching task keeps
 * its accepted widget.
 */

const p2 = programvareutviklingDefinition;
const task6Subject = 's1-m01-p05-e06';
const steps = [
  'Problem',
  'Behov',
  'Krav',
  'Modellering',
  'Planlegging',
  'Programmering',
  'Testing',
  'Forbedring',
  'Dokumentasjon',
  'Presentasjon',
] as const;

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

async function openTask6() {
  await renderAppAtRoute('/course/s1-m01-o04');
  const lesson = await screen.findByRole(
    'article',
    { name: /./ },
    { timeout: 15_000 },
  );
  const card = within(lesson).getByRole('group', { name: /^Oppgave 6 · / });

  await waitFor(() =>
    expect(
      within(card).getByRole('button', { name: 'Sjekk svaret' }),
    ).toBeEnabled(),
  );
  return card;
}

/** Uses a control in the same synchronous step that sees it enabled. */
async function whenEnabled(
  control: () => HTMLElement,
  act: (element: HTMLElement) => void = (element) => fireEvent.click(element),
) {
  for (;;) {
    await waitFor(() => expect(control()).toBeEnabled());
    const element = control();

    if (!(element as HTMLButtonElement).disabled) {
      act(element);
      return;
    }
  }
}

async function place(card: HTMLElement, names: readonly string[]) {
  for (const name of names) {
    await whenEnabled(() =>
      within(card).getByRole('button', { name: `Legg til: ${name}` }),
    );
  }
}

const checkButton = (card: HTMLElement) =>
  within(card).getByRole('button', { name: 'Sjekk så langt' });

/** The visible order, one placed step (or empty place) per list item. */
function placedOrder(card: HTMLElement) {
  return within(within(card).getByRole('list', { name: 'Din rekkefølge' }))
    .getAllByRole('listitem')
    .map(
      (item) =>
        item.querySelector('.lesson-order__name')?.textContent?.trim() ??
        item.textContent?.trim() ??
        '',
    );
}

async function nothingRecorded() {
  expect(await listLearnerEvidence()).toEqual([]);
  expect(await listXpTransactions({ programmeId: p2.programmeId })).toEqual([]);
  expect((await getDatabaseSnapshot()).achievementUnlocks).toEqual([]);
}

describe('Task 6: Sjekk så langt is a limited, aggregate, formative check', () => {
  it('shows progress and offers the first check only from four placed steps', async () => {
    const card = await openTask6();

    expect(card).toHaveTextContent('Plassert: 0 av 10');
    expect(card).toHaveTextContent('Gratis, og teller ikke som svar.');
    expect(checkButton(card)).toBeDisabled();
    expect(checkButton(card)).toHaveAccessibleDescription(
      'Velg fire steg før du kan sjekke.',
    );

    await place(card, steps.slice(0, 3));
    expect(card).toHaveTextContent('Plassert: 3 av 10');
    expect(checkButton(card)).toBeDisabled();
    expect(checkButton(card)).toHaveAccessibleDescription(
      'Velg ett steg til før du kan sjekke.',
    );

    await place(card, [steps[3]]);
    expect(card).toHaveTextContent('Plassert: 4 av 10');
    await waitFor(() => expect(checkButton(card)).toBeEnabled());
    expect(checkButton(card)).toHaveAccessibleDescription(
      'Du kan sjekke nå (2 igjen).',
    );
  }, 30_000);

  it('says how many placed steps stand right, never which, and records nothing', async () => {
    const card = await openTask6();

    // Places 1 and 4 are right, 2 and 3 are not.
    await place(card, ['Problem', 'Krav', 'Behov', 'Modellering']);
    await whenEnabled(() => checkButton(card));

    expect(
      await within(card).findByText('2 av 4 står riktig.'),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent('Flytt på det som ikke passer.');
    expect(
      within(card).queryByText('Riktig plass', { exact: true }),
    ).toBeNull();
    expect(within(card).queryByText('Feil plass', { exact: true })).toBeNull();
    expect(within(card).queryByRole('status', { name: 'Resultat' })).toBeNull();
    // The arrangement is untouched by the check.
    expect(placedOrder(card).slice(0, 4)).toEqual([
      'Problem',
      'Krav',
      'Behov',
      'Modellering',
    ]);
    await nothingRecorded();
  }, 30_000);

  it('allows a second check after three more steps, then no more', async () => {
    const card = await openTask6();

    await place(card, ['Problem', 'Krav', 'Behov', 'Modellering']);
    await whenEnabled(() => checkButton(card));
    await within(card).findByText('2 av 4 står riktig.');
    expect(checkButton(card)).toBeDisabled();
    expect(checkButton(card)).toHaveAccessibleDescription(
      'Velg tre steg til før du kan sjekke igjen.',
    );

    await place(card, ['Planlegging', 'Programmering', 'Testing']);
    await whenEnabled(() => checkButton(card));

    expect(
      await within(card).findByText('5 av 7 står riktig.'),
    ).toBeInTheDocument();
    expect(checkButton(card)).toBeDisabled();
    expect(checkButton(card)).toHaveAccessibleDescription(
      'Begge sjekkene er brukt. Bruk «Sjekk svaret» når du er klar.',
    );
    await nothingRecorded();
  }, 30_000);

  it('after a late first check, the second needs three places changed since then', async () => {
    const card = await openTask6();

    await place(card, steps.slice(0, 6));
    await whenEnabled(() => checkButton(card));
    expect(
      await within(card).findByText('6 av 6 står riktig.'),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent('Fortsett med neste steg.');

    // One more step: seven placed, but only one place changed. The line says
    // the order must change too, not that more steps must be chosen.
    await place(card, [steps[6]]);
    expect(checkButton(card)).toBeDisabled();
    expect(checkButton(card)).toHaveAccessibleDescription(
      'Endre rekkefølgen litt før du kan sjekke igjen.',
    );

    // Moving the first step down changes two more places.
    await whenEnabled(() =>
      within(card).getByRole('button', { name: 'Flytt ned: Problem' }),
    );
    expect(placedOrder(card).slice(0, 3)).toEqual(['Behov', 'Problem', 'Krav']);
    await waitFor(() => expect(checkButton(card)).toBeEnabled());
  }, 30_000);

  it('is not offered when at most one step remains: the whole answer is checked instead', async () => {
    const card = await openTask6();

    await place(card, steps.slice(0, 9));
    expect(checkButton(card)).toBeDisabled();
    expect(checkButton(card)).toHaveAccessibleDescription(
      'Nesten ferdig. Bruk «Sjekk svaret» når du er klar.',
    );
  }, 30_000);

  it('counts a double click as one check', async () => {
    const card = await openTask6();

    await place(card, steps.slice(0, 4));
    await whenEnabled(
      () => checkButton(card),
      (button) => {
        fireEvent.click(button);
        fireEvent.click(button);
      },
    );
    await within(card).findByText('4 av 4 står riktig.');
    expect(checkButton(card)).toHaveAccessibleDescription(
      'Velg tre steg til før du kan sjekke igjen.',
    );
  }, 30_000);

  it('can be used by keyboard alone (Enter and Space on native buttons)', async () => {
    const user = userEvent.setup();
    const card = await openTask6();

    for (const name of steps.slice(0, 4)) {
      await waitFor(() =>
        expect(
          within(card).getByRole('button', { name: `Legg til: ${name}` }),
        ).toBeEnabled(),
      );
      within(card)
        .getByRole('button', { name: `Legg til: ${name}` })
        .focus();
      await user.keyboard(name === 'Behov' ? ' ' : '{Enter}');
    }
    await waitFor(() => expect(checkButton(card)).toBeEnabled());
    checkButton(card).focus();
    await user.keyboard('{Enter}');

    expect(
      await within(card).findByText('4 av 4 står riktig.'),
    ).toBeInTheDocument();
  }, 30_000);
});

describe('Task 6: the scored answer and editing', () => {
  it('Sjekk svaret still needs all ten steps, then evaluates once and awards the task once', async () => {
    const card = await openTask6();

    await place(card, steps.slice(0, 7));
    await whenEnabled(() =>
      within(card).getByRole('button', { name: 'Sjekk svaret' }),
    );
    expect(
      await within(card).findByText('Fyll ut hele svaret før du sjekker det.'),
    ).toBeInTheDocument();
    expect(await listLearnerEvidence()).toEqual([]);

    await place(card, steps.slice(7));
    await whenEnabled(() =>
      within(card).getByRole('button', { name: 'Sjekk svaret' }),
    );
    expect(
      await within(card).findByRole(
        'status',
        { name: 'Resultat' },
        { timeout: 15_000 },
      ),
    ).toHaveTextContent('Riktig');

    const rows = await listLearnerEvidence();
    expect(rows.map((row) => row.kind)).toEqual([
      'exercise_attempt',
      'evaluation_result',
    ]);
    expect(
      (await listXpTransactions({ programmeId: p2.programmeId })).filter(
        (row) =>
          row.sourceType === 'exercise_solved' && row.sourceId === task6Subject,
      ),
    ).toHaveLength(1);
  }, 30_000);

  it('moves a placed step up or down without disturbing the others, keeping focus on it', async () => {
    const card = await openTask6();

    await place(card, ['Problem', 'Krav', 'Behov']);
    expect(
      within(card).getByRole('button', { name: 'Flytt opp: Problem' }),
    ).toBeDisabled();

    await whenEnabled(
      () => within(card).getByRole('button', { name: 'Flytt ned: Krav' }),
      (button) => {
        button.focus();
        fireEvent.click(button);
      },
    );

    expect(placedOrder(card).slice(0, 3)).toEqual(['Problem', 'Behov', 'Krav']);
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName('Flytt ned: Krav'),
    );
    expect(card).toHaveTextContent('Krav er flyttet til plass 3.');

    await whenEnabled(
      () => within(card).getByRole('button', { name: 'Flytt opp: Krav' }),
      (button) => {
        button.focus();
        fireEvent.click(button);
      },
    );
    expect(placedOrder(card).slice(0, 3)).toEqual(['Problem', 'Krav', 'Behov']);
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName('Flytt opp: Krav'),
    );
    expect(card).toHaveTextContent('Plassert: 3 av 10');
  }, 30_000);

  it('removes one placed step back to the pool and fills that place with the next choice', async () => {
    const card = await openTask6();

    await place(card, ['Problem', 'Krav', 'Behov']);
    await whenEnabled(() =>
      within(card).getByRole('button', { name: 'Fjern: Krav' }),
    );
    expect(placedOrder(card).slice(0, 3)).toEqual([
      'Problem',
      'Tom plass',
      'Behov',
    ]);
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName('Legg til: Krav'),
    );

    await place(card, ['Krav']);
    // The empty place is filled; the steps after it stay where they were.
    expect(placedOrder(card).slice(0, 3)).toEqual(['Problem', 'Krav', 'Behov']);
  }, 30_000);

  it('shows only the next empty place, not a column of empty places', async () => {
    const card = await openTask6();

    expect(placedOrder(card)).toEqual(['Tom plass']);
    await place(card, ['Problem', 'Behov']);
    expect(placedOrder(card)).toEqual(['Problem', 'Behov', 'Tom plass']);
  }, 30_000);

  it('keeps the right places on an ordinary retry and does not renew the checks', async () => {
    const card = await openTask6();
    const wrong = [...steps];
    [wrong[2], wrong[3]] = [wrong[3]!, wrong[2]!];

    await place(card, wrong.slice(0, 4));
    await whenEnabled(() => checkButton(card));
    await within(card).findByText('2 av 4 står riktig.');
    await place(card, wrong.slice(4));
    await whenEnabled(() =>
      within(card).getByRole('button', { name: 'Sjekk svaret' }),
    );
    expect(
      await within(card).findByRole(
        'status',
        { name: 'Resultat' },
        { timeout: 15_000 },
      ),
    ).toHaveTextContent('Ikke riktig ennå');

    await whenEnabled(() =>
      within(card).getByRole('button', { name: 'Prøv igjen' }),
    );
    expect(card).toHaveTextContent('Plassert: 8 av 10');
    expect(within(card).queryByText(/står riktig\./)).toBeNull();
    expect(checkButton(card)).toHaveAccessibleDescription(
      /^(Velg .* til før du kan sjekke igjen|Du kan sjekke nå \(1 igjen\))/,
    );
    expect(
      (await listLearnerEvidence()).filter(
        (row) => row.kind === 'exercise_attempt',
      ),
    ).toHaveLength(1);
  }, 30_000);
});

type SortExercise = Extract<LessonExercise, { type: 'sort' }> & {
  id: string;
};

const otherSorts = Object.values(p2Modules)
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
      (block as { kind?: string }).kind !== 'classify' &&
      (block as { id?: string }).id !== 'S1-M01-P05-E06',
  ) as unknown as SortExercise[];

describe('scope: the check and the move controls are Task 6 only', () => {
  it('is configured for exactly Task 6, a formative ordering task outside every gate', () => {
    const configured = p2.content.lessons?.progressCheckSubjectIds;

    expect(configured).toEqual([task6Subject]);
    for (const subjectId of configured ?? []) {
      const meta = p2Index.exercises.find(
        (entry) => entry.subjectId === subjectId,
      );

      expect(meta).toMatchObject({
        responseMode: 'sort',
        evaluatorMode: 'order',
        role: 'formative',
        masteryGate: false,
        optional: false,
      });
    }
  }, 30_000);

  it.each(otherSorts.map((exercise) => [exercise.id, exercise] as const))(
    '%s keeps its accepted widget: no check, no move controls',
    async (_id, exercise) => {
      const itemId = await bookmarkStageOf(exercise);

      await renderAppAtRoute(`/course/${itemId}`);
      const lesson = await screen.findByRole(
        'article',
        { name: /./ },
        { timeout: 15_000 },
      );
      const card = cardFor(lesson, exercise);

      expect(
        within(card).queryByRole('button', { name: 'Sjekk så langt' }),
      ).toBeNull();
      expect(
        within(card).queryAllByRole('button', { name: /^Flytt (opp|ned): / }),
      ).toEqual([]);
      expect(card.textContent).not.toMatch(/Plassert: \d+ av \d+/);
    },
    30_000,
  );
});

/**
 * Saves the bookmark at the task's own step, so its lesson opens on the
 * stage that holds it and nothing is written while the test looks.
 */
async function bookmarkStageOf(exercise: SortExercise) {
  const meta = p2Index.exercises.find(
    (entry) => entry.exerciseId === exercise.id,
  )!;
  const itemId = p2Index.modules
    .flatMap((module) => module.missions)
    .find((entry) => entry.missionId === meta.missionId)!.itemId;
  const loaded = await p2.content.lessons!.loadLesson(itemId);

  if (loaded.status !== 'ready') {
    throw new Error(`lesson ${itemId} did not load`);
  }

  const step = lessonSteps(loaded.value).find(
    (candidate) =>
      candidate.block.t === 'exercise' &&
      (candidate.block as { id?: string }).id === exercise.id,
  )!;

  await saveLessonPosition({
    itemId,
    programmeId: p2.programmeId,
    contentVersion: loaded.value.contentVersion,
    unitId: step.unitId.toLowerCase(),
    stepIndex: step.stepIndex,
  });
  return itemId;
}

/** The card of a sorting task on the stage on screen. */
function cardFor(lesson: HTMLElement, exercise: SortExercise) {
  const plain = (text: string) => text.replace(/[‹›`]/g, '');
  const card = within(lesson)
    .queryAllByRole('group', { name: /^Oppgave \d+ · / })
    .find((candidate) =>
      exercise.kind === 'order'
        ? within(candidate).queryByRole('group', {
            name: 'Steg å plassere',
          }) !== null &&
          exercise.items.every((item) =>
            (candidate.textContent ?? '').includes(plain(item[0]!)),
          )
        : within(candidate).queryAllByRole('combobox').length ===
            exercise.items.length &&
          (candidate.textContent ?? '').includes(exercise.items[0]![0]!),
    );

  if (card === undefined) {
    throw new Error(`no card for ${exercise.id}`);
  }

  return card;
}
