import { describe, expect, it } from 'vitest';

import {
  ACTION_GUARD_MS,
  createActionGuard,
} from '@/features/microlearning/components/actionGuard';

/**
 * The guard is a timestamp and a comparison: the first activation passes, a
 * repeat inside the window does not, and the window closes by itself.
 */

function guardAt() {
  const clock = { t: 10_000 };

  return { clock, guard: createActionGuard(() => clock.t) };
}

describe('createActionGuard', () => {
  it('accepts the first activation at any time', () => {
    const { guard } = guardAt();

    expect(guard.accept()).toBe(true);
  });

  it('refuses a repeat that arrives inside the window, however soon', () => {
    const { clock, guard } = guardAt();

    guard.accept();
    expect(guard.accept()).toBe(false);
    clock.t += 120;
    expect(guard.accept()).toBe(false);
    clock.t += ACTION_GUARD_MS - 121;
    expect(guard.accept()).toBe(false);
  });

  it('accepts a separate activation once the window has closed', () => {
    const { clock, guard } = guardAt();

    guard.accept();
    clock.t += ACTION_GUARD_MS;
    expect(guard.accept()).toBe(true);
  });

  it('does not let a refused repeat extend the window', () => {
    const { clock, guard } = guardAt();

    guard.accept();
    clock.t += 300;
    expect(guard.accept()).toBe(false);
    clock.t += 100;
    // 400 ms after the accepted press, though only 100 after the refused one.
    expect(guard.accept()).toBe(true);
  });

  it('keeps the window short enough to be unnoticeable and long enough for a double tap', () => {
    expect(ACTION_GUARD_MS).toBeGreaterThanOrEqual(300);
    expect(ACTION_GUARD_MS).toBeLessThanOrEqual(500);
  });

  it('keeps separate guards independent', () => {
    const first = guardAt();
    const second = guardAt();

    first.guard.accept();
    expect(second.guard.accept()).toBe(true);
  });
});
