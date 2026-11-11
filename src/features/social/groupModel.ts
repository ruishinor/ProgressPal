import type { SocialGroup } from '@/lib/cloud';

export function summarizeGroup(group: SocialGroup) {
  // The server supplies a stable join order. Stable sort keeps it for ties.
  const members = [...group.members].sort(
    (left, right) => right.days - left.days,
  );
  let rank = 1;
  const ranking = members.map((member, index) => {
    if (index > 0 && members[index - 1].days !== member.days) rank = index + 1;
    return { ...member, rank };
  });
  return {
    total: members.reduce((total, member) => total + member.days, 0),
    target: 2 * members.length,
    ranking,
  };
}
