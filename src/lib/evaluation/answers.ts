import {
  answerBounds,
  findAnswerPayloadIssues,
  type ExerciseAnswer,
  type LessonExercise,
} from '@/lib/domain';

/**
 * The input surface (E-SCHEMA-1 §3, prompt §3 item 7): an answer that is
 * over its bound, malformed or incomplete is refused before submission with
 * an explanation, and never becomes an attempt. Partial structured answers
 * are kept while editing (DC-13) and judged only when complete and
 * submitted.
 */

export type AnswerReadiness =
  | { readonly ready: true }
  | {
      readonly ready: false;
      readonly reason: 'incomplete' | 'too_large' | 'malformed';
    };

const ready: AnswerReadiness = { ready: true };
const refuse = (
  reason: 'incomplete' | 'too_large' | 'malformed',
): AnswerReadiness => ({ ready: false, reason });

const isFilled = (value: string) => value.trim().length > 0;
const tooLong = (value: unknown, limit: number) =>
  typeof value === 'string' && [...value].length > limit;

/** Text payloads over their mode's ceiling (checked before the shape). */
function exceedsBound(exercise: LessonExercise, answer: unknown): boolean {
  const record = (answer ?? {}) as Record<string, unknown>;
  const shortValues = (values: unknown) =>
    Array.isArray(values) &&
    values.some((value) => tooLong(value, answerBounds.shortValueChars));

  switch (exercise.type) {
    case 'program':
      return tooLong(record.source, answerBounds.programSourceChars);
    case 'predict':
    case 'reflect':
      return tooLong(record.text, answerBounds.freeTextChars);
    case 'evidence':
      return tooLong(record.text, answerBounds.pastedOutputChars);
    case 'cmd':
      return tooLong(record.command, answerBounds.commandChars);
    case 'fill':
      return shortValues(record.blanks);
    case 'trace':
      return (
        Array.isArray(record.cells) &&
        record.cells.some((row: unknown) => shortValues(row))
      );
    case 'testtable':
      return (
        Array.isArray(record.rows) &&
        record.rows.some(
          (row: { inputs?: unknown; expected?: unknown }) =>
            shortValues(row?.inputs) ||
            tooLong(row?.expected, answerBounds.shortValueChars),
        )
      );
    default:
      return false;
  }
}

export function checkAnswerReadiness(
  exercise: LessonExercise,
  answer: unknown,
): AnswerReadiness {
  if (exceedsBound(exercise, answer)) {
    return refuse('too_large');
  }

  if (findAnswerPayloadIssues(exercise.response_mode, answer).length > 0) {
    return refuse('malformed');
  }

  const value = answer as ExerciseAnswer;

  switch (exercise.type) {
    case 'mcq': {
      const { selected } = value as { selected: string[] };
      const ids = new Set(exercise.options.map((option) => option.id));

      if (selected.some((id) => !ids.has(id))) {
        return refuse('malformed');
      }
      if (new Set(selected).size !== selected.length) {
        return refuse('malformed');
      }
      if (selected.length === 0 || (!exercise.multi && selected.length !== 1)) {
        return refuse('incomplete');
      }
      return ready;
    }
    case 'sort': {
      const count = exercise.items.length;

      if (exercise.kind === 'classify') {
        const { categories } = value as { categories?: string[] };
        if (categories === undefined) return refuse('malformed');
        if (
          categories.some(
            (category) =>
              !(exercise.categories ?? []).includes(category) &&
              category !== '',
          )
        ) {
          return refuse('malformed');
        }
        return categories.length === count && categories.every(isFilled)
          ? ready
          : refuse('incomplete');
      }

      if (exercise.kind === 'order') {
        const { order } = value as { order?: number[] };
        if (order === undefined) return refuse('malformed');
        if (order.length !== count) return refuse('incomplete');
        return [...order]
          .sort((a, b) => a - b)
          .every((entry, index) => entry === index)
          ? ready
          : refuse('incomplete');
      }

      const { matches } = value as { matches?: string[] };
      if (matches === undefined) return refuse('malformed');
      const choices = new Set([
        ...exercise.items.map((item) => item[1] ?? ''),
        ...exercise.distractors,
      ]);
      if (matches.some((match) => match !== '' && !choices.has(match))) {
        return refuse('malformed');
      }
      return matches.length === count && matches.every(isFilled)
        ? ready
        : refuse('incomplete');
    }
    case 'assemble': {
      const { slots } = value as { slots: string[] };
      if (slots.length !== exercise.slots.length) return refuse('incomplete');
      return slots.every((id, index) =>
        exercise.slots[index]!.options.some((option) => option.id === id),
      )
        ? ready
        : refuse('malformed');
    }
    case 'fill': {
      const { blanks } = value as { blanks: string[] };
      return blanks.length === exercise.blanks.length && blanks.every(isFilled)
        ? ready
        : refuse('incomplete');
    }
    case 'predict':
    case 'evidence': {
      return isFilled((value as { text: string }).text)
        ? ready
        : refuse('incomplete');
    }
    case 'trace': {
      const { cells } = value as { cells: string[][] };
      const complete =
        cells.length === exercise.table.length &&
        cells.every(
          (row) => row.length === exercise.vars.length && row.every(isFilled),
        );
      return complete ? ready : refuse('incomplete');
    }
    case 'cmd': {
      const { command } = value as { command: string };
      if (/[\r\n]/.test(command)) return refuse('malformed');
      return isFilled(command) ? ready : refuse('incomplete');
    }
    case 'diagnose': {
      const { errorType, cause } = value as {
        errorType: string;
        cause: string;
      };
      if (!exercise.type_options.includes(errorType))
        return refuse('incomplete');
      return exercise.cause_options.some((option) => option.id === cause)
        ? ready
        : refuse('malformed');
    }
    case 'program':
      return isFilled((value as { source: string }).source)
        ? ready
        : refuse('incomplete');
    case 'testtable': {
      const { rows } = value as {
        rows: Array<{ inputs: string[]; expected: string }>;
      };
      const complete =
        rows.length > 0 &&
        rows.every(
          (row) =>
            row.inputs.length === exercise.fields.length &&
            row.inputs.every(isFilled) &&
            isFilled(row.expected),
        );
      return complete ? ready : refuse('incomplete');
    }
    case 'checklist': {
      const { checked } = value as { checked: boolean[] };
      return checked.length === exercise.items.length
        ? ready
        : refuse('malformed');
    }
    case 'reflect': {
      const reflection = value as { text?: string; choice?: string };
      if (reflection.choice !== undefined) {
        return (exercise.choices ?? []).includes(reflection.choice)
          ? ready
          : refuse('malformed');
      }
      return isFilled(reflection.text ?? '') ? ready : refuse('incomplete');
    }
  }
}
