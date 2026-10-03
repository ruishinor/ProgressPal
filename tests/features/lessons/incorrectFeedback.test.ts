import { describe, expect, it } from 'vitest';

import { presentResult } from '@/features/lessons/model';
import type { EvaluationResultRecord, LessonExercise } from '@/lib/domain';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';

import { p2Modules } from '../../programmes/p2Content';

/**
 * Owner instruction 2026-10-03: an incorrect answer keeps its truthful state
 * but leads to the specific explanation and the next step, never a bare
 * judgement. Verified over the real content: every evaluable exercise
 * carries authored incorrect feedback, and an incorrect result presents it
 * after the "not yet" judgement (with the matched specific explanation
 * first when one applies). No generic encouragement is added.
 */

const copy = programvareutviklingDefinition.content.lessons!.copy!;
const exercises = Object.values(p2Modules)
  .flatMap(
    (module) =>
      (module as unknown as { units: Array<{ flow: Array<{ t: string }> }> })
        .units,
  )
  .flatMap((unit) => unit.flow)
  .filter((block) => block.t === 'exercise') as unknown as LessonExercise[];

function incorrectResult(matchedFeedbackKey?: string): EvaluationResultRecord {
  return {
    id: 'result-1',
    kind: 'evaluation_result',
    programmeId: 'programvareutvikling',
    contentVersion: 2,
    subjectId: 'subject',
    contentHash: 'a'.repeat(64),
    recordedAt: '2026-10-03T10:00:00.000Z',
    attemptId: 'attempt-1',
    outcome: 'incorrect',
    ...(matchedFeedbackKey === undefined ? {} : { matchedFeedbackKey }),
  } as EvaluationResultRecord;
}

describe('incorrect answers lead to an explanation, not a bare judgement', () => {
  const evaluable = exercises.filter((exercise) => exercise.evaluable);

  it('covers the real evaluable exercises', () => {
    expect(evaluable).toHaveLength(276);
  });

  it.each(evaluable.map((exercise) => [exercise.id, exercise] as const))(
    '%s carries authored incorrect feedback that the result presents',
    (_id, exercise) => {
      expect(exercise.feedback.incorrect.trim()).not.toBe('');

      const presented = presentResult(exercise, incorrectResult(), copy);

      expect(presented.title).toBe(copy.text.incorrect);
      expect(presented.messages).toContain(exercise.feedback.incorrect);
    },
  );
});
