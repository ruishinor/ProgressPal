import { describe, expect, it } from 'vitest';

import type { LearnerEvidence, ProgrammeContentIndex } from '@/lib/domain';
import { deriveProgrammeMastery } from '@/lib/mastery';
import { p2Index as manifest } from '../../programmes/p2Content';

/**
 * Epic E §3 items 12–14, DC-28 to DC-32, `08`: skill state, readiness,
 * checkpoint state and retrieval are derived by a pure engine from the
 * evidence and the content version's rules, never stored. Checkpoint
 * clearance follows the owner-approved K-4 rule and retries the owner-approved
 * K-3 rule (2026-10-03).
 */

const index = manifest as unknown as ProgrammeContentIndex;
const meta = new Map(index.exercises.map((entry) => [entry.exerciseId, entry]));
const programmeId = 'programvareutvikling';
let clock = 0;

function nextTime() {
  clock += 1;
  return new Date(Date.UTC(2026, 9, 3, 8, 0, clock)).toISOString();
}

function attempt(
  exerciseId: string,
  attemptNumber: number,
  options: {
    hints?: number;
    reopened?: boolean;
    hash?: string;
    version?: number;
    id?: string;
  } = {},
): LearnerEvidence {
  const entry = meta.get(exerciseId)!;
  return {
    id: options.id ?? `attempt-${entry.subjectId}-${attemptNumber}`,
    kind: 'exercise_attempt',
    programmeId,
    contentVersion: options.version ?? index.contentVersion,
    subjectId: entry.subjectId,
    contentHash: options.hash ?? entry.contentHash,
    recordedAt: nextTime(),
    attemptNumber,
    responseMode: entry.responseMode,
    answer: { text: 'svar' },
    hintsUsedMax: options.hints ?? 0,
    teachingReopened: options.reopened ?? false,
  } as LearnerEvidence;
}

function result(
  attemptRow: LearnerEvidence,
  outcome:
    | 'correct'
    | 'incorrect'
    | 'not_evaluable'
    | 'evaluator_error'
    | 'recorded',
): LearnerEvidence {
  return {
    id: `result-${attemptRow.id}`,
    kind: 'evaluation_result',
    programmeId,
    contentVersion: attemptRow.contentVersion,
    subjectId: attemptRow.subjectId,
    contentHash: attemptRow.contentHash,
    recordedAt: nextTime(),
    attemptId: attemptRow.id,
    outcome,
  } as LearnerEvidence;
}

function solved(
  exerciseId: string,
  outcome: Parameters<typeof result>[1] = 'correct',
  options?: Parameters<typeof attempt>[2],
  attemptNumber = 1,
) {
  const row = attempt(exerciseId, attemptNumber, options);
  return [row, result(row, outcome)];
}

function derive(
  evidence: LearnerEvidence[],
  opened: string[] = [],
  runtimeAvailable = false,
) {
  return deriveProgrammeMastery({
    index,
    evidence,
    openedMissionIds: new Set(opened),
    runtimeAvailable,
  });
}

/** A runtime-free, structured or deterministic practice item carrying the skill. */
function practiceItemFor(skillId: string, unitKinds = ['P', 'L', 'W']) {
  return index.exercises.find(
    (entry) =>
      entry.skillIds.includes(skillId) &&
      unitKinds.includes(entry.unitKind) &&
      entry.evaluable &&
      !entry.needsRuntime &&
      !entry.masteryGate &&
      ['deterministic-evaluator', 'structured-reasoning'].includes(
        entry.evidenceTrust,
      ),
  )!.exerciseId;
}

function retrievalItemFor(skillId: string, unitId: string) {
  return index.exercises.find(
    (entry) =>
      entry.unitId === unitId &&
      entry.skillIds.includes(skillId) &&
      !entry.needsRuntime &&
      ['deterministic-evaluator', 'structured-reasoning'].includes(
        entry.evidenceTrust,
      ),
  )?.exerciseId;
}

describe('reading or opening content is progress, not competence', () => {
  it('opening every M01 mission creates no practised skill', () => {
    const opened = index.modules[0]!.missions.map(
      (mission) => mission.missionId,
    );
    const mastery = derive([], opened);

    for (const skill of Object.values(mastery.skills)) {
      expect(['unseen', 'recognised']).toContain(skill.state);
    }
  });
});

describe('test 10: non-evidence outcomes and unresolved attempts never count', () => {
  const item = practiceItemFor('SK-CMP-01');

  it('ignores not_evaluable, evaluator_error, recorded and unresolved attempts, which are never the first counted attempt', () => {
    const a1 = attempt(item, 1);
    const a2 = attempt(item, 2);
    const a3 = attempt(item, 3);
    const a4 = attempt(item, 4);
    const mastery = derive([
      a1,
      result(a1, 'not_evaluable'),
      a2,
      result(a2, 'evaluator_error'),
      a3, // unresolved
      a4,
      result(a4, 'incorrect'),
    ]);

    expect(mastery.attempts.get(a1.id)?.counting).toBe(false);
    expect(mastery.attempts.get(a2.id)?.counting).toBe(false);
    expect(mastery.attempts.get(a3.id)?.classification).toBe('unresolved');
    expect(mastery.skills['SK-CMP-01']!.firstCountedAttemptId).toBe(a4.id);
    expect(mastery.skills['SK-CMP-01']!.state).not.toBe('practised');
  });

  it('keeps a hint recorded around a non-counting attempt on later attempts as support', () => {
    const a1 = attempt(item, 1, { hints: 1 });
    const a2 = attempt(item, 2, { hints: 1 });
    const mastery = derive([
      a1,
      result(a1, 'evaluator_error'),
      a2,
      result(a2, 'correct'),
    ]);

    expect(mastery.attempts.get(a2.id)).toMatchObject({
      counting: true,
      supported: true,
    });
    expect(mastery.skills['SK-CMP-01']!.unsupportedCorrectCount).toBe(0);
  });
});

describe('support accounting and evidence trust', () => {
  it('lets supported success reach Practised and never Demonstrated or Retained', () => {
    const gate = index.exercises.find(
      (entry) =>
        entry.masteryGate &&
        entry.skillIds.includes('SK-CMP-01') &&
        !entry.needsRuntime,
    )!.exerciseId;
    const mastery = derive([
      ...solved(practiceItemFor('SK-CMP-01'), 'correct', { hints: 1 }),
      ...solved(gate, 'correct', { reopened: true }),
    ]);

    expect(mastery.skills['SK-CMP-01']!.state).toBe('practised');
    expect(mastery.skills['SK-CMP-01']!.retainedEvidence).toBe(false);
  });

  it('never counts pasted self-reported output or reflections', () => {
    const pasted = index.exercises.filter(
      (entry) =>
        entry.evidenceTrust === 'self-reported-paste' &&
        entry.skillIds.includes('SK-ENV-01'),
    );
    const reflections = index.exercises.filter(
      (entry) => entry.evidenceTrust === 'optional-reflection',
    );
    const evidence = [
      ...pasted.flatMap((entry) => solved(entry.exerciseId)),
      ...reflections.flatMap((entry) => solved(entry.exerciseId, 'recorded')),
    ];
    const mastery = derive(evidence);

    for (const row of evidence.filter(
      (entry) => entry.kind === 'exercise_attempt',
    )) {
      expect(mastery.attempts.get(row.id)?.counting, row.subjectId).toBe(false);
    }
    expect(mastery.skills['SK-ENV-01']!.state).not.toBe('practised');
  });
});

describe('content-version and exercise-hash binding (schema record §5)', () => {
  const item = practiceItemFor('SK-DBG-01');

  it('keeps evidence on a changed exercise as history without counting it', () => {
    const mastery = derive(solved(item, 'correct', { hash: 'f'.repeat(64) }));
    const [row] = solved(item, 'correct', { hash: 'f'.repeat(64) });

    expect(mastery.skills['SK-DBG-01']!.state).not.toBe('practised');
    expect(
      [...mastery.attempts.values()].map((entry) => entry.classification),
    ).toContain('stale_binding');
    expect(row).toBeDefined();
  });

  it('keeps evidence for an unknown exercise inert', () => {
    const unknown = {
      ...attempt(item, 1),
      id: 'attempt-unknown',
      subjectId: 's9-m99-x01-e01',
    } as LearnerEvidence;

    expect(
      derive([unknown, result(unknown, 'correct')]).attempts.get(
        'attempt-unknown',
      ),
    ).toMatchObject({
      classification: 'unknown_subject',
      counting: false,
    });
  });

  it('reports cannot-determine for evidence from newer content than the app carries', () => {
    const mastery = derive(
      solved(item, 'correct', { version: index.contentVersion + 1 }),
    );

    expect(mastery.cannotDetermine).toBe(true);
    expect(mastery.skills['SK-DBG-01']!.state).not.toBe('practised');
  });
});

describe('K-4 (owner rule 2026-10-03): criterion-referenced checkpoint clearance', () => {
  const m01Gates = index.exercises.filter(
    (entry) => entry.moduleId === 'S1-M01' && entry.masteryGate,
  );
  const gatesFor = (task: string) =>
    m01Gates.filter((entry) => entry.checkpointTask === task);

  it('clears a checkpoint at level D when every critical criterion has qualifying unsupported success', () => {
    const mastery = derive(
      m01Gates.flatMap((entry) => solved(entry.exerciseId)),
      [],
      true,
    );
    const judgement = mastery.checkpoints['S1-M01']!;

    expect(judgement.status).toBe('cleared');
    expect(
      Object.fromEntries(
        judgement.criteria.map((criterion) => [criterion.key, criterion.level]),
      ),
    ).toEqual({ c: 'D', d: 'D', r: 'D', x: 'D' });
    expect(mastery.modules['S1-M01']!.cleared).toBe(true);
    expect(mastery.modules['S1-M01']!.blockers).toEqual([]);
  });

  it('never manufactures a Strong level', () => {
    const mastery = derive(
      m01Gates.flatMap((entry) => solved(entry.exerciseId)),
      [],
      true,
    );

    for (const criterion of mastery.checkpoints['S1-M01']!.criteria) {
      expect(criterion.level).not.toBe('S');
    }
  });

  it('does not let easy successes hide one failed critical criterion', () => {
    const [failed, ...others] = gatesFor('d');
    const evidence = [
      ...m01Gates
        .filter((entry) => entry.exerciseId !== failed!.exerciseId)
        .flatMap((entry) => solved(entry.exerciseId)),
      ...solved(failed!.exerciseId, 'incorrect'),
    ];
    const mastery = derive(evidence, [], true);
    const judgement = mastery.checkpoints['S1-M01']!;

    expect(others.length).toBeGreaterThan(0);
    expect(judgement.status).toBe('not_yet');
    expect(
      judgement.criteria.find((criterion) => criterion.key === 'd')!.level,
    ).toBe('NY');
    expect(mastery.modules['S1-M01']!.cleared).toBe(false);
  });

  it.each([
    ['a hinted success', { hints: 1 }, 'correct'],
    ['reopened teaching', { reopened: true }, 'correct'],
    ['evaluator_error', {}, 'evaluator_error'],
    ['not_evaluable', {}, 'not_evaluable'],
  ] as const)(
    'does not clear a criterion from %s',
    (_label, options, outcome) => {
      const [target] = gatesFor('x');
      const evidence = [
        ...m01Gates
          .filter((entry) => entry.exerciseId !== target!.exerciseId)
          .flatMap((entry) => solved(entry.exerciseId)),
        ...solved(target!.exerciseId, outcome, options),
      ];
      const judgement = derive(evidence, [], true).checkpoints['S1-M01']!;

      expect(judgement.status).toBe('not_yet');
      expect(
        judgement.criteria.find((criterion) => criterion.key === 'x')!.level,
      ).toBe('NY');
    },
  );

  it('does not clear a criterion from a pending (unresolved) attempt', () => {
    const [target] = gatesFor('r');
    const evidence = [
      ...m01Gates
        .filter((entry) => entry.exerciseId !== target!.exerciseId)
        .flatMap((entry) => solved(entry.exerciseId)),
      attempt(target!.exerciseId, 1),
    ];

    expect(derive(evidence, [], true).checkpoints['S1-M01']!.status).toBe(
      'not_yet',
    );
  });

  it('keeps a checkpoint that needs Python uncleared while executable evaluation is unavailable', () => {
    const mastery = derive(
      m01Gates
        .filter((entry) => !entry.needsRuntime)
        .flatMap((entry) => solved(entry.exerciseId)),
      [],
      false,
    );

    expect(mastery.checkpoints['S1-M01']!.status).toBe('not_yet');
    expect(mastery.modules['S1-M01']!.cleared).toBe(false);
    expect(mastery.modules['S1-M01']!.blockers).toContain(
      'executable_evaluation_unavailable',
    );
  });

  it('uses only attempts whose terminal results qualify as the checkpoint basis (test 11)', () => {
    const gates = m01Gates.filter((entry) => !entry.needsRuntime);
    const [qualifying, errored, unresolved, unevaluable] = gates.map(
      (entry) => entry.exerciseId,
    );
    const evidence = [
      ...solved(qualifying!, 'incorrect'),
      ...solved(errored!, 'evaluator_error'),
      attempt(unresolved!, 1),
      ...solved(unevaluable!, 'not_evaluable'),
    ];
    const basis = derive(evidence).checkpoints['S1-M01']!.basisAttemptIds;

    expect(basis).toEqual([`attempt-${qualifying!.toLowerCase()}-1`]);
  });

  it('never trusts a stored checkpoint result under a rule the content does not carry', () => {
    const stored = {
      id: 'checkpoint-1',
      kind: 'checkpoint_result',
      programmeId,
      contentVersion: index.contentVersion,
      subjectId: 's1-m01-chk',
      contentHash: 'c'.repeat(64),
      recordedAt: nextTime(),
      attemptNumber: 1,
      criteria: [{ criterion: 'c', skillId: 'sk-git-01', level: 'S' }],
      passed: true,
      ruleId: 'invented-rule',
      basisAttemptIds: ['attempt-x'],
    } as LearnerEvidence;
    const mastery = derive([stored]);

    expect(mastery.checkpoints['S1-M01']!.status).toBe('not_yet');
    expect(mastery.checkpoints['S1-M01']!.storedResults).toEqual([
      { id: 'checkpoint-1', disposition: 'cannot_determine' },
    ]);
    expect(mastery.modules['S1-M01']!.cleared).toBe(false);
  });
});

describe('K-3 (owner rule 2026-10-03): retry is a new attempt on the same task', () => {
  const m01Gates = index.exercises.filter(
    (entry) => entry.moduleId === 'S1-M01' && entry.masteryGate,
  );
  const [processItem] = m01Gates.filter((entry) =>
    entry.skillIds.includes('SK-PRC-01'),
  );

  it('demonstrates a skill from an independent first success on a checkpoint task', () => {
    const mastery = derive(solved(processItem!.exerciseId), [], true);

    expect(mastery.skills['SK-PRC-01']!.state).toBe('demonstrated');
  });

  it('lets a later success clear the criterion but keeps the skill at Practised from that task alone', () => {
    const evidence = [
      ...m01Gates
        .filter((entry) => entry.exerciseId !== processItem!.exerciseId)
        .flatMap((entry) => solved(entry.exerciseId)),
      ...solved(processItem!.exerciseId, 'incorrect', {}, 1),
      ...solved(processItem!.exerciseId, 'correct', {}, 2),
    ];
    const mastery = derive(evidence, [], true);

    expect(mastery.checkpoints['S1-M01']!.status).toBe('cleared');
    expect(mastery.skills['SK-PRC-01']!.state).toBe('practised');
  });
});

describe('M02 clearance needs executable evidence, which is never removed from the denominator', () => {
  it('lists the runtime-dependent gate items as required and unavailable', () => {
    const m02Gates = index.exercises.filter(
      (entry) => entry.moduleId === 'S1-M02' && entry.masteryGate,
    );
    const runtimeGates = m02Gates
      .filter((entry) => entry.needsRuntime)
      .map((entry) => entry.subjectId);
    const mastery = derive(
      m02Gates
        .filter((entry) => !entry.needsRuntime)
        .flatMap((entry) => solved(entry.exerciseId)),
    );
    const readiness = mastery.modules['S1-M02']!;

    expect(runtimeGates).toEqual([
      's1-m02-chk-e01',
      's1-m02-chk-e02',
      's1-m02-chk-e03',
    ]);
    expect(readiness.requiredGateEvidence.total).toBe(m02Gates.length);
    expect(readiness.requiredGateEvidence.runtimeUnavailable).toEqual(
      runtimeGates,
    );
    expect(readiness.blockers).toContain('executable_evaluation_unavailable');
    expect(readiness.cleared).toBe(false);
  });

  it('keeps M01 free of a runtime blocker for its critical skills', () => {
    const mastery = derive([]);

    expect(mastery.modules['S1-M01']!.blockers).not.toContain(
      'executable_evaluation_unavailable',
    );
    expect(
      mastery.modules['S1-M01']!.requiredGateEvidence.runtimeUnavailable,
    ).toEqual(['s1-m01-chk-e01']);
  });
});

describe('§3 item 14: curriculum-spaced retrieval', () => {
  const skill = 'SK-THK-01';

  it('treats S1-M01-RET as consolidation that creates no retained evidence', () => {
    const consolidation = retrievalItemFor(skill, 'S1-M01-RET')!;
    const mastery = derive([
      ...solved(practiceItemFor(skill)),
      ...solved(consolidation),
    ]);

    expect(mastery.skills[skill]!.retainedEvidence).toBe(false);
  });

  it('creates retained evidence from an unsupported first correct answer at the later authored opportunity S1-M02-RET', () => {
    const separated = retrievalItemFor(skill, 'S1-M02-RET')!;
    const mastery = derive([
      ...solved(practiceItemFor(skill)),
      ...solved(separated),
    ]);

    expect(mastery.skills[skill]!.retainedEvidence).toBe(true);
  });

  it('creates nothing from elapsed time, a supported retrieval or a repeat after an earlier miss', () => {
    const separated = retrievalItemFor(skill, 'S1-M02-RET')!;
    const prior = attempt(practiceItemFor(skill), 1);
    const longAfter = {
      ...attempt(practiceItemFor(skill), 2),
      recordedAt: '2030-01-01T00:00:00.000Z',
    } as LearnerEvidence;

    expect(
      derive([
        prior,
        result(prior, 'correct'),
        longAfter,
        result(longAfter, 'correct'),
      ]).skills[skill]!.retainedEvidence,
    ).toBe(false);
    expect(
      derive([
        ...solved(practiceItemFor(skill)),
        ...solved(separated, 'correct', { hints: 1 }),
      ]).skills[skill]!.retainedEvidence,
    ).toBe(false);
    expect(
      derive([
        ...solved(practiceItemFor(skill)),
        ...solved(separated, 'incorrect'),
        ...solved(separated, 'correct', undefined, 2),
      ]).skills[skill]!.retainedEvidence,
    ).toBe(false);
  });

  it('shows no retrieval opportunity, and no failure, for a skill without one authored (K-5)', () => {
    const mastery = derive(solved(practiceItemFor('SK-TST-01')));

    expect(mastery.skills['SK-TST-01']!.retentionOpportunity).toBe(
      'none_authored',
    );
    expect(mastery.skills['SK-TST-01']!.retrievalDue).toBe(false);
  });

  it('presents a repetition set in authored order and marks items already answered correctly', () => {
    const set = index.exercises.filter(
      (entry) => entry.unitId === 'S1-M02-RET',
    );
    const [firstItem] = set;
    const mastery = derive(solved(firstItem!.exerciseId));
    const presentation = mastery.retrieval['S1-M02-RET']!;

    expect(presentation.items.map((entry) => entry.exerciseId)).toEqual(
      set.map((entry) => entry.exerciseId),
    );
    expect(presentation.items[0]).toMatchObject({ alreadyCorrect: true });
    expect(
      presentation.items.slice(1).every((entry) => !entry.alreadyCorrect),
    ).toBe(true);
    expect(presentation.lessonClosed).toBe(true);
  });

  it('a failed retrieval takes nothing away', () => {
    const separated = retrievalItemFor(skill, 'S1-M02-RET')!;
    const before = derive(solved(practiceItemFor(skill)));
    const after = derive([
      ...solved(practiceItemFor(skill)),
      ...solved(separated, 'incorrect'),
    ]);

    expect(after.skills[skill]!.state).toBe(before.skills[skill]!.state);
  });
});
