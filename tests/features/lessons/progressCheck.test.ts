import { describe, expect, it } from 'vitest';

import {
  moveOrderItem,
  noProgressChecks,
  orderSlots,
  progressCheckAvailability,
  progressCheckCount,
  progressCheckNeed,
  progressCheckRule,
  takeProgressCheck,
} from '@/features/lessons/progressCheck';

/**
 * The rule of "Sjekk så langt" as pure functions (Task 6, owner decision
 * 2026-10-10). Positions are by item: item i belongs in place i + 1, and 0
 * means not placed. Ten items, like Task 6.
 */

const empty = Array.from({ length: 10 }, () => 0);
/** Items 0..n-1 placed in their right places. */
const rightPrefix = (n: number) =>
  empty.map((_, index) => (index < n ? index + 1 : 0));

describe('progressCheckCount', () => {
  it('counts placed steps and the placed steps in their right place only', () => {
    // Places 1 and 4 right; items 2 and 1 swapped into places 2 and 3.
    const positions = [1, 3, 2, 4, 0, 0, 0, 0, 0, 0];

    expect(progressCheckCount(positions)).toEqual({ placed: 4, correct: 2 });
    expect(progressCheckCount(empty)).toEqual({ placed: 0, correct: 0 });
  });
});

describe('progressCheckAvailability', () => {
  it('opens the first check at four placed steps', () => {
    expect(progressCheckAvailability(rightPrefix(3), noProgressChecks)).toEqual(
      { status: 'blocked', reason: 'first' },
    );
    expect(progressCheckAvailability(rightPrefix(4), noProgressChecks)).toEqual(
      { status: 'available', left: 2 },
    );
  });

  it('never opens while at most one step remains', () => {
    for (const placed of [9, 10]) {
      expect(
        progressCheckAvailability(rightPrefix(placed), noProgressChecks),
      ).toEqual({ status: 'blocked', reason: 'nearly_complete' });
    }
    expect(
      progressCheckAvailability(rightPrefix(8), noProgressChecks).status,
    ).toBe('available');
  });

  it('opens the second check only at seven placed and three places changed', () => {
    const afterFirst = takeProgressCheck(rightPrefix(4), noProgressChecks);

    expect(afterFirst.used).toBe(1);
    expect(progressCheckAvailability(rightPrefix(6), afterFirst)).toEqual({
      status: 'blocked',
      reason: 'second',
    });
    expect(progressCheckAvailability(rightPrefix(7), afterFirst)).toEqual({
      status: 'available',
      left: 1,
    });

    // A late first check at seven: one more step is not enough...
    const late = takeProgressCheck(rightPrefix(7), noProgressChecks);
    expect(progressCheckAvailability(rightPrefix(8), late).status).toBe(
      'blocked',
    );
    // ...but swapping two placed steps as well changes two more places.
    const swapped = moveOrderItem(rightPrefix(8), 0, 1);
    expect(progressCheckAvailability(swapped, late)).toEqual({
      status: 'available',
      left: 1,
    });
  });

  it('closes after two checks', () => {
    const first = takeProgressCheck(rightPrefix(4), noProgressChecks);
    const second = takeProgressCheck(rightPrefix(7), first);

    expect(second.used).toBe(progressCheckRule.maxChecks);
    expect(progressCheckAvailability(rightPrefix(8), second)).toEqual({
      status: 'blocked',
      reason: 'used',
    });
  });
});

describe('takeProgressCheck', () => {
  it('records the count and the first arrangement, and ignores an unavailable check', () => {
    const positions = [1, 3, 2, 4, 0, 0, 0, 0, 0, 0];
    const first = takeProgressCheck(positions, noProgressChecks);

    expect(first).toEqual({
      used: 1,
      firstSlots: orderSlots(positions),
      result: { placed: 4, correct: 2 },
    });
    // A repeat on the same arrangement (a double click) changes nothing.
    expect(takeProgressCheck(positions, first)).toBe(first);
    expect(takeProgressCheck(rightPrefix(2), noProgressChecks)).toBe(
      noProgressChecks,
    );
  });
});

describe('moveOrderItem', () => {
  it('swaps with the neighbouring step and leaves every other step', () => {
    expect(moveOrderItem([1, 2, 3, 0], 1, 1)).toEqual([1, 3, 2, 0]);
    expect(moveOrderItem([1, 2, 3, 0], 2, -1)).toEqual([1, 3, 2, 0]);
  });

  it('moves into an empty neighbouring place', () => {
    expect(moveOrderItem([1, 2, 0, 0], 1, 1)).toEqual([1, 3, 0, 0]);
  });

  it('does nothing at either end or for an unplaced step', () => {
    expect(moveOrderItem([1, 2, 0, 0], 0, -1)).toEqual([1, 2, 0, 0]);
    expect(moveOrderItem([2, 3, 4, 1], 2, 1)).toEqual([2, 3, 4, 1]);
    expect(moveOrderItem([1, 2, 0, 0], 2, 1)).toEqual([1, 2, 0, 0]);
  });
});

describe('progressCheckNeed', () => {
  it('counts the steps still to choose for the first check', () => {
    expect(progressCheckNeed(empty, noProgressChecks)).toEqual({
      place: 4,
      rearrange: false,
    });
    expect(progressCheckNeed(rightPrefix(3), noProgressChecks)).toEqual({
      place: 1,
      rearrange: false,
    });
  });

  it('says choosing is enough for the second check when it covers the places to change', () => {
    const afterFirst = takeProgressCheck(rightPrefix(4), noProgressChecks);

    expect(progressCheckNeed(rightPrefix(4), afterFirst)).toEqual({
      place: 3,
      rearrange: false,
    });
    expect(progressCheckNeed(rightPrefix(6), afterFirst)).toEqual({
      place: 1,
      rearrange: false,
    });
  });

  it('says the order must change when choosing steps cannot be enough', () => {
    const late = takeProgressCheck(rightPrefix(7), noProgressChecks);

    // Seven placed already, nothing changed: no step to choose, order to change.
    expect(progressCheckNeed(rightPrefix(7), late)).toEqual({
      place: 0,
      rearrange: true,
    });
    // One more step changes one place; two more are still to change.
    expect(progressCheckNeed(rightPrefix(8), late)).toEqual({
      place: 0,
      rearrange: true,
    });
  });
});
