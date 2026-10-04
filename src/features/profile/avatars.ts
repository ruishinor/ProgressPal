import { learnerAvatarIdValues, type LearnerAvatarId } from '@/lib/domain';

export type AvatarOption = {
  readonly id: LearnerAvatarId;
  readonly label: string;
  readonly src: string;
};

export const avatarOptions: readonly AvatarOption[] = [
  { id: 'original', label: 'Original', src: '/assets/character-profile.png' },
  {
    id: 'auburn-braid',
    label: 'Auburn braid',
    src: '/assets/avatars/avatar-auburn-braid.png',
  },
  {
    id: 'short-curls',
    label: 'Short curls',
    src: '/assets/avatars/avatar-short-curls.png',
  },
  {
    id: 'wavy-bob',
    label: 'Wavy bob',
    src: '/assets/avatars/avatar-wavy-bob.png',
  },
];

const byId = new Map(avatarOptions.map((option) => [option.id, option]));

if (
  avatarOptions.length !== learnerAvatarIdValues.length ||
  learnerAvatarIdValues.some((id) => !byId.has(id))
) {
  throw new Error('Avatar registry does not cover the persisted avatar IDs.');
}

export function getAvatarOption(
  avatarId: LearnerAvatarId | undefined,
): AvatarOption {
  return byId.get(avatarId ?? 'original') ?? byId.get('original')!;
}
