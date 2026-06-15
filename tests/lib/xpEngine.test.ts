import { describe, expect, it } from 'vitest';
import {
  calculateXpSummary,
  deriveXpTransactionId,
  getCrossedBlocks,
  evaluateProgressXp,
} from '@/lib/xp/engine';
import type { CourseItem, CourseUnit, ProgressEntry } from '@/lib/domain';

describe('XP Engine Formulas', () => {
  it('correctly maps XP thresholds to levels', () => {
    // Required user tests
    expect(calculateXpSummary(0).level).toBe(1);
    expect(calculateXpSummary(99).level).toBe(1);
    expect(calculateXpSummary(100).level).toBe(2);
    expect(calculateXpSummary(399).level).toBe(2);
    expect(calculateXpSummary(400).level).toBe(3);
    expect(calculateXpSummary(900).level).toBe(4);
    expect(calculateXpSummary(1600).level).toBe(5);

    // Additional boundary checks
    expect(calculateXpSummary(100).xpToNextLevel).toBe(300); // Level 2 ceiling is 400
    expect(calculateXpSummary(399).xpToNextLevel).toBe(1);
    expect(calculateXpSummary(400).xpToNextLevel).toBe(500); // Level 3 ceiling is 900
    expect(calculateXpSummary(900).xpToNextLevel).toBe(700); // Level 4 ceiling is 1600
    expect(calculateXpSummary(1600).xpToNextLevel).toBe(900); // Level 5 ceiling is 2500
  });

  it('guarantees monotonicity over a broad range', () => {
    let previousLevel = 0;
    for (let xp = 0; xp <= 10000; xp += 5) {
      const summary = calculateXpSummary(xp);
      expect(summary.level).toBeGreaterThanOrEqual(previousLevel);
      expect(summary.xpToNextLevel).toBeGreaterThan(0);
      expect(summary.currentLevelFloorXp).toBeLessThanOrEqual(xp);
      expect(summary.nextLevelXp).toBeGreaterThan(xp);
      previousLevel = summary.level;
    }
  });
});

describe('XP Transaction ID Hashing', () => {
  it('creates clean IDs directly when valid', () => {
    const id = deriveXpTransactionId('study_session', 'session-123');
    expect(id).toBe('xp-study_session-session-123');
  });

  it('uses deterministic hash helper when characters are unsafe', () => {
    const id1 = deriveXpTransactionId(
      'media_unique_10_minutes',
      'asset/123/block:0',
    );
    const id2 = deriveXpTransactionId(
      'media_unique_10_minutes',
      'asset/123/block:0',
    );
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^xp-hashed-[a-f0-9]{16}$/);
  });

  it('proves two different source IDs do not collapse into the same transaction ID', () => {
    const id1 = deriveXpTransactionId(
      'media_unique_10_minutes',
      'asset/123/block:0',
    );
    const id2 = deriveXpTransactionId(
      'media_unique_10_minutes',
      'asset/123/block:1',
    );
    expect(id1).not.toBe(id2);
  });
});

describe('Long-Form Media Crossed Blocks', () => {
  it('detects fully crossed 10-minute blocks (600 seconds each)', () => {
    const duration = 1500; // 25 minutes (2 full 10-minute blocks, 1 partial)

    // 0 watched
    expect(getCrossedBlocks([], duration)).toEqual([]);

    // Less than 10 minutes watched
    expect(
      getCrossedBlocks([{ startSecond: 0, endSecond: 599 }], duration),
    ).toEqual([]);

    // Exactly one block watched
    expect(
      getCrossedBlocks([{ startSecond: 0, endSecond: 600 }], duration),
    ).toEqual([0]);

    // Overlap checks - same range twice
    expect(
      getCrossedBlocks(
        [
          { startSecond: 0, endSecond: 600 },
          { startSecond: 0, endSecond: 600 },
        ],
        duration,
      ),
    ).toEqual([0]);

    // Overlap checks - partial segments merging to cover the block
    expect(
      getCrossedBlocks(
        [
          { startSecond: 0, endSecond: 300 },
          { startSecond: 200, endSecond: 500 },
          { startSecond: 450, endSecond: 600 },
        ],
        duration,
      ),
    ).toEqual([0]);

    // Crossing second block as well
    expect(
      getCrossedBlocks(
        [
          { startSecond: 0, endSecond: 600 },
          { startSecond: 600, endSecond: 1200 },
        ],
        duration,
      ),
    ).toEqual([0, 1]);

    // Partial block at the end (e.g. 1200-1500 is only 5 minutes) cannot be crossed
    expect(
      getCrossedBlocks([{ startSecond: 0, endSecond: 1500 }], duration),
    ).toEqual([0, 1]);
  });
});

describe('Course Progress Milestones Evaluation', () => {
  const dummyItem = (id: string, type: CourseItem['type']): CourseItem => ({
    id,
    unitId: 'unit-1',
    type,
    title: `Item ${id}`,
    required: true,
    estimatedMinutes: 30,
    order: 0,
    createdAt: '2026-06-12T20:00:00Z',
    updatedAt: '2026-06-12T20:00:00Z',
  });

  const dummyUnit = (id: string, type: CourseUnit['type']): CourseUnit => ({
    id,
    courseId: 'cs50x',
    title: `Unit ${id}`,
    order: 0,
    type,
    sourceYear: 2026,
    required: true,
    createdAt: '2026-06-12T20:00:00Z',
    updatedAt: '2026-06-12T20:00:00Z',
  });

  const dummyProgress = (
    itemId: string,
    status: ProgressEntry['status'],
  ): ProgressEntry => ({
    id: `progress-${itemId}`,
    itemId,
    status,
    createdAt: '2026-06-12T20:00:00Z',
    updatedAt: '2026-06-12T20:00:00Z',
    confidence: 5,
  });

  it('awards completion XP for supported item types', () => {
    const lecture = dummyItem('lecture-1', 'lecture');
    const unit = dummyUnit('unit-1', 'week');
    const progress = dummyProgress('lecture-1', 'completed');

    const awards = evaluateProgressXp({
      progressEntry: progress,
      item: lecture,
      unit,
      allUnitItems: [lecture],
      allUnitProgress: [progress],
    });

    expect(awards).toContainEqual({
      sourceType: 'lecture_completed',
      sourceId: 'lecture-1-completed',
      xp: 40,
      reason: 'Completed lecture: Item lecture-1',
    });
  });

  it('handles problem set start/submit/accept milestones correctly', () => {
    const pset = dummyItem('pset-1', 'problem_set');
    const unit = dummyUnit('unit-1', 'week');

    // Started status
    const progressStart = dummyProgress('pset-1', 'started');
    const startAwards = evaluateProgressXp({
      progressEntry: progressStart,
      item: pset,
      unit,
      allUnitItems: [pset],
      allUnitProgress: [progressStart],
    });
    expect(startAwards).toEqual([
      {
        sourceType: 'problem_set_started',
        sourceId: 'pset-1-started',
        xp: 20,
        reason: 'Started problem set: Item pset-1',
      },
    ]);

    // Submitted status (triggers both started and submitted)
    const progressSubmit = dummyProgress('pset-1', 'submitted');
    const submitAwards = evaluateProgressXp({
      progressEntry: progressSubmit,
      item: pset,
      unit,
      allUnitItems: [pset],
      allUnitProgress: [progressSubmit],
    });
    expect(submitAwards).toContainEqual({
      sourceType: 'problem_set_started',
      sourceId: 'pset-1-started',
      xp: 20,
      reason: 'Started problem set: Item pset-1',
    });
    expect(submitAwards).toContainEqual({
      sourceType: 'problem_set_submitted',
      sourceId: 'pset-1-submitted',
      xp: 75,
      reason: 'Submitted problem set: Item pset-1',
    });

    // Accepted status (triggers all three)
    const progressAccept = dummyProgress('pset-1', 'accepted');
    const acceptAwards = evaluateProgressXp({
      progressEntry: progressAccept,
      item: pset,
      unit,
      allUnitItems: [pset],
      allUnitProgress: [progressAccept],
    });
    expect(acceptAwards).toContainEqual({
      sourceType: 'problem_set_started',
      sourceId: 'pset-1-started',
      xp: 20,
      reason: 'Started problem set: Item pset-1',
    });
    expect(acceptAwards).toContainEqual({
      sourceType: 'problem_set_submitted',
      sourceId: 'pset-1-submitted',
      xp: 75,
      reason: 'Submitted problem set: Item pset-1',
    });
    expect(acceptAwards).toContainEqual({
      sourceType: 'problem_set_accepted',
      sourceId: 'pset-1-accepted',
      xp: 125,
      reason: 'Accepted problem set: Item pset-1',
    });
  });

  it('awards week unit completion only when all required items are complete', () => {
    const item1 = dummyItem('item-1', 'lecture');
    const item2 = dummyItem('item-2', 'practice');
    const item3 = { ...dummyItem('item-3', 'reading'), required: false }; // optional
    const unit = dummyUnit('unit-1', 'week');

    const progress1 = dummyProgress('item-1', 'completed');
    const progress2 = dummyProgress('item-2', 'started'); // not complete
    const progress3 = dummyProgress('item-3', 'not_started');

    // Item 1 complete, Item 2 in progress -> Week NOT complete
    const awards1 = evaluateProgressXp({
      progressEntry: progress1,
      item: item1,
      unit,
      allUnitItems: [item1, item2, item3],
      allUnitProgress: [progress1, progress2, progress3],
    });
    expect(awards1.some((a) => a.sourceType === 'week_completed')).toBe(false);

    // Item 1 complete, Item 2 complete -> Week is complete (even though item3 is not complete since it is optional)
    const progress2Complete = dummyProgress('item-2', 'accepted');
    const awards2 = evaluateProgressXp({
      progressEntry: progress2Complete,
      item: item2,
      unit,
      allUnitItems: [item1, item2, item3],
      allUnitProgress: [progress1, progress2Complete, progress3],
    });
    expect(awards2).toContainEqual({
      sourceType: 'week_completed',
      sourceId: 'unit-1',
      xp: 150,
      reason: 'Completed all required items for Unit unit-1',
    });
  });
});
