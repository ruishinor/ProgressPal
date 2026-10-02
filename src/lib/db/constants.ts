// Import only the `version` field (not the whole package.json default object)
// so the production bundle does not inline the entire manifest - dependencies,
// devDependencies, and npm scripts. See DECISIONS.md (post-Module-19
// bundle-hygiene follow-up).
import { version as applicationVersion } from '../../../package.json';

import type { LearnerAvatarConfig, LearnerProfile } from '@/lib/domain';

export const progressPalDatabaseName = 'progresspal-cs50-edition';
export const currentDatabaseSchemaVersion = 4;
export const currentApplicationVersion = applicationVersion;

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
