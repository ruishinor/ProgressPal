import { describe, expect, it } from 'vitest';

import { backupSlotCount, compareStoredAt, parseStoredAt } from '@/lib/cloud';

describe('backup slot count', () => {
  it('is five, the database invariant the client mirrors', () => {
    expect(backupSlotCount).toBe(5);
  });
});

describe('parseStoredAt', () => {
  it.each([
    ['2026-10-08T11:41:04.37582+00:00', 1791459664, '375820000'],
    ['2026-10-08T11:41:04.376576+00:00', 1791459664, '376576000'],
    ['2026-10-08T11:41:04+00:00', 1791459664, '000000000'],
    ['2026-10-08T11:41:04.5Z', 1791459664, '500000000'],
    ['2026-10-08T13:41:04.000001+02:00', 1791459664, '000001000'],
    ['2026-10-08T11:41:04.123456789+00:00', 1791459664, '123456789'],
  ])(
    'reads %s without losing sub-millisecond digits',
    (text, seconds, fraction) => {
      expect(parseStoredAt(text)).toEqual({ seconds, fraction });
    },
  );

  it.each([
    '',
    'yesterday',
    '2026-10-08',
    '2026-10-08 11:41:04+00:00',
    '2026-10-08T11:41:04',
    '2026-10-08T11:41:04.+00:00',
    '2026-10-08T11:41:04.1234567890+00:00',
    '2026-13-45T11:41:04+00:00',
    ' 2026-10-08T11:41:04+00:00',
  ])('refuses %j', (text) => {
    expect(parseStoredAt(text)).toBeNull();
  });
});

describe('compareStoredAt', () => {
  it('orders by value, not by text: a trimmed fraction is still the same instant', () => {
    expect(
      compareStoredAt(
        '2026-10-08T11:41:04.5+00:00',
        '2026-10-08T11:41:04.500000+00:00',
      ),
    ).toBe(0);
  });

  it('orders two inserts that differ only below a millisecond (the live G3-stored-at pair)', () => {
    expect(
      compareStoredAt(
        '2026-10-08T11:41:04.37582+00:00',
        '2026-10-08T11:41:04.376576+00:00',
      ),
    ).toBeLessThan(0);
    expect(
      compareStoredAt(
        '2026-10-08T11:41:04.376576+00:00',
        '2026-10-08T11:41:04.37582+00:00',
      ),
    ).toBeGreaterThan(0);
  });

  it('is not fooled by text length: .9 is later than .12345', () => {
    expect(
      compareStoredAt(
        '2026-10-08T11:41:04.9+00:00',
        '2026-10-08T11:41:04.12345+00:00',
      ),
    ).toBeGreaterThan(0);
  });

  it('is not fooled by sub-millisecond ties that a Date would collapse', () => {
    expect(
      compareStoredAt(
        '2026-10-08T11:41:04.000100+00:00',
        '2026-10-08T11:41:04.000900+00:00',
      ),
    ).toBeLessThan(0);
  });

  it('compares across offsets by the instant', () => {
    expect(
      compareStoredAt('2026-10-08T13:41:04+02:00', '2026-10-08T11:41:05+00:00'),
    ).toBeLessThan(0);
  });

  it('crosses a second boundary correctly', () => {
    expect(
      compareStoredAt(
        '2026-10-08T11:41:04.999999+00:00',
        '2026-10-08T11:41:05.000001+00:00',
      ),
    ).toBeLessThan(0);
  });

  it('refuses text that is not a server timestamp', () => {
    expect(() => compareStoredAt('x', '2026-10-08T11:41:04+00:00')).toThrow(
      RangeError,
    );
    expect(() => compareStoredAt('2026-10-08T11:41:04+00:00', 'x')).toThrow(
      RangeError,
    );
  });
});
