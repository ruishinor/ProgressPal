import { rightOrderPlaces } from './drafts';

/**
 * "Sjekk så langt": a formative check of an ordering task while the learner
 * builds it (owner decision 2026-10-10, Task 6 only, by programme
 * configuration). It says how many placed steps stand right, never which,
 * and only twice per card: first from four placed steps, then from seven
 * once three places hold another step than at the first check. It is local
 * and leaves nothing behind: no attempt, no result, no XP, no mastery. With
 * at most one step left the answer is in effect complete, so the scored
 * "Sjekk svaret" decides instead. A reload or another visit starts the card
 * (and its draft) afresh; that limit is stated, not defended against.
 */

export const progressCheckRule = Object.freeze({
  maxChecks: 2,
  firstAt: 4,
  secondAt: 7,
  changedSinceFirst: 3,
  minRemaining: 2,
});

export type ProgressCheckCount = {
  readonly correct: number;
  readonly placed: number;
};

export type ProgressCheckState = {
  readonly used: number;
  /** The item in each place at the first check (-1 for an empty place). */
  readonly firstSlots: readonly number[] | null;
  /** What the last check found, shown until the next scored submission. */
  readonly result: ProgressCheckCount | null;
};

export type ProgressCheckAvailability =
  | { readonly status: 'available'; readonly left: number }
  | {
      readonly status: 'blocked';
      readonly reason: 'first' | 'second' | 'nearly_complete' | 'used';
    };

export const noProgressChecks: ProgressCheckState = Object.freeze({
  used: 0,
  firstSlots: null,
  result: null,
});

/** The item in each place, in place order (-1 for an empty place). */
export function orderSlots(positions: readonly number[]): number[] {
  return positions.map((_, slot) =>
    positions.findIndex((position) => position === slot + 1),
  );
}

/** How many steps are placed, and how many of those stand right. */
export function progressCheckCount(
  positions: readonly number[],
): ProgressCheckCount {
  const right = rightOrderPlaces(positions);

  return {
    placed: positions.filter((position) => position > 0).length,
    correct: right.filter(Boolean).length,
  };
}

/** Places that now hold a step and held another one at the first check. */
function changedSince(
  firstSlots: readonly number[],
  positions: readonly number[],
): number {
  return orderSlots(positions).filter(
    (item, slot) => item !== -1 && item !== firstSlots[slot],
  ).length;
}

export function progressCheckAvailability(
  positions: readonly number[],
  state: ProgressCheckState,
): ProgressCheckAvailability {
  const rule = progressCheckRule;
  const { placed } = progressCheckCount(positions);

  if (state.used >= rule.maxChecks) {
    return { status: 'blocked', reason: 'used' };
  }

  if (positions.length - placed < rule.minRemaining) {
    return { status: 'blocked', reason: 'nearly_complete' };
  }

  if (state.used === 0) {
    return placed >= rule.firstAt
      ? { status: 'available', left: rule.maxChecks }
      : { status: 'blocked', reason: 'first' };
  }

  return placed >= rule.secondAt &&
    state.firstSlots !== null &&
    changedSince(state.firstSlots, positions) >= rule.changedSinceFirst
    ? { status: 'available', left: rule.maxChecks - state.used }
    : { status: 'blocked', reason: 'second' };
}

/**
 * What a blocked check still waits for, for the one short line that tells the
 * learner what to do: steps to choose (`place`) and whether the order also
 * needs to change. A step chosen into a place that held another step at the
 * first check counts for both, so choosing is enough when it covers the
 * places still to change.
 */
export type ProgressCheckNeed = {
  readonly place: number;
  readonly rearrange: boolean;
};

export function progressCheckNeed(
  positions: readonly number[],
  state: ProgressCheckState,
): ProgressCheckNeed {
  const rule = progressCheckRule;
  const { placed } = progressCheckCount(positions);

  if (state.used === 0 || state.firstSlots === null) {
    return { place: Math.max(0, rule.firstAt - placed), rearrange: false };
  }

  const place = Math.max(0, rule.secondAt - placed);
  const changeLeft = Math.max(
    0,
    rule.changedSinceFirst - changedSince(state.firstSlots, positions),
  );

  return { place, rearrange: changeLeft > place };
}

/** The state after a check, or the same state when none is available. */
export function takeProgressCheck(
  positions: readonly number[],
  state: ProgressCheckState,
): ProgressCheckState {
  if (progressCheckAvailability(positions, state).status !== 'available') {
    return state;
  }

  return {
    used: state.used + 1,
    firstSlots: state.firstSlots ?? orderSlots(positions),
    result: progressCheckCount(positions),
  };
}

/**
 * Moves a placed step one place up (-1) or down (+1): into an empty place,
 * or swapping with the step there. Every other step stays where it is.
 */
export function moveOrderItem(
  positions: readonly number[],
  itemIndex: number,
  offset: -1 | 1,
): number[] {
  const from = positions[itemIndex] ?? 0;
  const to = from + offset;

  if (from === 0 || to < 1 || to > positions.length) {
    return [...positions];
  }

  return positions.map((position, index) =>
    index === itemIndex ? to : position === to ? from : position,
  );
}
