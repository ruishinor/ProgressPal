import { describe, expect, it } from 'vitest';

import {
  formatDurationMinutes,
  formatTimestampInput,
  getWholeMinutesFromElapsedMilliseconds,
  parseTimestampInput,
} from '@/lib/time';

describe('time helpers', () => {
  it('formats media timestamps for manual input defaults', () => {
    expect(formatTimestampInput(0)).toBe('0:00');
    expect(formatTimestampInput(1200)).toBe('20:00');
    expect(formatTimestampInput(3930)).toBe('1:05:30');
  });

  it('parses minute-second and hour-minute-second input safely', () => {
    expect(parseTimestampInput('20:00')).toBe(1200);
    expect(parseTimestampInput('1:05:30')).toBe(3930);
    expect(parseTimestampInput('05:07')).toBe(307);
  });

  it('rejects malformed timestamp input', () => {
    expect(parseTimestampInput('')).toBeNull();
    expect(parseTimestampInput('20')).toBeNull();
    expect(parseTimestampInput('20:70')).toBeNull();
    expect(parseTimestampInput('1:70:00')).toBeNull();
    expect(parseTimestampInput('abc')).toBeNull();
  });

  it('derives whole minutes from elapsed milliseconds for live sessions', () => {
    expect(getWholeMinutesFromElapsedMilliseconds(0)).toBe(0);
    expect(getWholeMinutesFromElapsedMilliseconds(59_999)).toBe(0);
    expect(getWholeMinutesFromElapsedMilliseconds(60_000)).toBe(1);
    expect(getWholeMinutesFromElapsedMilliseconds(43_200_000)).toBe(720);
  });

  it('formats whole-minute durations for session ledger copy', () => {
    expect(formatDurationMinutes(0)).toBe('0 min');
    expect(formatDurationMinutes(25)).toBe('25 min');
    expect(formatDurationMinutes(60)).toBe('1h');
    expect(formatDurationMinutes(125)).toBe('2h 5m');
  });
});
