import { describe, expect, it } from 'vitest';

import { getOnboardingReturnPath } from '@/lib/routing/onboardingReturnPath';

describe('getOnboardingReturnPath', () => {
  it('preserves a root-relative path, query, and fragment', () => {
    expect(
      getOnboardingReturnPath({
        returnTo: '/rpg/focus?itemId=week-4-lecture#timer',
      }),
    ).toBe('/rpg/focus?itemId=week-4-lecture#timer');
  });

  it.each([
    undefined,
    null,
    {},
    { returnTo: 'https://example.com/rpg' },
    { returnTo: '//example.com/rpg' },
    { returnTo: '/onboarding' },
    { returnTo: '/onboarding/retry' },
    { returnTo: '/rpg\\focus' },
    { returnTo: '/rpg\n/focus' },
  ])('falls back for unsafe or malformed state %#', (state) => {
    expect(getOnboardingReturnPath(state)).toBe('/rpg');
  });
});
