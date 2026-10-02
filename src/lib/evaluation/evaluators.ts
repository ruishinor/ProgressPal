import {
  runtimeEvaluatorModes,
  type EvaluationOutcome,
  type ExerciseAnswer,
  type LessonExercise,
  type LessonExerciseOf,
} from '@/lib/domain';

import { checkAnswerReadiness } from './answers';
import type { PythonRunResult, PythonRuntime } from './runtime';

/**
 * Pure evaluators for the authored evaluator modes (Epic E §3 item 8,
 * DC-16 to DC-22, EV-01/02/09/14/15). They implement the authored
 * semantics, they do not reinvent them:
 * - choices, sorts, matches and assemblies by full key, by position;
 * - predicted output by the declared normalisation
 *   (`trim-trailing-space-and-blank-edge-lines`);
 * - typed commands and pasted output by the authored patterns (typed
 *   commands are trimmed at the input surface; no authored negative example
 *   depends on surrounding whitespace);
 * - programs by behaviour on every authored test plus structure checks,
 *   never by text equality with a reference.
 * `not_evaluable` means the evaluator could not read the answer; it never
 * scores an answer incorrect. `evaluator_error` is an app problem (runtime
 * unavailable, timeout, crash, defective content); never the learner's. Self
 * checks and reflections are `recorded`. Evaluation never throws.
 */

export type EvaluationVerdict = {
  readonly outcome: EvaluationOutcome;
  readonly matchedFeedbackKey?: string;
};

export type EvaluationOptions = {
  readonly runtime: PythonRuntime;
};

const correct: EvaluationVerdict = { outcome: 'correct' };
const incorrect = (matchedFeedbackKey?: string): EvaluationVerdict =>
  matchedFeedbackKey === undefined
    ? { outcome: 'incorrect' }
    : { outcome: 'incorrect', matchedFeedbackKey };
const notEvaluable: EvaluationVerdict = { outcome: 'not_evaluable' };
const evaluatorError: EvaluationVerdict = { outcome: 'evaluator_error' };

export function exerciseNeedsRuntime(exercise: LessonExercise): boolean {
  return runtimeEvaluatorModes.has(exercise.evaluator.mode);
}

const lf = (text: string) => text.replace(/\r\n?/g, '\n');
const trimEnd = (text: string) => text.replace(/\s+$/, '');

/** `trim-trailing-space-and-blank-edge-lines`. */
export function normaliseOutputLines(text: string): string[] {
  const lines = lf(text).split('\n').map(trimEnd);

  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  return lines;
}

const sameLines = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((line, index) => line === b[index]);

function evaluateChoice(
  exercise: LessonExerciseOf<'mcq'>,
  selected: readonly string[],
): EvaluationVerdict {
  const key = new Set(exercise.evaluator.correct);
  const chosen = new Set(selected);

  if (key.size === chosen.size && [...key].every((id) => chosen.has(id))) {
    return correct;
  }

  const wrong = selected.find((id) => !key.has(id));
  return incorrect(wrong === undefined ? undefined : `option:${wrong}`);
}

function evaluateSort(
  exercise: LessonExerciseOf<'sort'>,
  answer: ExerciseAnswer,
): EvaluationVerdict {
  const evaluator = exercise.evaluator;

  if (evaluator.mode === 'classify') {
    const categories = (answer as { categories: string[] }).categories;
    const wrong = exercise.items.findIndex(
      (item, index) => categories[index] !== item[1],
    );
    return wrong === -1 ? correct : incorrect(`item:${wrong}`);
  }

  if (evaluator.mode === 'order') {
    const order = (answer as { order: number[] }).order;
    return order.every((itemIndex, position) => itemIndex === position)
      ? correct
      : incorrect();
  }

  const matches = (answer as { matches: string[] }).matches;
  const wrong = evaluator.pairs.findIndex(
    ([, right], index) => matches[index] !== right,
  );
  return wrong === -1 ? correct : incorrect(`item:${wrong}`);
}

function evaluateAssemble(
  exercise: LessonExerciseOf<'assemble'>,
  slots: readonly string[],
): EvaluationVerdict {
  const wrong = exercise.evaluator.expected.findIndex(
    ([, optionId], index) => slots[index] !== optionId,
  );
  return wrong === -1 ? correct : incorrect(`slot:${wrong}:${slots[wrong]}`);
}

function evaluateFill(
  exercise: LessonExerciseOf<'fill'>,
  blanks: readonly string[],
): EvaluationVerdict {
  return exercise.evaluator.blanks.every((alternatives, index) =>
    alternatives.includes((blanks[index] ?? '').trim()),
  )
    ? correct
    : incorrect();
}

function evaluateOutput(
  exercise: LessonExerciseOf<'predict'>,
  text: string,
): EvaluationVerdict {
  const answer = normaliseOutputLines(text);

  if (answer.length === 0) {
    return notEvaluable;
  }

  if (sameLines(answer, exercise.evaluator.expected.map(trimEnd))) {
    return correct;
  }

  const trap = exercise.traps.findIndex((entry) =>
    sameLines(normaliseOutputLines(entry.answer), answer),
  );
  return incorrect(trap === -1 ? undefined : `trap:${trap}`);
}

function evaluateTable(
  exercise: LessonExerciseOf<'trace'>,
  cells: readonly (readonly string[])[],
): EvaluationVerdict {
  const expected = exercise.evaluator.expected;

  if (cells.length !== expected.length) {
    return notEvaluable;
  }

  return expected.every((row, rowIndex) =>
    row
      .slice(1)
      .every(
        (value, column) =>
          (cells[rowIndex]?.[column] ?? '').trim() === value.trim(),
      ),
  )
    ? correct
    : incorrect();
}

function evaluateCommand(
  exercise: LessonExerciseOf<'cmd'>,
  command: string,
): EvaluationVerdict {
  const typed = command.trim();

  if (typed === '') {
    return notEvaluable;
  }

  if (
    new RegExp(exercise.evaluator.accept, exercise.evaluator.flags).test(typed)
  ) {
    return correct;
  }

  const collapse = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLowerCase();
  const near = exercise.evaluator.near_misses.findIndex(
    ([sample]) => collapse(sample) === collapse(typed),
  );
  return incorrect(near === -1 ? undefined : `near:${near}`);
}

function evaluateDiagnose(
  exercise: LessonExerciseOf<'diagnose'>,
  answer: { errorType: string; line: number; cause: string },
): EvaluationVerdict {
  const expected = exercise.evaluator.expected;

  if (
    answer.errorType === expected.type &&
    answer.line === expected.line &&
    answer.cause === expected.cause
  ) {
    return correct;
  }

  return incorrect(
    answer.cause === expected.cause ? undefined : `cause:${answer.cause}`,
  );
}

function evaluatePaste(
  exercise: LessonExerciseOf<'evidence'>,
  text: string,
): EvaluationVerdict {
  const pasted = lf(text);

  if (pasted.trim() === '') {
    return notEvaluable;
  }

  if (
    new RegExp(exercise.evaluator.pattern, exercise.evaluator.flags).test(
      pasted,
    )
  ) {
    return correct;
  }

  const diagnostic = exercise.evaluator.diagnostics.findIndex((entry) =>
    new RegExp(entry.regex).test(pasted),
  );
  return incorrect(diagnostic === -1 ? undefined : `diagnostic:${diagnostic}`);
}

const errorLinePattern =
  /^([A-Za-z]+(?:Error|Exception|Warning|Exit|Interrupt))\b/;

/** The authoring harness's error classification of a failed run. */
function errorType(stderr: string): string {
  const lines = trimEnd(lf(stderr))
    .split('\n')
    .filter((line) => line.trim() !== '');
  const match = (lines.at(-1) ?? '').match(errorLinePattern);
  return match?.[1] ?? '?';
}

/** `null` when the run is an evaluator failure (timeout or runtime failure). */
function runSignature(
  result: PythonRunResult,
  compare: 'stdout' | 'last_line' | 'transcript',
): string | null {
  if (result.kind !== 'completed') {
    return null;
  }

  if (result.exitCode !== 0) {
    return `ERROR ${errorType(result.stderr)}`;
  }

  const output = trimEnd(lf(result.stdout));
  return compare === 'last_line' ? (output.split('\n').at(-1) ?? '') : output;
}

async function runSafely(
  runtime: PythonRuntime,
  request: Parameters<PythonRuntime['run']>[0],
): Promise<PythonRunResult> {
  try {
    return await runtime.run(request);
  } catch (error) {
    return {
      kind: 'failed',
      reason: error instanceof Error ? error.message : 'runtime failure',
    };
  }
}

async function evaluateProgram(
  exercise: LessonExerciseOf<'program'>,
  source: string,
  runtime: PythonRuntime,
): Promise<EvaluationVerdict> {
  const evaluator = exercise.evaluator;

  if (runtime.status() !== 'available') {
    return evaluatorError;
  }

  const violation =
    evaluator.structure_checks.some(
      (check) => !new RegExp(check.regex).test(source),
    ) ||
    evaluator.forbidden_patterns.some((check) =>
      new RegExp(check.regex).test(source),
    );
  const signatures: string[] = [];
  let passes = !violation;

  for (const test of evaluator.tests) {
    const signature = runSignature(
      await runSafely(runtime, {
        source,
        file: exercise.file,
        stdin: test.stdin,
        timeoutMs: evaluator.timeout_s * 1000,
      }),
      evaluator.compare,
    );

    if (signature === null) {
      // A runtime timeout or failure is the app's problem (DC-19).
      return evaluatorError;
    }

    signatures.push(signature);
    passes &&= signature === test.expected;
  }

  if (violation) {
    signatures.push('STRUCTURE-CHECK-FAILS');
  }

  if (passes) {
    return correct;
  }

  const known = evaluator.failure_signatures.findIndex((entry) =>
    sameLines(entry.signature, signatures),
  );
  return incorrect(known === -1 ? undefined : `signature:${known}`);
}

const isNumeric = (value: string) => /^-?\d+(\.\d+)?$/.test(value);

async function evaluateTestTable(
  exercise: LessonExerciseOf<'testtable'>,
  rows: ReadonlyArray<{ inputs: readonly string[]; expected: string }>,
  runtime: PythonRuntime,
): Promise<EvaluationVerdict> {
  const evaluator = exercise.evaluator;

  if (runtime.status() !== 'available') {
    return evaluatorError;
  }

  if (rows.length < evaluator.min_rows) {
    return incorrect('rows');
  }

  const outputs: string[] = [];

  for (const [index, row] of rows.entries()) {
    const run = await runSafely(runtime, {
      source: exercise.reference,
      file: exercise.file,
      stdin: `${row.inputs.join('\n')}\n`,
      timeoutMs: 5_000,
    });

    if (run.kind !== 'completed') {
      return evaluatorError;
    }

    if (run.exitCode !== 0) {
      // The trusted reference rejects this row's input: the row is invalid.
      return incorrect(`row:${index}`);
    }

    const output = trimEnd(lf(run.stdout));
    const reference = (
      evaluator.compare === 'last_line'
        ? (output.split('\n').at(-1) ?? '')
        : output
    ).trim();
    const expected = row.expected.trim();
    const same =
      evaluator.numeric_values_compared_as_numbers &&
      isNumeric(expected) &&
      isNumeric(reference)
        ? Number(expected) === Number(reference)
        : expected === reference;

    if (!same) {
      return incorrect(`row:${index}`);
    }

    outputs.push(reference);
  }

  const missing = evaluator.coverage.findIndex(
    (rule) =>
      !rows.some((row, index) =>
        rule.input_regex !== null
          ? new RegExp(rule.input_regex).test(row.inputs.join('|'))
          : rule.reference_output_regex !== null &&
            new RegExp(rule.reference_output_regex).test(outputs[index] ?? ''),
      ),
  );

  return missing === -1 ? correct : incorrect(`coverage:${missing}`);
}

async function evaluateUnsafe(
  exercise: LessonExercise,
  answer: ExerciseAnswer,
  runtime: PythonRuntime,
): Promise<EvaluationVerdict> {
  switch (exercise.type) {
    case 'mcq':
      return evaluateChoice(
        exercise,
        (answer as { selected: string[] }).selected,
      );
    case 'sort':
      return evaluateSort(exercise, answer);
    case 'assemble':
      return evaluateAssemble(exercise, (answer as { slots: string[] }).slots);
    case 'fill':
      return evaluateFill(exercise, (answer as { blanks: string[] }).blanks);
    case 'predict':
      return evaluateOutput(exercise, (answer as { text: string }).text);
    case 'trace':
      return evaluateTable(exercise, (answer as { cells: string[][] }).cells);
    case 'cmd':
      return evaluateCommand(exercise, (answer as { command: string }).command);
    case 'diagnose':
      return evaluateDiagnose(
        exercise,
        answer as { errorType: string; line: number; cause: string },
      );
    case 'evidence':
      return evaluatePaste(exercise, (answer as { text: string }).text);
    case 'program':
      return evaluateProgram(
        exercise,
        (answer as { source: string }).source,
        runtime,
      );
    case 'testtable':
      return evaluateTestTable(
        exercise,
        (answer as { rows: Array<{ inputs: string[]; expected: string }> })
          .rows,
        runtime,
      );
    case 'checklist':
    case 'reflect':
      return { outcome: 'recorded' };
  }
}

/** Evaluates one submitted answer. Never throws. */
export async function evaluateExercise(
  exercise: LessonExercise,
  answer: ExerciseAnswer,
  options: EvaluationOptions,
): Promise<EvaluationVerdict> {
  if (!exercise.evaluable) {
    return { outcome: 'recorded' };
  }

  const readiness = checkAnswerReadiness(exercise, answer);

  if (!readiness.ready) {
    // An answer the evaluator cannot read is not scored (EV-14, DC-20).
    return notEvaluable;
  }

  try {
    return await evaluateUnsafe(exercise, answer, options.runtime);
  } catch {
    // A defect in the evaluator or the content is the app's problem.
    return evaluatorError;
  }
}
