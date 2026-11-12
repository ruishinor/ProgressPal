import { describe, expect, it } from 'vitest';

import type { LessonExercise } from '@/lib/domain';

import { p2Modules } from './p2Content';

/**
 * Learner feedback 2026-10-08 (LF-005, LF-023, LF-027): oracles over the real
 * exported Programme #2 content. They read what the static host serves, so a
 * correction made only in a generated file, or only in the authoring source
 * without a fresh export, cannot satisfy them.
 */

type Flow = Array<{ t: string }>;

const units = Object.values(p2Modules).flatMap(
  (module) =>
    (module as unknown as { units: Array<{ unit_id: string; flow: Flow }> })
      .units,
);
const exercises = units
  .flatMap((unit) => unit.flow)
  .filter((block) => block.t === 'exercise') as unknown as LessonExercise[];

const byId = (id: string) => exercises.find((exercise) => exercise.id === id)!;

describe('LF-005: typed-answer task contract', () => {
  it('the reported `pwd` task still accepts pwd and still has a hint ladder', () => {
    const task = byId('S1-M01-P02-E01');

    expect(task.type).toBe('cmd');
    expect(task.hints.length).toBeGreaterThanOrEqual(1);
    expect(task.type === 'cmd' && task.canonical).toBe('pwd');
  });
});

describe('LF-023: the ten-step development process keeps its educational target', () => {
  const stepNames = [
    'Problem',
    'Behov',
    'Krav',
    'Modellering',
    'Planlegging',
    'Programmering',
    'Testing',
    'Forbedring',
    'Dokumentasjon',
    'Presentasjon',
  ];

  it('still asks the learner to reconstruct all ten steps in order', () => {
    const task = byId('S1-M01-P05-E06');

    expect(task.type).toBe('sort');
    expect(task.type === 'sort' && task.kind).toBe('order');
    expect(task.type === 'sort' && task.items.map((item) => item[0])).toEqual(
      stepNames,
    );
  });
});

describe('LF-027: the matching task needs interpretation, not vocabulary', () => {
  const task = byId('S1-M01-P05-E07');
  it('is still a matching exercise', () => {
    expect(task.type).toBe('sort');
    expect(task.type === 'sort' && task.kind).toBe('match');
  });

  it('offers distractors and never pairs a text with itself', () => {
    if (task.type !== 'sort') {
      throw new Error('expected a sort exercise');
    }

    expect(task.distractors.length).toBeGreaterThanOrEqual(2);

    for (const [left, right] of task.items) {
      expect(right).toBeDefined();
      expect(right!.trim().toLowerCase()).not.toBe(left!.trim().toLowerCase());
    }

    const rights = task.items.map((item) => item[1]);
    expect(new Set(rights).size).toBe(rights.length);
  });
});
