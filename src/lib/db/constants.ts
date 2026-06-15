import packageJson from '../../../package.json';

import type { LearnerAvatarConfig, LearnerProfile } from '@/lib/domain';

export const progressPalDatabaseName = 'progresspal-cs50-edition';
export const currentDatabaseSchemaVersion = 2;
export const currentApplicationVersion = packageJson.version;

export const singletonIds = {
  appMeta: 'app-meta',
  learnerProfile: 'learner-profile',
} as const;

export const defaultAvatarConfig: Required<LearnerAvatarConfig> = {
  face: 'round',
  hair: 'short',
  topColor: 'forest',
};

export const defaultLearnerProfileValues: Omit<
  LearnerProfile,
  'id' | 'createdAt' | 'updatedAt'
> = {
  displayName: 'Learner',
  avatarConfig: defaultAvatarConfig,
  targetStudyDays: ['monday', 'wednesday', 'friday'],
  targetMinutesPerWeek: 300,
  preferredTheme: 'system',
  reducedMotion: false,
};
