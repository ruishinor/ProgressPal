import { describe, expect, it } from 'vitest';

import { presentResult } from '@/features/lessons/model';
import type { LessonExercise, LessonExerciseOf } from '@/lib/domain';
import {
  evaluateExercise,
  unavailablePythonRuntime,
  type EvaluationVerdict,
} from '@/lib/evaluation';
import { programvareutviklingLessonCopy } from '@/programmes/programvareutvikling/lessonCopy';

import { p2Modules } from '../../programmes/p2Content';

/**
 * Learner feedback 2026-10-06 (content version 3): materially different
 * malformed `cd` answers in S1-M01-P02 get distinct feedback through the
 * evaluator's existing `near_misses` capability. Valid PowerShell shorthand
 * stays valid: `cd..` is a built-in helper for `Set-Location ..`.
 */

const exercises = [p2Modules['S1-M01']!, p2Modules['S1-M02']!]
  .flatMap(
    (module) =>
      (module as unknown as { units: Array<{ flow: Array<{ t: string }> }> })
        .units,
  )
  .flatMap((unit) => unit.flow)
  .filter((block) => block.t === 'exercise') as unknown as LessonExercise[];

function command(id: string): LessonExerciseOf<'cmd'> {
  const exercise = exercises.find((entry) => entry.id === id);

  if (exercise === undefined || exercise.type !== 'cmd') {
    throw new Error(`${id} is not a command exercise`);
  }

  return exercise;
}

const evaluate = (exercise: LessonExerciseOf<'cmd'>, typed: string) =>
  evaluateExercise(
    exercise,
    { command: typed },
    { runtime: unavailablePythonRuntime },
  );

function feedbackFor(
  exercise: LessonExerciseOf<'cmd'>,
  verdict: EvaluationVerdict,
) {
  expect(verdict.outcome).toBe('incorrect');
  expect(verdict.matchedFeedbackKey).toMatch(/^near:\d+$/);

  return presentResult(
    exercise,
    {
      id: 'result',
      kind: 'evaluation_result',
      programmeId: 'programvareutvikling',
      contentVersion: 3,
      subjectId: exercise.id.toLowerCase(),
      contentHash: 'a'.repeat(64),
      recordedAt: '2026-10-06T10:00:00.000Z',
      attemptId: 'attempt',
      outcome: 'incorrect',
      matchedFeedbackKey: verdict.matchedFeedbackKey,
    },
    programvareutviklingLessonCopy,
  ).messages[0]!;
}

describe('S1-M01-P02 "go up one level" (cd ..)', () => {
  const up = command('S1-M01-P02-E08');

  it('accepts the taught form and PowerShell shorthand, including case/spacing variants', async () => {
    for (const typed of [
      'cd ..',
      'cd  ..',
      'CD ..',
      ' cd ..  ',
      'cd..',
      'CD..',
    ]) {
      expect((await evaluate(up, typed)).outcome, typed).toBe('correct');
    }
  });

  it('gives each materially different mistake its own feedback', async () => {
    const mistakes = ['cd .', 'cd ...', 'cd ....', 'cd . .', 'cd ..kode'];
    const messages = new Map<string, string>();

    for (const typed of mistakes) {
      messages.set(typed, feedbackFor(up, await evaluate(up, typed)));
    }

    expect(new Set(messages.values()).size).toBe(mistakes.length);
    expect(messages.get('cd ...')).toMatch(/punktum for mye/i);
    expect(messages.get('cd .')).toMatch(/blir stående/i);
    expect(messages.get('cd ..kode')).toMatch(/mappenavn/i);
  });

  it('does not hand over the finished taught form on the first failure', async () => {
    for (const typed of ['cd .', 'cd ...', 'cd ..kode']) {
      const message = feedbackFor(up, await evaluate(up, typed));

      expect(message, typed).not.toMatch(/cd \.\./);
    }
  });

  it('gives an unlisted wrong answer no matched feedback (the general feedback applies)', async () => {
    const verdict = await evaluate(up, 'cd upp');

    expect(verdict).toEqual({ outcome: 'incorrect' });
  });
});

describe('S1-M01-P02 "go into kode" (cd kode)', () => {
  const cases = ['S1-M01-P02-E03', 'S1-M01-P02-E07'] as const;

  it.each(cases)('%s accepts the intended command', async (id) => {
    const exercise = command(id);

    for (const typed of ['cd kode', 'cd .\\kode', 'CD  Kode']) {
      expect((await evaluate(exercise, typed)).outcome, typed).toBe('correct');
    }
  });

  it.each(cases)(
    '%s tells a missing space, a glued parent marker and a detour apart',
    async (id) => {
      const exercise = command(id);
      const mistakes = ['cdkode', 'cd..kode', 'cd ..kode', 'cd ../kode'];
      const messages = new Set<string>();

      for (const typed of mistakes) {
        const message = feedbackFor(exercise, await evaluate(exercise, typed));

        expect(message, typed).not.toMatch(/cd kode/);
        messages.add(message);
      }

      expect(messages.size).toBe(mistakes.length);
    },
  );
});
