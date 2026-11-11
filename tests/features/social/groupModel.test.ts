import { expect, it } from 'vitest';

import { summarizeGroup } from '@/features/social/groupModel';

it('uses shared rank and a target based on the current members', () => {
  const members = [
    { nickname: 'Bo', self: true, days: 0 },
    { nickname: 'Ada', self: false, days: 3 },
    { nickname: 'Cai', self: false, days: 3 },
  ];
  const group = {
    name: 'Lag A',
    membership: 'ab4d2826-20ad-4ee9-80ef-6bf725e82999',
    canInvite: true,
    hasInvite: false,
    members,
  };
  expect(summarizeGroup(group)).toEqual({
    total: 6,
    target: 6,
    ranking: [
      { ...members[1], rank: 1 },
      { ...members[2], rank: 1 },
      { ...members[0], rank: 3 },
    ],
  });
  expect(
    summarizeGroup({ ...group, members: members.slice(0, 2) }),
  ).toMatchObject({ total: 3, target: 4 });
});
