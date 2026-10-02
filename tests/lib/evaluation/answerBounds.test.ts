import { describe, expect, it } from 'vitest';

import { answerBounds, type LessonExercise } from '@/lib/domain';
import { checkAnswerReadiness } from '@/lib/evaluation';
import moduleOne from '@/programmes/programvareutvikling/content/s1-m01.json';
import moduleTwo from '@/programmes/programvareutvikling/content/s1-m02.json';

import vectorsFile from '../../fixtures/programvareutvikling/evaluator-vectors.json';

/**
 * E-SCHEMA-1 §3 "Answer bound" (an engineering derivation, not an owner
 * decision): every response mode is bounded by a named constant derived
 * from the longest legitimate authored payload, with ample headroom, and
 * input over the bound is refused at the input surface.
 */

const exercises = [moduleOne, moduleTwo]
  .flatMap(
    (module) =>
      (module as unknown as { units: Array<{ flow: Array<{ t: string }> }> })
        .units,
  )
  .flatMap((unit) => unit.flow)
  .filter((block) => block.t === 'exercise') as unknown as Array<
  LessonExercise & Record<string, unknown>
>;
const vectors = vectorsFile.exercises as Record<
  string,
  {
    reference?: string;
    examples_ok?: string[];
    failure_variants?: Array<{ code: string }>;
  }
>;

const longest = (values: readonly string[]) =>
  Math.max(0, ...values.map((value) => [...value].length));

describe('derived answer ceilings leave at least tenfold headroom over authored payloads', () => {
  it('program source', () => {
    const authored = longest(
      exercises
        .filter((exercise) => exercise.type === 'program')
        .flatMap((exercise) => [
          String(exercise.starter ?? ''),
          vectors[exercise.id]?.reference ?? '',
          ...(vectors[exercise.id]?.failure_variants ?? []).map(
            (variant) => variant.code,
          ),
        ]),
    );

    expect(authored).toBeGreaterThan(0);
    expect(answerBounds.programSourceChars).toBeGreaterThanOrEqual(
      authored * 10,
    );
  });

  it('predicted output and reflections', () => {
    const authored = longest(
      exercises
        .filter((exercise) => exercise.type === 'predict')
        .map((exercise) =>
          (exercise.evaluator as { expected: string[] }).expected.join('\n'),
        ),
    );

    expect(answerBounds.freeTextChars).toBeGreaterThanOrEqual(authored * 10);
  });

  it('pasted terminal output', () => {
    const authored = longest(
      exercises
        .filter((exercise) => exercise.type === 'evidence')
        .flatMap((exercise) => vectors[exercise.id]?.examples_ok ?? []),
    );

    expect(answerBounds.pastedOutputChars).toBeGreaterThanOrEqual(
      authored * 10,
    );
  });

  it('typed commands', () => {
    const authored = longest(
      exercises
        .filter((exercise) => exercise.type === 'cmd')
        .flatMap((exercise) => vectors[exercise.id]?.examples_ok ?? []),
    );

    expect(answerBounds.commandChars).toBeGreaterThanOrEqual(authored * 10);
  });

  it('keeps a whole bounded answer far below the backup cap', () => {
    expect(answerBounds.serializedAnswerChars).toBeGreaterThanOrEqual(
      answerBounds.programSourceChars,
    );
    expect(answerBounds.serializedAnswerChars).toBeLessThanOrEqual(32_768);
  });
});

describe('input over the bound is refused at the input surface', () => {
  const firstOf = (type: string) =>
    exercises.find((exercise) => exercise.type === type)!;

  it.each([
    ['program', { source: 'x'.repeat(answerBounds.programSourceChars + 1) }],
    ['predict', { text: 'x'.repeat(answerBounds.freeTextChars + 1) }],
    ['evidence', { text: 'x'.repeat(answerBounds.pastedOutputChars + 1) }],
    ['cmd', { command: 'x'.repeat(answerBounds.commandChars + 1) }],
  ])('%s', (type, answer) => {
    expect(checkAnswerReadiness(firstOf(type), answer)).toEqual({
      ready: false,
      reason: 'too_large',
    });
  });

  it('accepts input at the bound', () => {
    expect(
      checkAnswerReadiness(firstOf('program'), {
        source: 'x'.repeat(answerBounds.programSourceChars),
      }),
    ).toEqual({ ready: true });
  });
});
