const defaultOnboardingReturnPath = '/dashboard';
const onboardingPath = '/onboarding';

export type OnboardingLocationState = {
  returnTo?: unknown;
};

export function getOnboardingReturnPath(state: unknown) {
  if (state === null || typeof state !== 'object') {
    return defaultOnboardingReturnPath;
  }

  const { returnTo } = state as OnboardingLocationState;
  const hasUnsafeCharacter =
    typeof returnTo === 'string' &&
    Array.from(returnTo).some((character) => {
      const characterCode = character.charCodeAt(0);

      return character === '\\' || characterCode <= 31 || characterCode === 127;
    });

  if (
    typeof returnTo !== 'string' ||
    !/^\/(?!\/)/.test(returnTo) ||
    hasUnsafeCharacter
  ) {
    return defaultOnboardingReturnPath;
  }

  try {
    const currentOrigin = globalThis.location.origin;
    const parsedPath = new URL(returnTo, currentOrigin);

    if (
      parsedPath.origin !== currentOrigin ||
      parsedPath.pathname === onboardingPath ||
      parsedPath.pathname.startsWith(`${onboardingPath}/`)
    ) {
      return defaultOnboardingReturnPath;
    }
  } catch {
    return defaultOnboardingReturnPath;
  }

  return returnTo;
}
