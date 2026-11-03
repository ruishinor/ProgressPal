import { expect, it } from 'vitest';
import { formatEstimatedMinutes, formatMinutes } from '@/lib/time';

it('distinguishes unknown catalogue estimates from actual recorded zero minutes', () => {
  expect(formatEstimatedMinutes(0)).toBe('Not estimated');
  expect(formatMinutes(0)).toBe('0 min');
  for (const minutes of [1, 30, 90]) {
    expect(formatEstimatedMinutes(minutes)).toBe(formatMinutes(minutes));
  }
});
