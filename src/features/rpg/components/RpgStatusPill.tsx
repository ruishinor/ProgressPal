import type { HTMLAttributes } from 'react';

import { classNames } from '@/components/ui/utils';

export type RpgStatusTone =
  | 'neutral'
  | 'progress'
  | 'success'
  | 'warning'
  | 'danger';

export type RpgStatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  children: string;
  tone?: RpgStatusTone;
};

export function RpgStatusPill({
  children,
  className,
  tone = 'neutral',
  ...rest
}: RpgStatusPillProps) {
  return (
    <span
      className={classNames(
        'rpg-status-pill',
        `rpg-status-pill--${tone}`,
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="rpg-status-pill__marker" />
      <span>{children}</span>
    </span>
  );
}
