/**
 * Pure helpers for the microlearning surface. They hold no state and do no
 * I/O: a card keeps its own answer in component state, and nothing here can
 * reach storage, XP, mastery or Campaign progress.
 */

import type { MicroCard, MicroLearnCard } from '@/lib/domain';

/** Every card the learner answers: all but the non-assessed Learn card. */
export type MicroPracticeCard = Exclude<MicroCard, MicroLearnCard>;

export type PracticePhase =
  | 'answering'
  | 'wrong'
  | 'retry'
  | 'correct'
  | 'revealed';

/**
 * The one bounded loop every assessed card follows. A first miss shows a hint
 * and offers one retry; a second miss shows the answer. Nothing is counted,
 * scored or kept: `tries` only chooses the wording of the closing feedback.
 */
export type PracticeState = { phase: PracticePhase; tries: number };

export const initialPractice: PracticeState = { phase: 'answering', tries: 0 };

/** The learner can still act on the card. */
export function isOpen(state: PracticeState): boolean {
  return state.phase === 'answering' || state.phase === 'retry';
}

/** The card has ended and offers Next. */
export function isSettled(state: PracticeState): boolean {
  return state.phase === 'correct' || state.phase === 'revealed';
}

export function submitAttempt(
  state: PracticeState,
  correct: boolean,
): PracticeState {
  if (!isOpen(state)) {
    return state;
  }
  const tries = state.tries + 1;

  if (correct) {
    return { phase: 'correct', tries };
  }

  return { phase: state.phase === 'retry' ? 'revealed' : 'wrong', tries };
}

export function retryAttempt(state: PracticeState): PracticeState {
  return state.phase === 'wrong' ? { ...state, phase: 'retry' } : state;
}

export function isSameSequence(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((item, index) => item === expected[index])
  );
}

/**
 * Tap-to-place: a tap on an unplaced id appends it, a tap on a placed id
 * removes it (later ids close up). No drag and no pointer precision involved.
 */
export function toggleInSequence(
  placed: readonly string[],
  id: string,
): string[] {
  return placed.includes(id)
    ? placed.filter((placedId) => placedId !== id)
    : [...placed, id];
}

/** A left tap then a right tap pair up when they carry the same pair id. */
export function matchOutcome(
  selectedLeftId: string,
  tappedRightId: string,
): 'match' | 'miss' {
  return selectedLeftId === tappedRightId ? 'match' : 'miss';
}
