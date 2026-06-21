import type { HTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type RpgRankBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  rank: string;
};

export function RpgRankBadge({ className, rank, ...rest }: RpgRankBadgeProps) {
  return (
    <span className={classNames('rpg-rank-badge', className)} {...rest}>
      <span>Rank:</span>
      <span>{rank}</span>
    </span>
  );
}
