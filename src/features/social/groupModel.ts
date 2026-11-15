import type { SocialGroup } from '@/lib/cloud';

export function summarizeGroup(group: SocialGroup) {
  // Members stay in the server's stable join order: a shared list, not a ranking.
  return {
    total: group.members.reduce((total, member) => total + member.days, 0),
    target: 2 * group.members.length,
    members: group.members,
  };
}
