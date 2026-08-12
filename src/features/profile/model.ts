import { defaultAvatarConfig, defaultLearnerProfileValues } from '@/lib/db';
import { hasCompletedOnboarding, normalizeAvatarConfig } from '@/lib/profile';
import type {
  LearnerAvatarFace,
  LearnerAvatarHair,
  LearnerAvatarTopColor,
  LearnerProfile,
  PreferredTheme,
  StudyDay,
} from '@/lib/domain';

export type ProfileFormValues = {
  displayName: string;
  face: LearnerAvatarFace;
  hair: LearnerAvatarHair;
  preferredTheme: PreferredTheme;
  reducedMotion: boolean;
  targetMinutesPerWeek: string;
  targetStudyDays: StudyDay[];
  topColor: LearnerAvatarTopColor;
};

type NamedOption<T extends string> = {
  label: string;
  value: T;
};

export const themeOptions: readonly NamedOption<PreferredTheme>[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
] as const;

export const studyDayOptions: readonly { label: string; value: StudyDay }[] = [
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
  { label: 'Sun', value: 'sunday' },
] as const;

export function createProfileFormValues(
  profile: LearnerProfile | null,
): ProfileFormValues {
  const baseProfile = profile ?? {
    ...defaultLearnerProfileValues,
    avatarConfig: defaultAvatarConfig,
  };
  const avatarConfig = normalizeAvatarConfig(baseProfile.avatarConfig);

  return {
    displayName: baseProfile.displayName,
    face: avatarConfig.face,
    hair: avatarConfig.hair,
    preferredTheme: baseProfile.preferredTheme,
    reducedMotion: baseProfile.reducedMotion,
    targetMinutesPerWeek: String(baseProfile.targetMinutesPerWeek),
    targetStudyDays: [...baseProfile.targetStudyDays],
    topColor: avatarConfig.topColor,
  };
}

export function createAvatarConfig(
  values: Pick<ProfileFormValues, 'face' | 'hair' | 'topColor'>,
) {
  return {
    face: values.face,
    hair: values.hair,
    topColor: values.topColor,
  };
}

export { hasCompletedOnboarding, normalizeAvatarConfig };

export function getThemeLabel(theme: PreferredTheme) {
  return (
    themeOptions.find((option) => option.value === theme)?.label ?? 'System'
  );
}
