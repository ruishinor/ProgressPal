import { describe, expect, it } from 'vitest';

import {
  planEvidenceAchievementUnlocks,
  type EvidenceAchievementPlannerInput,
} from '@/lib/achievements';
import type {
  EvaluationResultRecord,
  ExerciseAttemptRecord,
  LearnerEvidence,
  ProgrammeContentIndex,
} from '@/lib/domain';
import { programvareutviklingAchievementDefinitions } from '@/programmes/programvareutvikling/achievements';
import { p2Index as manifest } from '../../programmes/p2Content';

const index = manifest as unknown as ProgrammeContentIndex;
const programmeId = 'programvareutvikling';
const plannerInput: EvidenceAchievementPlannerInput = {
  definitions: programvareutviklingAchievementDefinitions,
  index,
  runtimeAvailable: true,
};
let sequence = 0;

function timestamp() {
  sequence += 1;
  return new Date(Date.UTC(2026, 9, 4, 10, 0, sequence)).toISOString();
}

function solveSubject(
  subjectId: string,
  options: { stale?: boolean; supported?: boolean } = {},
): [ExerciseAttemptRecord, EvaluationResultRecord] {
  const meta = index.exercises.find((entry) => entry.subjectId === subjectId)!;
  const id = `attempt-${subjectId}-${sequence + 1}`;
  const attempt: ExerciseAttemptRecord = {
    id,
    kind: 'exercise_attempt',
    programmeId,
    contentVersion: index.contentVersion,
    subjectId,
    contentHash: options.stale ? 'f'.repeat(64) : meta.contentHash,
    recordedAt: timestamp(),
    attemptNumber: 1,
    responseMode: meta.responseMode,
    answer: { text: 'svar' },
    hintsUsedMax: options.supported ? 1 : 0,
    teachingReopened: false,
  };
  const result: EvaluationResultRecord = {
    id: `result-${id}`,
    kind: 'evaluation_result',
    programmeId,
    contentVersion: index.contentVersion,
    subjectId,
    contentHash: attempt.contentHash,
    recordedAt: timestamp(),
    attemptId: id,
    outcome: 'correct',
  };
  return [attempt, result];
}

function plan(
  rows: LearnerEvidence[],
  current: [ExerciseAttemptRecord, EvaluationResultRecord],
) {
  return planEvidenceAchievementUnlocks(plannerInput, {
    attempt: current[0],
    result: current[1],
    evidence: rows,
  }).map((entry) => entry.achievementId);
}

const codeReaderSubjects = [
  's1-m01-p06-e01',
  's1-m01-p06-e02',
  's1-m01-p06-e03',
  's1-m01-p06-e04',
  's1-m01-p06-e05',
  's1-m01-p06-e06',
  's1-m01-p06-e07',
  's1-m01-p06-e08',
  's1-m01-p06-e09',
  's1-m01-p06-e10',
  's1-m01-p06-e11',
  's1-m01-p06-e12',
] as const;

describe('P2 evidence achievement planning', () => {
  it('unlocks a trusted-practice set only when every mapped current-hash subject is solved', () => {
    const solved = codeReaderSubjects.map((subject) => solveSubject(subject));
    const evidence = solved.flat() as LearnerEvidence[];

    expect(plan(evidence, solved.at(-1)!)).toContain('p2-code-reader');

    const missing = solved.slice(0, -1);
    expect(
      plan(missing.flat() as LearnerEvidence[], missing.at(-1)!),
    ).not.toContain('p2-code-reader');
  });

  it('does not count stale evidence but does allow supported correct practice', () => {
    const stale = codeReaderSubjects.map((subject, position) =>
      solveSubject(subject, { stale: position === 0 }),
    );
    expect(
      plan(stale.flat() as LearnerEvidence[], stale.at(-1)!),
    ).not.toContain('p2-code-reader');

    const supported = codeReaderSubjects.map((subject, position) =>
      solveSubject(subject, { supported: position === 0 }),
    );
    expect(
      plan(supported.flat() as LearnerEvidence[], supported.at(-1)!),
    ).toContain('p2-code-reader');
  });

  it('reuses the derived checkpoint-cleared rule rather than stored checkpoint rows', () => {
    const gates = index.exercises.filter(
      (entry) => entry.moduleId === 'S1-M01' && entry.masteryGate,
    );
    const solved = gates.map((entry) => solveSubject(entry.subjectId));
    const evidence = solved.flat() as LearnerEvidence[];

    expect(plan(evidence, solved.at(-1)!)).toContain(
      'p2-foundation-checkpoint',
    );

    const missing = solved.slice(0, -1);
    expect(
      plan(missing.flat() as LearnerEvidence[], missing.at(-1)!),
    ).not.toContain('p2-foundation-checkpoint');
  });

  it('fails closed when the current result belongs to another programme', () => {
    const current = solveSubject(codeReaderSubjects[0]);
    const foreignAttempt = { ...current[0], programmeId: 'cs50x' };
    const foreignResult = { ...current[1], programmeId: 'cs50x' };

    expect(
      planEvidenceAchievementUnlocks(plannerInput, {
        attempt: foreignAttempt,
        result: foreignResult,
        evidence: [foreignAttempt, foreignResult],
      }),
    ).toEqual([]);
  });
});
