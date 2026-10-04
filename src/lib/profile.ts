import { defaultAvatarConfig, defaultLearnerProfileValues } from '@/lib/db';
import type {
  AppMeta,
  LearnerAvatarConfig,
  LearnerProfile,
} from '@/lib/domain';

function hasSameStudyDays(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((day) => right.includes(day)) &&
    right.every((day) => left.includes(day))
  );
}

export function normalizeAvatarConfig(
  avatarConfig: LearnerAvatarConfig | undefined,
): Required<LearnerAvatarConfig> {
  return {
    ...defaultAvatarConfig,
    ...avatarConfig,
  };
}

export function hasCompletedOnboarding(
  appMeta: AppMeta | null,
  profile: LearnerProfile | null,
) {
  if (appMeta?.onboardingCompletedAt !== undefined) {
    return true;
  }

  if (profile === null) {
    return false;
  }

  const normalizedAvatarConfig = normalizeAvatarConfig(profile.avatarConfig);
  const normalizedDefaultAvatarConfig = normalizeAvatarConfig(
    defaultLearnerProfileValues.avatarConfig,
  );

  return (
    profile.displayName !== defaultLearnerProfileValues.displayName ||
    profile.targetMinutesPerWeek !==
      defaultLearnerProfileValues.targetMinutesPerWeek ||
    profile.preferredTheme !== defaultLearnerProfileValues.preferredTheme ||
    profile.reducedMotion !== defaultLearnerProfileValues.reducedMotion ||
    !hasSameStudyDays(
      profile.targetStudyDays,
      defaultLearnerProfileValues.targetStudyDays,
    ) ||
    normalizedAvatarConfig.avatarId !==
      normalizedDefaultAvatarConfig.avatarId ||
    normalizedAvatarConfig.face !== normalizedDefaultAvatarConfig.face ||
    normalizedAvatarConfig.hair !== normalizedDefaultAvatarConfig.hair ||
    normalizedAvatarConfig.topColor !== normalizedDefaultAvatarConfig.topColor
  );
}
