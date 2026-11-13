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
  {
    id: 'matrix-neo',
    label: 'Neo',
    src: '/assets/avatars/avatar-matrix-neo.png',
  },
  {
    id: 'matrix-trinity',
    label: 'Trinity',
    src: '/assets/avatars/avatar-matrix-trinity.png',
  },
  {
    id: 'matrix-morpheus',
    label: 'Morpheus',
    src: '/assets/avatars/avatar-matrix-morpheus.png',
  },
  {
    id: 'matrix-niobe',
    label: 'Niobe',
    src: '/assets/avatars/avatar-matrix-niobe.png',
  },
  {
    id: 'matrix-agent-smith',
    label: 'Agent Smith',
    src: '/assets/avatars/avatar-matrix-agent-smith.png',
  },
  {
    id: 'nerds-lewis-skolnick',
    label: 'Skolnick',
    src: '/assets/avatars/avatar-nerds-lewis-skolnick.png',
  },
  {
    id: 'nerds-gilbert-lowell',
    label: 'Gilbert',
    src: '/assets/avatars/avatar-nerds-gilbert-lowell.png',
  },
  {
    id: 'nerds-judy',
    label: 'Judy',
    src: '/assets/avatars/avatar-nerds-judy.png',
  },
  {
    id: 'nerds-poindexter',
    label: 'Poindexter',
    src: '/assets/avatars/avatar-nerds-poindexter.png',
  },
  {
    id: 'nerds-dawson',
    label: 'Dawson',
    src: '/assets/avatars/avatar-nerds-dawson.png',
  },
  {
    id: 'hackers-dade',
    label: 'Zero Cool',
    src: '/assets/avatars/avatar-hackers-dade.png',
  },
  {
    id: 'hackers-kate',
    label: 'Acid Burn',
    src: '/assets/avatars/avatar-hackers-kate.png',
  },
  {
    id: 'hackers-cereal-killer',
    label: 'Cereal Killer',
    src: '/assets/avatars/avatar-hackers-cereal-killer.png',
  },
  {
    id: 'hackers-lord-nikon',
    label: 'Lord Nikon',
    src: '/assets/avatars/avatar-hackers-lord-nikon.png',
  },
  {
    id: 'hackers-the-plague',
    label: 'The Plague',
    src: '/assets/avatars/avatar-hackers-the-plague.png',
  },
  {
    id: 'wargames-david-lightman',
    label: 'Lightman',
    src: '/assets/avatars/avatar-wargames-david-lightman.png',
  },
  {
    id: 'wargames-jennifer-mack',
    label: 'Mack',
    src: '/assets/avatars/avatar-wargames-jennifer-mack.png',
  },
  {
    id: 'wargames-dr-falken',
    label: 'Falken',
    src: '/assets/avatars/avatar-wargames-dr-falken.png',
  },
  {
    id: 'swordfish-stanley-jobson',
    label: 'Jobson',
    src: '/assets/avatars/avatar-swordfish-stanley-jobson.png',
  },
  {
    id: 'swordfish-ginger-knowles',
    label: 'Ginger',
    src: '/assets/avatars/avatar-swordfish-ginger-knowles.png',
  },
  {
    id: 'archetype-wildcard',
    label: 'Wildcard',
    src: '/assets/avatars/avatar-archetype-wildcard.png',
  },
  {
    id: 'archetype-renegade',
    label: 'Renegade',
    src: '/assets/avatars/avatar-archetype-renegade.png',
  },
  {
    id: 'archetype-maverick',
    label: 'Maverick',
    src: '/assets/avatars/avatar-archetype-maverick.png',
  },
  {
    id: 'archetype-frontend-developer',
    label: 'Frontend Developer',
    src: '/assets/avatars/avatar-archetype-frontend-developer.png',
  },
  {
    id: 'archetype-backend-developer',
    label: 'Backend Developer',
    src: '/assets/avatars/avatar-archetype-backend-developer.png',
  },
  {
    id: 'archetype-fullstack-developer',
    label: 'Fullstack Developer',
    src: '/assets/avatars/avatar-archetype-fullstack-developer.png',
  },
  {
    id: 'archetype-html-css-expert',
    label: 'HTML & CSS Expert',
    src: '/assets/avatars/avatar-archetype-html-css-expert.png',
  },
  {
    id: 'archetype-junior-dev',
    label: 'Junior Dev',
    src: '/assets/avatars/avatar-archetype-junior-dev.png',
  },
  {
    id: 'archetype-senior-dev',
    label: 'Senior Dev',
    src: '/assets/avatars/avatar-archetype-senior-dev.png',
  },
  {
    id: 'archetype-java-old-school',
    label: 'Java Old-School',
    src: '/assets/avatars/avatar-archetype-java-old-school.png',
  },
  {
    id: 'archetype-ai-assisted-dev',
    label: 'AI-Assisted Dev',
    src: '/assets/avatars/avatar-archetype-ai-assisted-dev.png',
  },
  {
    id: 'archetype-knight-errant',
    label: 'Knight Errant',
    src: '/assets/avatars/avatar-archetype-knight-errant.png',
  },
  {
    id: 'archetype-modern-knight-errant',
    label: 'Modern Knight Errant',
    src: '/assets/avatars/avatar-archetype-modern-knight-errant.png',
  },
  {
    id: 'archetype-cyberpunk',
    label: 'Cyberpunk',
    src: '/assets/avatars/avatar-archetype-cyberpunk.png',
  },
  {
    id: 'archetype-steampunk',
    label: 'Steampunk',
    src: '/assets/avatars/avatar-archetype-steampunk.png',
  },
  {
    id: 'archetype-mechatronics',
    label: 'Mechatronics',
    src: '/assets/avatars/avatar-archetype-mechatronics.png',
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
