import type { HTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type RpgRankBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  rank: string;
};

export function RpgRankBadge({ className, rank, ...rest }: RpgRankBadgeProps) {
  return (
    <span className={classNames('rpg-rank-badge', className)} {...rest}>
      <span aria-hidden="true" className="rpg-rank-badge__mark" />
      <span className="rpg-rank-badge__label">Rank:</span>
      <span>{rank}</span>
    </span>
  );
}
