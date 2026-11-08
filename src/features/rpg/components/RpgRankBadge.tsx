import uiCopy from '@/ui-copy/interface.json';
import type { HTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type RpgRankBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  rank: string;
};

export function RpgRankBadge({ className, rank, ...rest }: RpgRankBadgeProps) {
  return (
    <span className={classNames('rpg-rank-badge', className)} {...rest}>
      <span>{uiCopy.surfaces.rpgRpgRankBadge.rank}</span>
      <span>{rank}</span>
    </span>
  );
}
