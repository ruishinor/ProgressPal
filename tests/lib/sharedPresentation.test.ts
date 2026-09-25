import { describe, expect, it } from 'vitest';

import { getItemStatusLabel, getItemStatusVariant } from '@/lib/progress';
import { formatMinutes } from '@/lib/time';

describe('shared progress presentation', () => {
  it('preserves minute rounding and clamping at hour boundaries', () => {
    expect(formatMinutes(-4)).toBe('0 min');
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(59.4)).toBe('59 min');
    expect(formatMinutes(59.5)).toBe('1h');
    expect(formatMinutes(95)).toBe('1h 35m');
  });

  it.each([
    [true, 'not_started', 'Not started', 'notStarted'],
    [false, 'not_started', 'Optional', 'optional'],
    [true, 'started', 'Started', 'inProgress'],
    [false, 'blocked', 'Blocked', 'blocked'],
    [true, 'completed', 'Completed', 'completed'],
    [true, 'submitted', 'Submitted', 'completed'],
    [true, 'accepted', 'Accepted', 'completed'],
    [false, 'skipped_optional', 'Skipped optional', 'optional'],
  ] as const)(
    'keeps status presentation for required=%s status=%s',
    (required, status, label, variant) => {
      expect(getItemStatusLabel(required, status)).toBe(label);
      expect(getItemStatusVariant(required, status)).toBe(variant);
    },
  );
});
