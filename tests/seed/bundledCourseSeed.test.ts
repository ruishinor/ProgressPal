import { describe, expect, it } from 'vitest';

import { bundledCourseSeed } from '@/seed';

describe('bundledCourseSeed', () => {
  it('ships the validated CS50x 2026 catalog expected by Module 05', () => {
    expect(bundledCourseSeed.courseId).toBe('cs50x-2026');
    expect(bundledCourseSeed.title).toBe('CS50x 2026');
    expect(bundledCourseSeed.dataVersion).toBe(20260617);
    expect(bundledCourseSeed.sourceCheckedDate).toBe('2026-06-17');
    expect(bundledCourseSeed.units).toHaveLength(14);
    expect(
      bundledCourseSeed.units.reduce(
        (total, unit) => total + unit.items.length,
        0,
      ),
    ).toBe(68);
    expect(bundledCourseSeed.units.map((unit) => unit.id)).toEqual([
      'week-0',
      'week-1',
      'week-2',
      'week-3',
      'week-4',
      'week-5',
      'week-6',
      'week-7',
      'artificial-intelligence',
      'week-8',
      'week-9',
      'week-10',
      'additional-practice',
      'final-project',
    ]);
  });

  it('uses CS50-specific item titles', () => {
    const week0 = bundledCourseSeed.units.find((u) => u.id === 'week-0');
    expect(week0?.items.find((i) => i.id === 'week-0-lecture')?.title).toBe(
      'Lecture 0: Scratch',
    );
    expect(week0?.items.find((i) => i.id === 'week-0-problem-set')?.title).toBe(
      'Problem Set 0: Scratch',
    );

    const week1 = bundledCourseSeed.units.find((u) => u.id === 'week-1');
    expect(week1?.items.find((i) => i.id === 'week-1-lecture')?.title).toBe(
      'Lecture 1: C',
    );
    expect(week1?.items.find((i) => i.id === 'week-1-shorts')?.title).toBe(
      'Shorts: C',
    );
    expect(week1?.items.find((i) => i.id === 'week-1-section')?.title).toBe(
      'Section: C',
    );
    expect(week1?.items.find((i) => i.id === 'week-1-problem-set')?.title).toBe(
      'Problem Set 1: C',
    );

    const aiUnit = bundledCourseSeed.units.find(
      (u) => u.id === 'artificial-intelligence',
    );
    expect(
      aiUnit?.items.find((i) => i.id === 'artificial-intelligence-lecture')
        ?.title,
    ).toBe('Lecture: Artificial Intelligence');

    const week10 = bundledCourseSeed.units.find((u) => u.id === 'week-10');
    expect(week10?.title).toBe('Week 10: The End');
    expect(week10?.items.find((i) => i.id === 'week-10-lecture')?.title).toBe(
      'Lecture 10: The End',
    );
  });

  it('keeps optional enrichment separate from required course milestones', () => {
    const aiUnit = bundledCourseSeed.units.find(
      (unit) => unit.id === 'artificial-intelligence',
    );
    const practiceUnit = bundledCourseSeed.units.find(
      (unit) => unit.id === 'additional-practice',
    );
    const finalProjectUnit = bundledCourseSeed.units.find(
      (unit) => unit.id === 'final-project',
    );

    expect(aiUnit?.required).toBe(false);
    expect(practiceUnit?.required).toBe(false);
    expect(practiceUnit?.items.every((item) => item.type === 'practice')).toBe(
      true,
    );
    expect(finalProjectUnit?.required).toBe(true);
    expect(finalProjectUnit?.items.map((item) => item.id)).toEqual([
      'final-project-build',
      'final-project-video-demo',
      'final-project-readme',
      'final-project-submit50',
      'final-project-gradebook-check',
    ]);
  });
});
