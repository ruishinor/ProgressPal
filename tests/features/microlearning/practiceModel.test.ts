import { describe, expect, it } from 'vitest';

import {
  initialPractice,
  isOpen,
  isSameSequence,
  isSettled,
  matchOutcome,
  retryAndSubmit,
  retryAttempt,
  submitAttempt,
  toggleInSequence,
  type PracticeState,
} from '@/features/microlearning/model';

/**
 * The one-retry loop as a pure state machine: a first miss waits for an
 * explicit retry, a second miss reveals, a hit ends the card, and nothing
 * moves once the card has ended.
 */

describe('submitAttempt', () => {
  it('ends the card on a first-attempt hit', () => {
    expect(submitAttempt(initialPractice, true)).toEqual({
      phase: 'correct',
      tries: 1,
    });
  });

  it('waits for a retry after a first miss', () => {
    const wrong = submitAttempt(initialPractice, false);

    expect(wrong).toEqual({ phase: 'wrong', tries: 1 });
    expect(isOpen(wrong)).toBe(false);
    expect(isSettled(wrong)).toBe(false);
  });

  it('ignores attempts while the miss is being read', () => {
    const wrong = submitAttempt(initialPractice, false);

    expect(submitAttempt(wrong, true)).toBe(wrong);
    expect(submitAttempt(wrong, false)).toBe(wrong);
  });

  it('credits a hit on the retry as correct on the second try', () => {
    const retry = retryAttempt(submitAttempt(initialPractice, false));

    expect(retry.phase).toBe('retry');
    expect(isOpen(retry)).toBe(true);
    expect(submitAttempt(retry, true)).toEqual({ phase: 'correct', tries: 2 });
  });

  it('reveals after a second miss and offers no third attempt', () => {
    const retry = retryAttempt(submitAttempt(initialPractice, false));
    const revealed = submitAttempt(retry, false);

    expect(revealed).toEqual({ phase: 'revealed', tries: 2 });
    expect(isSettled(revealed)).toBe(true);
    expect(submitAttempt(revealed, true)).toBe(revealed);
    expect(retryAttempt(revealed)).toBe(revealed);
  });

  it('never moves a settled card', () => {
    const correct = submitAttempt(initialPractice, true);

    expect(submitAttempt(correct, false)).toBe(correct);
    expect(retryAttempt(correct)).toBe(correct);
  });
});

describe('retryAttempt', () => {
  it('only acts on a first miss', () => {
    const states: PracticeState[] = [
      initialPractice,
      { phase: 'retry', tries: 1 },
      { phase: 'correct', tries: 1 },
    ];

    for (const state of states) {
      expect(retryAttempt(state)).toBe(state);
    }
  });
});

describe('sequence helpers', () => {
  it('compares sequences exactly', () => {
    expect(isSameSequence(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(isSameSequence(['b', 'a'], ['a', 'b'])).toBe(false);
    expect(isSameSequence(['a'], ['a', 'b'])).toBe(false);
  });

  it('appends an unplaced id and removes a placed one, closing up', () => {
    expect(toggleInSequence([], 'a')).toEqual(['a']);
    expect(toggleInSequence(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('pairs a left tap with the right tap that carries the same id', () => {
    expect(matchOutcome('a', 'a')).toBe('match');
    expect(matchOutcome('a', 'b')).toBe('miss');
  });
});

describe('a new choice while a first miss is shown', () => {
  const wrong = submitAttempt(initialPractice, false);

  it('is the one retry: right ends it, wrong reveals it', () => {
    expect(retryAndSubmit(wrong, true)).toEqual({ phase: 'correct', tries: 2 });
    expect(retryAndSubmit(wrong, false)).toEqual({
      phase: 'revealed',
      tries: 2,
    });
  });

  it('is the same as Prøv igjen followed by that choice', () => {
    for (const correct of [true, false]) {
      expect(retryAndSubmit(wrong, correct)).toEqual(
        submitAttempt(retryAttempt(wrong), correct),
      );
    }
  });

  it('never gives a third try or reopens an ended card', () => {
    const revealed = retryAndSubmit(wrong, false);
    const correct = submitAttempt(initialPractice, true);

    expect(retryAndSubmit(revealed, true)).toBe(revealed);
    expect(retryAndSubmit(correct, false)).toBe(correct);
  });

  it('is an ordinary first answer when nothing was missed yet', () => {
    expect(retryAndSubmit(initialPractice, false)).toEqual(wrong);
  });
});
