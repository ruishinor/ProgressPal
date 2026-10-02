import { describe, expect, it } from 'vitest';

import {
  evaluateExercise,
  exerciseNeedsRuntime,
  unavailablePythonRuntime,
  type EvaluationVerdict,
  type PythonRunRequest,
  type PythonRunResult,
  type PythonRuntime,
} from '@/lib/evaluation';
import type { ExerciseAnswer, LessonExercise } from '@/lib/domain';
import moduleOne from '@/programmes/programvareutvikling/content/s1-m01.json';
import moduleTwo from '@/programmes/programvareutvikling/content/s1-m02.json';

import vectorsFile from '../../fixtures/programvareutvikling/evaluator-vectors.json';

/**
 * Epic E §3 item 8, DC-18, DC-22, EV-01/02/11/12: the app evaluators agree
 * with the authored expectations on the content's own vectors, item by
 * item, for every runtime-free evaluable exercise; the parity check is
 * itself discriminating (mutations seeded from the negative vectors are
 * detected); and the runtime-backed `program` comparison logic agrees with
 * the authored failure signatures when fed the authored transcripts.
 * Real Python execution parity is gated by the runtime spike.
 */

type Vectors = {
  examples_ok?: string[];
  examples_bad?: string[];
  failure_variants?: Array<{ name: string; code: string; signature: string[] }>;
  reference?: string;
};

const vectors = vectorsFile.exercises as Record<string, Vectors>;
const exercises = [moduleOne, moduleTwo]
  .flatMap(
    (module) =>
      (module as unknown as { units: Array<{ flow: Array<{ t: string }> }> })
        .units,
  )
  .flatMap((unit) => unit.flow)
  .filter((block) => block.t === 'exercise') as unknown as LessonExercise[];

type Expectation = {
  answer: ExerciseAnswer;
  outcome: EvaluationVerdict['outcome'];
  feedbackKey?: string;
  label: string;
};

const fill = (exercise: LessonExercise) =>
  exercise as unknown as Record<string, unknown> & {
    evaluator: Record<string, unknown>;
  };

function rotate<T>(values: readonly T[]): T[] {
  return values.length < 2 ? [...values] : [...values.slice(1), values[0]!];
}

/** The authored positive and negative vectors for one runtime-free exercise. */
function authoredExpectations(exercise: LessonExercise): Expectation[] {
  const x = fill(exercise);
  const ev = x.evaluator;
  const v = vectors[exercise.id] ?? {};
  const out: Expectation[] = [];

  switch (ev.mode) {
    case 'choice': {
      const options = x.options as Array<{ id: string; correct: boolean }>;
      const correct = ev.correct as string[];
      out.push({
        answer: { selected: correct },
        outcome: 'correct',
        label: 'key',
      });
      for (const option of options.filter((entry) => !entry.correct)) {
        out.push({
          answer: { selected: x.multi ? [...correct, option.id] : [option.id] },
          outcome: 'incorrect',
          feedbackKey: `option:${option.id}`,
          label: `wrong ${option.id}`,
        });
      }
      if (x.multi && correct.length > 1) {
        out.push({
          answer: { selected: correct.slice(1) },
          outcome: 'incorrect',
          label: 'subset',
        });
      }
      break;
    }
    case 'classify': {
      const items = x.items as Array<[string, string]>;
      const categories = x.categories as string[];
      out.push({
        answer: { categories: items.map(([, c]) => c) },
        outcome: 'correct',
        label: 'key',
      });
      items.forEach(([, category], index) => {
        const other = categories.find((entry) => entry !== category)!;
        const answer = items.map(([, c]) => c);
        answer[index] = other;
        out.push({
          answer: { categories: answer },
          outcome: 'incorrect',
          feedbackKey: `item:${index}`,
          label: `move ${index}`,
        });
      });
      break;
    }
    case 'order': {
      const items = x.items as unknown[];
      const identity = items.map((_, index) => index);
      out.push({
        answer: { order: identity },
        outcome: 'correct',
        label: 'key',
      });
      out.push({
        answer: { order: rotate(identity) },
        outcome: 'incorrect',
        label: 'rotated',
      });
      break;
    }
    case 'match': {
      const pairs = ev.pairs as Array<[string, string]>;
      const distractors = ev.distractors as string[];
      const key = pairs.map(([, right]) => right);
      out.push({ answer: { matches: key }, outcome: 'correct', label: 'key' });
      out.push({
        answer: { matches: rotate(key) },
        outcome: 'incorrect',
        label: 'rotated',
      });
      if (distractors.length > 0) {
        out.push({
          answer: { matches: [distractors[0]!, ...key.slice(1)] },
          outcome: 'incorrect',
          label: 'distractor',
        });
      }
      break;
    }
    case 'assemble': {
      const slots = x.slots as Array<{
        options: Array<{ id: string; correct: boolean }>;
      }>;
      const key = slots.map(
        (slot) => slot.options.find((option) => option.correct)!.id,
      );
      out.push({ answer: { slots: key }, outcome: 'correct', label: 'key' });
      slots.forEach((slot, index) => {
        for (const option of slot.options.filter((entry) => !entry.correct)) {
          const answer = [...key];
          answer[index] = option.id;
          out.push({
            answer: { slots: answer },
            outcome: 'incorrect',
            feedbackKey: `slot:${index}:${option.id}`,
            label: `slot ${index} ${option.id}`,
          });
        }
      });
      break;
    }
    case 'blank-match': {
      const blanks = ev.blanks as string[][];
      const main = blanks.map((alternatives) => alternatives[0]!);
      blanks.forEach((alternatives, index) => {
        for (const alternative of alternatives) {
          const answer = [...main];
          answer[index] = alternative;
          out.push({
            answer: { blanks: answer },
            outcome: 'correct',
            label: `alt ${index} ${alternative}`,
          });
        }
        const wrong = [...main];
        wrong[index] = `${main[index]}x`;
        out.push({
          answer: { blanks: wrong },
          outcome: 'incorrect',
          label: `wrong ${index}`,
        });
      });
      break;
    }
    case 'output-match': {
      const lines = ev.expected as string[];
      out.push({
        answer: { text: lines.join('\n') },
        outcome: 'correct',
        label: 'key',
      });
      out.push({
        answer: {
          text: `\n\n${lines.map((line) => `${line}   `).join('\r\n')}\n\n`,
        },
        outcome: 'correct',
        label: 'declared normalisation',
      });
      ((x.traps as Array<{ answer: string }>) ?? []).forEach((trap, index) => {
        out.push({
          answer: { text: trap.answer },
          outcome: 'incorrect',
          feedbackKey: `trap:${index}`,
          label: `trap ${index}`,
        });
      });
      out.push({
        answer: {
          text: [...lines.slice(0, -1), `${lines.at(-1)}!`].join('\n'),
        },
        outcome: 'incorrect',
        label: 'changed last line',
      });
      break;
    }
    case 'table-match': {
      const table = ev.expected as string[][];
      const cells = table.map((row) => row.slice(1));
      out.push({ answer: { cells }, outcome: 'correct', label: 'key' });
      out.push({
        answer: { cells: cells.map((row) => row.map((cell) => ` ${cell} `)) },
        outcome: 'correct',
        label: 'trimmed',
      });
      const wrong = cells.map((row) => [...row]);
      wrong[wrong.length - 1]![0] = `${wrong.at(-1)![0]}9`;
      out.push({
        answer: { cells: wrong },
        outcome: 'incorrect',
        label: 'changed cell',
      });
      break;
    }
    case 'command-regex': {
      for (const sample of v.examples_ok ?? []) {
        out.push({
          answer: { command: sample },
          outcome: 'correct',
          label: `ok ${sample}`,
        });
      }
      for (const sample of v.examples_bad ?? []) {
        if (sample.trim() !== '') {
          out.push({
            answer: { command: sample },
            outcome: 'incorrect',
            label: `bad ${sample}`,
          });
        }
      }
      ((ev.near_misses as Array<[string, string]>) ?? []).forEach(
        ([sample], index) => {
          out.push({
            answer: { command: sample },
            outcome: 'incorrect',
            feedbackKey: `near:${index}`,
            label: `near ${sample}`,
          });
        },
      );
      break;
    }
    case 'diagnose': {
      const expected = ev.expected as {
        type: string;
        line: number;
        cause: string;
      };
      const types = x.type_options as string[];
      const causes = x.cause_options as Array<{ id: string; correct: boolean }>;
      out.push({
        answer: {
          errorType: expected.type,
          line: expected.line,
          cause: expected.cause,
        },
        outcome: 'correct',
        label: 'key',
      });
      out.push({
        answer: {
          errorType: types.find((type) => type !== expected.type)!,
          line: expected.line,
          cause: expected.cause,
        },
        outcome: 'incorrect',
        label: 'wrong type',
      });
      out.push({
        answer: {
          errorType: expected.type,
          line: expected.line + 1,
          cause: expected.cause,
        },
        outcome: 'incorrect',
        label: 'wrong line',
      });
      for (const cause of causes.filter((entry) => !entry.correct)) {
        out.push({
          answer: {
            errorType: expected.type,
            line: expected.line,
            cause: cause.id,
          },
          outcome: 'incorrect',
          feedbackKey: `cause:${cause.id}`,
          label: `cause ${cause.id}`,
        });
      }
      break;
    }
    case 'paste-regex': {
      for (const sample of v.examples_ok ?? []) {
        out.push({
          answer: { text: sample },
          outcome: 'correct',
          label: `ok ${sample}`,
        });
      }
      for (const sample of v.examples_bad ?? []) {
        out.push({
          answer: { text: sample },
          outcome: sample.trim() === '' ? 'not_evaluable' : 'incorrect',
          label: `bad ${JSON.stringify(sample)}`,
        });
      }
      break;
    }
    default:
      throw new Error(`unexpected runtime-free mode ${String(ev.mode)}`);
  }

  return out;
}

async function parityFailures(exercise: LessonExercise) {
  const failures: string[] = [];

  for (const expectation of authoredExpectations(exercise)) {
    const verdict = await evaluateExercise(exercise, expectation.answer, {
      runtime: unavailablePythonRuntime,
    });

    if (verdict.outcome !== expectation.outcome) {
      failures.push(
        `${expectation.label}: ${verdict.outcome} ≠ ${expectation.outcome}`,
      );
    } else if (
      expectation.feedbackKey !== undefined &&
      verdict.matchedFeedbackKey !== expectation.feedbackKey
    ) {
      failures.push(
        `${expectation.label}: feedback ${String(verdict.matchedFeedbackKey)} ≠ ${expectation.feedbackKey}`,
      );
    }
  }

  return failures;
}

const runtimeFree = exercises.filter(
  (exercise) => exercise.evaluable && !exerciseNeedsRuntime(exercise),
);

describe('EV-11 parity on every runtime-free evaluable exercise', () => {
  it('covers exactly the 227 runtime-free evaluable exercises', () => {
    expect(runtimeFree).toHaveLength(227);
    expect(
      exercises.filter((exercise) => exerciseNeedsRuntime(exercise)),
    ).toHaveLength(49);
  });

  it.each(runtimeFree.map((exercise) => [exercise.id, exercise] as const))(
    '%s agrees with its authored vectors',
    async (_id, exercise) => {
      expect(await parityFailures(exercise)).toEqual([]);
    },
  );

  it('returns recorded for the 15 self-check and self-report items', async () => {
    const selfReported = exercises.filter((exercise) => !exercise.evaluable);

    expect(selfReported).toHaveLength(15);
    for (const exercise of selfReported) {
      const answer: ExerciseAnswer =
        exercise.type === 'checklist'
          ? { checked: (fill(exercise).items as unknown[]).map(() => true) }
          : { text: 'Jeg tenkte på dette.' };
      await expect(
        evaluateExercise(exercise, answer, {
          runtime: unavailablePythonRuntime,
        }),
      ).resolves.toEqual({ outcome: 'recorded' });
    }
  });

  it('evaluates classify and order by item position, which agrees with the authored text keys', () => {
    for (const exercise of exercises.filter((entry) => entry.type === 'sort')) {
      const x = fill(exercise);
      const items = x.items as Array<[string, string?]>;
      const toKey = (text: string) => text.replace(/`([^`]*)`/g, '‹$1›');

      if (x.kind === 'classify') {
        expect(x.evaluator.expected, exercise.id).toEqual(
          items.map(([text, category]) => [toKey(text), category]),
        );
      } else if (x.kind === 'order') {
        expect(x.evaluator.expected, exercise.id).toEqual(
          items.map(([text]) => toKey(text)),
        );
      }
    }
  });
});

describe('EV-12 the parity check is discriminating (mutations seeded from negative vectors)', () => {
  function mutate(
    exercise: LessonExercise,
    change: (copy: ReturnType<typeof fill>) => void,
  ) {
    const copy = structuredClone(exercise) as unknown as ReturnType<
      typeof fill
    >;
    change(copy);
    return copy as unknown as LessonExercise;
  }

  const firstOf = (mode: string) =>
    runtimeFree.find((exercise) => fill(exercise).evaluator.mode === mode)!;

  it.each([
    [
      'command-regex accepts anything',
      'command-regex',
      (x: ReturnType<typeof fill>) => {
        x.evaluator.accept = '.*';
      },
    ],
    [
      'paste-regex accepts anything',
      'paste-regex',
      (x: ReturnType<typeof fill>) => {
        x.evaluator.pattern = '';
      },
    ],
    [
      'choice key moved to another option',
      'choice',
      (x: ReturnType<typeof fill>) => {
        x.evaluator.correct = [
          (x.options as Array<{ id: string; correct: boolean }>).find(
            (o) => !o.correct,
          )!.id,
        ];
      },
    ],
    [
      'output-match expected line changed',
      'output-match',
      (x: ReturnType<typeof fill>) => {
        (x.evaluator.expected as string[])[0] = 'endret';
      },
    ],
    [
      'table-match expected cell changed',
      'table-match',
      (x: ReturnType<typeof fill>) => {
        (x.evaluator.expected as string[][])[0]![1] = 'endret';
      },
    ],
    [
      'diagnose expected line shifted',
      'diagnose',
      (x: ReturnType<typeof fill>) => {
        (x.evaluator.expected as { line: number }).line += 1;
      },
    ],
    [
      'blank-match alternative removed',
      'blank-match',
      (x: ReturnType<typeof fill>) => {
        (x.evaluator.blanks as string[][])[0] = ['zzz'];
      },
    ],
    [
      'assemble key changed',
      'assemble',
      // The authored key of an assembly is `evaluator.expected` (the options'
      // `correct` flags are display metadata the evaluator does not read).
      (x: ReturnType<typeof fill>) => {
        const slot = (
          x.slots as Array<{ options: Array<{ id: string; correct: boolean }> }>
        )[0]!;
        (x.evaluator.expected as Array<[string, string]>)[0]![1] =
          slot.options.find((option) => !option.correct)!.id;
      },
    ],
  ])('detects: %s', async (_label, mode, change) => {
    const mutant = mutate(firstOf(mode), change);
    const original = firstOf(mode);
    const failures: string[] = [];

    for (const expectation of authoredExpectations(original)) {
      const verdict = await evaluateExercise(mutant, expectation.answer, {
        runtime: unavailablePythonRuntime,
      });
      if (verdict.outcome !== expectation.outcome) {
        failures.push(expectation.label);
      }
    }

    expect(failures.length).toBeGreaterThan(0);
  });
});

/**
 * A runtime that replays the authored execution record instead of running
 * Python: the reference program's transcripts, and each authored failure
 * variant's recorded signature. It proves the comparison, signature and
 * structure-check logic, not Python behaviour.
 */
function replayRuntime(exercise: LessonExercise): PythonRuntime {
  const x = fill(exercise);
  const tests = x.evaluator.tests as Array<{
    stdin: string;
    expected_transcript: string;
  }>;
  const variants = vectors[exercise.id]?.failure_variants ?? [];
  const reference = vectors[exercise.id]?.reference ?? '';

  return {
    status: () => 'available',
    async run(request: PythonRunRequest): Promise<PythonRunResult> {
      const index = tests.findIndex((test) => test.stdin === request.stdin);

      if (request.source === reference) {
        return {
          kind: 'completed',
          exitCode: 0,
          stdout: `${tests[index]!.expected_transcript}\n`,
          stderr: '',
        };
      }

      const variant = variants.find((entry) => entry.code === request.source);
      const signature = variant?.signature[index];

      if (signature === undefined) {
        return {
          kind: 'failed',
          reason: 'not in the authored execution record',
        };
      }

      if (signature.startsWith('ERROR ')) {
        return {
          kind: 'completed',
          exitCode: 1,
          stdout: '',
          stderr: `Traceback (most recent call last):\n  File "${x.file as string}", line 1, in <module>\n${signature.slice(6)}: replayed\n`,
        };
      }

      return {
        kind: 'completed',
        exitCode: 0,
        stdout: `${signature}\n`,
        stderr: '',
      };
    },
  };
}

describe('program comparison logic agrees with the authored failure signatures (replayed record)', () => {
  const programs = exercises.filter((exercise) => exercise.type === 'program');

  it('covers the 42 program exercises', () => {
    expect(programs).toHaveLength(42);
  });

  it.each(programs.map((exercise) => [exercise.id, exercise] as const))(
    '%s: reference passes and every authored failure variant fails with its recorded feedback',
    async (_id, exercise) => {
      const runtime = replayRuntime(exercise);
      const reference = vectors[exercise.id]!.reference!;

      await expect(
        evaluateExercise(exercise, { source: reference }, { runtime }),
      ).resolves.toMatchObject({ outcome: 'correct' });

      const variants = vectors[exercise.id]!.failure_variants ?? [];
      for (const [index, variant] of variants.entries()) {
        await expect(
          evaluateExercise(exercise, { source: variant.code }, { runtime }),
          variant.name,
        ).resolves.toEqual({
          outcome: 'incorrect',
          matchedFeedbackKey: `signature:${index}`,
        });
      }
    },
  );
});
