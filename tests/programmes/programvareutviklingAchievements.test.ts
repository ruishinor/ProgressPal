import { describe, expect, it } from 'vitest';

import {
  planEvidenceAchievementUnlocks,
  sharedAchievementDefinitions,
} from '@/lib/achievements';
import type {
  EvaluationResultRecord,
  ExerciseAttemptRecord,
  LearnerEvidence,
  ProgrammeContentIndex,
} from '@/lib/domain';
import { cs50AchievementCatalogue } from '@/programmes/cs50x-2026/achievements';
import {
  programvareutviklingAchievementContentVersion,
  programvareutviklingAchievementDefinitions,
  programvareutviklingAchievementIdPrefix,
  programvareutviklingAchievements,
} from '@/programmes/programvareutvikling/achievements';

import { p2Catalogue, p2Index } from './p2Content';

const index = p2Index as unknown as ProgrammeContentIndex;

const p2Ids = [
  'p2-code-reader',
  'p2-error-reader',
  'p2-foundation-checkpoint',
  'p2-change-calculator',
  'p2-coffee-change',
  'p2-recall-foundations',
  'p2-values-checkpoint',
] as const;

describe('Programvareutvikling achievements', () => {
  it('preserves the six shared definitions by identity and adds exactly seven P2 definitions', () => {
    expect(sharedAchievementDefinitions).toHaveLength(6);
    expect(
      programvareutviklingAchievementDefinitions.map((entry) => entry.id),
    ).toEqual(p2Ids);
    expect(programvareutviklingAchievements).toHaveLength(13);

    for (const shared of sharedAchievementDefinitions) {
      expect(
        programvareutviklingAchievements.find(
          (entry) => entry.id === shared.id,
        ),
      ).toBe(shared);
    }
  });

  it('keeps every P2 achievement reward-free and on an evidence-backed rule', () => {
    for (const definition of programvareutviklingAchievementDefinitions) {
      expect(definition.xpReward).toBe(0);
      expect(['evidence_subjects_solved', 'checkpoint_cleared']).toContain(
        definition.ruleType,
      );
    }
  });
});

describe('P2 achievement ids are globally unique and namespaced', () => {
  // Unlocks are stored by achievement id alone (v1.6.0 architecture), so a
  // Programvareutvikling id must never collide with another programme's.
  it('gives every programme-specific definition the p2- namespace', () => {
    expect(programvareutviklingAchievementIdPrefix).toBe('p2-');

    for (const definition of programvareutviklingAchievementDefinitions) {
      expect(definition.id.startsWith('p2-')).toBe(true);
    }
  });

  it('never reuses a P2 id in the shared or CS50 catalogues, and never repeats an id', () => {
    const other = [
      ...sharedAchievementDefinitions,
      ...cs50AchievementCatalogue,
    ].map((definition) => definition.id);

    expect(other.filter((id) => id.startsWith('p2-'))).toEqual([]);

    const all = programvareutviklingAchievements.map(
      (definition) => definition.id,
    );
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('P2 achievements are bound to the content version they describe', () => {
  it('is valid for the live Programvareutvikling content version', () => {
    // If this fails the content changed: re-review every definition in
    // programvareutvikling/achievements.ts against it, then bump the constant.
    expect(programvareutviklingAchievementContentVersion).toBe(
      index.contentVersion,
    );
    expect(programvareutviklingAchievementContentVersion).toBe(
      p2Catalogue.contentVersion,
    );

    for (const definition of programvareutviklingAchievementDefinitions) {
      expect(definition.ruleConfig.contentVersion, definition.id).toBe(
        index.contentVersion,
      );
    }
  });

  it('names only subjects and modules that exist in that content', () => {
    const subjects = new Set(index.exercises.map((entry) => entry.subjectId));
    const modules = new Set(index.modules.map((entry) => entry.moduleId));

    for (const definition of programvareutviklingAchievementDefinitions) {
      const { subjectIds, moduleId } = definition.ruleConfig as {
        subjectIds?: string[];
        moduleId?: string;
      };

      for (const subjectId of subjectIds ?? []) {
        expect(subjects.has(subjectId), `${definition.id}: ${subjectId}`).toBe(
          true,
        );
      }

      if (moduleId !== undefined) {
        expect(modules.has(moduleId), `${definition.id}: ${moduleId}`).toBe(
          true,
        );
      }
    }
  });

  function solved(subjectId: string, contentVersion: number, tick: number) {
    const meta = index.exercises.find(
      (entry) => entry.subjectId === subjectId,
    )!;
    const stamp = (offset: number) =>
      new Date(Date.UTC(2026, 9, 4, 10, 0, tick * 2 + offset)).toISOString();
    const attempt: ExerciseAttemptRecord = {
      id: `attempt-${subjectId}`,
      kind: 'exercise_attempt',
      programmeId: index.programmeId,
      contentVersion,
      subjectId,
      contentHash: meta.contentHash,
      recordedAt: stamp(0),
      attemptNumber: 1,
      responseMode: meta.responseMode,
      answer: { text: 'svar' },
      hintsUsedMax: 0,
      teachingReopened: false,
    };
    const result: EvaluationResultRecord = {
      id: `result-${attempt.id}`,
      kind: 'evaluation_result',
      programmeId: index.programmeId,
      contentVersion,
      subjectId,
      contentHash: meta.contentHash,
      recordedAt: stamp(1),
      attemptId: attempt.id,
      outcome: 'correct',
    };

    return [attempt, result] as const;
  }

  function planFor(liveVersion: number) {
    const code = programvareutviklingAchievementDefinitions.find(
      (entry) => entry.id === 'p2-code-reader',
    )!;
    const rows = (code.ruleConfig.subjectIds as string[]).map((id, tick) =>
      solved(id, liveVersion, tick),
    );
    const last = rows.at(-1)!;

    return planEvidenceAchievementUnlocks(
      {
        definitions: programvareutviklingAchievementDefinitions,
        index: { ...index, contentVersion: liveVersion },
        runtimeAvailable: true,
      },
      {
        attempt: last[0],
        result: last[1],
        evidence: rows.flat() as LearnerEvidence[],
      },
    ).map((entry) => entry.achievementId);
  }

  it('awards at the bound version and awards nothing when the content version moves on', () => {
    // Control: the same complete, correct evidence unlocks at the bound version.
    expect(planFor(index.contentVersion)).toContain('p2-code-reader');
    // A changed content version fails closed: no false unlock, no throw.
    expect(planFor(index.contentVersion + 1)).toEqual([]);
  });
});
