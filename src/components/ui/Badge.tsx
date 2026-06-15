import type { HTMLAttributes, ReactNode } from 'react';

import { classNames, type StatusTone } from '@/components/ui/utils';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  emphasis?: 'soft' | 'solid';
  tone?: StatusTone;
};

export function Badge({
  children,
  className,
  emphasis = 'soft',
  tone = 'neutral',
  ...rest
}: BadgeProps) {
  return (
    <span
      className={classNames(
        'badge',
        `badge--${tone}`,
        `badge--${emphasis}`,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
