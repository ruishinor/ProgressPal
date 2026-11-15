import { expect, it } from 'vitest';

import { summarizeGroup } from '@/features/social/groupModel';

it('keeps the join order instead of ranking and bases the target on current members', () => {
  const members = [
    { nickname: 'Bo', self: true, days: 0 },
    { nickname: 'Ada', self: false, days: 3 },
    { nickname: 'Cai', self: false, days: 2 },
  ];
  const group = {
    name: 'Lag A',
    membership: 'ab4d2826-20ad-4ee9-80ef-6bf725e82999',
    canInvite: true,
    isAdmin: true,
    hasInvite: false,
    members,
  };
  expect(summarizeGroup(group)).toEqual({ total: 5, target: 6, members });
  expect(
    summarizeGroup({ ...group, members: members.slice(0, 2) }),
  ).toMatchObject({ total: 3, target: 4 });
});
