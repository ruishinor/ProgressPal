import { describe, expect, it } from 'vitest';

import { defaultLearnerProfileValues } from '@/lib/db';
import type { AppMeta, LearnerProfile } from '@/lib/domain';
import {
  createProfileFormValues,
  hasCompletedOnboarding,
  normalizeAvatarConfig,
} from '@/features/profile/model';

const baseProfile: LearnerProfile = {
  id: 'learner-profile',
  avatarConfig: defaultLearnerProfileValues.avatarConfig,
  createdAt: '2026-06-11T10:00:00.000Z',
  displayName: defaultLearnerProfileValues.displayName,
  preferredTheme: defaultLearnerProfileValues.preferredTheme,
  reducedMotion: defaultLearnerProfileValues.reducedMotion,
  targetMinutesPerWeek: defaultLearnerProfileValues.targetMinutesPerWeek,
  targetStudyDays: defaultLearnerProfileValues.targetStudyDays,
  updatedAt: '2026-06-11T10:00:00.000Z',
};

describe('profile model', () => {
  it('fills legacy avatar config gaps with local defaults', () => {
    expect(normalizeAvatarConfig({})).toEqual({
      avatarId: 'original',
      face: 'round',
      hair: 'short',
      topColor: 'forest',
    });
  });

  it('detects onboarding completion from metadata or customized legacy profile data', () => {
    const emptyMeta: AppMeta = {
      appVersion: '0.1.0-test',
      createdAt: '2026-06-11T10:00:00.000Z',
      id: 'app-meta',
      schemaVersion: 3,
      activeProgrammeId: 'cs50x',
      updatedAt: '2026-06-11T10:00:00.000Z',
    };

    expect(hasCompletedOnboarding(emptyMeta, baseProfile)).toBe(false);
    expect(
      hasCompletedOnboarding(
        {
          ...emptyMeta,
          onboardingCompletedAt: '2026-06-11T11:00:00.000Z',
        },
        baseProfile,
      ),
    ).toBe(true);
    expect(
      hasCompletedOnboarding(emptyMeta, {
        ...baseProfile,
        displayName: 'Alex',
      }),
    ).toBe(true);
    expect(
      hasCompletedOnboarding(emptyMeta, {
        ...baseProfile,
        avatarConfig: {
          ...baseProfile.avatarConfig,
          avatarId: 'wavy-bob',
        },
      }),
    ).toBe(true);
  });

  it('creates form values from the persisted profile contract', () => {
    expect(createProfileFormValues(baseProfile)).toEqual({
      avatarId: 'original',
      displayName: 'Learner',
      face: 'round',
      hair: 'short',
      preferredTheme: 'system',
      reducedMotion: false,
      targetMinutesPerWeek: '300',
      targetStudyDays: ['monday', 'wednesday', 'friday'],
      topColor: 'forest',
    });
  });
});
