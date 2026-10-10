import type { ExerciseAnswer, LessonExercise } from '@/lib/domain';

/**
 * Answer drafts: a widget's editing state, converted to an answer only on
 * submit (DC-13 keeps partial structured progress while editing).
 */

/** A widget's editing state. Converted to an answer only on submit. */
export type AnswerDraft = Record<string, unknown>;

export function emptyDraft(exercise: LessonExercise): AnswerDraft {
  switch (exercise.type) {
    case 'mcq':
      return { selected: [] };
    case 'sort':
      return exercise.kind === 'order'
        ? { positions: exercise.items.map(() => 0) }
        : exercise.kind === 'classify'
          ? { categories: exercise.items.map(() => '') }
          : { matches: exercise.items.map(() => '') };
    case 'assemble':
      return { slots: exercise.slots.map(() => '') };
    case 'fill':
      return { blanks: exercise.blanks.map(() => '') };
    case 'trace':
      return { cells: exercise.table.map(() => exercise.vars.map(() => '')) };
    case 'cmd':
      return { command: '' };
    case 'diagnose':
      return { errorType: '', line: '', cause: '' };
    case 'program':
      return { source: '' };
    case 'testtable':
      return {
        rows: Array.from({ length: exercise.min_rows }, () => ({
          inputs: exercise.fields.map(() => ''),
          expected: '',
        })),
      };
    case 'checklist':
      return { checked: exercise.items.map(() => false) };
    case 'reflect':
      return exercise.choices === null ? { text: '' } : { choice: '' };
    case 'predict':
    case 'evidence':
      return { text: '' };
  }
}

/** The draft as an answer, or `incomplete` while required parts are empty. */
export function draftToAnswer(
  exercise: LessonExercise,
  draft: AnswerDraft,
): ExerciseAnswer | 'incomplete' {
  switch (exercise.type) {
    case 'sort': {
      if (exercise.kind !== 'order') {
        return draft as ExerciseAnswer;
      }

      const positions = draft.positions as number[];
      const order = positions
        .map((position, itemIndex) => ({ position, itemIndex }))
        .filter((entry) => entry.position > 0)
        .sort((left, right) => left.position - right.position)
        .map((entry) => entry.itemIndex);
      const distinct = new Set(positions).size === positions.length;

      return order.length === positions.length && distinct
        ? { order }
        : 'incomplete';
    }
    case 'assemble': {
      const slots = draft.slots as string[];
      return slots.every((slot) => slot !== '') ? { slots } : 'incomplete';
    }
    case 'diagnose': {
      const line = Number(draft.line);
      return draft.errorType === '' ||
        draft.cause === '' ||
        !Number.isInteger(line) ||
        line < 1
        ? 'incomplete'
        : {
            errorType: draft.errorType as string,
            line,
            cause: draft.cause as string,
          };
    }
    case 'reflect':
      return 'choice' in draft && draft.choice === ''
        ? 'incomplete'
        : (draft as ExerciseAnswer);
    default:
      return draft as ExerciseAnswer;
  }
}

/** The submitted answer, shown again (read-only) beside its result. */
export function answerToDraft(
  exercise: LessonExercise,
  answer: ExerciseAnswer,
): AnswerDraft {
  if (exercise.type === 'sort' && exercise.kind === 'order') {
    const order = (answer as { order: number[] }).order;
    const positions = exercise.items.map(() => 0);
    order.forEach((itemIndex, position) => {
      positions[itemIndex] = position + 1;
    });
    return { positions };
  }

  if (exercise.type === 'diagnose') {
    const value = answer as { errorType: string; line: number; cause: string };
    return { ...value, line: String(value.line) };
  }

  return structuredClone(answer) as AnswerDraft;
}

/**
 * Whether each step of an ordering draft stands in its right place. The
 * authored items are listed in their right order, so item i belongs in
 * place i + 1; an unplaced step (0) is never right.
 */
export function rightOrderPlaces(positions: readonly number[]): boolean[] {
  return positions.map((position, itemIndex) => position === itemIndex + 1);
}

/**
 * Which parts of a submitted ordering or matching answer are in their right
 * place, by item. It reads only the answer and the exercise's own public
 * content; it never decides correctness (the stored evaluation result does).
 * Null for every other kind of exercise.
 */
export function reviewAnswer(
  exercise: LessonExercise,
  answer: ExerciseAnswer,
): readonly boolean[] | null {
  if (exercise.type !== 'sort') {
    return null;
  }

  const draft = answerToDraft(exercise, answer);

  if (exercise.kind === 'order') {
    return rightOrderPlaces(draft.positions as number[]);
  }

  if (exercise.kind === 'match' && exercise.evaluator.mode === 'match') {
    const { pairs } = exercise.evaluator;

    return (draft.matches as string[]).map(
      (match, itemIndex) => match === pairs[itemIndex]?.[1],
    );
  }

  return null;
}

/**
 * The draft a retry starts from. For an ordering or matching task the places
 * that were right stay and the others are cleared, so the learner corrects
 * only what was wrong; every other exercise restores the whole answer.
 */
export function retryDraft(
  exercise: LessonExercise,
  answer: ExerciseAnswer,
): AnswerDraft {
  const draft = answerToDraft(exercise, answer);
  const review = reviewAnswer(exercise, answer);

  if (review === null || exercise.type !== 'sort') {
    return draft;
  }

  return exercise.kind === 'order'
    ? {
        positions: (draft.positions as number[]).map((position, index) =>
          review[index] ? position : 0,
        ),
      }
    : {
        matches: (draft.matches as string[]).map((match, index) =>
          review[index] ? match : '',
        ),
      };
}
