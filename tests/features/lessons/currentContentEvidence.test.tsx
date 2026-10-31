import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  addXpTransaction,
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  listLearnerEvidence,
  listXpTransactions,
  recordEvaluationResult,
  saveLearnerProfile,
  submitExerciseAttempt,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import type { ContentExerciseMeta, EvaluationOutcome } from '@/lib/domain';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import { p2Index } from '../../programmes/p2Content';

/**
 * Evidence is bound to the content hash of the exercise the learner
 * answered. When an authored exercise changes, its hash changes, and an
 * answer to the earlier version is history, not the state of the task the
 * learner sees now. XP (`planLessonXpAwards`) and mastery
 * (`deriveProgrammeMastery`, `stale_binding`) already read only
 * current-hash evidence; the lesson surface (the exercise card's result,
 * answer and retry state, and a closed lesson's "already correct" note)
 * must agree with them. The stored history itself is never changed.
 *
 * Every row here is a synthetic fixture on a fresh learner.
 */

const p2 = programvareutviklingDefinition;
const metaOf = (exerciseId: string): ContentExerciseMeta =>
  p2Index.exercises.find((entry) => entry.exerciseId === exerciseId)!;

// Lesson s1-m01-o01, exercise 3: a formative choice task whose right
// option is `a` ("Du har ikke lagret filen etter endringen.").
const formative = metaOf('S1-M01-P01-E03');
// Lesson s1-m01-o01, exercise 5: another choice task in the same lesson.
const neighbour = metaOf('S1-M01-P01-E05');
// The M01 module checkpoint (a closed lesson): a gate choice task whose
// right option is `a` (" M skilt.py").
const gate = metaOf('S1-M01-CHK-E04');
// A well-formed SHA-256 that no current exercise carries: the binding of an
// answer given to an earlier version of the same exercise.
const earlierHash = '0'.repeat(64);
const earlierVersion = p2Index.contentVersion - 1;

const alreadyCorrectNote = /Du har svart riktig på denne før/;

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

/** One stored answer and its terminal result, written outside the UI. */
async function storeAnswer(options: {
  readonly meta: ContentExerciseMeta;
  readonly key: string;
  readonly hash: 'current' | 'earlier';
  readonly selected: string;
  readonly outcome: EvaluationOutcome;
}) {
  const current = options.hash === 'current';

  await submitExerciseAttempt({
    id: `attempt-${options.key}`,
    programmeId: p2.programmeId,
    contentVersion: current ? p2Index.contentVersion : earlierVersion,
    subjectId: options.meta.subjectId,
    contentHash: current ? options.meta.contentHash : earlierHash,
    responseMode: 'mcq',
    answer: { selected: [options.selected] },
  });
  await recordEvaluationResult({
    id: `result-${options.key}`,
    attemptId: `attempt-${options.key}`,
    outcome: options.outcome,
  });
}

async function openLesson(itemId: string) {
  await renderAppAtRoute(`/course/${itemId}`);
  return screen.findByRole('article', { name: /./ }, { timeout: 15_000 });
}

// Exercise numbers identify the learner-visible groups. Prompt prose
// is not the subject of these evidence/history tests; answer labels below are.
function exerciseGroup(lesson: HTMLElement, number: number) {
  return within(lesson).getByRole('group', {
    name: `Oppgave ${number} · Flervalg`,
  });
}

// S1-M01-P01-E03, S1-M01-P01-E05 and S1-M01-CHK-E04, respectively.
const formativeNumber = 3;
const neighbourNumber = 5;
const gateNumber = 4;

/** The tab may write: the hint control is enabled whatever the answer state. */
async function writable(group: HTMLElement) {
  await waitFor(() =>
    expect(
      within(group).getByRole('button', { name: /Vis hint/ }),
    ).toBeEnabled(),
  );
}

/** The task as a learner meets it for the first time. */
async function expectUnanswered(group: HTMLElement) {
  await writable(group);
  expect(within(group).queryByRole('status', { name: /Resultat/ })).toBeNull();
  expect(
    within(group).queryByRole('button', { name: 'Prøv igjen' }),
  ).toBeNull();
  expect(
    within(group).getByRole('button', { name: 'Sjekk svaret' }),
  ).toBeEnabled();
  for (const radio of within(group).getAllByRole('radio')) {
    expect(radio).not.toBeChecked();
    expect(radio).toBeEnabled();
  }
}

describe('the lesson presents only evidence about the current version of an exercise', () => {
  it('shows no result, answer or retry from an answer to an earlier version, and keeps that history', async () => {
    await storeAnswer({
      meta: formative,
      key: 'earlier',
      hash: 'earlier',
      selected: 'a',
      outcome: 'correct',
    });
    const lesson = await openLesson('s1-m01-o01');
    const group = exerciseGroup(lesson, formativeNumber);

    await expectUnanswered(group);
    expect(group.textContent).not.toMatch(/Riktig/);
    // History is never rewritten: the earlier answer stays stored as it was.
    expect(await listLearnerEvidence()).toEqual([
      expect.objectContaining({
        id: 'attempt-earlier',
        contentHash: earlierHash,
      }),
      expect.objectContaining({
        id: 'result-earlier',
        contentHash: earlierHash,
        outcome: 'correct',
      }),
    ]);
  });

  it('lets the learner answer the changed exercise, without earning that task XP twice', async () => {
    await storeAnswer({
      meta: formative,
      key: 'earlier',
      hash: 'earlier',
      selected: 'a',
      outcome: 'correct',
    });
    // The XP the earlier version earned when it was current.
    await addXpTransaction({
      programmeId: p2.programmeId,
      sourceType: 'exercise_solved',
      sourceId: formative.subjectId,
      xp: 5,
      reason: 'Earlier version solved',
      awardedAt: new Date('2026-10-01T10:00:00.000Z').toISOString(),
    });
    const lesson = await openLesson('s1-m01-o01');
    const group = exerciseGroup(lesson, formativeNumber);

    await expectUnanswered(group);
    fireEvent.click(
      within(group).getByRole('radio', {
        name: /Du har ikke lagret filen etter endringen/,
      }),
    );
    fireEvent.click(
      within(group).getByRole('button', { name: 'Sjekk svaret' }),
    );
    const status = await within(group).findByRole(
      'status',
      { name: /Resultat/ },
      { timeout: 15_000 },
    );

    expect(status).toHaveTextContent('Riktig');
    // The once-per-task XP was already earned; the changed version adds none.
    expect(status.textContent).not.toMatch(/\+\d+ XP/);
    const solved = (
      await listXpTransactions({ programmeId: p2.programmeId })
    ).filter(
      (row) =>
        row.sourceType === 'exercise_solved' &&
        row.sourceId === formative.subjectId,
    );
    expect(solved).toHaveLength(1);
    const attempts = (await listLearnerEvidence()).filter(
      (row) => row.kind === 'exercise_attempt',
    );
    expect(attempts.map((row) => [row.attemptNumber, row.contentHash])).toEqual(
      [
        [1, earlierHash],
        [2, formative.contentHash],
      ],
    );
  });

  it('presents a result for the current version normally', async () => {
    await storeAnswer({
      meta: formative,
      key: 'current',
      hash: 'current',
      selected: 'a',
      outcome: 'correct',
    });
    const lesson = await openLesson('s1-m01-o01');
    const group = exerciseGroup(lesson, formativeNumber);
    const status = await within(group).findByRole(
      'status',
      { name: /Resultat/ },
      { timeout: 15_000 },
    );

    expect(status).toHaveTextContent('Riktig');
    expect(
      within(group).getByRole('radio', {
        name: /Du har ikke lagret filen etter endringen/,
      }),
    ).toBeChecked();
    expect(
      within(group).queryByRole('button', { name: 'Sjekk svaret' }),
    ).toBeNull();
  });

  it('in a mixed history shows the current version’s latest result and its ordinary retry', async () => {
    await storeAnswer({
      meta: formative,
      key: 'earlier',
      hash: 'earlier',
      selected: 'a',
      outcome: 'correct',
    });
    await storeAnswer({
      meta: formative,
      key: 'current',
      hash: 'current',
      selected: 'b',
      outcome: 'incorrect',
    });
    const lesson = await openLesson('s1-m01-o01');
    const group = exerciseGroup(lesson, formativeNumber);
    const status = await within(group).findByRole(
      'status',
      { name: /Resultat/ },
      { timeout: 15_000 },
    );

    expect(status).toHaveTextContent('Ikke riktig ennå');
    const retry = within(group).getByRole('button', { name: 'Prøv igjen' });
    await waitFor(() => expect(retry).toBeEnabled());
    fireEvent.click(retry);
    await waitFor(() =>
      expect(
        within(group).getByRole('button', { name: 'Sjekk svaret' }),
      ).toBeEnabled(),
    );
    expect(
      within(group).queryByRole('status', { name: /Resultat/ }),
    ).toBeNull();
  });

  it('leaves a task untouched by evidence about another task in the lesson', async () => {
    await storeAnswer({
      meta: neighbour,
      key: 'neighbour',
      hash: 'current',
      selected: 'a',
      outcome: 'correct',
    });
    const lesson = await openLesson('s1-m01-o01');

    await expectUnanswered(exerciseGroup(lesson, formativeNumber));
    expect(
      await within(exerciseGroup(lesson, neighbourNumber)).findByRole(
        'status',
        { name: /Resultat/ },
        { timeout: 15_000 },
      ),
    ).toBeInTheDocument();
  });
});

describe('a closed lesson claims “already correct” only for the current version', () => {
  it('does not present an earlier version’s correct answer as already correct, and the checkpoint counts nothing for it', async () => {
    await storeAnswer({
      meta: gate,
      key: 'earlier',
      hash: 'earlier',
      selected: 'a',
      outcome: 'correct',
    });
    const lesson = await openLesson('s1-m01-chk');
    const group = exerciseGroup(lesson, gateNumber);

    await expectUnanswered(group);
    expect(group.textContent).not.toMatch(alreadyCorrectNote);
    expect(lesson).toHaveTextContent(/Fullførte deler: 0 av \d+\./);
  });

  it('does not claim already correct when the current version was answered wrongly after an earlier version was right', async () => {
    await storeAnswer({
      meta: gate,
      key: 'earlier',
      hash: 'earlier',
      selected: 'a',
      outcome: 'correct',
    });
    await storeAnswer({
      meta: gate,
      key: 'current',
      hash: 'current',
      selected: 'b',
      outcome: 'incorrect',
    });
    const lesson = await openLesson('s1-m01-chk');
    const group = exerciseGroup(lesson, gateNumber);
    const status = await within(group).findByRole(
      'status',
      { name: /Resultat/ },
      { timeout: 15_000 },
    );

    expect(status).toHaveTextContent('Ikke riktig ennå');
    expect(group.textContent).not.toMatch(alreadyCorrectNote);
  });

  it('still says already correct for a current-version correct answer', async () => {
    await storeAnswer({
      meta: gate,
      key: 'current',
      hash: 'current',
      selected: 'a',
      outcome: 'correct',
    });
    const lesson = await openLesson('s1-m01-chk');
    const group = exerciseGroup(lesson, gateNumber);

    expect(
      await within(group).findByText(
        alreadyCorrectNote,
        {},
        { timeout: 15_000 },
      ),
    ).toBeInTheDocument();
    expect(
      within(group).getByRole('status', { name: /Resultat/ }),
    ).toHaveTextContent('Riktig');
  });
});
